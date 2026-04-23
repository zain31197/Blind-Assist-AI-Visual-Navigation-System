# ============================================================
# ml/03_preprocess_datasets.py
# Converts raw downloads into training-ready formats
#
# What this does:
#   1. COCO → BLIP-2 fine-tuning format (image + caption pairs)
#   2. Open Images → YOLOv8 format (images + label .txt files)
#   3. VQA → spatial-only subset for BLIP prompt tuning
#   4. Generates class_mapping.yaml for YOLO training
#
# Expected runtime on CPU: ~15-30 minutes
# ============================================================

import json
import shutil
import random
from pathlib import Path
from PIL import Image
from tqdm import tqdm

DATA_DIR = Path("ml/data")
PROCESSED_DIR = Path("ml/data/processed")
PROCESSED_DIR.mkdir(parents=True, exist_ok=True)

# ============================================================
# 1. Preprocess COCO → BLIP Caption Pairs
# ============================================================
def preprocess_coco_for_blip():
    """
    Converts COCO annotations into (image_path, caption) CSV
    for BLIP-2 fine-tuning.
    
    Also rewrites captions with navigation-focused prompt prefix.
    """
    print("\n[1/3] Preprocessing COCO for BLIP-2 fine-tuning...")

    coco_dir = DATA_DIR / "coco"
    ann_file = coco_dir / "annotations" / "captions_val2017.json"
    img_dir = coco_dir / "val2017"
    
    if not ann_file.exists():
        print("  [SKIP] COCO annotations not found. Run 02_download_datasets.py first.")
        return

    out_dir = PROCESSED_DIR / "blip_training"
    out_dir.mkdir(exist_ok=True)
    imgs_out = out_dir / "images"
    imgs_out.mkdir(exist_ok=True)

    with open(ann_file) as f:
        coco_data = json.load(f)

    # Build image_id → filename map
    id_to_file = {img["id"]: img["file_name"] for img in coco_data["images"]}

    # Build image_id → first caption
    id_to_caption = {}
    for ann in coco_data["annotations"]:
        iid = ann["image_id"]
        if iid not in id_to_caption:
            id_to_caption[iid] = ann["caption"]

    # Filter: prefer outdoor / street scenes by keyword
    OUTDOOR_KEYWORDS = [
        "street", "road", "sidewalk", "outdoor", "outside",
        "park", "building", "person walking", "traffic",
        "crosswalk", "bus", "car", "bicycle"
    ]

    records = []
    for iid, caption in id_to_caption.items():
        filename = id_to_file.get(iid)
        if not filename:
            continue
        src = img_dir / filename
        if not src.exists():
            continue

        # Check if outdoor
        is_outdoor = any(kw in caption.lower() for kw in OUTDOOR_KEYWORDS)
        weight = 2 if is_outdoor else 1  # oversample outdoor scenes

        # Rewrite caption as navigation instruction
        nav_caption = _to_navigation_caption(caption)

        for _ in range(weight):
            records.append({
                "image_path": str(src),
                "caption": nav_caption,
                "original_caption": caption,
                "is_outdoor": is_outdoor,
            })

    # Shuffle and split
    random.seed(42)
    random.shuffle(records)
    split = int(len(records) * 0.9)
    train_records = records[:split]
    val_records = records[split:]

    # Save as JSONL (HuggingFace Trainer format)
    def save_jsonl(recs, path):
        with open(path, "w") as f:
            for r in recs:
                f.write(json.dumps(r) + "\n")

    save_jsonl(train_records, out_dir / "train.jsonl")
    save_jsonl(val_records, out_dir / "val.jsonl")

    print(f"  Train: {len(train_records)} samples")
    print(f"  Val:   {len(val_records)} samples")
    print(f"  Outdoor ratio: {sum(r['is_outdoor'] for r in records)}/{len(records)}")
    print(f"  [DONE] Saved to {out_dir}")


