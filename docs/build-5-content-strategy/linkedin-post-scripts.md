# Build 05 — LinkedIn post scripts

Written 2026-09-17. This is the finished writing package for the fifteen-post content plan, not a publication log. Nothing has been recorded, designed, uploaded or scheduled by this task.

## How to use this file

Copy only the text under **LinkedIn post** when preparing a caption or text post. Slide titles, bodies and footers below are final copy; visual directions and production notes are instructions, not publishing copy. Source links sit beside the claims they support. For LinkedIn, preserve the source URLs when converting Markdown links to plain text.

The package contains six carousels with 46 slides, seven text posts, one full demo video and one short cut from that same recording. There are no standalone image posts. Publish in B5-01–B5-15 order unless the content plan is revised.

The master video covers the current synthetic, operator-run demo. It does not show a deployed client system, real consumer screening, real SMS, a physical tour or a completed move-in. Telegram stands in for messaging; Plaid and DocuSign run in their test environments. Proposed production integrations are labeled as proposals.

Captions describing video events are release-gated: record and verify those events before publishing. If a fresh run fails, fix or disclose the failure; don't publish a caption that claims unseen completion. Remove personal inbox details, credentials, token-bearing URLs and unrelated messages from every frame. Don't remove mock or sandbox labels.

## B5-01 — The work between an inquiry and a lease

Format: carousel, seven slides. Purpose: introduce the business problem before the build.

### LinkedIn post

A fast reply answers the first question. It doesn't finish the leasing work.

Someone still has to arrange the tour, collect the application, organize the evidence, get a manager's decision and check whether the lease was signed.

Each handoff is small. Across a busy portfolio, the checking and chasing can occupy a large part of the day.

I built a demo around those handoffs, from first inquiry to a sandbox lease signature. The point isn't to let AI choose a tenant. It's to prepare the work, keep its status visible and leave the rental decision with a person.

This carousel shows the scope. Synthetic applicant, operator-simulated tour completion and sandbox signing. It ends at a confirmed test signature and welcome message, not physical move-in. AI extracts sourced information; configured rules check criteria; the manager decides.

### Carousel slides

#### Slide 1

Title: A fast reply isn't a signed lease.

Body: The work is in the handoffs.

Footer: Synthetic leasing demo

Visual: Bold typographic cover. Highlight “fast reply”; select “lease” once. No diagram or screenshot panel.

#### Slide 2

Title: Answer from approved facts.

Body: Not guesses. Not promises.

Footer: Property facts, not invented availability

Visual: Short statement and two-line contrast, with one gold marker phrase.

#### Slide 3

Title: Booked isn't attended.

Body: An appointment isn't proof of a visit.

Footer: Tour completion is simulated in this demo

Visual: Oversized two-line statement. Circle “Booked”; leave the explanation short and separated.

#### Slide 4

Title: An application isn't approval.

Body: Collect information. Organize documents. Prepare the review.

Footer: Evidence preparation, not a tenancy

Visual: Three unnumbered ruled rows beneath the statement. No application screenshot.

#### Slide 5

Title: AI makes the rental decision?

Body: No. The manager does.

Footer: Human authority stays explicit

Visual: The only inverted page. A large Zodiak “No.” rejects AI authority; the manager is named underneath.

#### Slide 6

Title: Sent isn't signed.

Body: Wait for the signing service to confirm completion.

Footer: DocuSign sandbox · Test lease only

Visual: Quiet lead-in above an oversized highlighted “signed.” Provider confirmation remains explicit in the short explanation.

#### Slide 7

Title: Less chasing. Clearer handoffs.

Body: Next step. Owner. Status.

Footer: Demo ends at test signing + welcome, not move-in

Visual: Strong closing statement, three short lines, personal byline and a scope-boundary footer.

### Production notes

Revised 2026-09-17 at the user's request after comparing vendor COI carousels. Use annotated typography, varied existing kit layouts and sparse copy, not screenshot panels or dense diagrams. Public slides must not carry internal build numbers. Supporting detail stays in this caption. Don't add a time-saved number. Sources: `the-full-flow.md`, newest `progress-notes.md`, and the B5-01 brief. Booking and attendance remain separate; AI never decides; signing and physical move-in remain separate. Only this seven-slide design proof is approved for production work; the other five await design acceptance.

## B5-02 — Full current-build demo

Format: one native video, target 6–9 minutes. Purpose: show the current build working without disguising its test boundary.

### LinkedIn post

I built a leasing demo from first inquiry to sandbox lease signing.

In this recording, fictional renter Maya asks about a listing, books a tour, submits a rental application and reaches a manager review. After the manager approves, the build sends a fixed lease template to DocuSign's developer sandbox and waits for signature confirmation.

AI handles bounded reading and communication work. Configured rules check criteria. A person makes the rental decision.

This is an operator-run test with synthetic data. Telegram stands in for messaging, Plaid income verification uses Sandbox, and the credit, eviction and identity checks are mocks. I simulate the tour-completed event; I don't claim that a showing happened.

The endpoint is a confirmed test signature and delivered welcome email, not payment clearance, keys or move-in.

Happy to answer questions about a particular handoff in the recording.

### Master recording rules

Record one master in S01–S12 order. The short uses only footage and audio from S08–S12. Speak the five reusable passages exactly as written below, after the relevant result is visible. Their labels are editorial directions, not spoken words.

Use the clean-run steps in `docs/manual-testing-flow.md`, including Docker, listing server and fresh tunnel recovery. Check both bot webhooks and the current callback URLs before the take. Do not reuse a cleared reference or an old manager card.

Use the actual available future Cal.com slot and verify it in property-local time. No fixed recording date is promised here. Keep asynchronous waiting in the master if useful, or cut it with an on-screen label such as “Waiting period cut.” A cut is not evidence of instant delivery.

