# How The Leasing And Tenant-Screening System Works

Last updated: 2026-09-17

This is the business-facing explanation of the finished local demo. It describes what a
property manager, leasing employee and renter experience without asking the reader to
understand workflow nodes or APIs.

There is no client deployment behind this document. Every renter, property, document and
screening result is synthetic. The build proves that the coordination pattern can run; the
production blueprint explains what a contracted company deployment would require.

## The Business Problem

Leasing looks like one process from the outside. Inside a property-management company, it is
a chain of small handoffs:

- answer the inquiry;
- find the right property facts;
- collect enough information to schedule a useful tour;
- locate a real appointment;
- follow up after the showing;
- collect the application and documents;
- prepare the evidence;
- wait for a manager;
- prepare and send the lease;
- track the signature and the next handoff.

Each task is manageable. The volume is the problem. When dozens or hundreds of households
move through the process at once, small delays become unanswered messages, duplicate work,
missing documents and applications nobody clearly owns.

The screening side creates a second problem. A number typed into a form, a number printed on
a paystub and a number reported by an outside verification source are not the same kind of
evidence. Treating them as interchangeable makes discrepancies hard to see.

This build connects those handoffs while keeping the consequential decision with a person.
It prepares work. It doesn't choose the tenant.

## The Division Of Responsibility

Three parts do different jobs:

| Part | Responsibility |
|---|---|
| AI | Interpret a renter's message, answer from approved property facts, extract cited fields from a synthetic paystub and prepare bounded wording |
| Fixed controls | Match records, choose the next fixed question, check tour policy, apply configured criteria, prevent duplicate actions and stop unsupported messages |
| Human employee | Resolve exceptions, review the application evidence, make the rental decision and authorize the lease path |

The distinction matters. An AI-generated summary isn't a rental decision. A criteria label
isn't a rental decision either. The manager reviews the file and records the decision.

## The Complete Maya Path

### 1. Maya starts on the listing

Maya opens the generated listing page for MAPLE-2B. The rent, deposit, availability, pet
policy, parking and other facts come from the same unit record the conversation will use.
That keeps the public listing and the permitted answer set aligned.

The site uses six synthetic property images created for the two demo units. It doesn't use a
live listing-service feed or claim to represent a real property.

Maya submits this question through the listing's native contact form:

> Is parking included, and do you allow a small dog?

The system creates one lead reference and associates it with the selected unit. The receipt
page says that a message has been sent. It doesn't name Telegram, advertise an assistant or
display an app-launch button.

### 2. The demo conversation is activated

Telegram stands in for a production messaging channel such as approved business SMS. A
Telegram bot cannot initiate a new private conversation before the user starts it, so the
operator activates the fresh reference in the renter chat as a disclosed demo setup step.

The reference is resolved by fixed record logic. The language model never chooses which lead
or unit Maya belongs to.

Once the reference is bound, Maya receives an answer based on the unit record. If the system
doesn't hold a requested fact, it says so and asks a person to follow up. It can't invent a
different rent, fee, deposit or availability date and send it unchecked.

### 3. The conversation collects only what is still needed

The system collects Maya's requested move-in date, stated gross monthly income, occupant
count, pet details and vehicle count. The messages can be natural. Maya can provide several
facts in one sentence instead of completing a rigid questionnaire in chat.

Two controls keep this bounded:

1. The model extracts what Maya said and answers permitted factual questions.
2. A fixed collection order decides which question remains and supplies its exact wording.

The model doesn't decide what to ask next.

This stage uses self-reported information. It is labelled unverified and exists to support
the scheduling path. Clearing it is not application approval. A renter who doesn't clear the
gate isn't sent a rental denial; the system offers appropriate next help or routes the case
to a person.

### 4. Maya asks for a tour in ordinary language

Maya can say:

> Can I come by next Tuesday at 2pm?

The system reads actual Cal.com availability and interprets the request in the property's
local time. An available exact time waits for manager approval; nothing is booked yet.
An unavailable time produces real alternatives rather than booking a different time.