def _to_navigation_caption(caption: str) -> str:
    """
    Wraps raw COCO captions in a navigation-focused format.
    
    BLIP-2 will learn that its job is to describe scenes
    for safe navigation, not artistic description.
    """
    caption = caption.strip().rstrip(".")
    
    # Strip generic COCO phrasing
    for filler in ["a photo of", "an image of", "a picture of"]:
        if caption.lower().startswith(filler):
            caption = caption[len(filler):].strip()

    return f"For navigation: {caption}."


# ============================================================
# 2. Preprocess Open Images → YOLO format
# ============================================================

# Map Open Images class names → our danger class IDs
OI_TO_DANGER = {
    "Person":        0,
    "Car":           1,
    "Bicycle":       2,
    "Motorcycle":    3,
    "Bus":           4,
    "Truck":         5,
    "Traffic light": 6,
    "Stop sign":     7,
    "Fire hydrant":  8,
    "Dog":           9,
    "Stairs":        10,
    "Door":          11,
}

YOLO_CLASS_NAMES = list(OI_TO_DANGER.keys())


def preprocess_open_images_for_yolo():
    """
    Converts Open Images FiftyOne export to YOLOv8 training format.
    
    YOLOv8 expects:
      images/
        train/  *.jpg
        val/    *.jpg
      labels/
        train/  *.txt   (one line per box: class cx cy w h normalized)
        val/    *.txt
    """
    print("\n[2/3] Preprocessing Open Images for YOLOv8...")

    oi_yolo_src = DATA_DIR / "open_images" / "train"
    if not oi_yolo_src.exists():
        print("  [SKIP] Open Images not found. Run 02_download_datasets.py first.")
        _create_yolo_yaml()
        return

    out_dir = PROCESSED_DIR / "yolo_danger"
    for split in ["train", "val"]:
        (out_dir / "images" / split).mkdir(parents=True, exist_ok=True)
        (out_dir / "labels" / split).mkdir(parents=True, exist_ok=True)

    # Collect all images
    all_images = list(oi_yolo_src.glob("**/*.jpg")) + \
                 list(oi_yolo_src.glob("**/*.jpeg")) + \
                 list(oi_yolo_src.glob("**/*.png"))
    
    random.seed(42)
    random.shuffle(all_images)
    split_idx = int(len(all_images) * 0.85)
    splits = {
        "train": all_images[:split_idx],
        "val": all_images[split_idx:]
    }

    total = 0
    for split_name, images in splits.items():
        print(f"  Processing {split_name}: {len(images)} images...")
        for img_path in tqdm(images, desc=f"  {split_name}"):
            label_path = img_path.with_suffix(".txt")
            if not label_path.exists():
                # Check in adjacent labels dir
                label_path = img_path.parent.parent / "labels" / (img_path.stem + ".txt")
            
            if not label_path.exists():
                continue  # skip images without labels

            # Copy image
            dst_img = out_dir / "images" / split_name / img_path.name
            shutil.copy2(img_path, dst_img)

            # Copy/convert label
            dst_lbl = out_dir / "labels" / split_name / (img_path.stem + ".txt")
            shutil.copy2(label_path, dst_lbl)
            total += 1

    print(f"  Processed {total} labeled images")
    _create_yolo_yaml(out_dir)
    print(f"  [DONE] Saved to {out_dir}")


def _create_yolo_yaml(out_dir: Path = None):
    """Creates the dataset.yaml config that YOLOv8 needs."""
    if out_dir is None:
        out_dir = PROCESSED_DIR / "yolo_danger"
    
    yaml_content = f"""# Blind Assist — Danger Detection Dataset
# Generated by 03_preprocess_datasets.py

path: {out_dir.resolve()}
train: images/train
val: images/val

nc: {len(YOLO_CLASS_NAMES)}
names: {YOLO_CLASS_NAMES}
"""
    yaml_path = out_dir / "dataset.yaml"
    yaml_path.parent.mkdir(parents=True, exist_ok=True)
    yaml_path.write_text(yaml_content)
    print(f"  Created YOLO config: {yaml_path}")


# ============================================================
# 3. Preprocess VQA → Spatial Q&A subset
# ============================================================

SPATIAL_KEYWORDS = [
    "where", "left", "right", "front", "behind", "near",
    "far", "next to", "between", "above", "below", "how far",
    "how many", "is there", "what is on", "what is in front"
]

