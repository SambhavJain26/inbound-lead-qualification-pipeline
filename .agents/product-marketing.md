# Product marketing context — Build 05

Project: leasing / tenant-screening coordination. Updated: 2026-09-16.

Use this positioning context for LinkedIn content about the build. It isn't a commercial proposal, legal advice or a claim that the production system is deployed.

Read [customer-language.md](../docs/build-5-content-strategy/customer-language.md) before quoting customer language. The newest [progress notes](../progress-notes.md) govern current build facts. The [production blueprint](../docs/production-leasing-tenant-screening-blueprint.md) describes a proposed deployment, not additional completed demo features.

## 1. Core Position Matrix

The matrix came before the marketing drafts. A starting position. Audience and buying assumptions remain hypotheses until prospect conversations validate them.

| Element | Working position | Evidence / constraint |
| --- | --- | --- |
| Offer | A custom leasing and application coordination implementation, illustrated through a local synthetic portfolio demo | Not a launched SaaS product or screening bureau |
| Desired outcome | Less manual coordination per household while keeping rental decisions with authorized employees | Quantify through staff minutes per household, waiting time and exception ownership; no savings target approved |
| Mechanism | Approved property facts, fixed collection steps, deterministic criteria evidence, human permissions and tracked booking/signing events | Demonstrated in a narrow test setting; do not claim the mechanism is exclusive |
| Primary customer | US residential PM businesses with repeat leasing volume and cross-tool handoffs | Initial 50–500-home segment comes from project planning; not validated demand or a hard cutoff |
| Buyer | Owner/principal or operations leader who owns process quality and capacity | Buying-role hypothesis; titles vary by company |
| Champion | Leasing lead, coordinator or application reviewer who feels the daily handoff burden | Do not assume one staffing model |
| Awareness | Problem- or solution-aware: knows follow-up/file preparation take work and may already have automation | Hypothesis, not measured audience research |
| Market sophistication | Established category with PMS, CRM, virtual leasing and verification products | Do not pitch an unprecedented invention |
| Entry point | One confirmed gap between the buyer's existing systems and human process | A process assessment may find no custom build is needed |
| Top objection 1 | Our existing software already does this | Check native capabilities before proposing duplicate functionality |
| Top objection 2 | AI must not choose who gets a home | Show bounded AI tasks and an authorized human's recorded decision |
| Top objection 3 | Integration or privacy failures could create more work | Explain production permissions, ownership and recovery requirements without calling them deployed |
| Strongest proof | Fictional renter run with real Cal.com booking, sandbox lease signature callback, stored updates and independently checked welcome delivery | Demonstration evidence, not client business results |
| Commercial terms | Pricing, recurring/support model, deployment timeline and guarantees are not approved in this project | Do not copy maintenance-build fees or invent an introductory offer |
| Suggested invitation | See the synthetic demo, read the production blueprint, or discuss a specific leasing handoff | A recommendation for the future plan, not an approved published CTA |

### Qualitative value equation

The desired outcome is operational capacity and clearer control, not replacing rental judgment. That's the distinction. Evidence is strongest for the test flow; we haven't established client ROI, sustained uptime or system-specific integration.

Routine automation can reduce repetitive handling, but rollout still requires discovery, policy review, integration permission and a monitored pilot. Existing-tool operation can reduce employee effort when supported; human review and exception ownership remain real work.

### Three positioning recommendations

1. Lead with a visible business handoff and show what changed in the record.
2. Label synthetic data, mock checks and Sandbox signing close to the relevant claim.
3. Frame deployment around the company's current tools and rules, not a required new stack.

## 2. Product overview

### Working one-liner

I built a leasing coordination demo that handles routine inquiry-to-lease handoffs, prepares application evidence, and leaves every rental decision with a person.

This is a positioning sentence, not a final LinkedIn hook. The walkthrough must explain that signing uses DocuSign's developer sandbox and that some verification/access steps use mock results.

