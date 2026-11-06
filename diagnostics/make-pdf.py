#!/usr/bin/env python3
"""
MangaVault PDF Engine V2
Memory-bounded vertical image stitching.
"""
import sys
import re
import tempfile
import time
from pathlib import Path

from PIL import Image
from pypdf import PdfReader, PdfWriter


MAX_SLICE_H = 50000
IMAGE_EXTS = {".jpg", ".jpeg", ".png", ".webp"}


def natural_sort_key(filename):
    return [
        int(t) if t.isdigit() else t.lower()
        for t in re.split(r"(\d+)", filename)
    ]


def make_pdf(image_dir, output_pdf):
    started = time.perf_counter()

    image_dir = Path(image_dir)
    output_pdf = Path(output_pdf)
    output_pdf.parent.mkdir(parents=True, exist_ok=True)

    files = sorted(
        [
            f for f in image_dir.iterdir()
            if f.suffix.lower() in IMAGE_EXTS
        ],
        key=lambda f: natural_sort_key(f.name)
    )

    if not files:
        raise RuntimeError("No images found")

    print(f"Found {len(files)} images. Scanning dimensions...")

    # Store dimensions and vertical positions only.
    entries = []
    total_h = 0
    max_w = 0

    for f in files:
        with Image.open(f) as img:
            width, height = img.size

        if width < 1 or height < 1:
            raise RuntimeError(f"Invalid image dimensions: {f.name}")

        entries.append({
            "path": f,
            "width": width,
            "height": height,
            "top": total_h
        })

        max_w = max(max_w, width)
        total_h += height

    print(f"Total size: {max_w}x{total_h} px")

    page_count = (total_h + MAX_SLICE_H - 1) // MAX_SLICE_H
    print(f"Generating {page_count} PDF page(s) incrementally...")

    writer = PdfWriter()

    with tempfile.TemporaryDirectory(
        prefix="mangavault_pdf_",
        dir=str(output_pdf.parent)
    ) as temp_dir:

        temp_dir = Path(temp_dir)

        for page_index in range(page_count):
            slice_top = page_index * MAX_SLICE_H
            slice_bottom = min(slice_top + MAX_SLICE_H, total_h)
            slice_height = slice_bottom - slice_top

            canvas = Image.new(
                "RGB",
                (max_w, slice_height),
                "white"
            )

            try:
                for item in entries:
                    image_top = item["top"]
                    image_bottom = image_top + item["height"]

                    # Skip images that don't overlap this slice.
                    overlap_top = max(slice_top, image_top)
                    overlap_bottom = min(slice_bottom, image_bottom)

                    if overlap_top >= overlap_bottom:
                        continue

                    with Image.open(item["path"]) as source:
                        source.load()

                        if source.mode != "RGB":
                            source = source.convert("RGB")

                        crop_top = overlap_top - image_top
                        crop_bottom = overlap_bottom - image_top

                        part = source.crop(
                            (0, crop_top, item["width"], crop_bottom)
                        )

                        x_offset = (max_w - item["width"]) // 2
                        y_offset = overlap_top - slice_top

                        canvas.paste(part, (x_offset, y_offset))
                        part.close()

                page_pdf = temp_dir / f"page_{page_index:04d}.pdf"
                canvas.save(
                    str(page_pdf),
                    "PDF",
                    resolution=100.0
                )

            finally:
                canvas.close()

            # Merge the completed page without retaining image canvases.
            reader = PdfReader(str(page_pdf), strict=True)
            if len(reader.pages) != 1:
                raise RuntimeError(
                    f"Unexpected page count in temporary page {page_index + 1}"
                )

            writer.append(reader)
            print(f"Completed PDF page {page_index + 1}/{page_count}")

        # Write the complete PDF to a temporary file.
        temp_output = output_pdf.with_name(
            output_pdf.name + ".v2.tmp"
        )

        try:
            with open(temp_output, "wb") as out:
                writer.write(out)

            # Verify the completed PDF before replacing the target.
            check = PdfReader(str(temp_output), strict=True)

            if len(check.pages) != page_count:
                raise RuntimeError(
                    f"PDF verification failed: expected {page_count}, "
                    f"found {len(check.pages)}"
                )

            if temp_output.stat().st_size < 1000:
                raise RuntimeError("Generated PDF is unexpectedly small")

            temp_output.replace(output_pdf)

        finally:
            if temp_output.exists():
                temp_output.unlink()

    elapsed = time.perf_counter() - started
    size_mb = output_pdf.stat().st_size / (1024 * 1024)

    print(f"SUCCESS: PDF -> {output_pdf}")
    print(f"Verified: {len(files)} images stitched into {page_count} pages")
    print(f"PDF size: {size_mb:.2f} MB")
    print(f"Generation time: {elapsed:.2f} seconds")

    return True


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print("Usage: make-pdf.py IMAGE_DIRECTORY OUTPUT_PDF")
        sys.exit(1)

    try:
        make_pdf(sys.argv[1], sys.argv[2])
    except Exception as exc:
        print(f"ERROR: {exc}", file=sys.stderr)
        sys.exit(1)