Show the action and its result. Don't advance the narration merely because a button was clicked. Capture the manager decision once, on the fresh application. Do not click Conditional to explore an alternative during this happy-path take.

For each shot, leave a clean visual hold before and after speaking. Keep the cursor off important values. Show readable application windows, not raw configuration or a secrets-bearing terminal.

### S01 — Scope and opening

Capture: listing page, with a small persistent “Synthetic demo · Test services” label. Suggested duration: 25–35 seconds.

Narration:

“I'm going to follow one fictional renter through the leasing demo I built. We'll start with an inquiry and finish with a confirmed test lease signature and a welcome email.

This is synthetic data, not a client deployment. Telegram stands in for messaging, Plaid runs in Sandbox, and DocuSign runs in its developer sandbox. Credit, eviction and identity checks are mocks. I'll also simulate the tour-completed event. No physical move-in happens here.”

Check before moving on: disclosures readable and no claim of a real resident, screening report or signed real-world tenancy.

### S02 — Listing and inquiry

Capture: MAPLE-2B listing facts, then the native inquiry form and acknowledgment page. Suggested duration: 30–40 seconds.

Narration:

“Maya is looking at the Maple Street two-bedroom listing. The listing and the approved facts used in the conversation come from the same unit record.

Her first question is whether parking is included and whether a small dog is allowed. I'll submit that inquiry under her fictional name. The system creates a reference so the later conversation and application can stay attached to the right lead.

This acknowledgment page isn't proof that a message was received. In this demo, the prospect must start the messaging conversation with that reference. I'll show that step next.”

Input: Maya Restrepo; fabricated inquiry address from the runbook; demo phone 555-0142; question “Is parking included, and do you allow a small dog?”

Check: unit, reference and stored lead match. Don't replace the neutral acknowledgment with a bot-branded button or imply SMS was sent.

### S03 — Start the referenced conversation

Capture: prospect chat, fresh reference activation and factual answer. Crop unrelated chat history. Suggested duration: 25–35 seconds.

Narration:

“I'm starting the prospect conversation with the new reference. That link is resolved by the system, not chosen by the language model.

The reply answers Maya's parking and pet question using the approved listing facts. It can explain the property's published information; it can't invent a different rent, promise availability or negotiate terms.

This is the messaging stand-in for the demo. A production version would use the company's approved communication channels, subject to their permissions and consent rules.”

Check: the actual received reply is grounded and associated with the new lead. Don't narrate a canned answer that differs from the screen.

### S04 — Collect scheduling information

Capture: the fixed questions and Maya's self-reported answers. Suggested duration: 30–40 seconds.

Narration:

“The next questions collect the information needed for this scheduling path. Maya reports an October fifth move-in date, five thousand dollars in gross monthly income, one occupant, an eighteen-pound dog and one car.

These are self-reported answers. They haven't been verified, and clearing this pre-qualification gate isn't a rental approval.

The configured gate controls the next step and the order of questions. The model helps read the answer and respond to factual questions; it doesn't decide who gets a tour or a home.”

Inputs, sent as the chat requests them:

- “I would like to move in on October 5, 2026.”
- “My gross monthly income is $5,000 before taxes.”
- “Only me living there. I have one small dog weighing 18 pounds and one car.”

Check: recorded answers reflect the messages. Do not claim verified income here. If the next question differs, answer the requested slot; don't force this sequence.

### S05 — Book an available tour

Capture: offered slots, Maya's selection, actual Cal.com booking and its local time. Suggested duration: 30–45 seconds.

Narration:

“Maya now chooses one of the available showing slots. I'll check the date and time in the property's time zone, then confirm that the booking exists in Cal.com.

A successful API response isn't enough on its own. The renter's requested time and the calendar's recorded time need to agree.

This confirms an appointment, not attendance. The next stage remains separate until a tour-completed event is recorded.”

Input: an actual available future slot, following the runbook's notice requirements. Don't use a stale example date.

Check: one booking, correct unit and attendee mapping, correct property-local time. Hide attendee email details and private calendar information.

### S06 — Simulate the completed tour

Capture: a clear “Simulated tour-completed event” label, followed by the actual application link received. Suggested duration: 20–30 seconds.

Narration:

“For this local demo, I'm recording a synthetic tour-completed event. We haven't conducted a physical showing.

That event advances this lead to the application step and sends the application link. In a live business, the attendance event would need a trustworthy source, such as the company's showing process or an authorized employee update.

The automation shouldn't infer attendance because a calendar appointment has passed.”

Check: event and lead match, received application link opens the correct unit and reference. Hide the full token-bearing URL.

### S07 — Submit the synthetic application

Capture: seven-section form, selected filled sections, synthetic paystub upload and submission acknowledgment. Suggested duration: 45–60 seconds.

Narration:

“This is the rental application, not the lease. It collects information and authorization for review.

I'll fill it with Maya's fictional details and upload the synthetic paystub supplied with the project. The form links back to her inquiry, so the unit and reference don't have to be guessed from the document.

The demo masks sensitive identifiers on arrival. For the recording, I won't enter real personal or financial information.

Submitting the form starts evidence preparation. It doesn't approve Maya, create a contract or mean that every check has been completed.”

Input checklist:

- MAPLE-2B, fictional Maya Restrepo and the configured test-delivery email from the local runbook. Keep the real inbox address out of published frames.
- Demo phone 555-0142; synthetic identifier last-four 1234 only. Never show or enter a real SSN, date of birth or bank account number.
- Fictional addresses 88 Cedar Lane, Apt 4, Springfield and 17 Birch Court, Springfield.
- Desired move-in October 5, 2026; Northgate Dental Group; Dental Hygienist; gross monthly income 5000; assistance amount 0.
- One occupant; one 18-pound dog; one blue Honda Civic. Answer the fixture's history questions No, without implying those questions are a universal production form.
- Upload `fixtures/paystub-maya.pdf`; use the synthetic authorization wording from the runbook.

