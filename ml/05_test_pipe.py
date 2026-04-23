# ============================================================
# ml/05_test_pipeline.py
# Tests the complete vision pipeline on your local machine
#
# What this tests:
#   1. YOLOv8 danger detection (fine-tuned or pretrained fallback)
#   2. BLIP-base captioning (CPU-friendly, ~3s per image)
#   3. Fusion engine (combines both into spoken navigation output)
#
# Run this before integrating into the backend.
# Expected runtime: ~10-15 seconds per image on i5 CPU
# ============================================================
import pyttsx3
import time
import json
import requests
import numpy as np
from pathlib import Path
from PIL import Image
from io import BytesIO

MODELS_DIR = Path("ml/models")


# ============================================================
# 1. Danger Detector (YOLOv8)
# ============================================================
class DangerDetector:
    DANGER_WEIGHTS = {
        "car": 0.95, "motorcycle": 0.9, "bus": 0.88,
        "truck": 0.85, "stairs": 0.85, "escalator": 0.80,
        "bicycle": 0.75, "curb": 0.70, "traffic light": 0.65,
        "stop sign": 0.60, "fire hydrant": 0.55,
        "dog": 0.55, "door": 0.50, "person": 0.40,
    }

    # --- Update your __init__ in DangerDetector ---
    def __init__(self):
        from ultralytics import YOLO
        from pathlib import Path
        
        # Use your absolute path here
        custom_path = Path(r"D:\Blind_Help\ml\models\yolo_weights\best.pt")
        
        if custom_path.exists():
            self.model = YOLO(str(custom_path))
            self.using_custom = True
        else:
            self.model = YOLO("yolov8n.pt")
            self.using_custom = False
            
        print(f"  YOLOv8: {'custom fine-tuned' if self.using_custom else 'pretrained COCO fallback'}")

    def detect(self, image: Image.Image) -> list:
        import numpy as np
        frame = np.array(image)
        results = self.model(frame, conf=0.35, iou=0.45, verbose=False)[0]

        detections = []
        h, w = frame.shape[:2]

        for box in results.boxes:
            cls_name = self.model.names[int(box.cls)].lower()
            conf = float(box.conf)
            x1, y1, x2, y2 = box.xyxy[0].tolist()

            # Spatial position
            cx = (x1 + x2) / 2 / w
            size = (y2 - y1) / h
            position = "left" if cx < 0.33 else ("right" if cx > 0.66 else "ahead")
            distance = "close" if size > 0.30 else ("medium" if size > 0.10 else "far")

            danger_weight = self.DANGER_WEIGHTS.get(cls_name, 0.3)
            detections.append({
                "class": cls_name,
                "confidence": round(conf, 2),
                "position": position,
                "distance": distance,
                "danger_weight": danger_weight,
            })

        return sorted(detections, key=lambda x: x["danger_weight"], reverse=True)


# ============================================================
# 2. Scene Captioner (BLIP-base — CPU friendly)
# ============================================================
class SceneCaptioner:
    # blip-base is ~900MB and runs in ~3s on CPU
    # blip2-opt-2.7b is ~5GB and runs in ~15s on CPU
    MODEL_ID = "Salesforce/blip-image-captioning-base"

    def __init__(self):
        from transformers import BlipProcessor, BlipForConditionalGeneration
        import torch

        print(f"  BLIP: loading {self.MODEL_ID}...")
        self.processor = BlipProcessor.from_pretrained(self.MODEL_ID)
        self.model = BlipForConditionalGeneration.from_pretrained(
            self.MODEL_ID,
            torch_dtype=torch.float32,   # float32 on CPU (float16 only for GPU)
        )
        self.model.eval()
        self.device = "cpu"

    def caption(self, image: Image.Image, prompt: str = None) -> str:
        import torch
        inputs = self.processor(
            image,
            text=prompt,
            return_tensors="pt"
        ).to(self.device)

        with torch.no_grad():
            out = self.model.generate(
                **inputs,
                max_new_tokens=60,
                num_beams=3,
                early_stopping=True,
            )
        return self.processor.decode(out[0], skip_special_tokens=True)


# ============================================================
# 3. Fusion Engine
# ============================================================
class FusionEngine:
    DANGER_THRESHOLD = 0.75
    REPEAT_SUPPRESS_SEC = 3.0

    DIST_MAP = {
        "close":  "about 1 meter",
        "medium": "about 3 meters",
        "far":    "ahead"
    }

    def __init__(self):
        self._last_spoken = {}

    def fuse(self, caption: str, detections: list) -> dict:
        critical = [d for d in detections if d["danger_weight"] >= self.DANGER_THRESHOLD]

        if critical:
            text = self._danger_utterance(critical)
            priority = "CRITICAL"
        elif detections:
            text = self._scene_with_objects(caption, detections[:2])
            priority = "INFO"
        else:
            text = f"For navigation: {caption}"
            priority = "AMBIENT"

        # Suppress repeats
        key = hash(text[:40])
        now = time.time()
        suppressed = (
            key in self._last_spoken and
            (now - self._last_spoken[key]) < self.REPEAT_SUPPRESS_SEC
        )
        if not suppressed:
            self._last_spoken[key] = now

        return {
            "speak": not suppressed,
            "text": text,
            "priority": priority,
            "detections": detections,
            "caption": caption,
        }

    def _danger_utterance(self, dangers: list) -> str:
        top = dangers[0]
        dist = self.DIST_MAP[top["distance"]]
        return f"Warning: {top['class']} {dist} to your {top['position']}."

    def _scene_with_objects(self, caption: str, detections: list) -> str:
        objs = " and ".join(
            f"{d['class']} to your {d['position']}" for d in detections
        )
        return f"{caption}. Also: {objs}."


