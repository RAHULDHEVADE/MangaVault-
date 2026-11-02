import json
from pathlib import Path

manifest = json.loads(
    Path("diagnostics/manifest.json").read_text()
)

folder = Path("uploads") / "sweet-home-001"
folder.mkdir(parents=True, exist_ok=True)

extensions = {".jpg", ".jpeg", ".png", ".webp"}
found = sorted(
    p for p in folder.iterdir()
    if p.suffix.lower() in extensions
)

print("CHAPTER:", manifest["title"])
print("EXPECTED PAGES:", manifest["totalPages"])
print("LOCAL IMAGES:", len(found))
print("READY FOR PDF:", len(found) == manifest["totalPages"])

if len(found) != manifest["totalPages"]:
    print("Missing", manifest["totalPages"] - len(found), "page files.")
else:
    print("All pages are available for PDF generation.")