Tour policy lives in a separate configuration record. Every request requires a manager
decision, with policy exceptions shown on the card. The manager taps Approve tour or types
it as an ordinary message. Reply is unnecessary. Only then can booking and confirmation run.

The one-time entry code is a labelled mock. A production self-guided tour would use an
approved identity and access provider, or the company would retain a staff-guided showing.

### 5. The manager confirms tour completion in chat

The demo does not conduct a physical showing. After the calendar booking, the manager types
Tour completed, names the resident or taps the completion button. This records synthetic
attendance with the manager's identity and timestamp; no command or script is needed.

That event changes the lead to toured and sends Maya the application link for the same lead
and unit. The system doesn't infer attendance because a calendar appointment passed.

### 6. Maya completes a realistic rental application

The application contains seven sections:

- home and carried reference;
- contact details;
- residential history;
- move-in and income;
- occupants, pets and parking;
- rental disclosures;
- supporting document and authorization.

For the demo, Maya enters synthetic information and uploads
`fixtures/paystub-maya.pdf`. The form requests a four-digit demo identity code, not a full
Social Security number. No date of birth, real bank credential or government identity
document is required.

The application is not the lease. It collects information and a synthetic authorization for
the test verification path. Submitting it doesn't approve Maya or create a contract.

### 7. The system prepares the review file

The paystub-reading step extracts the requested fields and keeps source evidence with the
values. It doesn't decide whether the document is trustworthy or whether Maya should qualify.

The build then calls Plaid's real Sandbox API. Plaid returns canned test payroll information
through its Payroll Income response. Maya does not connect a real bank or payroll account,
and the build contains no Plaid Link screen. The API interaction, response shape, parsing and
comparison are real; the person and financial data are not.

The review file separates three figures:

| Source | Meaning in this demo |
|---|---|
| Claimed income | What Maya entered on the application |
| Document income | What the extraction step read from the synthetic paystub |
| Plaid Sandbox income | What the canned Payroll Income response reported |

The credit, eviction and identity results are separate mock fixtures. They are labelled as
mock data and never presented as a real consumer report or identity verification.

### 8. Fixed criteria organize the evidence

The criteria engine reads the manager-configured thresholds and the prepared evidence. It
doesn't call a language model. It produces one of three internal classifications:

- `meets_criteria`;
- `conditional`;
- `does_not_meet`.

Each criterion includes the value and source behind it. Missing evidence remains missing.
The engine doesn't silently invent a value or convert uncertainty into approval.

The income multiple is calculated against tenant-responsible rent when rental assistance is
recorded. That arithmetic is part of the test suite. The demo does not claim that its example
criteria are lawful or appropriate for every company or jurisdiction.

### 9. A manager makes the rental decision

The manager receives a separate Telegram card. The renter and manager never share a bot or
conversation.

The card shows the application reference, unit, income sources, evidence for each configured
criterion and the engine's classification. Nothing has been sent to the applicant at this
point.

For Maya's verified path, the operator reviews the synthetic file and taps **Approve** in the
manager role. The decision record stores the action, actor and time. A repeated tap cannot
create a second lease envelope.

### 10. The approved lease goes to DocuSign Sandbox

The system fills a fixed lease template with authorized variable fields and sends it to
DocuSign's developer sandbox. The model doesn't write lease clauses or choose the rent.

Sending and signing are separate states. The record first shows that the test envelope was
sent. Maya then opens the sandbox signing link, completes the required fields and presses
Finish.

### 11. The callback closes the demonstrated path

DocuSign sends a completion callback. The workflow matches the envelope to the application,
marks the lease signed, changes the synthetic unit to leased and asks the manager to approve
the fixed welcome email. Send welcome or its button authorizes delivery; success or failure
is reported separately. Signing alone no longer sends that email.

Postgres holds the authoritative demo state. Airtable receives a phase-boundary mirror for
visibility. The mirror can fail without stopping the leasing path, and the automation never
reads operational truth back from Airtable.

The demonstrated endpoint is a confirmed sandbox signature and delivered welcome email.
It is not payment clearance, property readiness, key release, possession or a completed
physical move-in.

## The Devon Stop Path

