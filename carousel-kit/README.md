# Leasing carousel production status

## Current generated decks; individual review

The five active carousel sections in ../docs/build-5-content-strategy/linkedin-post-scripts.md
were rewritten after the user's second design review. Current counts are
10/9/9/11/10 pages: 49 total. Teaching pages have balanced explanatory text,
practical examples and reusable worksheets, not the rejected sparse statements.

The current b5-01-inquiry-to-lease.html and output/pdf/b5-01-inquiry-to-lease.pdf
now match the ten-page first-deck script. The latest PDF is 123,940 bytes. All ten final
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

The user subsequently requested the next carousel. B5-04 is now rendered as
b5-04-reviewable-application-file.html and output/pdf/b5-04-reviewable-application-file.pdf:
nine pages, now 116,116 bytes. All final-PDF pages, its contact sheet and representative
360px cover/human-action/review-packet previews were inspected. Exact copy, layout,
fonts and the single grain-image checks pass. Its separate assessment is
../docs/build-5-content-strategy/b5-04-carousel-design-assessment.md.

The shared .lesson-fields--questions layout sets full written questions in two
columns at the existing 48/72 body scale, with compact selection-box padding.
B5-04 has two blue boxes, four blue underlines, two blue circles and three gold
highlights. Page seven is the only dark page and deliberately has no focal mark.

Two decks are generated; B5-06/09/11 remain active briefs. Continue one requested deck
at a time, not a batch inferred from this request. No account uploads, publishing
or operational-service changes happened. Technical QA is not user preference.

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

2026-09-17 campaign reduction: B5-13's ungenerated fit carousel and text post
B5-14 are retired from the active plan. The package now has thirteen posts: five
carousels, six text posts and two videos. Keep retained IDs stable rather than
renaming existing assets or matching scripts to contiguous post numbers. Removed
drafts are recoverable from Git history. No generated PDF or PNG was removed.

2026-09-17 targeted copy trim: B5-06/09/11 now carry about 13% less title/body
copy combined, with unchanged 9/11/10-page counts, captions, titles, footers and
annotation phrases. Calculations and worksheet fields remain complete. Use the
latest canonical bodies when generating those three sources; no PDF was exported
for this writing pass and both completed decks remain unchanged.

2026-09-17 subsequent request: lightly trimmed B5-01/B5-04 and regenerated both
HTML sources, PDFs and managed page previews. Their title/body copy fell from
583 to 500 words (14.2%), with unchanged ten/nine-page counts, worksheet fields,
review questions, captions, titles, footers and annotation phrases. Shared CSS
and type sizes are unchanged. Inspected all nineteen final-PDF pages, both contact
sheets and 360px cover/human-boundary/worksheet previews; exact-copy and final-PDF
checks pass. The prior exports remain recoverable in Git. Three decks remain
ungenerated; no publication or runtime change.