def preprocess_vqa_spatial():
    """
    Filters VQA v2 to spatial questions only.
    Converts Q&A pairs into natural language navigation instructions.
    
    Example:
      Q: "What is to the left of the car?"
      A: "fire hydrant"
      → Output: "To the left of the car, there is a fire hydrant."
    """
    print("\n[3/3] Preprocessing VQA (spatial questions only)...")

    vqa_dir = DATA_DIR / "vqa"
    q_files = list(vqa_dir.glob("*Questions*.json"))
    a_files = list(vqa_dir.glob("*Annotations*.json"))

    if not q_files or not a_files:
        print("  [SKIP] VQA files not found. Run 02_download_datasets.py first.")
        return

    with open(q_files[0]) as f:
        questions = {q["question_id"]: q for q in json.load(f)["questions"]}
    with open(a_files[0]) as f:
        annotations = json.load(f)["annotations"]

    out_dir = PROCESSED_DIR / "vqa_spatial"
    out_dir.mkdir(exist_ok=True)

    spatial_pairs = []
    for ann in tqdm(annotations, desc="  Filtering spatial Q&A"):
        qid = ann["question_id"]
        question = questions.get(qid, {}).get("question", "").lower()
        
        # Only keep spatial questions
        if not any(kw in question for kw in SPATIAL_KEYWORDS):
            continue

        # Get majority answer
        answer_counts = {}
        for a in ann["answers"]:
            ans = a["answer"]
            answer_counts[ans] = answer_counts.get(ans, 0) + 1
        if not answer_counts:
            continue
        best_answer = max(answer_counts, key=answer_counts.get)

        # Convert to natural language
        nl_description = _qa_to_natural(question, best_answer)
        
        spatial_pairs.append({
            "question_id": qid,
            "image_id": ann["image_id"],
            "question": question,
            "answer": best_answer,
            "navigation_text": nl_description,
        })

    # Save
    out_path = out_dir / "spatial_vqa.jsonl"
    with open(out_path, "w") as f:
        for pair in spatial_pairs:
            f.write(json.dumps(pair) + "\n")

    print(f"  Kept {len(spatial_pairs)} spatial Q&A pairs from {len(annotations)} total")
    print(f"  [DONE] Saved to {out_path}")


def _qa_to_natural(question: str, answer: str) -> str:
    """Converts Q/A pair to navigation-style natural language."""
    question = question.rstrip("?").strip()
    
    # Simple template-based conversion
    if question.startswith("what is"):
        subject = question[len("what is"):].strip()
        return f"There is {answer} {subject}."
    elif question.startswith("is there"):
        subject = question[len("is there"):].strip()
        return f"{'Yes, there is' if answer == 'yes' else 'No'} {subject}."
    elif question.startswith("how many"):
        subject = question[len("how many"):].strip()
        return f"There {'is' if answer == '1' else 'are'} {answer} {subject}."
    else:
        return f"{question.capitalize()}: {answer}."


# ============================================================
# MAIN
# ============================================================
if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser()
    parser.add_argument("--coco-only", action="store_true")
    parser.add_argument("--yolo-only", action="store_true")
    parser.add_argument("--vqa-only", action="store_true")
    args = parser.parse_args()

    print("=" * 55)
    print("  Blind Assist — Dataset Preprocessing")
    print(f"  Output: {PROCESSED_DIR.resolve()}")
    print("=" * 55)

    if args.coco_only:
        preprocess_coco_for_blip()
    elif args.yolo_only:
        preprocess_open_images_for_yolo()
    elif args.vqa_only:
        preprocess_vqa_spatial()
    else:
        preprocess_coco_for_blip()
        preprocess_open_images_for_yolo()
        preprocess_vqa_spatial()

    print("\n" + "=" * 55)
    print("  Preprocessing complete!")
    print("\n  Next: python ml/04_train_yolo_local.py")
    print("  Then: Upload ml/colab_finetune_blip2.ipynb to Google Colab")
    print("=" * 55)