The same screening workflow can process Devon's synthetic application. His form and paystub
report $7,800 per month, while Plaid Sandbox returns approximately $4,996.33 per month. For
the higher-rent MAPLE-5A fixture, the configured engine returns `does_not_meet` and records a
56.1% document variance.

That mismatch is a review fact, not proof of fraud. It could reflect the wrong source,
different income periods, incomplete coverage, a document problem or another explanation.

The demo takes no applicant-facing action. It records `stopped_for_human`, sends no lease and
doesn't generate, draft or send an adverse-action notice. An authorized human process would
own any real decision, applicant communication, report dispute or legally required notice.

## What AI Does

- Understands the renter's wording and extracts stated fields.
- Answers from the approved unit record.
- Reads requested facts from the synthetic paystub with source evidence.
- Prepares bounded wording that still passes fixed controls.

## What AI Never Does

- Resolve identity or select a database record.
- Set screening or tour policy.
- Decide which question comes next.
- Approve, deny, rank, score or recommend an applicant.
- Infer a protected characteristic.
- Write lease clauses or legal notices.
- Send a post-screening outcome on its own.

## How Work Stays Visible

The renter's messages, phase changes, application status, manager action, envelope and
signature state all attach to stable references. Prospect-facing correspondence is logged in
delivery order. Airtable shows one upserted row per lead rather than one row per event.

The visible pipeline milestones include New, Prequalified, Tour Booked, Toured, Applied,
manager decision, Lease Sent and Lease Signed. Optional custom Airtable views were skipped;
the existing Grid is enough for the demo.

Failure does not mean silence. A blocked or malformed conversational reply sends a safe
handoff message and alerts the manager. An unknown signature callback alerts the manager
instead of trying to send welcome information without an application. External actions are
recorded separately from attempted actions.

## What Is Real, Test-Mode And Mocked

| Capability | Demo status |
|---|---|
| Generated listing site and native inquiry form | Real local software using synthetic unit data |
| Telegram conversations and manager controls | Real messages through two separate bots; Telegram stands in for production messaging |
| OpenAI extraction and bounded conversation work | Real API calls on synthetic information |
| Cal.com availability and booking | Real cloud service and test appointment |
| Plaid Payroll Income | Real Sandbox API calls returning canned test data; no applicant connection screen |
| Credit, eviction and identity results | Mock fixtures |
| Tour entry code | Mock fixture |
| Rental application and paystub upload | Real local form with synthetic inputs and file |
| Criteria engine and human decision record | Real demo logic and recorded manager action |
| DocuSign | Real developer-sandbox envelope, signature and callback |
| Welcome email | Real delivery to the controlled test inbox |
| Airtable pipeline | Real display mirror; never the source of truth |

## What A Production Company Would Change

A production deployment would fit around the company's existing PMS, CRM, communications,
calendar, application, screening, signature, accounting and operations tools. It would not
ask the company to replace its whole stack with this demo.

Production work includes contracted provider access, secure applicant connection screens,
real screening and identity processes, approved messaging permissions, durable hosting,
monitoring, backups, role-based access and recovery. It must also handle multiple adults,
guarantors, competing applications, reservation controls, all required signers, payment
status, property readiness and possession.

Those additions are not a matter of changing one Sandbox URL. They require operating policy,
provider agreements, record authority, security review and acceptance testing.

The complete production design is documented in
[production-leasing-tenant-screening-blueprint.md](production-leasing-tenant-screening-blueprint.md).

## What The Verified Demo Proves

A genuine browser-entered Maya run completed the following path:

listing inquiry → referenced renter conversation → grounded answer → self-reported
pre-qualification → real Cal.com booking → labelled simulated tour completion → realistic
application and synthetic paystub → OpenAI extraction → Plaid Sandbox Payroll Income →
mocked screening evidence → fixed criteria → genuine manager approval tap → DocuSign sandbox
signature → callback → signed state → welcome delivery.

That proves the connected demo path works on synthetic data. It does not prove customer
savings, screening accuracy across a population, legal compliance, production reliability or
market demand. Those require a scoped pilot, measured baselines and the company's own review.
