# Build 05 carousel design proof

Only B5-01 has been produced. The other five carousels remain on hold for the user's design approval. No LinkedIn upload or publishing occurred.

## Files and provenance

- `b5-01-inquiry-to-lease.html`: seven-slide editable source beside the shared stylesheet.
- `carousel-template.css` and `design-system.md`: unchanged copies from the maintenance-triage carousel kit at its current location, `D:/codex_projects/automation_projects/maintenance-triage/carousel-kit/`.
- `render-carousel.cjs`: local headless renderer and checks, using the bundled desktop runtime. It renders only the named deck; it doesn't open account tabs or modify application services.
- Final document: `../output/pdf/b5-01-inquiry-to-lease.pdf`.
- Approval previews: `../output/carousels/b5-01-inquiry-to-lease/contact-sheet.png` and seven full-size slide PNGs rendered from the final PDF.
- Intermediate layout diagnostics: ignored `../tmp/carousel-qa/`.

The approved title, body and footer wording comes from B5-01 in `docs/build-5-content-strategy/linkedin-post-scripts.md`. The copy is not shortened to fit. The kit's newer design directions supersede that script's optional screenshot/diagram stage directions: this version uses annotated typography, not screenshot panels or interface mockups.

## Design choices

Cream ruled paper, the existing baked grain tile, Switzer text, gold marker and blue pen annotations. One selection box identifies “lease” on the cover. Slide 5 is the only dark slide and the only Zodiak word: “decision,” affirmed with an underline because the manager owns it. No images, icon set, progress dots or swipe prompt added.

The existing `.lead` size step carries the longer cover. All interior sentences use the shared statement layout. The final slide uses `.body--close` with a byline. No new layout, stylesheet override, color or per-post size rule introduced.

Annotation tally: eight highlights, four underlines, one circle and one selection box. Each slide has a mark; each interior slide has at most two. “Sent” is circled for examination, not struck out: it is a valid state, but not proof of signing. The dark slide's highlight stays short to avoid a wrapped swipe obscuring letter tops.

## Render and verification

Run from the project root:

```powershell
node carousel-kit/render-carousel.cjs b5-01-inquiry-to-lease
```

Requires installed Chrome, the bundled Playwright/sharp packages and Poppler. The defaults point to the verified local desktop runtime. Optional environment overrides are `CAROUSEL_BROWSER`, `CAROUSEL_NODE_MODULES` and `CAROUSEL_PDFTOPPM`.

Fonts still load from Fontshare. This run found that the kit's combined family URL returned Switzer without Zodiak. The HTML requests each family through its own stylesheet link, preserving the original families and weights. The renderer checks loaded font faces and refuses to export a fallback-font deck. It reruns the example's unchanged baseline-snap script after fonts settle.

The renderer checks content-band fit, footer/byline clearance, pen wrapping, exact approved wording and final PDF page count. Poppler renders the resulting PDF to PNGs; inspect the contact sheet and full pages. Run `carousel-kit/verify-carousel.py b5-01-inquiry-to-lease` with the bundled Python for final-PDF text, dimensions, font embedding and grain-image checks. Chromium rounds the declared paper height by less than one pixel; the verifier allows only that small tolerance. A successful HTML layout check alone is not visual approval.

Review state: technical and visual QA completed; design acceptance is still the user's decision. Use “The work between an inquiry and a lease” as the document title on a later upload, not the filename.