Check: fresh application reference, uploaded file recognized, required sections present. Don't show a real ID document or real consumer report.

### S08 — Review the prepared evidence

Capture: manager card with cited extraction, separate income sources, configured criteria and explicit mock labels. Suggested duration: 45–60 seconds.

Narration:

“The application is now prepared for review. The document reading step extracts values with their sources. The income result comes from Plaid Sandbox, not Maya connecting a real bank or payroll account. Credit, eviction and identity results here are mock fixtures.

The configured criteria check is separate from the model. It applies the demo's rules and shows the evidence behind the result. These aren't universal rental criteria or a legal compliance certification.

This card puts the extracted value beside its source. It prepares the evidence; it doesn't choose whether Maya gets the home.

If evidence is missing or inconsistent, that needs review. It isn't permission to invent a value or silently move the application forward.”

Reusable short passage A: “This card puts the extracted value beside its source. It prepares the evidence; it doesn't choose whether Maya gets the home.”

Check: actual values, document citations and source labels visible. Distinguish the fixture's criteria result from the manager's decision. Don't enlarge a mock score without its mock label.

### S09 — Take the manager decision

Capture: fresh application card, Approve action and recorded decision. Suggested duration: 25–35 seconds.

Narration:

“Before this tap, no lease has been sent for this application. I'm checking the application reference and reviewing the prepared file.

The manager reviews the file and makes the rental decision. I'm taking that role in this synthetic test and approving this application.

The record should show the action, its actor and the time. A criteria result alone must not masquerade as a human approval.”

Reusable short passage B: “The manager reviews the file and makes the rental decision. I'm taking that role in this synthetic test and approving this application.”

Check: correct fresh card, one tap, stored approval and subsequent workflow execution. Don't use an old keyboard as evidence of the new run.

### S10 — Send the sandbox lease

Capture: actual lease email and sandbox envelope, with recipient details and signing URL concealed. Suggested duration: 25–35 seconds.

Narration:

“The approved template now goes to DocuSign's developer sandbox. Sending the envelope isn't the same as completing the signature.

The lease text is a fixed template with approved variable slots. The language model doesn't write rental clauses or choose the rent.

I'll verify that this application has a sent envelope, then open the test signing flow. Until completion is confirmed, the record must not say signed.”

Reusable short passage C: “The approved template now goes to DocuSign's developer sandbox. Sending the envelope isn't the same as completing the signature.”

Check: envelope matches application, actual received email, sent state not signed. Preserve sandbox label throughout.

### S11 — Complete the test signature

Capture: sandbox signing screen, required fields and Finish action. Suggested duration: 25–40 seconds.

Narration:

“I'm signing as fictional Maya in the sandbox, not creating a real tenancy.

I'll complete the required signing fields and finish the test envelope. The browser's signing confirmation is one piece of evidence; the automation still needs the provider callback associated with the correct application.

I'm not treating an opened email, a clicked link or a signature drawn before Finish as completed signing.”

Reusable short passage D: “I'm signing as fictional Maya in the sandbox, not creating a real tenancy.”

Check: authorized synthetic role only, required fields complete, Finish confirmed. Don't record a real person's signature or a live lease.

### S12 — Confirm state and delivery; close the scope

Capture: actual signed state after the callback, received welcome email, manager confirmation and Airtable Grid row for the same lead. Suggested duration: 35–50 seconds, excluding asynchronous waiting.

Narration, speak the first paragraph only after both results are visible:

“DocuSign has confirmed the test signature. The record now shows signed, and the welcome email has arrived. Physical move-in is outside this demo.

The callback updates the authoritative Postgres record. Airtable is a display mirror, not the source that decides what happens next. I can also check the manager confirmation and the matching pipeline row.

That completes this test path: inquiry, booking, simulated attendance, application, human decision and sandbox signature. Payments, all required production signers, property readiness and authorized possession would need their own controls.

The next production question is where this coordination would fit around a company's existing tools. The demo proves a path can run; a pilot would need to measure whether it removes work in that business.”

Reusable short passage E: “DocuSign has confirmed the test signature. The record now shows signed, and the welcome email has arrived. Physical move-in is outside this demo.”

Check: callback evidence and signed row agree, welcome message received and not merely logged as attempted, no duplicate lead row. If the mirror is stale, label it and recover before capturing; don't claim it blocks the underlying pipeline.

### Recording acceptance gate

All twelve shots must come from the current verified run. Inspect the received messages, Cal.com booking, application record, manager action, sandbox envelope, callback, signed state and welcome inbox. The operator-controlled attendance transition remains labeled. Keep a private evidence log; never publish raw secrets or a real inbox export.

Full-video duration is an editorial target, not a processing-time claim. Keep the complete sequence truthful even if the final edit runs longer. Record the actual S08–S12 in/out timestamps afterward for B5-08; this file does not invent timestamps for unrecorded footage.

## B5-03 — Pre-qualification isn't a rental decision

Format: text. Purpose: distinguish the scheduling gate from application review.

### LinkedIn post

“Pre-qualified” and “approved” shouldn't mean the same thing in a leasing workflow.

In my demo, the first stage uses what the prospect tells us: desired move-in date, income and a few details needed for the scheduling path. Those answers help route the conversation. They aren't verified application evidence.

The application comes later. It supplies information and documents for review, with separate sources and a record of what was checked.

Then a manager makes the rental decision.

Those three stages need different labels because people act on them differently. If a scheduling gate looks like an approval, a renter can receive the wrong impression and an employee can skip work that hasn't happened yet.

The same distinction matters on an exception path. Not clearing the demo's scheduling gate doesn't send a rental denial. It offers an alternative path or a human handoff.

This is one configured demo sequence, not a claim that every PM company must require a tour before an application. The order should fit the business. The meaning of each status still needs to be clear.

### Production notes

