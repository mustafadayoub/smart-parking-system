"""Extract paragraph text order from docx."""
import re
import zipfile
from pathlib import Path

DOCX = Path(
    r"d:\Smart Parking System\presentation-site\public\diagrams\_import\WORD Project\Smart_Parking_System (1).docx"
)

with zipfile.ZipFile(DOCX) as z:
    xml = z.read("word/document.xml").decode("utf-8")
    rels = z.read("word/_rels/document.xml.rels").decode("utf-8")

from urllib.parse import unquote

rid_map = {
    m.group(1): unquote(m.group(2))
    for m in re.finditer(r'Id="(rId\d+)"[^>]*Target="([^"]+)"', rels)
}

# Split by paragraphs
parts = re.split(r"(<w:p[^>]*>)", xml)
current = ""
for i, part in enumerate(parts):
    chunk = part
    if "r:embed" in chunk or 'r:id="' in chunk:
        for m in re.finditer(r'r:embed="(rId\d+)"', chunk):
            print(f"[IMG] {rid_map.get(m.group(1), m.group(1))}")
        for m in re.finditer(r'r:id="(rId\d+)"', chunk):
            t = rid_map.get(m.group(1), "")
            if ".svg" in t.lower():
                print(f"[SVG] {t}")
    text = re.sub(r"<[^>]+>", "", chunk)
    text = text.strip()
    if text and len(text) > 2:
        print(f"[TXT] {text[:120]}")
