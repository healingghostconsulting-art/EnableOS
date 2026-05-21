from __future__ import annotations

import re
import zipfile
from pathlib import Path
import xml.etree.ElementTree as ET

NS = {
    "a": "http://schemas.openxmlformats.org/drawingml/2006/main",
    "p": "http://schemas.openxmlformats.org/presentationml/2006/main",
}


def natural_slide_key(name: str) -> int:
    match = re.search(r"slide(\d+)\.xml$", name)
    return int(match.group(1)) if match else 10**9


def extract_slide_texts(pptx_path: Path) -> list[tuple[int, str]]:
    slide_texts: list[tuple[int, str]] = []
    with zipfile.ZipFile(pptx_path) as zf:
        slide_names = sorted(
            [name for name in zf.namelist() if name.startswith("ppt/slides/slide") and name.endswith(".xml")],
            key=natural_slide_key,
        )
        for slide_name in slide_names:
            slide_number = natural_slide_key(slide_name)
            xml_bytes = zf.read(slide_name)
            root = ET.fromstring(xml_bytes)
            paragraphs: list[str] = []
            for shape in root.findall(".//p:sp", NS):
                runs: list[str] = []
                for text_node in shape.findall(".//a:t", NS):
                    text = (text_node.text or "").strip()
                    if text:
                        runs.append(text)
                if runs:
                    paragraph = " ".join(runs)
                    paragraph = re.sub(r"\s+", " ", paragraph).strip()
                    if paragraph:
                        paragraphs.append(paragraph)
            if paragraphs:
                slide_texts.append((slide_number, "\n".join(paragraphs)))
            else:
                slide_texts.append((slide_number, "[No extracted text]") )
    return slide_texts


def main() -> None:
    src_dir = Path("/home/ubuntu/upload")
    out_dir = Path("/home/ubuntu/chcg-enableos-demo/references/leadership-deck-text")
    out_dir.mkdir(parents=True, exist_ok=True)

    for pptx_path in sorted(src_dir.glob("LeadershipModule*.pptx")):
        slide_texts = extract_slide_texts(pptx_path)
        out_path = out_dir / f"{pptx_path.stem}.md"
        with out_path.open("w", encoding="utf-8") as f:
            f.write(f"# {pptx_path.name}\n\n")
            for slide_number, slide_text in slide_texts:
                f.write(f"## Slide {slide_number}\n\n")
                f.write(slide_text)
                f.write("\n\n")


if __name__ == "__main__":
    main()
