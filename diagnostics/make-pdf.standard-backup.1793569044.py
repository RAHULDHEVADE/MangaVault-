#!/usr/bin/env python3
"""
MangaVault - Seamless Chapter to PDF converter (Pure Pillow)
Stitches all pages vertically into one long continuous strip.
"""
import sys, os, re
from pathlib import Path
from PIL import Image

def natural_sort_key(filename):
    return [int(t) if t.isdigit() else t.lower() for t in re.split(r'(\d+)', filename)]

def make_pdf(image_dir, output_pdf):
    image_dir = Path(image_dir)
    output_pdf = Path(output_pdf)
    if not image_dir.exists():
        print(f"ERROR: Dir not found: {image_dir}"); return False

    exts = {'.jpg', '.jpeg', '.png', '.webp'}
    files = sorted([f for f in image_dir.iterdir() if f.suffix.lower() in exts], key=lambda f: natural_sort_key(f.name))

    if not files:
        print("ERROR: No images"); return False

    print(f"Found {len(files)} images. Stitching...")

    images = []
    total_h = 0
    max_w = 0
    
    # Load all images
    for f in files:
        try:
            img = Image.open(f)
            if img.mode != "RGB":
                img = img.convert("RGB")
            images.append(img)
            max_w = max(max_w, img.width)
            total_h += img.height
        except Exception as e:
            print(f"  Skipping {f.name}: {e}")

    if not images:
        print("ERROR: No valid images"); return False

    # Create a single long canvas
    print(f"  Total size: {max_w}x{total_h} px")
    canvas = Image.new("RGB", (max_w, total_h), "white")

    y_offset = 0
    for i, img in enumerate(images, 1):
        x_offset = (max_w - img.width) // 2
        canvas.paste(img, (x_offset, y_offset))
        y_offset += img.height

    # Save as a single-page PDF directly using Pillow
    canvas.save(str(output_pdf), "PDF", resolution=100.0)

    size_mb = output_pdf.stat().st_size / (1024 * 1024)
    print(f"\nSUCCESS: PDF → {output_pdf}")
    print(f"Size: {size_mb:.2f} MB | Pages: 1 (continuous scroll)")
    return True

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python make-pdf.py <folder> <out.pdf>")
        sys.exit(1)
    sys.exit(0 if make_pdf(sys.argv[1], sys.argv[2]) else 1)
