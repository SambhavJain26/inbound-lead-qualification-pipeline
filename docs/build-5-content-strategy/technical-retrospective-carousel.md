# Build retrospective: automated leasing and tenant screening

Revised: 2026-10-20. Status: rendered draft for review; not published or queued.

Review PDF: `output/pdf/technical-retrospective-leasing-screening.pdf`.
Editable HTML: `carousel-kit/technical-retrospective-leasing-screening.html`.
Build: `node carousel-kit/scripts/build-technical-retrospective.cjs`.
Verify: `& "C:\Users\jains\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe" carousel-kit/scripts/verify-technical-retrospective.py`.

## Editorial direction

- Problem-first retrospective for property-management decision makers and buyers, with enough concrete decisions and debugging to show hiring readers how I work.
- No prominent stack list, code, schema, node counts or database status labels. Explain decisions through their operational consequences. Keep the two real defects and specific checks; avoid vague AI claims.
- Eleven short slides: problem, workflow, responsibilities, signature check, two bugs, compliance boundary, lesson, verification and next steps. Use varied plain-language diagrams and comparisons.
- Preserve cream ruled paper, Switzer, restrained Zodiak and meaning-led blue/yellow annotations. Either color works for every annotation shape.
- Public wording omits demo/synthetic-data and no-client/no-deployment labels. Internal evidence remains below. No invented business results, classifier benchmarks or completed future safeguards.

## LinkedIn caption

> Leasing teams face an uncomfortable trade-off.
>
> If you reply slowly to inquiries, prospective renters sign elsewhere while your apartment sits empty. If you rush through underwriting to move fast, you risk accepting altered pay stubs that turn into costly evictions months later.
>
> I built an automated leasing and screening workflow designed around that tension: answer prospect questions instantly, schedule approved tours, collect applications, and reconcile income before handing a clean file to a manager.
>
> AI assists with routine communication: answering grounded property questions, extracting document figures, and drafting updates. But the manager remains the decision maker. Every applicant is evaluated against fixed, published criteria, and no lease is generated without human approval.
>
> Most importantly, the workflow compares three income sources side by side: what the applicant typed on their form, what was extracted from their uploaded pay stub, and what was independently verified through payroll records. If those numbers do not agree, the file is immediately flagged for review.
>
> Two real defects during development taught me how easy it is to break a good process:
>
> First, a safety guardrail caused dead silence during a routine conversation. When a prospect stated their monthly income, the assistant attempted to acknowledge it. But because the renter's personal income was not in the property facts knowledge base, the guardrail treated it as an ungrounded figure and blocked the message. The renter experienced dead silence. I resolved this by dynamically adding the prospect's recorded answers to the allowlist, permitting natural acknowledgments while still blocking fabricated rents or promises.
>
> Second, a single character broke application delivery. After a tour, the link sent to the renter contained an underscore in its reference token. The messaging node defaulted to Markdown, interpreted the underscore as an unclosed italic tag, and failed silently. I pinned the messaging mode to HTML and added explicit escaping so links arrive reliably.
>
> Those issues reinforced an important principle: defensive engineering should protect against bad data, not stop a normal conversation.
>
> I verified the system across factual Q&A, income discrepancy flagging, tokenized link delivery, and duplicate click prevention. Next, I would add support for multi-applicant households, conversational tour rescheduling in chat, and recovery routines for interrupted webhook events.
>
> The goal is simple: help property managers respond in minutes without compromising on underwriting rigor.

## Carousel copy

### Slide 1

**Title:** Fast leasing without the shortcuts

**Body:** What I built to speed up leasing without skipping verification, what broke, and what I learned.

**Footer:** Build retrospective · Leasing and screening automation

### Slide 2

**Title:** Two pressures on every vacancy

**Body:** Moving fast fills vacancies before competitors do. Moving too quickly lets falsified documents slip past, turning an empty unit into a costly eviction.

