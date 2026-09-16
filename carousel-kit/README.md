# Leasing carousel production status

## Current first proof; design approval pending

All six carousel sections in ../docs/build-5-content-strategy/linkedin-post-scripts.md
were rewritten after the user's second design review. Current counts are
10/9/9/11/10/11 pages: 60 total. Teaching pages have balanced explanatory text,
practical examples and reusable worksheets, not the rejected sparse statements.

The current b5-01-inquiry-to-lease.html and output/pdf/b5-01-inquiry-to-lease.pdf
now match the ten-page first-deck script. The PDF is 124,532 bytes. All ten final
PDF pages, the contact sheet and representative 360px-wide previews were inspected.
Copy, layout, font embedding and the single shared grain image checks pass.
This is a design proof, not user approval or authorization to publish.

The old seven-page output is superseded. Source and PDF history remain in Git;
the rejected sparse proof was also backed up in ignored tmp/carousel-comparison/
leasing-sparse before regeneration. Old page previews were replaced by ten padded
slide-01.png through slide-10.png files, not left mixed with the new export.

Current design specification:
../docs/build-5-content-strategy/carousel-design-blueprint.md.

Latest self-assessment and limitations:
../docs/build-5-content-strategy/carousel-design-assessment.md.

The shared stylesheet now implements the teaching-page scale, grouped lessons,
compact ruled roles and a three-column field worksheet, with inverted colors.
No page contains inline size/color/spacing overrides. The new proof uses two blue
boxes, four visible blue underlines, three blue circles, two gold highlights and
one gold underline on its dark page. These are observations, not quotas.

Next step is user review. Don't batch the other five PDFs until the direction is
accepted. No account uploads, publishing or operational-service changes happened.

## Existing helpers

- check-carousel-copy.cjs: read-only copy, page-count and design-map checks; no visual approval.
- render-carousel.cjs: renders only a named deck; checks fonts, copy and layout.
- verify-carousel.py: verifies the final PDF, not only HTML.
- assess-carousel.cjs: read-only vendor comparison and preserved first-proof render.
- carousel-template.css: marked-document kit plus named shared teaching layouts.
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
