# # ============================================================
# # ml/02_download_datasets.py
# # Downloads all datasets needed for Blind Assist training
# #
# # ADJUSTED FOR CPU/LOW-RESOURCE MACHINE:
# #   - COCO: 5K validation subset (not 118K train) for local testing
# #   - Open Images: 10K danger-class subset (not 9M full)
# #   - Full datasets are downloaded on Colab for actual fine-tuning
# #
# # Disk space needed: ~8GB total
# # ============================================================

# import os
# import json
# import requests
# import zipfile
# import tarfile
# from pathlib import Path
# from tqdm import tqdm

# # ---- Config ------------------------------------------------
# DATA_DIR = Path("ml/data")
# DATA_DIR.mkdir(parents=True, exist_ok=True)

# DANGER_CLASSES = [
#     "Person", "Car", "Bicycle", "Motorcycle",
#     "Stairs", "Door", "Traffic light", "Stop sign",
#     "Fire hydrant", "Bus", "Truck", "Dog"
# ]

# # ---- Helpers -----------------------------------------------
# def download_file(url: str, dest: Path, desc: str):
#     """Download with progress bar."""
#     if dest.exists():
#         print(f"  [SKIP] {desc} already downloaded")
#         return
    
#     print(f"  [DL] Downloading {desc}...")
#     response = requests.get(url, stream=True, timeout=60)
#     total = int(response.headers.get("content-length", 0))
    
#     with open(dest, "wb") as f, tqdm(
#         total=total, unit="B", unit_scale=True, desc=desc[:40]
#     ) as bar:
#         for chunk in response.iter_content(chunk_size=8192):
#             f.write(chunk)
#             bar.update(len(chunk))
#     print(f"  [OK] {desc}")

# def extract_zip(src: Path, dest: Path):
#     print(f"  [EXTRACT] {src.name}...")
#     with zipfile.ZipFile(src, "r") as z:
#         z.extractall(dest)

# def extract_tar(src: Path, dest: Path):
#     print(f"  [EXTRACT] {src.name}...")
#     with tarfile.open(src, "r:gz") as t:
#         t.extractall(dest)


# # # ============================================================
# # # DATASET 1 — COCO Validation 2017
# # # (5K images — enough for local dev/testing)
# # # For full training, use train2017 (18GB) on Colab
# # # ============================================================
# # def download_coco_val():
# #     print("\n[DATASET 1/4] COCO Captions (val2017 subset — 5K images)")
# #     coco_dir = DATA_DIR / "coco"
# #     coco_dir.mkdir(exist_ok=True)

# #     # Images
# #     img_zip = coco_dir / "val2017.zip"
# #     download_file(
# #         "http://images.cocodataset.org/zips/val2017.zip",
# #         img_zip,
# #         "COCO val2017 images (~800MB)"
# #     )
# #     if img_zip.exists() and not (coco_dir / "val2017").exists():
# #         extract_zip(img_zip, coco_dir)

# #     # Annotations
# #     ann_zip = coco_dir / "annotations.zip"
# #     download_file(
# #         "http://images.cocodataset.org/annotations/annotations_trainval2017.zip",
# #         ann_zip,
# #         "COCO annotations (~241MB)"
# #     )
# #     if ann_zip.exists() and not (coco_dir / "annotations").exists():
# #         extract_zip(ann_zip, coco_dir)

# #     print(f"  [DONE] COCO saved to {coco_dir}")
# #     return coco_dir


# # ============================================================
# # DATASET 2 — Open Images v7 (danger classes only, via FiftyOne)
# # Downloads ~10K images matching our danger classes
# # ============================================================
# def download_open_images():
#     print("\n[DATASET 2/4] Open Images v7 — Danger Classes")
#     oi_dir = DATA_DIR / "open_images"
#     oi_dir.mkdir(exist_ok=True)
    