No asset required. Keep the distinction between self-reported scheduling information, evidence review and human decision. Don't add a universal income threshold or present a pre-qualification outcome as an adverse-action process.

## B5-04 — Prepare the evidence; don't choose the tenant

Format: carousel, eight slides. Purpose: make the division of labor visible.

### LinkedIn post

The manager shouldn't have to accept an unexplained AI conclusion.

For this build, I separated document reading, configured criteria and the rental decision.

The reading step returns a value with its source. The criteria check applies the configured rules and records the evidence behind each result. The manager reviews the file and decides.

That separation makes the system easier to inspect. A wrong extracted value, a missing document and a disputed rule aren't the same problem, so they shouldn't disappear into one score.

The card in this carousel is from a synthetic demo. It shows the review pattern, not verified information about a real renter.

### Carousel slides

#### Slide 1

Title: Prepare the evidence. Don't choose the tenant.

Body: The review card organizes a synthetic application. It gives the manager a way to inspect the file without asking AI to make the rental decision.

Footer: Synthetic evidence · Human decision

Visual: Review card cropped for readability, retaining all relevant source labels.

#### Slide 2

Title: Start with the reading work

Body: Documents arrive in different formats. Reading them can produce useful fields, but every extracted value needs a source the reviewer can check.

Footer: Extraction is preparation, not approval

Visual: Paystub section connected to its extracted value. Use only the synthetic fixture.

#### Slide 3

Title: Three jobs, three boundaries

Body: AI reads bounded material. Configured rules check criteria. A manager reviews and decides. Each result stays distinct so one role can't quietly replace another.

Footer: Read → check → human decision

Visual: Three separate boxes; only the third carries the rental decision.

#### Slide 4

Title: A value needs its citation

Body: The card links the extracted amount to the document field behind it. The reviewer can inspect the evidence instead of trusting a detached number.

Footer: Value + document + field

Visual: Annotate one actual citation from the verified synthetic card; don't invent a source location.

#### Slide 5

Title: The rules aren't a model opinion

Body: The criteria check uses manager-configured thresholds and evidence. It records which rule was evaluated; those demo rules aren't universal legal requirements or production policy.

Footer: Configured criteria, not an AI recommendation

Visual: A criterion and its evidence, clearly separated from the decision controls.

#### Slide 6

Title: No ranking. No hidden recommendation.

Body: The model doesn't score applicants, label risk or recommend approval. Uncertain or missing evidence needs review, not a confident-sounding guess about the person.

Footer: AI stays inside bounded tasks

Visual: Show allowed extraction outputs; don't add a fictional risk gauge even as decoration.

#### Slide 7

Title: Record who decided

Body: The manager's action is stored with the actor and time. The audit trail distinguishes a criteria result from an authorized person's rental decision.

Footer: Decision ownership stays visible

Visual: Fresh manager action and matching recorded state; conceal unrelated identifiers.

#### Slide 8

Title: Make each part reviewable

Body: A disputed value goes back to its source. A rule belongs to policy review. The rental decision belongs to the manager, not the model.

Footer: Separate responsibilities make errors easier to locate

Visual: Recap value, rule and decision as three independent review points.

### Production notes

Use S08–S09 frames from the master, with explicit synthetic and mock labels. Don't imply the demo includes a live bureau integration. This describes the build's design boundary, not a certification that any screening policy is lawful.

## B5-05 — The booking worked. The time was wrong.

Format: text. Purpose: show a real development failure and its operational lesson.

### LinkedIn post

The booking request succeeded. The showing time was wrong.

During a controlled test of my leasing demo, a request for 2 p.m. became a 9:30 a.m. booking. Nothing about the successful request told me the business result was correct.

The problem was how a date-time without a time zone was interpreted. The prospect meant property-local time; the container treated the value differently.

I corrected that conversion and checked the requested time against the calendar's recorded time in the property's time zone.

That's a more useful test than “Did the automation run?” It checks whether the result matches what the person asked for.

A production rollout would also need checks for daylight-saving changes, notice requirements and time zones across the portfolio. A successful test of one slot doesn't prove every scheduling case.

This wasn't a client missing a real showing. It was a demo defect caught while testing. But it explains why I want evidence from the calendar itself, not only a green execution status.

### Production notes

No new recording required. Source: recorded timezone defect and correction in `progress-notes.md`. Don't manufacture a resident complaint or imply a production incident. If using the earlier defect as an example, preserve the distinction between that test and the corrected master run.

## B5-06 — Permission changes as the application progresses

Format: carousel, seven slides. Purpose: explain automatic messaging versus individual human approval.

### LinkedIn post

Not every message in a leasing process needs the same permission.

A factual answer about the listing is different from a message about an application outcome. Treating both as interchangeable makes the workflow harder to control.

This demo uses two messaging tiers. Approved factual and routine coordination messages can send after checks. Once screening begins, applicant-facing messages need a manager's individual approval.

The check runs again at send time, including after an edit. Approval isn't a reason to skip the last check against current information.

These slides explain the configured boundary. They don't claim that every possible message or legal exception has been tested.

### Carousel slides

#### Slide 1

Title: Who can send what?

Body: Permission depends on the message and stage. A routine listing answer and an application-outcome message shouldn't pass through the same approval path.

Footer: Build 05 messaging boundaries

Visual: Two labeled lanes, Tier A and Tier B, not “safe people” versus “risky people.”

#### Slide 2

Title: Factual answers can move quickly

Body: Tier A permits answers grounded in approved property facts. Checks block invented terms, unsupported commitments and content outside the assistant's allowed role.

Footer: Automatic only after guardrail checks

Visual: Question → approved facts → check → factual reply.

#### Slide 3

Title: Routine coordination has a lane

Body: Tour confirmations, reminders and application links can use the permitted automatic path. The message still needs the right recipient, reference and current facts.

Footer: Routine doesn't mean unchecked

Visual: A confirmation and an application-link example, with references concealed.