### What the build is

A local-first n8n automation demonstration with a Postgres state store, generated listing site, prospect and manager messaging surfaces, email, booking, test income verification and test-mode lease signing. The business subject is coordination around leasing and screening, not automated tenant selection.

It's the fifth portfolio build, with five workflows in the current demonstration. Technical background, not business value. A PM owner needs to see the work these workflows handle, not only their count.

### What it does in the demonstration

| Business step | Demonstrated behavior | Boundary |
| --- | --- | --- |
| Property inquiry | Captures the inquiry and returns an SMS-like receipt | Local listing front door; generated synthetic property imagery |
| Prospect communication | Answers grounded property questions and gathers fixed pre-qualification answers | Telegram stands in for messaging; prospect activation is required |
| Pre-qualification | Applies a deterministic gate to self-reported answers | Scheduling triage, not verified approval or denial |
| Tour booking | Checks real Cal.com slots and records the booking | Real scheduling account; no physical visit proved |
| Tour completion | Operator records the simulated completion event | Access PIN and attendance/completion are mock boundaries |
| Application | Collects a more realistic application form and synthetic evidence | Not a production application portal or real fee/payment flow |
| Evidence preparation | Extracts cited document values and compares configured evidence | Extraction is not truth certification or fraud adjudication |
| Income provider | Calls Plaid Sandbox and processes a synthetic response | No real renter bank/payroll connection |
| Screening criteria | Produces evidence-backed deterministic criteria classifications | Credit/eviction and identity checks are mocked; human decides |
| Review | Presents information for manager action and controlled messages | Not a model ranking or recommending applicants |
| Lease signing | Sends an approved fixed template through DocuSign sandbox | Test-mode agreement, not a real tenancy |
| Completion update | Receives the signature callback, updates state and sends welcome communication | No deposit settlement, insurance check, readiness inspection or possession |
| Pipeline visibility | Mirrors lifecycle status to Airtable | Postgres is the demo truth; Airtable is display-only |

### What the build never does

- Let AI approve, deny, rank or assign a risk label to applicants.
- Let a model choose an applicant's identity or record ID.
- Infer or use protected characteristics from conversation or documents.
- Write legal notices, lease clauses or negotiated rent.
- Draft or send adverse-action communication.
- Obtain real consumer reports or use real applicant PII in the portfolio demonstration.
- Present a mock identity, background, access or attendance result as a real check.
- Treat a discrepancy as proof that the applicant lied.
- Treat a signed sandbox envelope as a completed physical move-in.

### Automatic work versus controlled work

| Tier | Work | Control |
| --- | --- | --- |
| Routine communication | Grounded factual answers, tour confirmations/reminders, application links and permitted status updates | Guardrails and logging; failure must produce a visible fallback |
| Screening-stage communication | Outcome-related wording, conditional terms, further-document requests and applicant messages after screening begins | Individual manager approval, with guardrails checked again at send time |
| Criteria processing | Consistent configured rules and source evidence | Deterministic code; rules still require production legal/policy review |
| Rental decision | Authorized employee reviews and decides | Recorded human action; no AI recommendation field |
| Stop / exception | Missing, unsuitable or failing evidence; blocked communication; outcome requiring external process | Human handoff; no automatic adverse notice |

Human control does not mean every routine factual reply waits for approval. Automatic coordination does not mean sensitive decisions are delegated to AI.

## 3. Production positioning, separate from demo proof

The production proposal is a background coordination layer around the company's existing systems. Its PMS/CRM, application portal, calendars, documents and approved providers remain central. Staff should receive tasks and review work through existing approved surfaces where integration allows.

The demonstration does not connect to a production PMS, send SMS, run production consumer reports or prove always-on service. It uses Telegram, Gmail, local Docker, a temporary tunnel and a display mirror to make the concept observable.