#     manifest_path = oi_dir / "download_manifest.txt"
#     if manifest_path.exists():
#         print("  [SKIP] Open Images already downloaded")
#         return oi_dir

#     try:
#         import fiftyone as fo
#         import fiftyone.zoo as foz

#         print(f"  Downloading for classes: {DANGER_CLASSES}")
#         print("  This may take 20-40 minutes (~5GB for 10K images)")
        
#         dataset = foz.load_zoo_dataset(
#             "open-images-v7",
#             split="train",
#             classes=DANGER_CLASSES,
#             max_samples=10000,           # limit for local machine
#             dataset_dir=str(oi_dir),
#             label_types=["detections"],  # bounding boxes only
#         )
        
#         # Export to YOLO format (needed for YOLOv8 training)
#         export_dir = oi_dir / "yolo_format"
#         export_dir.mkdir(exist_ok=True)
#         dataset.export(
#             export_dir=str(export_dir),
#             dataset_type=fo.types.YOLOv5Dataset,
#         )

#         # Save manifest
#         manifest_path.write_text(
#             f"Downloaded {len(dataset)} images\nClasses: {DANGER_CLASSES}"
#         )
#         print(f"  [DONE] {len(dataset)} images saved to {oi_dir}")
        
#     except Exception as e:
#         print(f"  [WARN] FiftyOne download failed: {e}")
#         print("  Alternative: use the Kaggle download below instead")
#         _download_open_images_kaggle(oi_dir)
    
#     return oi_dir


# def _download_open_images_kaggle(dest: Path):
#     """Fallback: smaller OI subset from Kaggle."""
#     print("  [FALLBACK] Downloading Open Images subset from Kaggle...")
#     print("  Make sure you have your kaggle.json API key in ~/.kaggle/")
#     os.system(
#         f"kaggle datasets download -d "
#         f"andrewmvd/open-images-v6 -p {dest} --unzip"
#     )


# # # ============================================================
# # # DATASET 3 — VQA v2 (annotations only — images reuse COCO)
# # # ============================================================
# # def download_vqa():
# #     print("\n[DATASET 3/4] VQA v2 — Spatial Questions")
# #     vqa_dir = DATA_DIR / "vqa"
# #     vqa_dir.mkdir(exist_ok=True)

# #     base = "https://s3.amazonaws.com/cvmlp/vqa/mscoco/vqa"

# #     files = {
# #         "v2_Questions_Val_mscoco.zip": f"{base}/v2_Questions_Val_mscoco.zip",
# #         "v2_Annotations_Val_mscoco.zip": f"{base}/v2_Annotations_Val_mscoco.zip",
# #     }

# #     for filename, url in files.items():
# #         dest = vqa_dir / filename
# #         download_file(url, dest, filename)
# #         if dest.exists() and not (vqa_dir / filename.replace(".zip", "")).exists():
# #             try:
# #                 extract_zip(dest, vqa_dir)
# #             except Exception as e:
# #                 print(f"  [WARN] Could not extract {filename}: {e}")

# #     print(f"  [DONE] VQA saved to {vqa_dir}")
# #     return vqa_dir


# # # ============================================================
# # # DATASET 4 — Ego4D (Registration Required)
# # # This cannot be auto-downloaded — requires account approval
# # # ============================================================
# # def ego4d_instructions():
# #     print("\n[DATASET 4/4] Ego4D — First-Person Video Dataset")
# #     print("  ⚠️  Ego4D requires manual registration (free for research)")
# #     print()
# #     print("  Steps to get access:")
# #     print("  1. Go to: https://ego4d-data.org/")
# #     print("  2. Click 'Request Access'")
# #     print("  3. Fill in the form (takes ~1-2 days for approval)")
# #     print("  4. Once approved, run:")
# #     print("     pip install ego4d")
# #     print("     ego4d --output_directory ml/data/ego4d --datasets full_scale")
# #     print()
# #     print("  NOTE: Ego4D is 7TB total. For training we only need")
# #     print("  frame-extracted subsets (~50GB). Instructions in")
# #     print("  ml/03_preprocess_datasets.py will handle this.")
# #     print()
# #     print("  For now, skip Ego4D and proceed with COCO + Open Images.")
# #     print("  You can add Ego4D later for fine-tuning quality improvement.")
    
