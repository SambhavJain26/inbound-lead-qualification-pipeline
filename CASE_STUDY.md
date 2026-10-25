# Case Study: Autonomous Leasing, Tour Scheduling & Fraud-Proof Tenant Screening Engine

> *A comprehensive portfolio case study detailing the architecture, engineering decisions, and operational impact of an enterprise leasing and tenant screening automation engine.*

---

## Project Hero

* **Project Title**: Autonomous Leasing, Tour Scheduling & Fraud-Proof Tenant Screening Engine
* **Subtitle**: An enterprise n8n and PostgreSQL automation pipeline that compresses inquiry-to-lease velocity, eliminates paystub fraud via Plaid payroll verification, and routes mobile approvals to managers with automated DocuSign execution.
* **Role**: Lead Workflow Automation Architect & Backend Engineer
* **Timeline**: 3 Weeks (Architecture, Third-Party API Integrations, Workflow Orchestration, and Verification)
* **Stack**: n8n v2.x (Self-Hosted Docker), PostgreSQL 16 (Authoritative State Store), DocuSign Connect API (Envelopes & Webhooks), Cal.com API (Tour Scheduling), Plaid API (Payroll Income Verification), Dual Telegram Bots, Airtable API (Pipeline Mirror), Node.js v18+, Docker Compose
* **Project Type**: Enterprise Operations Automation / Resident Acquisition & Risk Engineering

---

## Executive Summary & Impact

Residential leasing teams face a chronic dilemma: respond fast to sign renters before competitors do, or take days manually vetting paystubs to prevent costly tenant fraud. The average apartment takes **34 to 41 days to lease**, burning **$55 to $60 daily in lost rent**. Meanwhile, the National Multifamily Housing Council (NMHC) reports that **85% of property operators have received falsified paystubs**, with fraudulent applications causing **23.8% of all tenant evictions**.

This system resolves that conflict by automating the entire pipeline with strict human-in-the-loop oversight and automated payroll cross-referencing.

```
┌─────────────────────────────────┐   ┌─────────────────────────────────┐   ┌─────────────────────────────────┐
│     < 30s Lead Response Time    │   │     85%+ Fraud Exposure Cut     │   │   100% Human Decision Gate      │
│  24/7 instant FAQ and booking   │   │  Direct Plaid payroll check     │   │  Single path to lease guarantees│
│  captures after-hours renters   │   │  stops forged paystub scams     │   │  zero autonomous contract sends │
└─────────────────────────────────┘   └─────────────────────────────────┘   └─────────────────────────────────┘
```

* **Lead Response Time Cut to Under 30 Seconds**: Provides instantaneous, hallucination-free answers to prospective renter questions at any hour, booking tours directly into available calendars.
* **Neutralized 85%+ Paystub Fraud Risk**: Automatically cross-references applicant-uploaded paystubs against authoritative Plaid payroll data, flagging income variances over 10% before lease creation.
* **100% Guaranteed Human Decision Gate**: Bounded Fair Housing compliance architecture ensures that only authorized human managers can approve applications or trigger DocuSign envelopes.
* **Automated E-Signature & Welcome Packet Logistics**: Automatically populates legal lease templates upon manager approval, tracks DocuSign Connect signing webhooks, and dispatches move-in logistics.

---

## The Problem & Business Context

### 1. The Speed Penalty: Vacancy Burn
A prospective renter browsing apartment listings at 10:30 PM typically submits inquiries on four or five listings simultaneously. Inquiries arriving outside office hours usually wait days for a response. By the time a leasing coordinator calls back on Monday, the renter has already toured and applied elsewhere.
* Average time to lease an apartment: **34 to 41 days**.
* Daily vacancy loss: **$55 to $60 per day** in unrecoverable gross rent.

### 2. The Application Fraud Epidemic
Advances in online graphic editors and paystub generation websites have turned application fraud into an enterprise crisis:
* **93%** of rental housing operators experienced fraud in the past year (*NMHC National Survey*).
* **85%** received falsified paystubs or altered bank statements.
* **75%** cite forged income documents as their primary operational risk.
* **23.8% of tenant evictions trace directly back to fraudulent applications**.
* Evicting a non-paying fraudulent tenant takes **3 to 9 months**, costing between $5,000 and $10,000+ in lost rent, legal fees, and unit restoration.

