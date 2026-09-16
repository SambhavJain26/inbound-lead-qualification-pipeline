# First carousel: vendor COI comparison and redesign assessment

Reviewed 2026-09-17. This is a self-assessment, not user design approval.
Only the first seven-slide leasing carousel was redesigned. The other five remain
ungenerated. Nothing was uploaded, scheduled or published to LinkedIn.

## What I got wrong

I reproduced the palette and annotation style, but missed the reference decks'
editorial discipline. Almost every slide carried a heading and a full explanation.
The pages fitted their bounds, yet they still felt crowded and repetitive.
Checking for clipping did not answer the user's more important design question.

The cover described scope instead of making a sharp claim. The human-decision page
was dark, but its paragraph weakened the contrast. Repeated internal build labels
added noise. The close tried to summarize the whole flow instead of landing a point.

The error wasn't a missing icon or background color. It was treating each slide
as a small explanatory document instead of pacing a visual story.

## References inspected

Actual reference directory:
`D:/codex_projects/automation_projects/vendor-coi-chasing/docs/carousels/`.

| Vendor deck | Useful reference behavior |
|---|---|
| Post 01 — What AI should touch | Cover, statements, field tags, checklist, brief dark payoff and close. |
| Post 04 — What AI reading costs | Number-led hierarchy, quiet framing and a short dark question. |
| Post 07 — Twelve things wrong | Ruled lists and grouping rather than paragraphs for every item. |
| Post 13 — Questions to ask | Matched claims and a concise closing contrast. |

I read the reference guidance and relevant sources, rendered all four decks and
visually inspected their contact sheets. I compared them with the preserved first
leasing proof and inspected all seven full-size pages of the revised final PDF.
Reference project files were used read-only, not edited or re-exported.

Some vendor pages are deliberately full. Their strength isn't universally empty
pages; it is variation in emphasis and sentence shape. The redesign borrows that
principle rather than claiming every reference page is sparse.

## Measurements and limits

The same script measures rendered main reading areas, excluding eyebrows, footers,
bylines and captions. Visible checklist numerals count as tokens; contractions
count as one word. Visible line breaks are retained to avoid merging list rows.
This corrects a preliminary `textContent` count which slightly undercounted some decks.

| Deck | Pages | Words/page | Range | Block combinations | Mean content-band span |
|---|---:|---:|---:|---:|---:|
| Vendor 01 | 8 | 21.5 | 19–27 | 6 | 79.6% |
| Vendor 04 | 7 | 17.1 | 11–24 | 5 | 64.9% |
| Vendor 07 | 11 | 21.3 | 17–26 | 5 | 61.4% |
| Vendor 13 | 8 | 20.1 | 16–24 | 4 | 71.9% |
| Leasing first proof | 7 | 28.1 | 27–30 | 3 | 84.2% |
| Leasing revision | 7 | 10.0 | 8–13 | 7 | 56.0% |

Main reading copy fell from 197 to 70 words, a 64.5% reduction. Seven-page scope
remains; supporting operational detail now lives in the caption.

Content-band span is the vertical distance from the first block to the last,
divided by available band height. It includes gaps. It is **not** ink coverage,
actual whitespace percentage or a design-quality score. Block combinations are
arrangements of existing classes, not seven new layouts. None predicts engagement
or establishes business ROI.

## Slide-by-slide assessment

| Page | Revision | Improvement | Remaining trade-off |
|---|---|---|---|
| 1 | Fast reply versus signed lease; one supporting line. | A concrete contrast replaces a scope heading and paragraph. | The caption supplies full scope, not the cover. |
| 2 | Approved facts; “Not guesses. Not promises.” | One rule and a short contrast replace a long explanation. | Doesn't enumerate all messaging guardrails. |
| 3 | “Booked isn't attended.” | The status distinction becomes the subject, not a buried phrase. | Not evidence of a real tour; simulation is disclosed in the footer. |
| 4 | Application boundary and three unnumbered rows. | The list breaks the repeated headline-and-paragraph pattern. | Still the fullest page, at 76.4% band span; intentionally the structured evidence page. |
| 5 | AI decision question; “No.”; manager named below. | The dark page lands one explicit authority boundary. | Keep the question and answer together in later crops. |
| 6 | Quiet lead-in above oversized “signed.” | Scale emphasizes completion without another paragraph. | Callback delivery and retry details belong in the production map. |
| 7 | Outcome plus “Next step. Owner. Status.” | A clean close replaces the full-flow recap. | Intended benefit, not a measured client result; footer limits demo scope. |

## Visual and editorial checks

Cream paper, navy ink, gold marker and blue pen remain consistent with the kit.
Existing Switzer sizes were retained, not reduced to squeeze in text. Zodiak appears
once on “No.” Slide 5 alone is inverted. The cover has the only selection box.
The booking circle has two uneven strokes, not a clean decorative ellipse.

`.checks--plain` removes the unnecessary number gutter. Existing list rules,
spacing, type and inverted colors remain. No per-slide CSS overrides, screenshots,
mock interfaces, icons, stock images, progress dots or swipe prompts were added.

All seven final-PDF pages were inspected, not only HTML screenshots. No clipped
words, wrapped pen labels or footer/byline overlaps were found. The PDF has seven
pages, embedded font subsets and one shared grain image. Both intended font
families loaded before export. Revised title/body/footer copy matches the canonical
script and extracted final PDF text. No public slide contains “Build 05.”

Short statements are intentional here. A generic long-sentence rhythm rule would
work against the user's request; supporting sentences remain in the caption.
The copy still separates application from approval, booking from attendance,
AI preparation from human decisions, and sandbox signing from physical move-in.

## Honest limitations

This revision is intentionally sparser than the vendor average. That suits the
feedback, but isn't automatically better for every future post. Comparisons and
checklists may require more words to avoid vague claims.

The deck still shares a left alignment and paper shell; it doesn't change visual
theme every page. Its variation comes from scale, framing, list structure and
the dark payoff, not decorative graphics added to fill empty space.

Footer type remains small at contact-sheet scale, consistent with the kit. Critical
AI authority appears in large main text; the full caption carries simulation and
sandbox boundaries. Publish with that caption, not an unrelated claim of real
screening, real tenancy or physical move-in.

No client time savings, conversion improvement or staffing reduction was measured.
No numerical design score is assigned: evidence informs the review, but the user's
visual preference still decides whether this direction is accepted.

## Reproduce the review

Run `node carousel-kit/assess-carousel.cjs --current` from the leasing project.
It renders vendor 01/04/07/13 read-only, retrieves the original proof from Git
commit `8c016e9`, then renders the current source. Contact sheets, PNGs and
`comparison.json` go to ignored `tmp/carousel-comparison/`.

Render with `node carousel-kit/render-carousel.cjs b5-01-inquiry-to-lease` and run
the local Python verifier. Final PDF previews live under
`output/carousels/b5-01-inquiry-to-lease/`.

Next decision: present this proof for feedback. Don't batch the remaining five
until the user accepts the direction.