# #     ego_dir = DATA_DIR / "ego4d"
# #     ego_dir.mkdir(exist_ok=True)
# #     instructions = ego_dir / "README.txt"
# #     instructions.write_text(
# #         "Ego4D requires registration at https://ego4d-data.org/\n"
# #         "See ml/02_download_datasets.py for full instructions.\n"
# #     )


# # ============================================================
# # MAIN
# # ============================================================
# if __name__ == "__main__":
#     import argparse

#     parser = argparse.ArgumentParser(description="Download Blind Assist datasets")
#     parser.add_argument("--skip-coco", action="store_true", help="Skip COCO download")
#     parser.add_argument("--skip-oi", action="store_true", help="Skip Open Images")
#     parser.add_argument("--skip-vqa", action="store_true", help="Skip VQA")
#     parser.add_argument("--coco-only", action="store_true", help="Download COCO only (fastest)")
#     args = parser.parse_args()

#     print("=" * 55)
#     print("  Blind Assist Dataset Downloader")
#     print(f"  Saving to: {DATA_DIR.resolve()}")
#     print("=" * 55)

#     # if args.coco_only:
#     #     download_coco_val()
#     # else:
#     #     if not args.skip_coco:
#     #         download_coco_val()
#     #     if not args.skip_oi:
#     #         download_open_images()
#     #     if not args.skip_vqa:
#     #         download_vqa()
#     #     ego4d_instructions()

#     print("\n" + "=" * 55)
#     print("  Download Complete!")
#     print(f"  Data location: {DATA_DIR.resolve()}")
#     print("\n  Next: python ml/03_preprocess_datasets.py")
#     print("=" * 55)









# ============================================================
# Blind Assist — YOLO Dataset Downloader (FIXED VERSION)
# Downloads ONLY Open Images (YOLO dataset)
# ============================================================

import os
from pathlib import Path

DATA_DIR = Path("ml/data")
YOLO_DIR = DATA_DIR / "open_images"
YOLO_DIR.mkdir(parents=True, exist_ok=True)

DANGER_CLASSES = [
    "Person", "Car", "Bicycle", "Motorcycle",
    "Stairs", "Door", "Traffic light", "Stop sign",
    "Fire hydrant", "Bus", "Truck", "Dog"
]

def download_yolo_dataset():
    print("=" * 60)
    print("  YOLO (Open Images) Dataset Downloader")
    print("=" * 60)

    try:
        import fiftyone as fo
        import fiftyone.zoo as foz

        print("\n[YOLO] Downloading via FiftyOne...")

        dataset = foz.load_zoo_dataset(
            "open-images-v7",
            split="train",
            classes=DANGER_CLASSES,
            max_samples=10000,
            dataset_dir=str(YOLO_DIR),
            label_types=["detections"],
        )

        export_dir = YOLO_DIR / "yolo_format"
        export_dir.mkdir(exist_ok=True)

        dataset.export(
            export_dir=str(export_dir),
            dataset_type=fo.types.YOLOv5Dataset,
        )

        print(f"\n[DONE] YOLO dataset saved to: {YOLO_DIR}")
        print(f"Samples downloaded: {len(dataset)}")

    except Exception as e:
        print("\n[WARN] FiftyOne failed:", e)
        print("[FALLBACK] Using Kaggle...")

        os.system(
            f"kaggle datasets download -d "
            f"andrewmvd/open-images-v6 -p {YOLO_DIR} --unzip"
        )

        print(f"\n[DONE] Kaggle YOLO dataset saved to: {YOLO_DIR}")


if __name__ == "__main__":
    download_yolo_dataset()