### 3. The Compliance Tightrope: Fair Housing Regulations
While property managers must prevent fraud, federal and state Fair Housing laws strictly regulate tenant selection. Black-box automated denial algorithms expose operators to severe legal liabilities. Automated screening systems must maintain objective, transparent scoring criteria and preserve human decision authority.

---

## The System Solution

The engine operates as an **integrated five-workflow orchestration cluster** coordinating third-party enterprise services with transactional database integrity:
1. **The Transactional Authority (PostgreSQL 16)**: Holds authoritative units, leads, criteria configurations, applications, and tamper-proof message audit logs.
2. **The Orchestration Core (n8n on Docker)**: An interconnected cluster of 5 production workflows (296 nodes) managing conversational inquiries, calendar booking, document parsing, and signature webhooks.
3. **Third-Party Enterprise API Connectors**:
   * **Cal.com API**: Live tour calendar availability, booking, and rescheduling.
   * **Plaid API**: Payroll Income Sandbox cross-referencing.
   * **DocuSign Connect API**: Tamper-proof electronic lease generation and webhook event listeners.
4. **Dual Mobile Action Surfaces (Telegram)**:
   * **Prospect Bot**: Conversational intake and verified unit FAQ.
   * **Manager Bot**: Interactive mobile application review cards with 1-tap lease approval buttons.

```mermaid
flowchart LR
    A["Prospect Inquiry\n(Web / Telegram Bot)"] -->|"WF1: Leasing Front\n(102 Nodes)"| B["24/7 Verified Unit FAQ\n& Qualification"]
    B -->|"Tour Request"| C["WF5: Tour Booking\n(Cal.com API)"]
    C -->|"Tour Confirmed"| D["WF2: Digital Application\n(7-Section Intake)"]
    D -->|"OCR & Paystub Extraction"| E["Income Verification\n(Plaid Payroll API)"]
    E -->|"Compiled Dossier & Score"| F["WF3: Manager Desk\n(Telegram Review Card)"]
    F -->|"1-Tap Manager Approval"| G{{"WF4: Lease & Signature\n(The ONLY Lease Gate)"}}
    G -->|"DocuSign Envelope"| H["Tenant E-Signature"]
    H -->|"Connect Webhook: Signed"| I["Welcome Packet &\nAirtable Pipeline Sync"]
```

---

## Step-by-Step Workflow Walkthrough

### Phase 1: 24/7 Conversational Lead Capture & Zero-Hallucination FAQ
When a prospect inquires via the web listing portal or Telegram bot, **WF1 (Leasing Front, 112 nodes)** responds in seconds:
* **Grounded Unit Data**: The bot reads verified attributes directly from the PostgreSQL `units` table (rent price, pet policies, parking allocation, utility inclusions).
* **Hallucination Guard**: If a prospect asks an unrecorded question (e.g., *"what color is the kitchen backsplash?"*), the engine refuses to guess, politely informs the prospect, and flags the question for human follow-up.

---

### Phase 2: Autonomous Tour Scheduling & Timezone Engine
When a qualified prospect requests a showing, **WF5 (Tour Booking, 91 nodes)** coordinates the appointment:
* **Property-Local Timezone Translation**: Resolves the building's physical timezone (`America/Phoenix`, `America/New_York`, etc.) from the database, translating conversational requests (*"tomorrow at 3pm"*) into exact UTC timestamps.
* **Cal.com Calendar Sync**: Queries available slots via the Cal.com API and books the appointment in real time.
* **Exception Hold Logic**: If a prospect requests a slot outside configured touring hours or inside the 2-hour minimum notice window, the request is routed to the manager's Telegram bot for 1-tap exception approval without blocking the calendar.

---

