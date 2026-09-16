"""Read-only checks of the final PDF and approved copy; no artifact edits."""
from pathlib import Path
import re
import sys
import json

import pdfplumber
from pypdf import PdfReader

sys.stdout.reconfigure(encoding="utf-8")
root = Path(__file__).resolve().parent.parent
name = sys.argv[1] if len(sys.argv) > 1 else "b5-01-inquiry-to-lease"
if not re.fullmatch(r"b5-\d{2}-[a-z0-9-]+", name):
    raise ValueError("Use a Build 05 lowercase hyphenated deck name")
pdf = root / "output/pdf" / (name + ".pdf")
reader = PdfReader(pdf)
post_id = name[:5].upper()
copy = (root / "docs/build-5-content-strategy/linkedin-post-scripts.md").read_text(encoding="utf-8")
section = copy.split("## " + post_id + " — ")[1].split("\n## B5-")[0]
slides = re.findall(r"#### Slide (\d+)\s+Title: ([^\n]+)\s+Body: ([^\n]+)\s+Footer: ([^\n]+)", section)
fonts, images, seen = set(), set(), set()


def obj(value):
    return value.get_object() if hasattr(value, "get_object") else value


def normalize(text):
    # The font's middle-dot extraction differs from its correctly rendered glyph.
    return re.sub(r"\s+([,.;:])", r"\1", re.sub(r"\s+", " ", text.replace("\ufffd", "·"))).strip()


def inspect_resources(resources):
    resources = obj(resources)
    for reference in obj(resources.get("/Font", {})).values():
        font = obj(reference)
        fonts.add(str(font.get("/BaseFont")))
        for candidate in [font] + [obj(v) for v in font.get("/DescendantFonts", [])]:
            descriptor = candidate.get("/FontDescriptor")
            if descriptor:
                assert any(k in obj(descriptor) for k in ("/FontFile", "/FontFile2", "/FontFile3"))
    for reference in list(obj(resources.get("/XObject", {})).values()) + list(obj(resources.get("/Pattern", {})).values()):
        key = (reference.idnum, reference.generation)
        if key in seen:
            continue
        seen.add(key)
        value = obj(reference)
        if value.get("/Subtype") == "/Image":
            images.add(key)
        if "/Resources" in value:
            inspect_resources(value["/Resources"])


assert len(reader.pages) == len(slides), "PDF page count differs from approved copy"
layout = json.loads((root / "tmp/carousel-qa" / name / "layout-checks.json").read_text(encoding="utf-8"))
with pdfplumber.open(pdf) as text_reader:
    for index, (page, slide, text_page) in enumerate(zip(reader.pages, slides, text_reader.pages), 1):
        box = [float(v) for v in page.mediabox]
        # Chromium quantizes the declared CSS paper height by less than one pixel.
        assert all(abs(a - b) <= 0.75 for a, b in zip(box, (0, 0, 810, 1012.5))), box
        text = normalize(text_page.extract_text(x_tolerance=2, y_tolerance=3))
        check = layout[index - 1]
        if check.get("copyBlocks"):
            # Read each actual semantic block in DOM order. Whole-page x/y
            # sorting interleaves columns and wrapped footers with page numbers.
            extracted = []
            for block in check["copyBlocks"]:
                region = tuple(v * 0.75 for v in block["box"])
                block_text = normalize(text_page.crop(region).extract_text(x_tolerance=2, y_tolerance=3) or "")
                assert block_text == normalize(block["text"]), (index, block, block_text)
                extracted.append(block_text)
            assert normalize(" ".join(extracted)) == normalize(slide[1] + " " + slide[2]), (index, extracted)
            footer_region = tuple(v * 0.75 for v in check["footerCopy"]["box"])
            footer_text = normalize(text_page.crop(footer_region).extract_text(x_tolerance=2, y_tolerance=3) or "")
            assert footer_text == normalize(slide[3]), (index, footer_text)
        else:
            for value in slide[1:]:
                assert normalize(value) in text, (index, value, text)
        inspect_resources(page["/Resources"])
        print("Page", index, "approved wording preserved; paper dimensions within Chromium rounding")
assert len(fonts) >= 2, "Expected multiple embedded font subsets"
# Fontshare's served font programs have generic internal PostScript names in this
# export. Verify CSS family loading from the renderer, not those internal labels.
for check in layout:
    assert "Switzer" in check["fonts"] and "Zodiak" in check["fonts"]
    assert not check["violations"]
assert len(images) == 1, "Expected only the shared baked grain tile"
print("PASS:", len(reader.pages), "pages;", pdf.stat().st_size, "bytes; fonts:", sorted(fonts), "; one grain image")