Production needs approved interfaces and contracts, contact permissions, secure evidence handling, named exception owners, retries and reconciliation, operational monitoring, backups and acceptance testing. No universal plug-in promise. We haven't approved claims that it connects to every PMS or requires no workflow change.

The blueprint separates application review, home allocation, required signatures, payment/readiness and possession. Operators differ on reservation timing and application-first versus tour-first sequencing. Adapt to their documented process instead of claiming a universal funnel.

## 4. Audience and qualification

### Initial segment hypothesis

US residential property managers overseeing roughly 50–500 homes are the project's initial working segment. This range is not a validated ideal customer profile, a minimum viable portfolio size or evidence of willingness to pay. Larger-company examples in the blueprint illustrate scale; they are not our deployment history.

Prioritize the gap and event volume over a door count. A company outside the range may have a suitable problem; one inside it may already have a good native solution.

| Qualification question | Useful signal | Signal against a custom project |
| --- | --- | --- |
| What repeats each week? | Regular inquiries, applications or signing follow-up that require handling | Very occasional leasing work with little measurable burden |
| Where does the file wait? | Clear missing handoff or owner across tools | No identified delay or ownership problem |
| What already works? | Existing software covers some steps but leaves a specific gap | Licensed/native features solve the whole identified need |
| Who decides? | A named authorized reviewer and approved criteria | Desire for automated applicant selection or an opaque AI score |
| Can systems connect? | Approved integration access and an accountable IT/security contact | Required system access is unavailable or prohibited |
| How will success be measured? | Baseline handling time, waiting work and error/exception records | Only vague interest in an AI demo |
| How will it be operated? | Staff capacity to review exceptions and own policies | Expectation that automation eliminates oversight |

### Actors and their distinct concerns

| Actor | What they need to understand | What not to assume |
| --- | --- | --- |
| Owner / principal | Whether less admin and better control justify an implementation | Personally handling every inquiry or having approved a fee |
| Operations director | Ownership, consistency, visibility and failure recovery | Wanting another standalone dashboard |
| Leasing lead / coordinator | Fewer repeated handoffs and a clearer next task | Resistance to all software or lack of existing automation |
| Application reviewer / PM | Source evidence, applicable criteria and final authority | That the model should interpret law or choose an outcome |
| IT / security contact | Permissions, data handling, system fit and accountability | That a local tunnel is a production hosting plan |
| Legal / compliance adviser | Jurisdiction-specific criteria, communication and notices | That this document certifies compliance |
| Finance / accounting | Correct fees, payments and lease/accounting handoffs | That signed equals funds settled |
| Prospect / applicant | Clear information, status and an accessible human route | That bank linking is suitable or available for everyone |

## 5. Problems and motivations

The [customer-language research](../docs/build-5-content-strategy/customer-language.md) distinguishes published tasks from inferred pain. Do not convert a likely concern into a claim that every buyer has it.

| Problem hypothesis | Work involved | Desired operational change | Proof available today |
| --- | --- | --- | --- |
| Repeated property questions | Finding and sending approved facts | Consistent factual replies without repeated lookup | Grounded demo answers and guardrails |
| Calendar back-and-forth | Checking, booking and confirming | A real booked slot reflected in the record | Cal.com demo flow |
| Scattered evidence | Reading documents and locating values | Cited facts prepared for review | Synthetic extraction tests and review card |
| Ambiguous progress | Asking staff or checking several tools | Current state and action history | Demo state, messages and Airtable projection |
| Sensitive messages leaving too soon | Drafting and checking applicant wording | Approval before screening-stage communication | Controlled demo design and manager actions |
| Signing event not reflected elsewhere | Checking envelope state and updating records | Confirmed event changes the correct application state | Sandbox Connect callback |
| Failed steps waiting unseen | Finding errors and assigning next action | Owned exception queue and recovery process | Production blueprint; not a deployed service proof |
| More volume creating more admin | Additional handling per household | Lower measured handling time at equal review quality | No client time study yet |