### Phase 3: Digital 7-Section Application & Document Intake
After completing a tour, the prospect receives a secure link to the digital rental application (**WF2: Application & Verify, 24 nodes**):
* Captures personal identification, co-applicants, residential history, employment details, vehicle registrations, pet profiles, and disclosure acknowledgments.
* Uploads proof-of-income documents (paystubs, W2s, or offer letters) directly into encrypted storage.

---

### Phase 4: Multi-Tier Income Verification & Fraud Scoring
WF2 executes automated income verification to protect against forged documents:
1. **Paystub OCR & Schema Extraction**: OpenAI extracts employer details, pay frequency, gross wages, net pay, and year-to-date earnings under a strict JSON Schema.
2. **Authoritative Payroll Cross-Reference**: Connects to payroll sources via Plaid Sandbox, extracting verified payroll records and direct deposit amounts.
3. **Variance Calculation**: Compares stated earnings on the paystub against verified payroll deposits. Variances greater than 10% automatically flag the application as `INCOME_MISMATCH`.
4. **Objective Criteria Evaluation**: Evaluates property-wide criteria from PostgreSQL `criteria_config` (e.g. gross monthly income must equal at least 3.0x monthly rent, credit score tier 650+).

---

### Phase 5: Mobile Manager Desk & 1-Tap Triage
Rather than forcing property managers to log into complex screening portals, **WF3 (Telegram Router, 32 nodes)** delivers a complete executive summary card to the manager's phone:

```
┌────────────────────────────────────────────────────────┐
│ 📋 Rental Application Review: Unit 204                 │
│ Applicant: Elena Rostova · Move-In: Nov 1              │
│ Stated Gross Income: $6,500/mo (Rent: $2,100 = 3.1x)   │
│ ────────────────────────────────────────────────────── │
│ Income Verification:                                   │
│ • Paystub OCR: Verified ($6,500/mo)                    │
│ • Plaid Payroll Check: Confirmed ($6,480/mo)           │
│ • Variance: 0.3% (Clean Match)                         │
│ • Criteria Scorecard: 4 of 4 Criteria Met              │
│ ────────────────────────────────────────────────────── │
│ [ ✅ Approve & Send Lease ]   [ ❓ More Info ]   [ ❌ Decline ] │
└────────────────────────────────────────────────────────┘
```

---

### Phase 6: The Single Path to Lease Execution & Post-Signature Onboarding
When the property manager taps `[Approve & Send Lease]`:
1. WF3 validates manager authorization and triggers **WF4 (Lease & Signature, 37 nodes)**.
2. **The Single Lease Gate**: WF4 is the **only workflow capable of generating legal lease contracts**.
3. **DocuSign Envelope Generation**: Automatically merges tenant details, unit terms, rent rates, security deposits, and rules into the standard lease template, creating an envelope via the DocuSign API.
4. **DocuSign Connect Webhook**: Listens for the `envelope-completed` event. When the tenant signs, the webhook updates the application state to `LEASE_SIGNED` in PostgreSQL, dispatches an automated move-in welcome email (key pickup, utility transfer codes), and updates the Airtable pipeline mirror.

---

## Visual Asset Placeholders

> **Visual Asset Embed 1**:
> *Asset Reference: `output/carousels/b5-01-inquiry-to-lease/contact-sheet.png`*
> *Caption: End-to-end renter journey overview from listing inquiry to confirmed tour and lease execution.*

> **Visual Asset Embed 2**:
> *Asset Reference: `output/carousels/b5-04-reviewable-application-file/contact-sheet.png`*
> *Caption: Reviewable application file architecture showing structured 7-section digital intake and scorecard compilation.*

> **Visual Asset Embed 3**:
> *Asset Reference: `output/carousels/b5-09-income-reconciliation/contact-sheet.png`*
> *Caption: Multi-tier income reconciliation comparing OCR paystub data against Plaid authoritative payroll records.*

> **Visual Asset Embed 4**:
> *Asset Reference: `output/carousels/b5-11-post-signature-readiness/contact-sheet.png`*
> *Caption: Post-signature onboarding flow illustrating DocuSign Connect webhook processing and automated welcome logistics.*

> **Visual Asset Embed 5**:
> *Asset Reference: `output/carousels/technical-retrospective-leasing-screening/contact-sheet.png`*
> *Caption: Full technical retrospective detailing n8n 296-node topology, database constraints, and service boundaries.*

