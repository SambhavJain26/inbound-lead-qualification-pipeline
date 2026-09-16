# Leasing carousel design proof

Only the first seven-slide carousel has been produced. The other five remain on
hold for design acceptance. Nothing has been uploaded or published to LinkedIn.

## Current direction

The first proof was too dense and repetitive. On 2026-09-17 the user requested a
revision based on vendor COI decks: shorter copy, breathing room and no public build
numbers. This version follows that direction, not the superseded first proof.

The palette, paper, grain and fonts come from the maintenance-triage kit. Vendor
COI decks inform the editorial rhythm: claims, contrasting type treatments,
lists and one brief dark payoff. Main copy now averages 10 words per page, down
from 28.1, excluding furniture. Details and demo boundaries remain in the caption.

The user authorized shortening. B5-01 copy and visual directions in
`../docs/build-5-content-strategy/linkedin-post-scripts.md` were revised with the
HTML; exact-copy checks still apply. Other posts are unchanged.

## Files and provenance

- `b5-01-inquiry-to-lease.html`: editable seven-slide source.
- `carousel-template.css`: maintenance kit copy plus `.checks--plain`, removing
  the unused numeral gutter for unnumbered rows.
- `design-system.md`: reference system with local revision guidance.
- `render-carousel.cjs`: named-deck renderer and layout checks.
- `verify-carousel.py`: read-only checks of the final PDF.
- `assess-carousel.cjs`: read-only vendor comparison and before/after render;
  retrieves the original proof from Git commit `8c016e9`.
- PDF: `../output/pdf/b5-01-inquiry-to-lease.pdf`.
- PDF-derived contact sheet and full pages: `../output/carousels/b5-01-inquiry-to-lease/`.
- Assessment: `../docs/build-5-content-strategy/carousel-design-assessment.md`.
- Intermediate checks and comparisons: ignored `../tmp/`.

References now live under `D:/codex_projects/automation_projects/`, not the old
`D:/codex/_projects/automation/_projects/` path. Reference files were not edited.

## Design choices

Cream ruled paper, Switzer, gold marker, blue pen and one cover selection on
“lease.” Slide 5 alone is inverted; Zodiak sets “No.” AI authority is explicitly
rejected and the manager named. Seven block combinations vary the reading rhythm
without introducing new themes or smaller type. No screenshots, mock interfaces,
icons, image assets, progress dots or swipe prompts were added.

## Render, verify and compare

From the project root:

```powershell
node carousel-kit/render-carousel.cjs b5-01-inquiry-to-lease
& 'C:\Users\jains\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' carousel-kit/verify-carousel.py b5-01-inquiry-to-lease
node carousel-kit/assess-carousel.cjs --current
```

Requires Chrome, bundled Playwright/sharp, Poppler and Python PDF libraries.
Renderer overrides: `CAROUSEL_BROWSER`, `CAROUSEL_NODE_MODULES`, `CAROUSEL_PDFTOPPM`.
Comparison additionally requires the vendor checkout and original Git commit.

Request Switzer and Zodiak through separate Fontshare links; the combined URL can
omit Zodiak. Check loaded faces and rerun baseline snapping after fonts settle.
Never export a fallback-font version.

Checks cover exact revised copy, content bands, footer/byline clearance, pen fit,
page count, paper dimensions, font embedding and the shared grain tile. Chromium's
sub-pixel height rounding is allowed, not larger drift. Inspect the contact sheet
and every full-size PDF page. Technical QA isn't visual acceptance or a prediction
of engagement. Later upload title: “A fast reply isn't a signed lease.”