# ============================================================
# 4. Full Pipeline Test
# ============================================================
def run_test(image_source=None):
    print("\n" + "=" * 55)
    print("  Blind Assist — Full Pipeline Test")
    print("=" * 55)

    # Load test image
    if image_source and Path(image_source).exists():
        print(f"\n[IMAGE] Loading from: {image_source}")
        image = Image.open(image_source).convert("RGB")
    else:
        print("\n[IMAGE] Downloading test street scene...")
        try:
            resp = requests.get("https://ultralytics.com/images/bus.jpg", timeout=10)
            image = Image.open(BytesIO(resp.content)).convert("RGB")
            print(f"  Loaded: {image.size}")
        except Exception as e:
            print(f"  Could not download: {e}")
            print("  Using synthetic test image")
            image = Image.fromarray(
                np.random.randint(80, 180, (480, 640, 3), dtype=np.uint8)
            )

    print(f"  Image size: {image.width}×{image.height}")

    # --- Load models ---
    print("\n[LOADING MODELS]")
    t0 = time.time()
    detector = DangerDetector()
    captioner = SceneCaptioner()
    fusion = FusionEngine()
    load_time = time.time() - t0
    print(f"  Models loaded in {load_time:.1f}s (one-time cost)")

    # --- Run detection ---
    print("\n[STEP 1] Running danger detection (YOLOv8)...")
    t0 = time.time()
    detections = detector.detect(image)
    det_time = time.time() - t0
    print(f"  Time: {det_time*1000:.0f}ms")
    print(f"  Found {len(detections)} objects:")
    for d in detections:
        bar = "█" * int(d["danger_weight"] * 10)
        print(f"    {d['class']:15s} {bar:10s} {d['position']:6s} ({d['distance']})  "
              f"danger={d['danger_weight']:.2f}  conf={d['confidence']:.2f}")

    # --- Run captioning ---
    print("\n[STEP 2] Running scene captioning (BLIP-base)...")
    t0 = time.time()
    caption = captioner.caption(image)
    cap_time = time.time() - t0
    print(f"  Time: {cap_time*1000:.0f}ms")
    print(f"  Caption: {caption}")

    # Also test spatial Q&A
    print("\n[STEP 2b] Spatial question answering...")
    t0 = time.time()
    spatial_q = "What obstacles are in the path ahead?"
    spatial_a = captioner.caption(image, prompt=spatial_q)
    qa_time = time.time() - t0
    print(f"  Q: {spatial_q}")
    print(f"  A: {spatial_a}  ({qa_time*1000:.0f}ms)")

    # --- Fusion ---
    print("\n[STEP 3] Fusion engine...")
    result = fusion.fuse(caption, detections)
    print(f"  Priority: {result['priority']}")
    print(f"  Will speak: {result['speak']}")
    print(f"  Output text: \"{result['text']}\"")

    # --- Summary ---
    total = det_time + cap_time
    print("\n" + "=" * 55)
    print("  LATENCY SUMMARY (CPU)")
    print(f"  YOLO detection:   {det_time*1000:>6.0f}ms")
    print(f"  BLIP captioning:  {cap_time*1000:>6.0f}ms")
    print(f"  Fusion:           {'<1':>6}ms")
    print(f"  Total (no TTS):   {total*1000:>6.0f}ms")
    print()
    print("  On CPU this is too slow for real-time (~3-5s).")
    print("  On T4 GPU: ~200ms total. Deploy backend on GPU.")
    print()
    print("  Next steps:")
    print("  1. Upload colab_finetune_blip2.ipynb to Google Colab")
    print("  2. Run 04_train_yolo_local.py --demo to test YOLO")
    print("  3. Start Phase 2: backend/app/services/vision/")
    print("=" * 55)

    return result




# ... (all your previous class definitions for DangerDetector, etc.)

if __name__ == "__main__":
    import argparse
    import pyttsx3  # Import it here
    
    parser = argparse.ArgumentParser()
    parser.add_argument("--image", help="Path to a test image (optional)")
    args = parser.parse_args()

    # 1. Run the vision and fusion logic
    result = run_test(args.image)

    # 2. Handle the Voice Output
    if result['speak']:
        print(f"\n[VOICE] {result['text']}")
        
        # Initialize the engine locally for the test
        engine = pyttsx3.init()
        
        # Optional: Adjust speed (200 is default, 150 is better for clarity)
        engine.setProperty('rate', 170) 
        
        engine.say(result['text'])
        engine.runAndWait()


  