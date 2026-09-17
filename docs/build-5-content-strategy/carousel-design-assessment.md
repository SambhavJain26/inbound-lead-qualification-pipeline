# First carousel: vendor COI comparison and redesign assessment

Current status: the ten-page first proof is rendered and inspected; user design
approval is pending. It supersedes both rejected seven-page proofs assessed below.
Earlier measurements remain historical observations, not targets or approval.
See the latest review at the end and the current design blueprint.

Subsequent production update: the user requested the next deck individually.
B5-04's nine-page checklist is also rendered and reviewed in
[its separate assessment](b5-04-carousel-design-assessment.md). Three active decks remain
ungenerated; B5-13 and text post B5-14 were subsequently retired. Historical statuses below describe their respective review passes.

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

## Second review — value and annotation balance

The user is right that the sparse revision lost too much information. I treated
word reduction as the solution, despite acknowledging that fit and word counts
don't establish design quality. The gold-heavy annotation mix also survived the
rewrite. Blue appeared in a cover box, one circle and page numbers; that wasn't
the fuller use of the kit the user wanted.

The latest pass rewrites all six decks as usable reference documents, not just
builder commentary. It adds an eight-check handoff audit, review-file checklist,
message-permission worksheet, income reconciliation method, readiness signoffs
and an existing-business pilot brief. The decks have 10/9/9/11/10/11 pages.
Two worked income examples are explicitly illustrative, not recorded fixture results.

Current teaching pages contain 26–35 title/body words. This is more information
than either rejected proof, not a claim that fewer words alone produce better
design. The proposed teaching-page scale and grouped compositions must support
that information instead of repeating giant headings over full paragraphs.

The user's clarification is deck-level variety, not every device on each page.
The brief now mixes boxes, underlines, circles, highlights and quiet pages across
each document without imposing a device quota. Marks identify specific phrases
and jobs; blue page numbers don't count as substantive balance. The dark page's
pen stays gold for contrast, so nominal blue-mark counts aren't visible-blue counts.
Selected interior boxes override the old cover-only rule; they are not compulsory.

UI/UX Foundations informs hierarchy, grouping, mobile-scale readability and contrast.
The high-end visual-design skill was inspected but not selected: app motion, glass
cards and decorative effects would conflict with this static reference-document task.
The social framework uses practical Value-Stack structures rather than a generic rant.

Editorial checks cover current page counts, complete slide fields, public build-ID
removal, focal mark budgets, exact marked phrases, caption lengths, numerical examples
and unchanged non-carousel scripts. Plain-language editing removes hype and filler.
Parallel worksheet labels and concise instructional sentences remain intentional;
forced stutter transitions and long-sentence quotas would add copy without value.

Remaining limitation: this is a copy-and-design-brief pass, not a new rendered proof.
No new visual quality, fit or color-balance result is claimed. The old PDF/PNG assets
and HTML are superseded and don't match the new ten-page first deck. Retained assets
are comparison evidence only. One new B5-01 proof must test the hierarchy, field/list
treatments and visible blue/gold distribution before batching the remaining five.

## Third review — ten-page teaching proof rendered

The user requested the first carousel only. The current source and PDF now match
all ten written pages: cover, eight handoff checks and a reusable seven-field
record. No public copy changed to make the layout easier. Captions, the seven
text posts and both video scripts retain their earlier wording.

### Comparison with the references and rejected proofs

Re-ran the read-only vendor 01/04/07/13 comparison and inspected their contact
sheets against the original, sparse revision and new final-PDF contact sheet.
The current main reading area contains 296 words: 29.6/page, range 26–32. The
first rejected proof averaged 28.1 and the sparse proof 10.0. The improvement is
the more usable audit and supporting hierarchy, not a claim that word counts
measure usefulness or predict LinkedIn performance.

