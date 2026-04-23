import pandas as pd
from pathlib import Path
from tqdm import tqdm

# Maps Open Images freebase IDs and strings to our YOLO class IDs
OI_TO_DANGER = {
    "/m/01g317": 0, "Person": 0,
    "/m/0k4j": 1, "Car": 1,
    "/m/0199g": 2, "Bicycle": 2,
    "/m/04_sv": 3, "Motorcycle": 3,
    "/m/01bjv": 4, "Bus": 4,
    "/m/07r04": 5, "Truck": 5,
    "/m/015qff": 6, "Traffic light": 6,
    "/m/02pv19": 7, "Stop sign": 7,
    "/m/01pns0": 8, "Fire hydrant": 8,
    "/m/0bt9lr": 9, "Dog": 9,
    "/m/01lynh": 10, "Stairs": 10,
    "/m/02dgv": 11, "Door": 11,
}

# Paths based on your folder structure
csv_path = Path("ml/data/open_images/train/labels/detections.csv")
labels_dir = Path("ml/data/open_images/train/labels")
images_dir = Path("ml/data/open_images/train/images")

print("Reading the giant CSV file (this might take a few seconds)...")
df = pd.read_csv(csv_path)

print("Filtering for danger classes...")
df_filtered = df[df['LabelName'].isin(OI_TO_DANGER.keys())]
print(f"Found {len(df_filtered)} relevant bounding boxes.")

processed = 0
grouped = df_filtered.groupby('ImageID')

for image_id, group in tqdm(grouped, desc="Generating YOLO .txt files"):
    # Check if we actually downloaded the image for these labels
    if not (images_dir / f"{image_id}.jpg").exists() and not (images_dir / f"{image_id}.jpeg").exists():
        continue
        
    txt_path = labels_dir / f"{image_id}.txt"
    
    with open(txt_path, "w") as f:
        for _, row in group.iterrows():
            class_id = OI_TO_DANGER[row['LabelName']]
            
            # YOLO math (Convert min/max to center x/y and width/height)
            xmin, xmax = row['XMin'], row['XMax']
            ymin, ymax = row['YMin'], row['YMax']
            
            x_center = (xmin + xmax) / 2.0
            y_center = (ymin + ymax) / 2.0
            width = xmax - xmin
            height = ymax - ymin
            
            f.write(f"{class_id} {x_center:.6f} {y_center:.6f} {width:.6f} {height:.6f}\n")
            
    processed += 1

print(f"\n[DONE] Successfully generated {processed} YOLO label files!")