#### Slide 4

Title: Screening changes the permission

Body: Applicant-facing screening messages, outcome wording, conditional terms and requests for further documents require individual human approval. They aren't routine factual replies.

Footer: Tier B · Manager approval required

Visual: Draft paused at a clearly marked human review point.

#### Slide 5

Title: Approval needs an owner

Body: The record captures the authorized person's action and time. A model-generated draft or criteria result doesn't count as permission to send an outcome message.

Footer: Human approval is a recorded event

Visual: Manager action → audit entry, kept separate from AI output.

#### Slide 6

Title: Check again before sending

Body: A manager may edit the wording, and the record may change. The send-time check evaluates the final message against the information available now.

Footer: Approval doesn't bypass the final check

Visual: Edit → current-state check → send or visible exception.

#### Slide 7

Title: A stop must stay visible

Body: A blocked message needs a safe fallback and human alert, not silence. This demo never generates or sends adverse-action notices; that process stays outside automation.

Footer: No silent failure. No automated legal notice.

Visual: Failure path to fallback and manager alert, not a disappearing arrow.

### Production notes

Don't stage a Conditional decision to illustrate document collection: in the current build, that action can start the sandbox lease path. Use diagram copy to explain message permissions. No legal notice wording, invented approval policy or universal two-step notice claim.

## B5-07 — Start with the software the company already has

Format: text. Purpose: establish production fit without selling another application by default.

### LinkedIn post

Before adding automation to a PM company's leasing process, I'd ask what its existing software already handles.

Applications, documents, showing calendars and leases may already have a home. Building a second version of those features can add another place to check instead of removing work.

The useful starting point is a specific handoff that still needs attention. Who checks that an application is ready? Where does the manager see the review? Who follows up when a lease is sent but not signed?

If the current software solves the problem, use it. If a gap remains, check its integration options, permissions and data quality before deciding what to build around it.

My local demo uses a listing site, messaging stand-ins and a display board to prove the coordination path. It isn't connected to a client's property management system.

The production objective would be to return statuses, tasks and exceptions to the tools employees already use wherever supported. That requires discovery; it isn't a promise that every PMS can connect without changes.

Which handoff still needs a person to check another system before the work can continue?

### Production notes

No asset required. The closing question asks about a process, not sensitive applicant records. Avoid claims of universal PMS compatibility, zero employee change or a deployed integration.

## B5-08 — Review, decision, signature

Format: one short, target 45–60 seconds. Purpose: excerpt the master recording, not create a second demo.

### LinkedIn post

This is the review-to-signature portion of my leasing demo.

The evidence card prepares the file. The manager makes the rental decision. A fixed template goes to DocuSign's developer sandbox, and the record changes to signed after completion is confirmed.

I cut this clip from the full recording, using its original footage and narration. It's a synthetic, operator-run test—not a live tenant approval or real tenancy. I've cut and labeled waiting periods; the clip isn't a processing-time claim.

AI doesn't choose the tenant. Physical move-in remains outside this demo.

### Primary short edit sequence

Use these passages verbatim from the original audio. Do not record them again. Durations below are planned edit allocations, not source timestamps. Log the actual source in/out points after the master is recorded.

| Beat | Planned allocation | Source footage | Exact original-audio passage | On-screen text |
| --- | --- | --- | --- | --- |
| Evidence | 10 seconds | S08, value and citation visible | This card puts the extracted value beside its source. It prepares the evidence; it doesn't choose whether Maya gets the home. | Synthetic demo · Prepared evidence |
| Human decision | 11 seconds | S09, review and fresh approval | The manager reviews the file and makes the rental decision. I'm taking that role in this synthetic test and approving this application. | Manager decides · Synthetic test |
| Sent, then signing | 16 seconds | S10 envelope, then S11 signing action | The approved template now goes to DocuSign's developer sandbox. Sending the envelope isn't the same as completing the signature. I'm signing as fictional Maya in the sandbox, not creating a real tenancy. | DocuSign developer sandbox · Sent ≠ signed |
| Confirmed completion | 13 seconds | S12 actual signed state and received welcome email | DocuSign has confirmed the test signature. The record now shows signed, and the welcome email has arrived. Physical move-in is outside this demo. | Confirmed test signature · Welcome received |
| Scope hold | 5 seconds | Hold the final verified S12 frame; no new scene | No additional spoken line; retain the original recording's room tone or silence. | Not a live tenancy · No physical move-in |

Total target: 55 seconds. Adjust within 45–60 seconds for the original speaking pace without speeding audio to an unnatural rate or cutting away needed disclosure. If the narration alone requires longer, favor a truthful cut over forcing the target.

Keep “Synthetic demo · Sandbox” visible from the first frame; the short cannot rely on the master's introduction. Caption the original speech accurately. Crop or reframe original footage for a readable short; no stock footage, new performance, new voiceover or fake confirmation screen.

At a cut across asynchronous waiting, add “Waiting period cut.” Put that label at the transition, not only in the caption. Preserve the distinction between the browser signing action and the later confirmed state.

### Fallback if the callback footage cannot be used

Produce only one short. If S12 doesn't prove completion or is unreadable, narrow that one short to evidence review → human approval → envelope sent. Don't use the primary caption or claim a confirmed signature.

Fallback caption:

“This clip shows the review-to-send handoff in my leasing demo.

The evidence card prepares the file. The manager makes the rental decision. After that approval, a fixed template goes to DocuSign's developer sandbox.

It doesn't show confirmed signing. Sent and signed remain separate states.

This is original footage and narration from the full demo recording, using a fictional applicant and test services. AI doesn't choose the tenant, and this isn't a real tenancy.”

Fallback edit: use A, B and C from S08–S10, about 30–40 seconds of original speech; add readable holds from those same shots to reach about 45 seconds. Persistent disclosure: “Synthetic demo · DocuSign sandbox.” End text: “Envelope sent · Signing not shown.” No new voiceover. Do not fill the gap with a still claiming signed.

