# ============================================================
# ml/04_train_yolo_local.py
# Fine-tunes YOLOv8 nano on danger detection classes
#
# WHY THIS RUNS LOCALLY ON YOUR CPU:
#   - YOLOv8 nano has only 3.2M parameters (tiny)
#   - Training on 10K images for 10 epochs: ~4-6 hours on CPU
#   - For faster training, use the Colab version instead
#
# WHAT THIS PRODUCES:
#   ml/models/blindassist_yolov8n.pt  ← your fine-tuned weights
# ============================================================

from ultralytics import YOLO
from pathlib import Path
import yaml
import torch

# ---- Config ------------------------------------------------
PROCESSED_DIR = Path("ml/data/processed")
MODELS_DIR = Path("ml/models")
MODELS_DIR.mkdir(parents=True, exist_ok=True)

DATASET_YAML = PROCESSED_DIR / "yolo_danger" / "dataset.yaml"
BASE_MODEL = "yolov8n.pt"        # nano — fastest, good for mobile/CPU
OUTPUT_NAME = "blindassist_yolov8n"

# Training hyperparameters — tuned for CPU and small danger dataset
TRAIN_CONFIG = {
    "epochs": 10,               # 10 epochs for first run; increase to 50 on GPU
    "imgsz": 640,               # standard YOLO input size
    "batch": 4,                 # small batch for 16GB RAM (use 16+ on GPU)
    "workers": 2,               # CPU workers for data loading
    "device": "cpu",            # force CPU (auto-detected but explicit is safer)
    "optimizer": "AdamW",       # better convergence than SGD on small datasets
    "lr0": 0.001,               # initial learning rate
    "lrf": 0.01,                # final lr factor (lr0 * lrf = final lr)
    "momentum": 0.937,
    "weight_decay": 0.0005,
    "warmup_epochs": 2,         # gradual warmup — important for small batches
    "hsv_h": 0.015,             # hue augmentation
    "hsv_s": 0.7,               # saturation augmentation
    "hsv_v": 0.4,               # value augmentation
    "flipud": 0.0,              # don't flip upside-down (real-world constraint)
    "fliplr": 0.5,              # horizontal flip is fine
    "mosaic": 0.5,              # mosaic augmentation (reduces to 0.5 for small data)
    "save_period": 5,           # save checkpoint every 5 epochs
    "patience": 5,              # early stopping if no improvement
    "project": str(MODELS_DIR / "runs"),
    "name": OUTPUT_NAME,
    "exist_ok": True,
    "verbose": True,
    "val": True,
}


# ---- Verify dataset exists ---------------------------------
def check_dataset():
    if not DATASET_YAML.exists():
        print(f"\n[ERROR] Dataset YAML not found: {DATASET_YAML}")
        print("  Run python ml/03_preprocess_datasets.py first")
        print("  Or run with --demo flag to use COCO pretrained as baseline")
        return False

    with open(DATASET_YAML) as f:
        cfg = yaml.safe_load(f)
    
    print(f"  Dataset: {DATASET_YAML}")
    print(f"  Classes ({cfg['nc']}): {cfg['names']}")
    
    # Count images
    data_path = Path(cfg["path"])
    train_imgs = list((data_path / "images" / "train").glob("*.jpg"))
    val_imgs = list((data_path / "images" / "val").glob("*.jpg"))
    print(f"  Train images: {len(train_imgs)}")
    print(f"  Val images:   {len(val_imgs)}")
    
    if len(train_imgs) == 0:
        print("  [WARN] No training images found!")
        return False
    
    return True


# ---- Demo mode: test with COCO baseline --------------------
def run_demo_inference():
    """
    Run YOLOv8n pretrained on COCO to test your setup
    before actual fine-tuning. This works immediately
    without any dataset download.
    """
    print("\n[DEMO MODE] Testing pretrained YOLOv8n on a sample image...")
    
    import numpy as np
    from PIL import Image, ImageDraw
    import requests
    from io import BytesIO

    # Download a test street scene
    test_url = "https://ultralytics.com/images/bus.jpg"
    try:
        resp = requests.get(test_url, timeout=10)
        img = Image.open(BytesIO(resp.content))
    except Exception:
        # Fallback: create synthetic test image
        img = Image.fromarray(
            np.random.randint(100, 200, (480, 640, 3), dtype=np.uint8)
        )
        print("  (Using synthetic image — no internet access)")

    model = YOLO(BASE_MODEL)
    results = model(img, conf=0.4, verbose=False)[0]

    print(f"\n  Detected {len(results.boxes)} objects:")
    for box in results.boxes:
        cls_name = model.names[int(box.cls)]
        conf = float(box.conf)
        x1, y1, x2, y2 = box.xyxy[0].tolist()
        w = img.width
        h = img.height
        
        # Position classification
        cx = (x1 + x2) / 2 / w
        size = (y2 - y1) / h
        pos = "left" if cx < 0.33 else ("right" if cx > 0.66 else "ahead")
        dist = "close" if size > 0.3 else ("medium" if size > 0.1 else "far")
        
        print(f"    {cls_name:15s} conf={conf:.2f}  |  {pos} ({dist})")

    # Save annotated result
    out_path = MODELS_DIR / "demo_result.jpg"
    results.save(filename=str(out_path))
    print(f"\n  Annotated image saved to: {out_path}")
    print("\n  This is how the pretrained model performs.")
    print("  Fine-tuning on danger classes will improve accuracy on")
    print("  stairs, curbs, and other blind-assist-specific hazards.")