**Footer:** The problem · Speed versus underwriting risk

### Slide 3

**Title:** From inquiry to signed lease

**Body:** I built a workflow that answers renter questions 24/7, schedules approved tours, collects applications, verifies income, and prepares files for decision.

**Footer:** The workflow · A connected journey with human gates

### Slide 4

**Title:** AI assists. The manager decides.

**Body:** AI answers factual questions and extracts document figures. The manager controls rental criteria, reviews discrepancies, and makes every rental decision before a lease sends.

**Footer:** The boundary · Clear separation of duties

### Slide 5

**Title:** Reconcile three income sources

**Body:** Instead of trusting a single PDF, the workflow compares application entries, extracted pay stub numbers, and verified payroll records. Any mismatch flags for review.

**Footer:** The signature check · Catching altered documents

### Slide 6

**Title:** A guardrail created dead silence

**Body:** Repeating a prospect's stated income triggered the safety guardrail because the figure was not a property fact. The conversation stalled until I allowed recorded user answers.

**Footer:** Bug 1 · Distinguishing user facts from hallucination

### Slide 7

**Title:** One character broke link delivery

**Body:** An underscore in the application link token was parsed as Markdown formatting, causing silent delivery failure. I pinned the messaging mode to HTML and added character escaping.

**Footer:** Bug 2 · Safe message encoding before dispatch

### Slide 8

**Title:** Rejections require a person

**Body:** Automating denials creates severe legal liability under credit reporting laws. If an applicant fails criteria, the workflow stops completely and hands the file to a human.

**Footer:** Compliance boundary · Never automate adverse action

### Slide 9

**Title:** Guardrails need conversational context

**Body:** Strict rules prevent hallucinated rents, but conversations require natural acknowledgments. Building this taught me that guardrails must understand what the user just stated.

**Footer:** What I learned · Balance safety with conversation

### Slide 10

**Title:** I checked the critical paths

**Body:** I verified factual property answers, income discrepancy flags, link encoding, and duplicate click protection. These checks confirmed the pipeline behaves predictably.

**Footer:** Verification · Specific checks of workflow behavior

### Slide 11

**Title:** What I'd improve next

**Body:** Next, I would add support for multi-applicant households, automated tour rescheduling in chat, and recovery routines for interrupted webhook deliveries.

**Footer:** Next steps · Proposed improvements

## Internal evidence mapping

| Slides | Evidence | Boundary |
|---|---|---|
| 1-3 | WF1 (`leasing-front`), units table, 05 problem research | Grounded Q&A and tour triage; no external leasing speed claim |
| 4 | WF1 Tier A/B split, WF2 criteria engine, WF3 manager router | AI assists with extraction and grounded facts; human approves every send and rental decision |
| 5 | WF2 3-way income reconciliation (`claimed`, `extracted`, `verified`) | Compared against Plaid Sandbox payroll fixture; real API call with test data |
| 6 | Stage 7 Gate failure 2; `buildConversationKnowledge` in `leasing-lib.js` | Allowlist updated to include prospect-stated answers; synthetic test cases verify invented rent is still blocked |
| 7 | Stage 7 Gate failure 1; `escapeTelegramHtml` and HTML parse mode pin | Markdown underscore parsing bug resolved with HTML mode and escaping |
| 8 | WF2 criteria evaluation stop and HUD/FCRA compliance rules | Hard stop on `does_not_meet`; no adverse action notice generated or sent |
| 9 | Development notes on guardrail behavior across conversational turns | Qualitative engineering lesson from debugging silent conversational dropouts |
| 10 | Preserved Stage 7 verification run and test suite | Synthetic test checks: grounded unit facts, 3-way reconciliation, escaped tokens, duplicate tap idempotency |
| 11 | Production blueprint and architecture open items | Multi-applicant households, conversational rescheduling, and crash recovery are proposed future work |

Keep this appendix, evidence provenance and local paths outside the PDF.
