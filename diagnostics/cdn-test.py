import urllib.request
import urllib.error
import json
from pathlib import Path

data = json.loads(
    Path("diagnostics/classified.json").read_text()
)

url = data["pages"][0]["url"]

req = urllib.request.Request(
    url,
    headers={"User-Agent": "MangaVault/1.0"},
    method="HEAD"
)

try:
    with urllib.request.urlopen(req, timeout=15) as response:
        print("STATUS:", response.status)
        print("FINAL URL:", response.url)
        print("CONTENT TYPE:", response.headers.get("Content-Type"))
        print("CONTENT LENGTH:", response.headers.get("Content-Length"))

except urllib.error.HTTPError as e:
    print("STATUS:", e.code)
    print("FINAL URL:", e.geturl())
    print("SERVER:", e.headers.get("Server"))
    print("CONTENT TYPE:", e.headers.get("Content-Type"))
    print("RESPONSE:", e.read(500).decode("utf-8", errors="replace"))

except Exception as e:
    print("ERROR:", type(e).__name__, str(e))