The current mean content-band span is 76.5%, versus 84.2% in the original and
56.0% in the sparse proof. Its range is 64.5–90.6%; the worksheet is fullest.
This includes gaps and uses the new reserved bands. It is not ink coverage,
whitespace percentage or a design score. The vendor mean spans remain
79.6/64.9/61.4/71.9%; their type hierarchy and content differ, so equalizing those
numbers would not establish a good design.

Four shared outer compositions now carry the deck: cover, grouped teaching
lesson, compact responsibility rows and worksheet. Inside the grouped lessons,
selected evidence statements use a stronger middle type step; others stay quiet.
This is a consistent reference-document shell, not ten unrelated graphic themes.

### What changed in the rendered design

- Cover: a substantive blue box on handoffs and a raised gold highlight on Eight
  checks. Useful setup remains unmarked, not discarded to create empty space.
- Record/facts/tour: one blue reference underline, a source circle and a booked
  circle support the specific audit checks, with supporting evidence separated.
- Application: only Missing evidence is highlighted. It retains the practical
  follow-up and explicitly separates a submitted form from approval.
- Human boundary: the only navy page uses three ruled responsibilities and one
  gold underline. Removing inherited list margins and compacting top padding
  restores breathing room without shrinking the explanation or deleting words.
- Signing/waiting/possession: selected circle/underline marks identify the state
  or responsibility to inspect. They are not a blue-and-gold pair on every page.
- Worksheet: all seven written fields appear in a row-major three-column layout,
  with one selected Owner field and a concrete inspection action underneath.

Visible totals are two blue boxes, four blue underlines, three blue circles, two
gold highlights and one gold underline on the dark page. Gold is still present,
but no longer the default mark on every teaching page. These counts describe the
result, not a quota to impose on the other five decks. No icon set, fake app frame,
stock image, new mock result or additional public build number was introduced.

### Verification and fixes

Inspected every full-size PNG rendered from the final PDF, the contact sheet and
360px-wide cover/decision/worksheet previews. Body is 48px at production size
(16px at 360px), metadata 36px (12px); no automatic shrink or per-page font sizes.
No clipped text, wrapped pen phrase, lost scope text or footer/byline overlap was
found. Enlarged circle clearance stops the lower stroke crossing the glyph bodies.
Raised gold backgrounds read as marker swipes rather than thin underlines.

Text contrast ratios: navy/cream 17.61:1; navy/gold 11.93:1; cream/blue box 8.15:1;
blue/cream 4.91:1; dark metadata/cream 10.00:1. Meaning remains explicit in words,
not dependent on color. These checks are not a full PDF-accessibility certification.

The whole-page extractor initially mixed a two-line footer with its page number.
The verifier now checks actual semantic block regions in reading order, including
each worksheet cell and the scope footer; every title/body/footer word matches.
The renderer also clears only its managed page previews before rebuilding, because
Poppler uses padded names after nine pages. It must not leave old seven-page PNGs
mixed with the ten-page export. Historical outputs remain in Git and an ignored
comparison backup.

Final file: output/pdf/b5-01-inquiry-to-lease.pdf, ten pages, 124,532 bytes. Checks
pass for copy, page dimensions, loaded families, embedded font subsets, mark fit,
content-band and footer clearance, and one shared grain image. Switzer carries
the document; Zodiak is loaded but no giant payoff word is forced into the teaching
pages. The authored wording and its practical instructions take priority.

### Remaining trade-offs and gate

The deck is more instructional and text-rich than the vendor averages. Seven
teaching pages intentionally share the grouped-lesson skeleton, so it remains a
coherent audit rather than a highly illustrated story. The worksheet remains the
densest page, and its three-column labels need the full page view, not a tiny
contact-sheet thumbnail. Scope footers wrap on two pages instead of shrinking.

Technical checks and my visual inspection do not establish user design acceptance,
engagement or client results. The next step is feedback on this proof. The other
five PDFs remain ungenerated; nothing was uploaded, scheduled or published.
