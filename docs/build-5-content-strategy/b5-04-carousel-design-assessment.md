# Application review-file checklist: production self-assessment

Reviewed 2026-09-17. The user requested the next carousel after the first proof.
Only B5-04 was generated in this pass. After the subsequent campaign reduction,
B5-06/09/11 remain active and ungenerated; B5-13 and text post B5-14 are retired.
This is technical and visual self-assessment, not user approval or publishing.

## Reader value and scope

The nine pages specify a reviewable application file: trusted household matching,
source context, configured criteria, missing evidence, conflicting values and the
separately recorded human action. Page eight delivers six reusable review questions;
page nine supplies a concrete traceability test. The caption is supporting context,
not a substitute for those instructions.

All approved title/body/footer wording and the caption remain unchanged. Canonical
main copy is 287 words, 31.9/page, range 28-35. No criteria threshold, applicant
score, ranking, legal notice, mock consumer report or client-results claim was added.
The packet is an operational aid, not screening-policy certification. Synthetic
demo and human-authority boundaries are stated, not conveyed only through color.

## Comparison and design judgment

Compared the final contact sheet with the current first deck and the previously
rendered vendor Post 01 reference. Reference files were used read-only; no fresh
reference export or source changes. The prior four-reference comparison remains
documented in carousel-design-assessment.md.

The vendor reference has greater composition variety and a large one-word dark
payoff. This checklist is deliberately more instructional: grouped statements and
rules preserve useful context, while the review packet provides a distinct list
composition. Copy is not cut to imitate the vendor's shorter statements. A giant
Zodiak word is not forced into a sentence that needs its full explanation.

The first deck's cream/navy shell, Switzer hierarchy, 24px rhythm and blue/gold
semantic annotations remain. The new two-column question layout is shared CSS,
not nine bespoke themes, smaller typography or a fake application screenshot.

## Page-level review

| Page | Teaching job | Visual treatment |
| --- | --- | --- |
| 1 | Introduce the traceable review file | Blue selection on reviewable; gold on trace each value. |
| 2 | Match evidence to a trusted household | Blue reference underline; ambiguous matching hands off to a person. |
| 3 | Keep value and source context together | Blue document underline; gold basis/period phrase; readable wrapped footer. |
| 4 | Separate criteria evidence from a rental decision | Stronger middle statement and one blue rule underline. |
| 5 | Give missing evidence an owner and approved route | One blue missing circle; supporting explanation is unmarked. |
| 6 | Preserve conflicting definitions and sources | Blue source underline and a definitions circle on its own line. |
| 7 | Record authorized human action separately | Sole navy page; quiet cream copy, no forced focal annotation. |
| 8 | Deliver the six-question packet template | Two-column ruled questions, one selected unresolved question, privacy instruction. |
| 9 | Give a practical review test | Gold missing-link emphasis; byline remains separate from usable copy. |

Visible totals: two blue boxes, four blue underlines, two blue circles and three
gold highlights. Furniture is excluded. These are observations, not quotas; the
quiet dark page deliberately has no gold or blue focal mark. No stock imagery,
icons, gradients, shiny cards, public build number or invented public labels.

## Verification and corrections

Inspected every final-PDF page, the contact sheet and 360px-wide cover, human-action
and review-packet previews. Body stays 48/72, metadata 36/48; at mobile width these
are approximately 16px and 12px. Titles stay 78/96, cover 96/120. No per-page size
override, automatic shrink, content clipping or footer/byline overlap was found.

The first packet render overset because the question mark detached from the
selected unresolved question and added a line. A shared question-grid modifier
uses the existing body scale, compact box padding and the punctuation inside the
selection. This restores fit and preserves exact public copy. The hyphenated
follow-up term is kept together rather than allowing PDF extraction to produce
follow- up. Routine chat stays together to avoid a one-word orphan. Circle paths
were widened within their existing SVG frame after reviewing glyph clearance.

Mean content-band span is 80.4%, range 72.6-92.4%; page eight is fullest. This is
block height including gaps divided by the reserved band, not ink coverage,
whitespace percentage or a quality score. The closing page has a shorter band
because it reserves the byline. The first deck averaged 76.5%; its different
content and worksheet labels make matching that number an inappropriate target.

Final export: nine equal 1080x1350-design pages, 116,563 bytes. Renderer and final
PDF verifier pass exact title/body/footer copy, semantic reading order, actual
content bands, mark clearance, dimensions, loaded Switzer/Zodiak families,
embedded used-font subsets and one baked grain image. Zodiak is loaded but unused
in this deck. The editorial checker still passes all 60 pages and preserves the
nine non-carousel posts. Contrast inherits the checked first-deck palette:
navy/cream 17.61:1 and cream/selection blue 8.15:1. Not an accessibility audit.

## Remaining trade-offs and handoff

Six interior lessons share a title/reference/instruction skeleton. This is coherent
but less compositionally varied than the vendor deck; annotations alone do not
make every lesson a distinct layout. The question packet is the densest page and
requires full-page viewing, not judging tiny contact-sheet labels. Its final
question wraps over two lines without reducing the body size.

This work proves export fidelity, not LinkedIn engagement, business ROI or user
design acceptance. Review this individual deck before requesting the next one.
Nothing was uploaded, scheduled, published or changed in the automation runtime.

## Reproduce

Run node carousel-kit/render-carousel.cjs b5-04-reviewable-application-file, then
carousel-kit/verify-carousel.py with the same slug using the bundled Python.
Final outputs live under output/pdf/ and output/carousels/; scratch layout checks
and mobile previews live in ignored tmp/carousel-qa/. Upload title, if publishing
later: What belongs in a reviewable application file? Use the canonical caption.
