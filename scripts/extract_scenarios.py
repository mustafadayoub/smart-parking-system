"""Extract use case scenario text from Word docx with UTF-8."""
from __future__ import annotations

import re
import zipfile
from pathlib import Path

DOCX = Path(
    r"d:\Smart Parking System\presentation-site\public\diagrams\_import\WORD Project\Smart_Parking_System (1).docx"
)

with zipfile.ZipFile(DOCX) as z:
    xml = z.read("word/document.xml").decode("utf-8")

texts = re.findall(r"<w:t[^>]*>([^<]*)</w:t>", xml)
full = "".join(texts)

for marker in ["Use Case Scenario 1", "Use Case Scenario 2"]:
    start = full.find(marker)
    if start == -1:
        continue
    end = full.find("Use Case Scenario", start + 10)
    if marker.endswith("1"):
        end = full.find("Use Case Scenario 2", start + 10)
    if end == -1:
        end = start + 2500
    chunk = full[start:end]
    print("=" * 60)
    print(marker)
    print("=" * 60)
    print(chunk[:2000])
    print()