# ---- Main training loop ------------------------------------
def train():
    print("=" * 55)
    print("  Blind Assist — YOLOv8 Danger Detection Training")
    print(f"  Device: {'CUDA' if torch.cuda.is_available() else 'CPU'}")
    print("=" * 55)
    
    dataset_ok = check_dataset()

    if not dataset_ok:
        print("\n[Falling back to demo mode]")
        run_demo_inference()
        return

    print(f"\n[TRAINING] Starting fine-tuning on danger classes...")
    print(f"  Base model: {BASE_MODEL}")
    print(f"  Epochs: {TRAIN_CONFIG['epochs']}")
    print(f"  Batch size: {TRAIN_CONFIG['batch']}")
    print()
    
    # Estimated time warning
    if not torch.cuda.is_available():
        print("  ⏱️  CPU Training time estimate:")
        print("     10 epochs × ~600 steps = ~5-6 hours on i5 10th gen")
        print("     Tip: reduce epochs to 3 for a quick validation run")
        print("     For full training, use: python ml/colab_upload.py")
        print()
        
        confirm = input("  Continue with CPU training? (y/n): ").strip().lower()
        if confirm != "y":
            print("  Upload to Colab instead:")
            print("  1. Open ml/colab_finetune_yolo.ipynb in Google Colab")
            print("  2. Upload your dataset ZIP from ml/data/processed/yolo_danger/")
            print("  3. Run all cells — free T4 GPU trains in ~20 minutes")
            return

    # Load pretrained YOLOv8n and fine-tune
    model = YOLO(BASE_MODEL)
    
    results = model.train(
        data=str(DATASET_YAML),
        **TRAIN_CONFIG
    )

    # Copy best weights to models dir
    best_weights = MODELS_DIR / "runs" / OUTPUT_NAME / "weights" / "best.pt"
    final_path = MODELS_DIR / "blindassist_yolov8n.pt"
    
    if best_weights.exists():
        import shutil
        shutil.copy2(best_weights, final_path)
        print(f"\n  Best weights saved to: {final_path}")
    
    # Print final metrics
    print("\n" + "=" * 55)
    print("  Training Complete!")
    print(f"  mAP50:    {results.results_dict.get('metrics/mAP50(B)', 'N/A'):.3f}")
    print(f"  mAP50-95: {results.results_dict.get('metrics/mAP50-95(B)', 'N/A'):.3f}")
    print(f"  Model:    {final_path}")
    print("\n  Next: python ml/05_test_pipeline.py")
    print("=" * 55)


# ---- Validate trained model --------------------------------
def validate(weights_path: str = None):
    """Run validation on the fine-tuned model."""
    weights = weights_path or str(MODELS_DIR / "blindassist_yolov8n.pt")
    if not Path(weights).exists():
        print(f"[ERROR] Weights not found: {weights}")
        return
    
    print(f"\n[VALIDATE] Loading {weights}...")
    model = YOLO(weights)
    metrics = model.val(data=str(DATASET_YAML), device="cpu", verbose=True)
    
    print("\n  Validation Results:")
    print(f"  mAP50:    {metrics.box.map50:.3f}")
    print(f"  mAP50-95: {metrics.box.map:.3f}")
    print(f"  Precision: {metrics.box.mp:.3f}")
    print(f"  Recall:    {metrics.box.mr:.3f}")


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--demo", action="store_true",
                        help="Run demo inference without training")
    parser.add_argument("--validate", metavar="WEIGHTS",
                        help="Validate a trained model")
    parser.add_argument("--epochs", type=int, default=10)
    args = parser.parse_args()

    if args.demo:
        run_demo_inference()
    elif args.validate:
        validate(args.validate)
    else:
        TRAIN_CONFIG["epochs"] = args.epochs
        train()