> **Visual Asset Embed 6**:
> *Asset Reference: Work Sample PDF (`output/pdf/leasing-tenant-screening-work-sample.pdf`)*
> *Caption: Comprehensive 35-page production work sample detailing workflow nodes, data models, and test evidence.*

---

## Key Engineering Challenges & Solutions

### 1. The "Single Path from Review to Lease" Safety Boundary
* **Challenge**: Automated lease generation without human oversight risks executing binding legal contracts on incomplete files or creating duplicate DocuSign envelopes.
* **Engineering Solution**: Enforced an architectural boundary. WF4 (`lease-and-signature`) has zero public webhooks or timers; it is callable only via an internal trigger from WF3. Before creating an envelope, the workflow verifies that the application record is in `PENDING_REVIEW` state and applies row-level locking in PostgreSQL, ensuring duplicate manager clicks cannot generate duplicate envelopes.

### 2. Cross-Referencing Unstructured Paystubs with Plaid Payroll Data
* **Challenge**: Paystubs come in dozens of different layouts, with varying pay frequencies (weekly, bi-weekly, semi-monthly, monthly) and complex deductions that confuse naive regex parsers.
* **Engineering Solution**: Developed a two-tier extraction pipeline. OpenAI's Responses API parses the document into a standardized `PaystubExtraction` schema with normalized monthly gross income. The engine then queries Plaid's payroll income endpoint, matching pay periods and calculating percentage variance. If variance exceeds 10%, the ticket automatically flags for manual inspection.

### 3. Fair Housing & Regulatory Compliance Boundaries
* **Challenge**: Automated applicant screening must comply with the US Fair Housing Act, which prohibits discriminatory practices and opaque decision-making.
* **Engineering Solution**: Completely separated criteria evaluation from decision-making. The system evaluates mathematical ratios against pre-configured, transparent property rules stored in `criteria_config`. The AI model is strictly prohibited from issuing rental approvals or denials; it simply compiles an objective, audit-proof dossier for an authorized human manager.

### 4. Property-Local Timezone Scheduling without Drift
* **Challenge**: Coordinating tours across properties in multiple time zones often causes calendar booking drift when daylight saving rules or client-side UTC conversions mismatch.
* **Engineering Solution**: Architected dynamic timezone resolution in WF5. The workflow looks up the target property's specific IANA timezone identifier from PostgreSQL, normalizes conversational timestamps relative to that specific locality, and communicates with Cal.com in verified ISO 8601 strings.

---

## Measurable Results & Deliverables

| Metric / Attribute | Traditional Manual Leasing | With Automated Leasing Engine |
| :--- | :--- | :--- |
| **First Inquiry Response Time** | 4 to 24 Hours (or days over weekends) | **< 30 Seconds (24/7 instant FAQ)** |
| **Tour Booking Friction** | 3-5 Phone calls or email exchanges | **Self-serve booking in under 1 minute** |
| **Paystub Fraud Exposure** | High (Visual inspection misses forged PDFs) | **Low (Cross-checked against Plaid payroll)** |
| **Time to Complete File Review** | 45-60 Minutes per applicant | **< 5 Minutes (Pre-scored mobile dossier)** |
| **Lease Generation & Dispatch** | 1-2 Days drafting and sending PDFs | **Instant (Automated DocuSign envelope)** |
| **Total Turnaround (Inquiry to Lease)**| 7 to 14 Days | **24 to 48 Hours** |

---

## Future v2 Roadmap

1. **Direct PMS API Ingestion**: Bi-directional integration with Yardi Voyager and AppFolio to pull real-time vacant unit inventory and push signed lease documents directly into resident ledgers.
2. **Self-Guided Smart Lock Tour Integration**: Dynamic generation of temporary smart lock pin codes (via Yale/Schlage or Rently APIs) for verified tour attendees.
3. **Automated Adverse Action Notice Generation**: Built-in generation and mailing of legally compliant FCRA adverse action letters when managers decline applications based on consumer credit reports.