Practical motivations: less chasing, clearer handoffs, fewer repeated entries and confidence about who acts next. Those are benefits to test, not achieved customer outcomes.

## 6. Competitive context

Buyers are not starting from nothing. Their current PMS, leasing CRM, portals, email templates and employees may already handle much of the process. The fairest first alternative is enabling the tools they already own.

| Alternative | Why a buyer might choose it | How to position honestly |
| --- | --- | --- |
| Existing PMS / CRM functionality | Lower change burden and established records | Ask what is configured before claiming a missing feature |
| Staff, templates and checklists | Familiar, flexible and accountable | Don't dismiss employees; identify repetitive handling and preserve human judgment |
| Virtual leasing / prospect platforms | Established communication and scheduling products | Compete on fit only after discovery, not a blanket superiority claim |
| Specialist document/income providers | Verification capabilities beyond this demo | Use or recommend the right provider; do not claim equivalent fraud detection |
| Custom coordination layer | A confirmed cross-system or policy-specific gap | Implementation service hypothesis; production access and economics still need validation |

Funnel markets a virtual leasing agent with multichannel engagement and scheduling. EliseAI markets prospect management and configurable leasing flows. Snappt markets fraud detection and income verification. These are vendor descriptions, not independently verified comparisons; this build does not prove that their products lack human controls. [Funnel product page](https://funnelleasing.com/products/virtual-leasing-agent), [EliseAI prospect management](https://eliseai.com/prospect-management), [Snappt](https://snappt.com/).

Do not claim competitors all automate denials, that ours is the only human-controlled system, or that a custom build is cheaper without a scoped cost comparison. Feature availability, contracts and pricing require fresh checking for an actual prospect.

## 7. Differentiation: what can be shown

This is the emphasis of our demonstration, not a claim of unique ownership of each feature.

| Emphasis | What can be shown | Boundary |
| --- | --- | --- |
| Coordination across stages | Inquiry, booking, application, review, signing and status changes | One synthetic demonstration, not a portfolio deployment |
| Evidence before decision | Values alongside their sources and deterministic rule results | No model recommendation, no provider infallibility |
| Human authority | Manager action before the decision and sensitive messages | Approval must be substantive in production; not a rubber stamp |
| A visible stop | Criteria/exception paths hand work back instead of sending a denial | Applicable notices remain in the business's external authorized process |
| Confirmed events | Actual booking and sandbox signature callback | No proof of tour attendance, deposits or possession |
| Recoverable display | Airtable is a projection, not the decision/state authority | PMS-native visibility remains a production integration proposal |
| Existing-business fit | Detailed blueprint showing actors, systems and exception ownership | Architecture proposal, not completed connections |

## 8. Obstacles and reversals

These are response directions for later posts and conversations, not a script for arguing away legitimate concerns.

| Obstacle | Honest reversal / response direction | Evidence or required next step |
| --- | --- | --- |
| We already have leasing software | Keep it; first identify a handoff it does not already cover | Configuration and integration discovery |
| I don't want AI choosing residents | The model prepares facts; authorized staff retain decisions | Show the evidence card and recorded action |
| It could quote the wrong rent or policy | Replies use approved facts and guardrails, with a safe fallback | Demo source grounding; production freshness controls needed |
| A discrepancy could unfairly hurt an applicant | Separate evidence basis from interpretation; route uncertainty for review | Explain gross/net periods and alternatives |
| Applicants may not be able to link an account | Do not make a provider route the only assumed evidence option | Client-approved alternatives and accessible process |
| We cannot send sensitive files through chat | Use approved secure evidence systems in production | Security review; demo chat is not a production data design |
| It might match the wrong household | Identity matching must be deterministic and ambiguous matches stop | Demo reference tokens; production household identifiers required |
| What if it sends duplicate leases? | Define one authorized send and handle duplicate events safely | Test demo dedupe; validate production send/reconciliation controls |
| I don't want another app for staff | Aim to surface tasks in existing approved tools | Conditional on real integration permissions; no universal promise |
| Our PMS API isn't available | That may prevent the intended design or require a smaller scope | Confirm vendor/account access before proposing implementation |
| What if the reviewer is away? | Assign backup ownership and timed escalation | Production operating design; staff responsibility remains |
| A provider report could be wrong | Preserve source context and the human dispute/review path | Provider contract and business/legal process |
| Conditional terms can create legal obligations | The automation does not improvise them or issue notices | Authorized human/legal review |
| What if an integration fails overnight? | Waiting work needs an owner and reconciliation, not silent retries alone | Production monitoring, on-call ownership and acceptance tests |
| Signed doesn't mean ready to move in | Correct; signatures, funds, readiness and possession are separate | Blueprint milestones; latter steps not implemented in demo |
| How much will it save or cost? | Measure the baseline and scope the missing work first | No approved fee or measured ROI for this build |

## 9. Poor-fit requests and switching conditions

Decline or reframe requests for autonomous rental decisions, opaque applicant scoring, evading notices, scraping consumer reports, using sensitive real data in a portfolio demo, or portraying synthetic checks as live verification.

A business without a material coordination gap may not need this. A business without approved system access, a review owner or a workable data policy is not ready for the proposed production design.

Potential buying triggers to validate: a busy leasing period, a new centralized team, recurring file delays, newly available integration access, or an operations review that identifies duplicate handling. These are hypotheses, not events we have witnessed at client companies.

Reasons not to switch include a sufficient native solution, licensing restrictions, limited leasing volume, competing priorities and the cost of changing a stable process. Do not manufacture urgency or imply that a buyer is behind because it has not adopted AI.

## 10. Proof register

| Proof ID | Evidence | Claim allowed | Claim not allowed |
| --- | --- | --- | --- |
| P1 | Maya fictional renter flow, reference R-6343 / application A-6686 | A synthetic household was taken through the operator-run flow | A real customer applied or became a resident |
| P2 | Real Cal.com booking in the test flow | The demo booked an actual scheduling slot | Verified attendance or reduced client no-shows |
| P3 | Manager action execution 220 and lease send 221, recorded in progress notes | A person approved the tested decision and triggered sandbox lease sending | AI approved the applicant or all production decision paths passed |
| P4 | DocuSign developer-sandbox completion callback, execution 222 | A test envelope completion updated the application/unit state | Legally completed real tenancy or production signing uptime |
| P5 | Welcome mail independently found in prospect mailbox; manager notification received | Delivery was checked beyond inspecting workflow configuration | Every channel delivered, every recipient read it, or a physical check-in happened |
| P6 | Recorded 32 leasing + 19 screening + 8 form + 10 mirror checks | The project reports 69 checks across those categories | Model accuracy, fraud-detection rate, 69 production applicants or 100% reliability |
| P7 | Upsert and milestone mirror verification; clean reset recorded | A tested display projection and reset process exist | Airtable is the authoritative application database |
| P8 | Manual testing guide includes cold start and tunnel recovery | Operator preparation is documented for repeatable local testing | A production deployment or managed service SLA |
| P9 | Detailed production blueprint | A deployment proposal explains components, ownership and exceptions | All proposed integrations and controls are already implemented |

Use the [progress notes](../progress-notes.md), [manual testing guide](../docs/manual-testing-flow.md), [pipeline board notes](../docs/pipeline-board.md) and [production blueprint](../docs/production-leasing-tenant-screening-blueprint.md) to recheck evidence before recording or publication. Do not print envelope IDs, private execution payloads, personal mailbox addresses or private dashboard links in social content.

### Evidence not documented for this build

No approved client testimonial, production PM deployment, measured staff time saving, occupancy lift, vacancy reduction, applicant satisfaction result, extraction accuracy study, fraud-detection study or sustained service benchmark is documented here.

This doesn't make a claim about the author's entire business or other projects. This build only. Keep its evidence separate from any results documented elsewhere.

### Number rules

The exact optional NMHC statistic and its limitations live in the [customer-language source gate](../docs/build-5-content-strategy/customer-language.md). Never use the shorthand that 85% of rental applications are fraudulent.

Fixture amounts can explain a test calculation only if labelled synthetic. Do not turn a monthly bank-derived number into verified gross income, or a mismatch into guilt. [Plaid Bank Income](https://plaid.com/docs/income/bank-income/), [Plaid Payroll Income](https://plaid.com/docs/income/payroll-income/).

The blueprint's example capacity and vacancy arithmetic is illustrative, not achieved savings. No commercial guarantee or universal response-time SLA is approved.

## 11. Compliance and claim guardrails

Describe controls, not certification. Deterministic rules and human decisions do not automatically make a policy lawful, fair or suitable for a jurisdiction.

Do not repeat the stale claim that every rental adverse action requires the employment-style pre-adverse two-step sequence. FTC landlord guidance also identifies certain consumer-report-based conditions, not only denials, as adverse actions. Applicable requirements need business/legal review. The build never drafts or sends adverse notices. [FTC guidance](https://www.ftc.gov/business-guidance/resources/using-consumer-reports-what-landlords-need-know).

Avoid claims that a bank source cannot be altered, provider output cannot be wrong, a model catches fake paystubs, or production income verification only requires changing a Sandbox URL. Production access, permission, coverage, secure connection and approved alternatives are separate requirements.

The applicant is a person applying for housing, not a threat profile. Do not use fabricated names to stage public accusations or imply protected-class suitability. Property facts can be explained without judging who belongs in a neighborhood.

## 12. Voice and message hierarchy

### Voice

First-person builder; calm, concrete and candid about boundaries. Here's the test. Say I built, I tested or the demo recorded when supported; don't say my leasing team, our residents or my clients saved without separate approved evidence.

Avoid an AI revolution pitch, buzzwords, fear-based fraud hooks and claims that employees are the problem. Explain the tedious task and the control that makes automation usable.

### Message hierarchy for future content

1. Business event and the work it creates.
2. What the automation handles.
3. What the employee still controls.
4. Visible proof from the demonstration.
5. Relevant mock/Sandbox or production boundary.
6. A proportionate question or next step.

Business readers do not need every node. A technical audience may value the implementation detail, but keep that separate from an owner's business-outcome story.

### Reusable vocabulary

Prefer application file, source evidence, follow-up, booked tour, authorized reviewer, signed test lease, recorded action and waiting work. Use the [language inventory](../docs/build-5-content-strategy/customer-language.md) for stage-specific definitions.

Avoid best tenants, AI approval, risk score, fully compliant, fraud-proof, hands-free move-in and no humans needed. No wording trick should hide a missing capability.

## 13. Content opportunities, not a calendar

These are candidate subjects for the next planning step. They are not finished hooks, post scripts or an agreed publication sequence.

| Subject | Reader | Useful proof / asset | Necessary boundary |
| --- | --- | --- | --- |
| What happens after a listing inquiry | Leasing lead | Native form receipt and factual conversation | Telegram transport and prospect activation |
| Preparing facts without choosing tenants | Reviewer / owner | Cited extraction and criteria evidence card | Synthetic evidence; human makes the decision |
| Application versus lease | Business reader | Two distinct stages in the walkthrough | No implication that an application grants possession |
| Why a mismatch should stop for review | Reviewer | Synthetic fixture comparison | Gross/net/coverage context; no accusation |
| A manager approval that changes the record | Operations leader | Sanitized manager action and resulting state | Test-mode flow, not client process performance |
| Sent versus signed | Coordinator | Sandbox send and confirmed callback | No completed physical move-in |
| Keeping a display from becoming the truth | Operations / technical reader | Postgres state and Airtable projection | Demo architecture, not required client stack |
| How this would fit an existing PM company | Owner / executive | Production blueprint and clearly labelled workflow diagram | Proposed integration, subject to discovery |
| What happens when work cannot continue | Operations leader | Demonstrated stop plus proposed exception ownership | Separate tested branch from roadmap controls |

The existing architecture drawing is a demo asset. The production blueprint can support a new workflow map; do not offer a finished production Excalidraw map before checking that it has been created and reviewed.

## 14. Goals and invitations

Recommended content goal: establish that the author can build controlled, observable leasing coordination and can discuss how it would fit an existing business. Validate whether the audience cares about the selected handoffs.

Do not set invented lead, reach or conversion targets. Useful early signals include replies describing an actual process gap, questions about control/integration and requests for a walkthrough. These are proposed evaluation signals, not reported campaign results.

Available next-step assets: the synthetic demonstration, written production blueprint and operator testing guide. A workflow assessment conversation is a possible invitation; its scope and commercial terms still need agreement.

Do not request real applications, paystubs, SSNs, bank records or consumer reports through a LinkedIn comment or DM. Use synthetic or properly redacted process examples in an approved setting. Do not add a free audit, fixed fee, deployment deadline or guarantee without explicit commercial approval.

## 15. Recording and publication checks

- Use synthetic names and documents; generated listing images are not photographs of a real offered home.
- Keep unrelated Gmail messages, personal accounts, phone numbers, tokens and private URLs out of the recording.
- Explain Telegram as the messaging stand-in somewhere the viewer can reasonably see or hear it. The receipt can remain app-neutral without making an SMS claim.
- Identify Plaid Sandbox, mock credit/eviction, mock identity and simulated tour/access when shown.
- Identify DocuSign developer sandbox; avoid calling the test envelope a real signed tenancy.
- Show the human decision and sensitive-message approval, not only a successful final badge.
- Separate a configured action, an executed action, confirmed delivery and confirmed recipient behavior.
- Distinguish the demo architecture from proposed production components in any diagram.
- Recheck source dates and evidence before using a number or competitor capability.
- Do not imply a client result, testimonial or production compliance approval that is absent.

## 16. Source and authority notes

Structural references: maintenance-triage's Build 02 `customer-language.md` and `.agents/product-marketing.md`, located in the sibling maintenance-triage repository. Their maintenance-specific buyer cutoffs, prices and claims do not transfer to this project.

Project background: [problem statement](../05-automated-leasing-tenant-screening.md), [domain foundation](../foundation-5-leasing-screening.md), [overview](../what-we-are-building.md), [full-flow narrative](../the-full-flow.md) and [technical notes](../my_builds/05-leasing-tenant-screening/build-technical-notes.md).

Those older files contain historical descriptions. Use newer progress decisions and the corrected blueprint when they differ, particularly workflow count, mirror detail, real-versus-mock boundaries, income interpretation and rental adverse-action language.

External language sources, quality labels and bounded quotes are registered in the companion customer-language file. Competitive product descriptions above are primary supplier pages checked on 2026-09-16; they are not independent performance tests.

## 17. Handoff and change log

Completed in this task: customer-language foundation and product-marketing context.

Content plan created: [linkedin-content-plan.md](../docs/build-5-content-strategy/linkedin-content-plan.md). It specifies fifteen posts: one full current-build demo, one short using clips and original audio from the same recording, six PDF carousels and seven text posts. No standalone image posts or extra recording task.

After that plan is reviewed: draft `linkedin-post-scripts.md`. The plan is a writing/production brief, not finished copy or a published campaign.

2026-09-16 — Created Build 05 foundations from maintenance references, current leasing evidence and primary public research. Recorded unvalidated audience/commercial assumptions, separated proposed phrasing from customer quotations, defined AI/human boundaries and restricted claims to the demonstrated scope. No content published or operational system changed.

2026-09-16 — Added the content-plan handoff and the user's format contract: one master demo recording, one short extracted from that footage/audio, carousel and text support only. Scripts and production assets remain subsequent tasks.
