#!/usr/bin/env python3
"""
MangaVault - Seamless Chapter to PDF (Chunked)
Stitches pages vertically but slices the canvas into safe chunks.
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

    print(f"  Total size: {max_w}x{total_h} px")
    
    # Create a single long canvas
    canvas = Image.new("RGB", (max_w, total_h), "white")

    y_offset = 0
    for img in images:
        x_offset = (max_w - img.width) // 2
        canvas.paste(img, (x_offset, y_offset))
        y_offset += img.height

    # Slice into chunks of 50,000 px (safe for PDF)
    MAX_SLICE_H = 50000
    slices = []
    y = 0
    while y < total_h:
        h = min(MAX_SLICE_H, total_h - y)
        slice_img = canvas.crop((0, y, max_w, y + h))
        slices.append(slice_img)
        y += h

    print(f"  Slicing into {len(slices)} page(s) to stay under pixel limit")

    # Save all slices as a single PDF
    slices[0].save(str(output_pdf), "PDF", resolution=100.0, save_all=True, append_images=slices[1:])

    size_mb = output_pdf.stat().st_size / (1024 * 1024)
    print(f"\nSUCCESS: PDF → {output_pdf}")
    print(f"Size: {size_mb:.2f} MB | Pages: {len(slices)} (seamless slices)")
    return True

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: python make-pdf.py <folder> <out.pdf>")
        sys.exit(1)
    sys.exit(0 if make_pdf(sys.argv[1], sys.argv[2]) else 1)
