#!/bin/bash
# ============================================================
# Blind Assist — ML Environment Setup (CPU-Only Machine)
# Run this once to set everything up
# ============================================================

echo "======================================"
echo "  Blind Assist ML Setup (CPU Mode)"
echo "======================================"

# Step 1: Create Python virtual environment
echo ""
echo "[1/6] Creating virtual environment..."
python3 -m venv blind-assist-ml
source blind-assist-ml/bin/activate

# Step 2: Upgrade pip
echo "[2/6] Upgrading pip..."
pip install --upgrade pip

# Step 3: Install PyTorch (CPU-only build — much smaller download)
echo "[3/6] Installing PyTorch (CPU)..."
pip install torch torchvision torchaudio --index-url https://download.pytorch.org/whl/cpu

# Step 4: Install ML libraries
echo "[4/6] Installing ML libraries..."
pip install \
    ultralytics==8.2.0 \
    transformers==4.40.0 \
    datasets==2.19.0 \
    Pillow==10.3.0 \
    opencv-python==4.9.0.80 \
    numpy==1.26.4 \
    scipy==1.13.0 \
    matplotlib==3.8.4 \
    tqdm==4.66.2 \
    pyyaml==6.0.1 \
    requests==2.31.0

# Step 5: Install dataset tools
echo "[5/6] Installing dataset tools..."
pip install \
    fiftyone==0.24.0 \
    pycocotools==2.0.7 \
    huggingface_hub==0.23.0 \
    kaggle==1.6.14

# Step 6: Install Colab helper (for pushing training jobs)
echo "[6/6] Installing Jupyter for local notebooks..."
pip install jupyter notebook ipywidgets

echo ""
echo "======================================"
echo "  Setup Complete!"
echo ""
echo "  Activate your env anytime with:"
echo "  source blind-assist-ml/bin/activate"
echo ""
echo "  Next step: run python ml/01_verify_setup.py"
echo "======================================"
