# Leasing carousel production status

## Current rewrite; previous PDF is superseded

All six carousel sections in ../docs/build-5-content-strategy/linkedin-post-scripts.md
were rewritten after the user's second design review. Current counts are
10/9/9/11/10/11 pages: 60 total. Teaching pages have balanced explanatory text,
practical examples and reusable worksheets, not the rejected sparse statements.

The existing b5-01-inquiry-to-lease.html, seven-page PDF and PNG previews are
historical rejected proofs. They do not match the current ten-page copy and must
not be published. They are retained for comparison, not silently deleted. The
renderer checks canonical wording and count and will reject the old source.

Current design specification:
../docs/build-5-content-strategy/carousel-design-blueprint.md.

Latest self-assessment and limitations:
../docs/build-5-content-strategy/carousel-design-assessment.md.

Next production step is one new proof implementing the teaching-page layouts and
blue/gold annotation balance. Inspect every final PDF page before presenting it.
Don't batch the other five PDFs until that direction is accepted. This rewrite
produced no new PDF, no account uploads and no operational-service changes.

## Existing helpers

- check-carousel-copy.cjs: read-only copy, page-count and design-map checks; no visual approval.
- render-carousel.cjs: renders only a named deck; checks fonts, copy and layout.
- verify-carousel.py: verifies the final PDF, not only HTML.
- assess-carousel.cjs: read-only vendor comparison and preserved first-proof render.
- carousel-template.css: maintenance kit style with the checks--plain modifier.
- design-system.md: reference vocabulary plus the latest local overrides.

Check the current copy independently of the superseded HTML:

```powershell
node carousel-kit/check-carousel-copy.cjs
```

For an updated, matching source, run:

```powershell
node carousel-kit/render-carousel.cjs b5-01-inquiry-to-lease
& 'C:\Users\jains\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe' carousel-kit/verify-carousel.py b5-01-inquiry-to-lease
node carousel-kit/assess-carousel.cjs --current
```

The reference projects now live under D:/codex_projects/automation_projects/.
Chrome, bundled Playwright/sharp, Python PDF libraries and Poppler were verified
for earlier proofs. Load Switzer and Zodiak with separate Fontshare links, check
both faces and rerun baseline snapping after fonts settle. Do not export fallback
fonts or replace baked grain with a full-page SVG turbulence filter.

The sparse revision's earlier numbers are historical, not targets. Only assess
rendered band span once the new source exists; it isn't actual ink coverage,
whitespace percentage or proof that the revised design is good.