### Production notes

Release primary only if the master passes S08–S12 checks. Use one caption and one final export, never both versions as separate posts. Actual timestamps and export are later tasks. The five reusable passages above appear in the full-demo narration so this short requires no separate recording.

## B5-09 — A different income number isn't a verdict

Format: carousel, eight slides. Purpose: explain source reconciliation without a fraud story.

### LinkedIn post

Two income numbers can differ without either one proving dishonesty.

One may be self-reported gross monthly income. Another may reflect net deposits into a connected account. A third may come from a pay period that needs conversion.

Plaid distinguishes bank-income information based on net income from payroll-income information that includes gross income. Those definitions matter before comparing a number with a rental criterion. [Bank income documentation](https://plaid.com/docs/income/bank-income/), [payroll income documentation](https://plaid.com/docs/income/payroll-income/).

For my demo, the income result is Sandbox data and the paystub is synthetic. I don't present a mismatch as fraud or ask AI to decide what it means about the applicant.

The review needs to compare like with like—and leave an unresolved discrepancy visible for a person.

### Carousel slides

#### Slide 1

Title: A different income number isn't a verdict

Body: Before drawing a conclusion, check what each number measures, where it came from and which period it covers. A discrepancy needs explanation, not accusation.

Footer: Evidence review, not applicant judgment

Visual: Two source-labeled amounts without red warning labels or a risk score.

#### Slide 2

Title: Keep the sources separate

Body: Self-reported income, a document amount and a provider result are different evidence sources. Preserve each source instead of overwriting them with one unexplained number.

Footer: Reported · Document · Provider

Visual: Three parallel evidence cards; use labels, not invented applicant values.

#### Slide 3

Title: Gross and net aren't interchangeable

Body: Bank deposits can reflect net income. Payroll information can include gross income. Comparing them directly can create a discrepancy that comes from definitions, not dishonesty.

Footer: Source: Plaid bank-income and payroll-income documentation

Visual: Gross pay → deductions → net deposit. Link the two official sources in the caption or PDF source note.

#### Slide 4

Title: Match the period

Body: A pay-period amount isn't a monthly amount. Check frequency and the conversion basis before comparing a document value with a monthly requirement.

Footer: Period and frequency belong beside the value

Visual: Pay-period label, frequency and monthly basis as separate fields; no universal formula for every income type.

#### Slide 5

Title: Check coverage, too

Body: A connected account may not contain every deposit or income source. Check the evidence's coverage before treating an incomplete view as the applicant's total income.

Footer: An incomplete source isn't a complete financial picture

Visual: Source coverage boundary with an unresolved item, not fabricated bank-account details.

#### Slide 6

Title: Give the discrepancy an owner

Body: A reviewer checks the difference and uses approved evidence alternatives where policy permits. Any further-document message follows the human-approval path once screening has begun.

Footer: Review first · Approved communication

Visual: Discrepancy → manager review → approved next step. Don't draw an automatic rejection branch.

#### Slide 7

Title: The demo uses test evidence

Body: Maya's paystub is synthetic and the income result comes from Plaid Sandbox. This demonstrates evidence handling, not a real bank connection or verified consumer income.

Footer: Synthetic paystub · Plaid Sandbox

Visual: Fixture and Sandbox labels, no simulated bank login presented as real.

#### Slide 8

Title: Compare like with like

Body: Preserve source, definition, period and coverage. If the difference remains unresolved, keep it visible for human review. AI doesn't issue a rental decision or fraud label.

Footer: Better evidence organization, not a hidden verdict

Visual: Four check labels feeding review, with human decision outside the comparison box.

### Production notes

Sources checked 2026-09-17: [Plaid bank income](https://plaid.com/docs/income/bank-income/) and [Plaid payroll income](https://plaid.com/docs/income/payroll-income/). These support the definitions, not a universal provider selection; current Plaid guidance directs new US integrations toward its applicable consumer-report products. Production selection requires a separate review of product eligibility, permissions and legal obligations.

This post does not prescribe screening criteria or a notice process. If a consumer report affects an unfavorable rental action, the business must handle its applicable obligations with authorized people. See [FTC landlord guidance](https://www.ftc.gov/business-guidance/resources/using-consumer-reports-what-landlords-need-know). Don't add an automated denial or claim that a single discrepancy determines the outcome.

## B5-10 — Five rows didn't mean five prospects

Format: text. Purpose: distinguish operational records from repeated display writes.

### LinkedIn post

One lead appeared several times on the demo's pipeline board.

The cause wasn't a rush of new inquiries. The mirror created a new row each time the same lead reached another phase.

That makes a board look busy, but it makes the work harder to understand. Which row is current? Did the person apply twice? Which status should an employee trust?

I changed the mirror to update the row using the lead's stable identity, and limited writes to meaningful phase changes. The latest application information belongs with the lead. It shouldn't create another apparent prospect.

Postgres remains the authoritative record in this build. Airtable displays the pipeline; the workflow doesn't read it back to decide what happens next. A stale or failed mirror write must not stop the underlying process.

This was a development defect, not evidence that a client's reporting was wrong. The lesson is about the board's meaning: repeated activity and a new person are different events.

A visible status is useful only if people can tell what it represents.

### Production notes

No asset or new Airtable view required. Source: mirror duplicate-row diagnosis and upsert/phase-boundary changes in `progress-notes.md`. “Several” deliberately avoids presenting an arbitrary display count as a business metric. Don't imply Airtable is the production system of record.

## B5-11 — Signed doesn't mean move-in ready

Format: carousel, eight slides. Purpose: define the operational boundary after signing.

### LinkedIn post

A signed lease and permission to take possession are different milestones.

A production process may still need all required signatures, confirmed funds, a ready unit and any policy-required checks before access is released.

Those steps need their own owners and evidence. A signature callback shouldn't quietly stand in for all of them.

My current demo stops after a confirmed sandbox signature and a welcome email. It doesn't clear payments, inspect the home, complete every production signer or issue real access.

This carousel shows the additional controls a production design would need to define. The exact sequence belongs to the company's policy and applicable requirements, not a generic automation template.

### Carousel slides

#### Slide 1

Title: Signed doesn't mean move-in ready

Body: Lease completion is one milestone. A production process needs separate evidence for the other conditions that must be met before the resident can take possession.

Footer: Production considerations · Not current demo features

Visual: Signed milestone followed by explicitly proposed readiness checks.

#### Slide 2

Title: Start with the recorded decision

Body: The authorized person's rental decision must be clear. Document preparation and a criteria result don't replace that decision or its recorded conditions.

Footer: Decision owner and terms stay explicit

Visual: Human approval record at the start of the post-decision lane.

#### Slide 3

Title: Confirm the allocation or hold

Body: The business needs a policy for unit allocation and any holding period. Automation shouldn't promise exclusive availability unless the authorized system and policy support it.

Footer: Business policy controls the hold

Visual: Unit record and authorized allocation event; label as proposed production integration.

#### Slide 4

Title: Check all required signatures

Body: Completion must mean the signers required for that transaction have finished. One applicant's signature isn't evidence that every required party has executed the lease.

Footer: Demo signature ≠ every production signer

Visual: Required-signers checklist without asserting a universal number of signers.

#### Slide 5

Title: Confirm required funds separately

Body: Where funds are required before possession, use the approved accounting or payment record. A lease callback doesn't prove receipt, clearance or a reconciled balance.

Footer: Payment status comes from its authorized source

Visual: Accounting confirmation as a separate input; no fake paid screenshot.

#### Slide 6

Title: Check readiness under company policy

Body: Unit readiness, insurance and access arrangements may need confirmation. Assign the relevant checks to the right team; don't infer completion from a signed document.

Footer: Requirements vary by policy and location

Visual: Proposed operations checklist with an owner beside each applicable item.

#### Slide 7

Title: Release possession through an authorized step

Body: Once applicable conditions are confirmed, an authorized employee or controlled process can release possession. Access shouldn't be triggered by signing alone without that authority.

Footer: Authorized handoff, not automatic assumption

Visual: Readiness gate leading to an authorized handoff; no live lock code.

#### Slide 8

Title: Here is the demo boundary

Body: The current build confirms a sandbox signature and welcome delivery. Payments, physical readiness and possession are production design topics, not completed features in this demo.

Footer: Test signature → welcome · Physical move-in excluded

Visual: Bold boundary between verified demo endpoint and proposed later controls.

### Production notes

Use diagrams, not fabricated operational screenshots. Don't imply a welcome email certifies readiness or that a mock access value grants possession. The production blueprint supplies the proposed control pattern; the live demo supplies only the narrower endpoint.

## B5-12 — A blocked reply still needs a response

Format: text. Purpose: describe a controlled guardrail failure without repeating sensitive prompts.

### LinkedIn post

The reply tried to refuse a question. The guardrail blocked the refusal.

During a controlled test, the model repeated part of a restricted subject while saying it couldn't answer. That wording triggered the outgoing check, so the prospect received nothing.

The safety boundary was still needed. The failure was letting a blocked message become silence.

I changed the refusal instruction so it doesn't repeat the restricted subject, and added a fixed fallback with a manager alert for failed paths. The fallback avoids invented figures, commitments and sensitive content.

That doesn't turn the demo into a staffed support queue. It gives the operator a visible handoff instead of leaving the conversation hanging.

In production, the next questions would be operational: who owns that exception, where do they see it and what happens if they don't pick it up? An alert without an owner can still be missed.

The test reminded me that blocking an unsafe reply is only part of the behavior. The system also needs a safe way to say that a person needs to take over.

### Production notes

No reenactment or separate recording. Source: guardrail refusal and fallback entries in `progress-notes.md`. Don't repeat the restricted prospect question, manufacture a resident complaint or claim a staffed escalation SLA. Distinguish current manager alert from proposed production assignment and escalation controls.

## B5-13 — Fit the coordination around the existing business

Format: carousel, eight slides. Purpose: explain the proposed production system without pretending the demo is deployed.

### LinkedIn post

The production goal isn't “give the team another dashboard.”

It's to connect the handoffs around the systems the company already uses, then return the next task or status to the right place wherever the integrations support it.

Property facts stay with their authorized source. Applications and evidence stay in approved systems. People keep decision authority. The coordination layer handles supported events, routing and visible exceptions.

This is a proposed production design, not an existing client integration. The local demo proves a narrower path with test services and stand-ins.

I've written the production blueprint for discussing this fit. It starts with the business process; the actual connection choices would follow discovery of the company's tools, permissions and remaining gaps.

### Carousel slides

#### Slide 1

Title: Fit the automation around the business

Body: A production design should connect the company's existing leasing work, not duplicate every tool or force employees to monitor a separate application for each handoff.

Footer: Proposed production design · Integration-dependent

Visual: Existing systems around a coordination layer; no claim of a deployed client architecture.

#### Slide 2

Title: Keep property facts authoritative

Body: The approved PM or CRM source supplies unit facts and stable identities. Updates must follow its authority; the model doesn't invent availability or choose records.

Footer: Existing source → approved facts and identifiers

Visual: Authoritative property source feeding a bounded factual-answer process.

#### Slide 3

Title: Use approved communication and calendars

Body: Supported email, messaging and calendar tools carry replies and appointments. Consent, account permissions and local-time rules determine which actions the automation may take.

Footer: Existing channels where supported

Visual: Communication and scheduling lanes connected to the same lead identity.

#### Slide 4

Title: Keep evidence in approved systems

Body: A secure application portal and eligible verification providers supply evidence. Access, retention and purpose need review before connecting sensitive applicant information to any automation.

Footer: Proposed integrations · Not real consumer data in the demo

Visual: Application system and approved provider inputs, with restricted-access boundary.

#### Slide 5

Title: Coordinate events and exceptions

Body: The coordination layer tracks supported events, next steps and failures. Missing evidence or a failed action produces owned work, not a status that silently looks complete.

Footer: Event → next step or assigned exception

Visual: One normal branch and one visible exception branch with ownership.

#### Slide 6

Title: People retain decision authority

Body: Authorized employees review the evidence and make rental decisions. AI can prepare bounded material, but it doesn't rank applicants or approve outcomes on their behalf.

Footer: Human review remains a distinct handoff

Visual: Prepared evidence into human review; separate approval before controlled downstream actions.

#### Slide 7

Title: Return work to the team's tools

Body: Where supported, tasks, statuses and exceptions appear in the existing operational system. Employees see who owns the next step without hunting across unconnected messages.

Footer: Requires supported writeback and agreed ownership

Visual: Coordination output returning to an existing task or record; label as proposed.

#### Slide 8

Title: Discover the gap. Pilot the fit.

Body: Check native features first, then permissions and integration limits. Pilot one useful path and measure remaining manual work before expanding the design across the portfolio.

Footer: Demo proof is not a production rollout

Visual: Discovery → scoped pilot → measured decision to expand or stop.

### Production notes

Use a simplified teaching diagram drawn from `docs/production-leasing-tenant-screening-blueprint.md`. No finished production Excalidraw map is claimed. Keep the “proposed” label on every slide; don't substitute logos that suggest integrations have been built. The written blueprint exists, but compatibility, client permissions and pilot results do not.

## B5-14 — What the 69 checks tell me

Format: text. Purpose: state verification evidence without turning it into an accuracy statistic.

### LinkedIn post

I don't want to present 69 checks as “69 renters tested” or “99% accurate.”

The leasing build's recorded checks cover different pieces: 32 leasing checks, 19 screening checks, eight application-form checks and ten pipeline-mirror checks.

Some check routing or a stored value. Others check a form behavior or a display update. They aren't 69 complete renter journeys, and they don't measure model accuracy.

The end-to-end evidence is a separate question. For the tested path, I checked received messages, the calendar booking, the stored application, the manager action, the sandbox signing callback and welcome delivery.

That supports a narrow claim: the recorded synthetic path ran and the inspected outputs matched the checks. It doesn't prove a client rollout, a reduction in staffing or every exception a production business could encounter.

For a pilot, I'd measure the work still left to people: handling time, follow-up effort, waiting at each handoff, unresolved exceptions and whether statuses match the source systems.

Checks help explain what was verified. Their count shouldn't replace that explanation.

### Production notes

Source: recorded verification summaries and separate execution evidence in `progress-notes.md`. Keep the 32 + 19 + 8 + 10 breakdown intact. No accuracy percentage, client outcome, handling-time reduction or assertion that all checks were complete end-to-end cases.

## B5-15 — Start with one handoff worth fixing

Format: text. Purpose: one business invitation grounded in discovery.

### LinkedIn post

The best starting point for a leasing automation discussion isn't a list of AI features.

It's one handoff the team still has to chase.

Maybe someone checks whether an application is ready for review. Maybe the manager's decision lives in a message that another employee has to copy elsewhere. Maybe lease follow-up means opening a second system to find out whether anything changed.

The answer may be a feature already in the company's software. It may be a process change. Or there may be a useful integration gap to fill.

My leasing demo shows one synthetic path from inquiry to a sandbox signature. The production blueprint explains a wider design, but neither replaces discovery of how your company works today.

If you lead a PM team and want to discuss one of those gaps, DM me the systems involved, who owns the step and where the work waits. A short, non-sensitive process description is enough—please don't send applicant documents, bank information or consumer reports.

We can start by identifying the handoff before deciding whether anything new needs to be built.

### Production notes

One invitation only: a DM about a non-sensitive operational gap. Don't append a second request to comment, download, book or buy. No free implementation promise, fabricated pricing, guaranteed delivery date, finished workflow-map offer or permission to share applicant records.

## Release checklist

- All fifteen captions remain aligned with their evidence and scope. The six carousels contain 7, 8, 7, 8, 8 and 8 slides respectively.
- The full demo is one master recording. The short uses only its original footage and audio, with its own visible test disclosures.
- Video captions are checked against the final recorded events. Primary and fallback short versions are alternatives, not two posts.
- Carousel PDFs and video exports remain later production work. Inspect legibility, captions, disclosures and privacy before uploading.
- No mock becomes a real verification claim. No criteria result becomes an AI rental decision. No signing event becomes a physical move-in claim.
- No automation generates or sends an adverse-action notice. Production obligations remain an authorized human process.
- External definitions retain their primary-source links. Before upload, verify the current composer accepts the intended files; [LinkedIn document guidance](https://www.linkedin.com/help/linkedin/answer/a519831) supports document posting, not a promised reach advantage.
- Keep the local testing evidence private. Publish neither environment variables nor signing URLs, callback secrets, real inbox identifiers or unrelated messages.

## Writing references and change log

This package follows `linkedin-content-plan.md`, `.agents/product-marketing.md` and `customer-language.md`. Build behavior comes from the newest `progress-notes.md`, the manual testing flow and the pipeline notes. Production-only considerations come from the written production blueprint, not assumed live functionality.

The copy uses the existing offer-positioning matrix, a before/after/bridge structure for the demo, evidence-specific hooks and a final plain-language edit. Hook exploration and editorial QA are working notes, not extra posts or new claims.

2026-09-17 — Completed fifteen posts, 46 exact carousel slides, twelve-shot full-demo narration and the single-short original-audio edit brief, including a narrower fallback. No recording, graphic design, exports, publishing or runtime changes performed.
