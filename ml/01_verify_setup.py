# ============================================================
# ml/01_verify_setup.py
# Run after setup_env.sh to confirm everything works
# Expected runtime: ~2 minutes (downloads small test files)
# ============================================================

import sys
print("=" * 50)
print("  Blind Assist — Environment Verification")
print("=" * 50)

errors = []

# --- 1. Python version check ---
print("\n[1/6] Python version...", end=" ")
major, minor = sys.version_info[:2]
if major == 3 and minor >= 10:
    print(f"OK (Python {major}.{minor})")
else:
    print(f"WARN — Python {major}.{minor} detected, recommend 3.10+")

# --- 2. PyTorch ---
print("[2/6] PyTorch...", end=" ")
try:
    import torch
    print(f"OK (v{torch.__version__}, CUDA={torch.cuda.is_available()})")
    print(f"        Device: {'GPU' if torch.cuda.is_available() else 'CPU — using CPU mode'}")
except ImportError as e:
    print(f"FAIL — {e}")
    errors.append("torch")

# --- 3. Transformers (for BLIP) ---
print("[3/6] HuggingFace Transformers...", end=" ")
try:
    import transformers
    print(f"OK (v{transformers.__version__})")
except ImportError:
    print("FAIL")
    errors.append("transformers")

# --- 4. Ultralytics (YOLOv8) ---
print("[4/6] Ultralytics (YOLOv8)...", end=" ")
try:
    import ultralytics
    print(f"OK (v{ultralytics.__version__})")
except ImportError:
    print("FAIL")
    errors.append("ultralytics")

# --- 5. OpenCV ---
print("[5/6] OpenCV...", end=" ")
try:
    import cv2
    print(f"OK (v{cv2.__version__})")
except ImportError:
    print("FAIL")
    errors.append("opencv-python")

# --- 6. Quick YOLO smoke test ---
print("[6/6] YOLOv8 nano smoke test (downloads ~6MB)...", end=" ")
try:
    from ultralytics import YOLO
    import numpy as np
    from PIL import Image

    # Create a dummy image (640x480 white image)
    dummy = Image.fromarray(np.zeros((480, 640, 3), dtype=np.uint8))
    
    # This downloads YOLOv8n weights on first run (~6MB)
    model = YOLO("yolov8n.pt")
    results = model(dummy, verbose=False)
    print("OK — YOLOv8n loaded and ran inference")
except Exception as e:
    print(f"FAIL — {e}")
    errors.append("yolo_smoke_test")

# --- Summary ---
print("\n" + "=" * 50)
if not errors:
    print("  All checks passed!")
    print("  Your CPU-only ML environment is ready.")
    print("\n  Next: run python ml/02_download_datasets.py")
else:
    print(f"  Issues found with: {', '.join(errors)}")
    print("  Fix by running: pip install " + " ".join(errors))
print("=" * 50)
