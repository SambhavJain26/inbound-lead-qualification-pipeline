# Production Blueprint: Leasing And Tenant-Screening Coordination

Business and workflow-map reference · 16 September 2026

## 1. Business impact at scale

It is Monday morning at a property management company responsible for 12,000 homes across 80 properties. Its leasing teams open the systems they already use. Over the weekend, 240 households asked about advertised homes. Some wanted parking details. Others asked for an evening tour, started an application, or replied to an earlier conversation.

The team doesn't begin by sorting 240 messages into a spreadsheet. No Monday-morning sorting marathon.

Routine property questions have already received answers drawn from approved property records. Tour requests within the company's published scheduling rules have been booked against real availability. Requests outside those rules are assigned to a leasing employee. Prospects who want to apply have received the company's existing application link. Every conversation is attached to the right lead, property and unit, with a visible next step.

Other households were further along before the weekend started. The system has assembled their documents and verification results into files for authorized employees to review. AI hasn't approved anyone.

The system has sent leases authorized by people and opened onboarding checklists for completed agreements. Missing signatures, unsupported verification methods, unavailable units and delivery failures appear as assigned work instead of disappearing into an inbox.

But here's what changes. The team starts with work already organized: which households need a decision, which appointments need attention, which documents are missing, and which move-ins are blocked. Employees spend less time moving information between systems and more time speaking with people, checking evidence and resolving exceptions.

### What repeated small savings can mean

The following is a hypothetical monthly capacity model, not a measured client result or a promise of savings. The company would establish its own baseline before deployment.

| Activity | Illustrative monthly volume | Manual administration avoided per event | Monthly capacity released |
|---|---:|---:|---:|
| Inquiry acknowledgement, basic answers and lead recording | 3,000 distinct inquiry conversations | 4 minutes | 200 hours |
| Tour scheduling, confirmation and calendar updates | 700 appointments | 3 minutes | 35 hours |
| Application file assembly and status chasing | 300 household files | 12 minutes | 60 hours |
| Executed-lease filing and onboarding task creation | 180 household leases | 5 minutes | 15 hours |
| Total | Separate administrative activities | — | 310 hours |

These are task volumes, not conversion-rate benchmarks. One household can appear in several rows because the work differs at each stage; no minute of work should be counted twice. A household application can also contain several adult applicant files. The estimate excludes human screening review, legal work, tours conducted by employees, exception handling and implementation effort.

At 173 working hours per month, 310 hours is about 1.8 full-time equivalents of administrative capacity. That does not mean 1.8 employees can or should be removed. It means a busy team could absorb more work, clear a backlog or spend more time on service without adding staff in direct proportion to inquiry volume.

Faster administration can also remove avoidable delays between an interested prospect, a completed application and a lease. It does not guarantee occupancy. Pricing, demand, property condition, applicant choices and staff decisions still determine the result. For perspective, two avoidable vacant days on 30 homes at an illustrative $1,650 monthly rent represent $3,300 of gross rent exposure using a 30-day month. That is a planning example, not guaranteed recovered revenue or profit.

### The operational outcome

- Fewer unanswered inquiries and forgotten follow-ups.
- Less copying of names, documents, appointment times and lease details.
- Reviewers work from evidence files, not scattered attachments.
- Consistent, approved process steps across properties, without assuming every jurisdiction has the same rules.
- Clear ownership of stalled work and overdue decisions.
- Better portfolio visibility without turning leasing employees into report administrators.
- More capacity at busy properties without relying on employees to work through every evening and weekend.

The system removes coordination work. It doesn't remove accountability, applicant rights or the need for professional judgment. Less administration, not less responsibility.

## 2. A real-world production example

The company in this example is fictional. Its operating conditions are representative of the production design, not evidence of a deployed client system.

Maple Grove Property Management uses a property management system (PMS) for units, applications, leases and resident accounts. Its customer relationship management system (CRM) holds leasing leads and conversations, alongside a shared communications inbox, staff calendars, an application portal, a screening provider and an electronic-signature service. Its regional managers oversee several sites each.

### One household, from inquiry to possession

On Sunday evening, Maya asks through the company's website whether a listed two-bedroom includes parking and whether she can view it Tuesday afternoon.

The inquiry enters the existing CRM. The automation records the event, links it to the advertised unit and retrieves the company's current approved facts. It replies through the company's normal messaging service. It answers the parking question and asks for any scheduling information still needed. It does not promise that the home will remain available or negotiate a price.

Maya chooses a Tuesday slot. The scheduling service checks the property's calendar, booking rules and unit status. It confirms that exact time and records the appointment in the CRM and calendar. If the company offers self-guided tours, its approved access service performs the separate identity and access checks. A door code is issued only if those checks succeed. Otherwise, the appointment remains staff-guided or is handed to the team.

After the appointment, the system receives a tour outcome from the employee or tour platform. An elapsed appointment window alone isn't proof that Maya visited. If her attendance is unknown, the follow-up asks whether she was able to view the home; it doesn't state that she toured it.

Maya receives a link to the application portal the company already uses. She enters her details there, reviews the required disclosures and authorizations, and submits the requested documents. Any application fee is handled by the company's established payment process, at the point allowed by its approved policy and local requirements. The automation does not create a new fee or collect bank credentials in a chat.

The portal identifies Maya's application. The system checks that the file has the required information and authorization before initiating any permitted verification. Her pay document is read into a factual record that cites the relevant page and field. She completes an approved income-verification method through the provider's secure interface. The company can offer a documented alternative when that method is unavailable or inappropriate.

The review file keeps three kinds of information separate: what Maya stated, what her documents show, and what the verification source reports. It identifies the income basis and period for each value. Net deposits are not treated as equivalent to gross payroll. Missing information is marked as missing, not converted into a failed financial check.

An authorized manager opens a task in the company's normal work queue. The task shows the applicable policy version, source evidence, outstanding questions and deterministic criteria results. It contains no AI ranking or recommendation about Maya. The manager reviews the material and records the decision.

If the manager approves the application and lease terms, the system checks that the unit is still available to reserve under the company's allocation policy. It records the reservation before sending a lease. It fills an approved lease template with authorized details and sends it through the existing signature service. Changes to rent, dates, signers or terms require renewed authorization; the AI does not write clauses.

Maya signs. If the company requires a countersignature, the lease remains awaiting execution until that signature is complete too. The completed agreement and signing evidence are filed in the PMS. Onboarding tasks are assigned to the right teams: accounting, leasing and property operations.

Payments are confirmed by the payment and accounting systems, not by a message saying "I paid." Operations confirms that the home is ready. Any required insurance or utility steps follow the company's lawful, approved process. When all required items are satisfied and an authorized employee approves possession, keys or resident access are released. The PMS records the actual move-in. A welcome message does not, by itself, prove that possession has been delivered.

### What happens to a different household

Another applicant, Devon, supplies a document whose pay period does not match the period returned by the verification provider. The system does not accuse him of fraud or infer that he cannot afford the home. It records the mismatch in basis or period and assigns it for review. An employee may find a bonus, a second income source, an extraction error or information that needs correction.

If the company considers a refusal or different terms based on a consumer report, the file leaves the automated applicant-message path. Authorized employees follow the company's legally reviewed screening and notice process. This automation doesn't generate, draft or send an adverse-action notice.

The system records the external handoff and follows the internal task until someone confirms its disposition. No unattended rejection.

At portfolio scale, both households follow controlled processes. The straightforward file moves without repeated copying. The uncertain file stays visible and receives human attention.

## 3. What the production system does

This is a coordination layer around the company's existing leasing operation. It watches for business events, prepares the next permitted action, carries out routine authorized work and gives employees clear review tasks when a person must act.

Its primary scope runs from first inquiry through application review, lease execution and the handoff into resident onboarding. Production onboarding can connect to payments, readiness checks and access release, but those connections must be explicitly included in the deployment. Maintenance dispatch, renewals, inspections and ongoing resident accounting remain the responsibility of the company's existing processes; this system hands the new resident and property records to them.

### Work it handles

| Business event | Information processed | Automatic work | Human control point |
|---|---|---|---|
| New inquiry | Contact channel, advertised home, question, communication permissions | Link or create the lead, acknowledge, answer approved factual questions, record the conversation | Ambiguous identity, unknown facts, sensitive questions or negotiation |
| Tour request | Requested time, actual availability, property rules | Offer real slots, confirm a selected slot, update records and send reminders | Exceptions to scheduling or access policy |
| Application submission | Household and adult applicant records, disclosures, authorization, documents | Check completeness, associate documents, start authorized verification | Missing authorization, unsupported verification, sensitive correction requests |
| Verification result | Source, period, basis, document evidence and provider status | Assemble evidence and apply approved deterministic criteria | Every rental decision; disputed or unclear evidence |
| Recorded approval | Approver, exact terms, policy and file version | Recheck unit allocation and terms, reserve, prepare approved lease | Reservation conflicts, changed terms or expired approval |
| Signature update | Envelope, required signers, execution status | Track reminders, retrieve completed agreement, update the lease record | Declined signature, amendments, voiding or missing countersignature |
| Onboarding progress | Ledger confirmation, readiness, outstanding tasks | Assign and follow up on required tasks; prepare welcome information | Possession approval and any unresolved readiness or payment issue |
| Failed or overdue action | Affected household, last confirmed state, owner and deadline | Retry safely where appropriate, create an exception, escalate | Decisions that require policy judgment or external correction |

### Separate milestones, not one misleading status

The system tracks several related records. A lead can have multiple applications over time. A household application can include several adult applicant files. A unit can have competing applications, but only the permitted reservation or lease allocation. These relationships are explicit; matching names is not enough.

| Record | Typical milestones | What must not be inferred |
|---|---|---|
| Lead | New, contacted, appointment booked, outcome unknown, interested, withdrawn | A booked tour is not a completed visit |
| Application | Started, incomplete, verification pending, ready for review, human review, decision recorded | Complete paperwork is not approval |
| Unit allocation | Available, reservation requested, reserved, released, lease commitment recorded | Approval alone does not reserve a unit |
| Lease | Prepared, sent, partially signed, fully executed, expired or voided | One signature is not full execution |
| Onboarding | Tasks open, blocked, ready for possession, possession confirmed | A signed lease or welcome email is not move-in |
| Payment | Requested, submitted, confirmed under ledger policy, returned or reconciled | A submission or pending bank transfer is not settled funds |

Every active record has a next action, accountable owner and due time. Business closure is recorded by an authorized person or a confirmed system event. The system never treats an internal error as a completed household process.

## 4. How it fits into an existing PM business

The company keeps its existing operating tools. A prospect still arrives from a listing channel, website, phone call or leasing office. Employees still use their PMS, CRM, shared inbox, calendar and document systems.

The automation runs in the background. Leasing staff don't need a new daily dashboard. If a PMS already provides the application, screening workflow or signature service, the deployment reuses those features instead of rebuilding them.

### What employees see in practice

- Leasing staff see the conversation, appointment and next action on the existing lead record.
- Managers receive an application-review task in their usual system, with a secure link to evidence and authenticated controls for the permitted action.
- Accounting sees onboarding charges, payment status and reconciliation tasks in its existing ledger process.
- Site operations sees readiness and possession tasks in its established queue.
- Regional leaders see open work, aging and exceptions in existing reports or an approved reporting view.
- The technical operator sees service health and failed integrations in a separate support console. Business employees do not have to use that console.

An email or Teams notification can tell a manager that a task is ready. It is not sufficient authority by itself to change a rental decision. The action must identify the employee, verify their role, bind the approval to the current file and record the exact action authorized. If the company's existing system cannot provide that control, a secure company-authenticated review page can open from the task. This is an exception to "no extra application," not an invitation to move the entire operation into a new portal.

### Connect only where supported access exists

The selected PMS might be AppFolio, Yardi, Entrata, Buildium or another platform. Naming a vendor does not establish that the company has access to the required integration. Contracts, product editions, partner approval, permitted data use and available read/write functions are checked during discovery.

| Access available | Production approach | Operational limit |
|---|---|---|
| Approved event notifications and supported read/write integration | Respond to events, retrieve the authoritative record and write back confirmed results | Use only the operations permitted by the vendor agreement |
| Supported scheduled retrieval and limited updates | Check for new work regularly and reconcile changes | Agree on the resulting delay; do not promise instant updates |
| Read access or approved exports, but no supported write access | Prepare evidence and assign an employee to complete the business update | The task remains open until the employee confirms the update |
| Email notifications only | Use approved mailbox intake, retain the source message and verify uncertain matches | No unattended decision or write based only on a loosely matched email |
| No dependable access | Keep the affected step manual or outside the initial deployment | Do not disguise a fragile workaround as a reliable integration |

Manual update tasks are a supported operating mode. Employees must not need to guess whether the automation updated the PMS. Each task states what was prepared, what still needs to be entered and which record should be checked.

### Record authority

| Information | Business authority |
|---|---|
| Property, unit, rent, approved availability, lease and resident account | PMS or the company's designated authoritative platform |
| Lead and conversation | Existing CRM or designated leasing record |
| Appointment and resource availability | Company's scheduling system |
| Documents and original signed agreement | Approved document repository and signature provider, with links filed in the PMS |
| Verification findings | Contracted provider or documented human verification source |
| Screening policy, approved templates and delegation limits | Controlled company policy records approved by operations and counsel |
| Rental decision and authorized terms | Authenticated employee decision recorded in the business system |
| Money and reconciliation | Accounting ledger and payment provider |
| Automation progress, pending actions and execution history | Operational state and audit store |

The automation's state store remembers what it attempted and what remains pending. It is not a second independent rent roll or a competing authority for account balances. Conflicts are resolved according to this ownership table, not by letting the newest message overwrite everything.

### Deployment without a wholesale process change

First, document the company's actual approval routes, jurisdiction-specific rules, contact permissions, systems of record and service expectations. Remove duplicate or obsolete steps before automating them.

Second, run a read-only shadow period. The system observes authorized events and prepares internal outputs, but does not contact applicants, order paid reports, send leases or change live records. Employees compare its work with their normal process.

Third, pilot a limited group of properties. Begin with factual inquiry handling and scheduling, then add application preparation, human-controlled lease sending and onboarding connections as each stage passes its acceptance checks. Keep the normal manual process available.

Finally, expand based on measured accuracy, service quality and operational capacity. Production acceptance covers correct matching, duplicate prevention, safe approval controls, failed delivery handling, provider outages, disputed evidence and restored backups. One successful application isn't enough.

Production services require contracts, approved hosting and operating budgets. They are not assumed to share the demo's free or sandbox pricing. No purchases or live integration changes are authorized by this document.

## 5. Major components and why they exist

These are business roles within the design. Several roles may be supplied by the same existing platform. They are not a shopping list of products the company must add.

| Map ID / component | Why it exists and what it does | Receives | Sends and communicates with |
|---|---|---|---|
| S1 — Listing and inquiry channels | Captures interest through the channels the company already uses | Published property facts; prospect questions | Inquiry and source reference to CRM/intake; approved answers back through the relevant channel |
| S2 — Leasing CRM and work queue | Gives employees one business view of leads, conversations, assignments and deadlines | Inquiries, appointments, tasks and confirmed milestones | Lead identifiers and work events to automation; visible work to leasing staff and managers |
| S3 — Property management system | Owns property, unit, application, lease and resident business records | Authorized application and lease updates; onboarding outcomes | Current facts, availability, policy references and record identifiers to other approved systems |
| S4 — Company communications service | Sends and receives email, business messaging or portal messages with permissions and delivery tracking | Approved wording, verified recipient and channel permission | Messages to prospects; replies, delivery failures and opt-outs to intake/work queue |
| S5 — Scheduling and tour platform | Manages actual times, resource capacity, reminders and tour outcomes | Requested slot, property rules and calendar availability | Confirmed appointment or conflict; cancellation and attendance events to CRM/automation |
| S6 — Tour identity and access service | Controls permitted self-guided access separately from conversation handling | Confirmed appointment and approved access-verification inputs | Time-limited access confirmation, failure or access event; never resident credentials to an unverified chat |
| S7 — Existing application portal | Collects structured applications, required disclosures and submitted authorizations | Application invitation, applicant entries and uploads | Application/household identifiers, completeness and authorization status to PMS/automation |
| S8 — Secure document repository | Stores originals, controlled versions and access history | Application uploads, source verification documents, completed leases | Restricted document references to extraction and authorized reviewers; final links to PMS |
| S9 — Document reading and bounded AI service | Answers grounded questions, extracts cited fields, classifies intent and prepares permitted drafts | Only approved facts and the minimum allowed document content | Structured factual output to controls; uncertain output to human review; no decisions or direct system writes |
| S10 — Income-verification service | Provides source-specific income information through an approved applicant method | Appropriate authorization and provider-secure connection | Source, basis, period, coverage and verified data or unavailability to evidence assembly |
| S11 — Contracted screening provider | Supplies permitted consumer reports under the company's legal and contractual arrangements | Provider-required identifiers, permissible-purpose information and approved request | Report and status to restricted review storage; correction/dispute updates to authorized review |
| S12 — Company identity-verification process | Resolves identity through an approved provider or employee process | Minimum required identity material through secure collection | Verification outcome or unresolved exception to authorized review; no AI identity decision |
| S13 — Controlled policies and templates | Holds the rules, wording, approval limits and documents authorized for each property/jurisdiction | Approved changes from operations, counsel and designated administrators | Versioned criteria, collection questions, messaging templates and lease templates to controls |
| S14 — Orchestration and deterministic controls | Coordinates work, checks permissions, applies fixed approved criteria and waits for human actions | Business events, current records, provider results and authenticated approvals | Permitted requests to connected systems; review tasks, exceptions and confirmed state changes |
| S15 — Operational state and audit store | Remembers progress and provides evidence of who did what | Event references, action attempts, approvals, outcomes and deadlines | Current pending work to orchestration; restricted history to audit and support; no independent ledger authority |
| S16 — Durable work queue and recovery process | Preserves accepted work through outages and controls retries | Pending actions, scheduled follow-ups and failed attempts | Safe retries to orchestration; exhausted or uncertain actions to the support queue |
| S17 — Electronic-signature service | Delivers approved agreements and tracks every required signature | Approved template, authorized variables and signer list | Envelope status, completed agreement and signing evidence to PMS/repository/orchestration |
| S18 — Payment and accounting systems | Collect and account for authorized fees, deposits and rent in the established financial process | Approved charges and payer actions | Confirmed ledger/payment status, returns and reconciliation tasks to onboarding |
| S19 — Onboarding, readiness and resident access tools | Coordinate the work that must precede possession and transition into resident operations | Executed lease, assigned readiness tasks and required financial status | Readiness and possession confirmation to PMS; authorized resident access and welcome information |
| S20 — Monitoring, reporting and secure administration | Shows failures, overdue work, service health and business measures; controls access | Audit events, pending work, integration health and permission changes | Alerts to responsible employees/support; portfolio reports to leaders; restricted administration to authorized operators |

### Production operation behind these components

The orchestration service could be a supported n8n deployment or an approved equivalent. It runs on continuously available, company-approved infrastructure with durable endpoints, secured credentials, backups and a supported recovery process. It does not depend on an employee keeping a laptop or temporary tunnel open.

A managed Postgres service or equivalent can hold operational state. An approved object-storage or document service can hold originals. Hosting location, access rights, retention and provider use are agreed with the company. Production and testing are separated; tests use synthetic records and cannot send a real lease or overwrite a resident account.

If the company already has suitable database, queue, document and monitoring services, use them. If it does not, these background services can be supplied as part of the deployment without becoming additional daily applications for leasing staff.

The plan must also account for licensed report charges, income verification, messaging, signatures, storage, hosting, AI usage and ongoing support. Report ordering is permission-controlled and duplicate-safe; a retry must not silently create another charge.

## 6. How the components communicate

A business event signals that something changed: an inquiry arrived, an applicant submitted a file, a manager recorded a decision or an envelope reached a new status. Platforms either send supported event notifications or expose changes through approved scheduled checks. Both methods retrieve the current authoritative record before an important action; neither assumes every signal arrives once or in order.

### Main information exchanges

| From → to | Information transferred | Confirmation required |
|---|---|---|
| Inquiry channel → CRM → orchestration | Source reference, contact permission, unit interest and message | Event accepted and linked to the intended record |
| PMS/policy records → controls → bounded AI | Current permitted facts and approved collection questions | Facts are sufficiently fresh and within allowed scope |
| Controls → communications → CRM | Approved message and recipient | Provider acceptance recorded separately from delivery or failure |
| Scheduling → controls → CRM/PMS | Exact appointment, resource and status | Booking exists; no alternate time is silently substituted |
| Application portal → PMS/repository → controls | Submission, household/adult relationships, authorization and document references | Correct application linked; prerequisites satisfied |
| Verification providers → restricted evidence → criteria controls | Source results, measurement basis, period and limitations | Results belong to the intended applicant and are usable under the approved policy |
| Controls → manager work queue → controls | Evidence file, requested action and current version | Authenticated person authorizes a specific decision/action |
| Controls ↔ PMS unit allocation | Approved household, reservation request and current unit state | Authoritative reservation confirmed before lease sending |
| Controls → signature service → repository/PMS | Approved agreement, exact variables, signer list and execution updates | All required signatures complete and final documents retrievable |
| Accounting/readiness → onboarding → PMS | Confirmed requirements and possession approval | Account/lease/resident state updated; actual possession recorded |
| All actions → audit/recovery → work queue | Attempts, outcomes, deadlines and exceptions | No unresolved action is marked complete merely because it was attempted |

### Identity, sequence and safe repetition

Every event carries or is linked to business identifiers: company, property, unit, lead, household application, individual applicant and provider request where relevant. References are resolved deterministically. A name, phone number or AI guess does not establish that two people are the same applicant. Contact changes require verification before disclosing private information.

The system expects duplicate and out-of-order notifications. It recognizes an event already processed, prevents repeat report orders and lease sends, and does not let an older "sent" notification undo a later executed agreement. A correction creates a new version of the affected evidence, with the original retained according to policy.

If a request times out after a provider may have completed it, the system checks the provider's known action reference before retrying. If it cannot determine the outcome, it assigns an "outcome unknown" exception. It does not guess or repeatedly submit a lease, report order or payment instruction.

Employee changes in the PMS matter too. A cancellation, revised price, withdrawn application or manually completed task must be reflected back into the automation. The next action reads current state and revalidates the approval; an old task cannot override a newer employee decision.

### Data shared, and data deliberately withheld

Ordinary task notifications contain a name or reference, status, next action and secure link, not a full consumer report, identity document or bank statement. Sensitive identifiers are collected through the approved portal/provider where possible. Full SSNs, bank credentials and payment card details are not stored in chat, exposed in model prompts or included in general logs.

The company chooses the minimum information needed for each component and restricts who can access it. Provider contracts, AI data-use settings, retention schedules, deletion rules and legal holds are reviewed before production use. A general-purpose AI service does not automatically receive consumer reports, raw banking histories or complete identity documents.

## 7. Human involvement and AI boundaries

### Useful work for AI

| Permitted task | AI contribution | Required control |
|---|---|---|
| Factual property questions | Interpret the question and compose an answer from approved current records | Validate stated facts, figures and scope; unknown answers go to an employee |
| Conversation intent | Identify an appointment request, factual question, correction or request for help | Fixed rules determine the next step; AI cannot establish identity or consent |
| Document field extraction | Read the requested field and identify its page/line or source location | Preserve the original; reject unsupported values; uncertain readings require review |
| Permitted internal or applicant-message drafts | Prepare wording around an authorized operational action | Apply message controls and the required individual human approval |

AI does not decide eligibility, approve a household, rank applicants, predict tenancy quality, label a person as risky, infer protected characteristics, assess credibility or accuse someone of fraud. It does not decide identity, select a record to update, invent rent, negotiate terms or create lease language. It does not turn missing data into a negative finding.

An application document is evidence to read, not an instruction for the system. Text inside it can't authorize a decision, change policy, reveal other records or direct a message. Controls reject unexpected model output and create a visible review task.

### Fixed criteria are not AI judgment

Approved criteria are implemented as explicit rules, with the applicable property, jurisdiction, effective date and policy version recorded. Each result shows the input and source behind it. The internal categories are "meets the configured criteria," "requires review" and "does not meet the configured criteria." They are not rental decisions.

The company and its legal advisers decide whether a criterion is lawful and appropriate. A rule does not become fair merely because software applies it consistently. Disputed reports, accommodation requests, assistance programs, permitted alternative evidence and policy exceptions receive authorized human review. The system does not automatically reject access to a tour or application based on self-reported income.

Income calculations identify gross versus net, the relevant period, pay frequency, coverage and permitted sources. A weekly payment is not a monthly amount. A bank transfer is not necessarily income. Variable income, partial coverage and household aggregation follow the approved policy or go to review. No model invents a gross-income conversion from net deposits.

Plaid's documentation distinguishes Bank Income, which retrieves net income from connected accounts, from Payroll Income, which can verify gross income from a connected payroll account. The contracted production product, coverage and permitted use must be checked at deployment; sandbox success is not production approval. [Plaid Bank Income](https://plaid.com/docs/income/bank-income/), [Plaid Payroll Income](https://plaid.com/docs/income/payroll-income/).

### Who is accountable

| Actor | Responsibility |
|---|---|
| Leasing employee | Correct lead handling, conversations needing judgment, appointment exceptions and document follow-up |
| Authorized property manager / application reviewer | Review evidence, record every rental decision and authorize exact lease terms within delegated limits |
| Compliance/legal lead | Approve policies and templates; oversee sensitive exceptions, disputes and any consumer-report-related notice process |
| Accounting employee | Confirm financial treatment, resolve returns and reconcile charges; authorize financial corrections |
| Site operations employee | Confirm readiness and actual possession/access handoff |
| Regional operations leader | Own service targets, escalation coverage and portfolio performance |
| Technical operator | Restore failed services and integrations without making business decisions or changing evidence |

An employee's authorization applies only to the action and version they reviewed. If material evidence, household membership, unit, price or terms change, the approval is invalidated for subsequent action and returned for review. A duplicate click cannot create a second send.

### Message approval policy

Before screening begins, factual answers, confirmed scheduling details, approved reminders and application invitations may send automatically after their controls pass. Contact permission and current record state are checked again at send time. Opt-outs suppress the affected channel and preserve an approved alternative where available.

Once screening begins, applicant-facing messages from this automation require individual recorded human approval. That includes document requests, explanations of findings, outcome-related messages and conditional terms. The company can still use its portal's established submission receipts, but that does not authorize the automation to interpret a result or send an outcome on its own.

Adverse-action notices are outside this automated messaging scope. The automation does not generate, draft or send them, including in a conditional-approval path that may trigger notice duties.

The FTC explains that consumer-report-related adverse action can include denial, a required co-signer, higher rent or a larger deposit. Applicable notice duties belong in the company's counsel-approved process, checked against federal, state and local requirements. [FTC: Using Consumer Reports—What Landlords Need to Know](https://www.ftc.gov/business-guidance/resources/using-consumer-reports-what-landlords-need-know).

Don't assume the employment-specific pre-adverse-action sequence and waiting period are a universal rental requirement. The FTC describes a separate pre-action process for employment decisions; the company's advisers must determine the process applicable to its rental decisions and jurisdictions. [FTC: Background Checks—What Employers Need to Know](https://www.ftc.gov/business-guidance/resources/background-checks-what-employers-need-know).

Applicants must have a route to correct or dispute information with the appropriate provider and receive human handling. The system records that a dispute is pending; it does not silently continue toward a lease or an adverse outcome using superseded evidence. [CFPB: Rental applications and tenant-screening reports](https://www.consumerfinance.gov/ask-cfpb/what-should-i-do-if-my-rental-application-is-denied-because-of-a-tenant-screening-report-en-2105/).

This blueprint describes operating controls, not legal advice or a certification of compliance.

## 8. The end-to-end production workflow

### Flow A — Inquiry and factual assistance

1. A prospect contacts the company through an existing channel, or an employee records a phone/office inquiry. The source event enters the CRM and automation intake.
2. Intake preserves the source reference, identifies the company/property, checks channel permission and links the event to a lead. An uncertain match is assigned to an employee before private information is disclosed.
3. The system reads current approved unit facts and applicable conversation rules. It answers only supported factual questions. An unknown, sensitive or negotiating question becomes an assigned task with a safe acknowledgement where contact is permitted.
4. Fixed prompts collect only approved information still needed for the requested service. Answers are recorded without repeatedly asking the same question. Self-reported answers remain labeled unverified.
5. The lead record shows what was answered, what remains open and who owns any follow-up. A request to speak to a person goes to the normal leasing team. No response from the prospect triggers only the company's bounded contact policy, not endless reminders.

### Flow B — Tour scheduling and outcome

1. The prospect selects or confirms a real available slot. The system checks the current unit status, resource capacity, lead time and scheduling rules.
2. A permitted request is booked and confirmed. A conflict produces real alternatives. A different time is never booked without the prospect's confirmation.
3. An out-of-policy request is assigned to an authorized employee. Nothing is represented as confirmed until that approval and booking succeed.
4. The appointment is recorded in the calendar and CRM. Reminders respect contact permissions, cancellation status and local time.
5. For a self-guided tour, the approved access service must separately confirm its prerequisites. Failed checks switch to human handling; no code is improvised. Codes are limited to the permitted appointment and revoked on cancellation under the provider's process.
6. A tour platform or employee records attended, cancelled, no-show or unknown. Follow-up wording uses that actual outcome. A tour is not mandatory before applying unless the company's lawful published process requires it; accessible staff-assisted alternatives remain available.

### Flow C — Application and evidence preparation

1. The prospect follows the existing application portal link. The invitation carries a safe business reference, not exposed sensitive data. The portal collects disclosures, required authorizations, uploads and any permitted fee through existing controls.
2. Submission creates or updates the appropriate household application and individual applicant records. A resubmission adds a version; it doesn't erase prior decisions or lease history.
3. Completeness checks distinguish missing fields, missing documents, missing authorization and technical upload failures. After screening begins, any applicant document request waits for an employee's approval.
4. Authorized verification is initiated only when its prerequisites are met. Existing usable provider results are reused where permitted; duplicate events do not order a second report. A secure provider flow, not ordinary chat, handles sensitive verification inputs.
5. Document extraction produces cited facts and preserves originals. A poor scan or contradictory reading is held for review. Identity checks follow the approved human/provider process, not model inference.
6. Verification responses are linked to the correct applicant and file. Income basis, period, coverage and source are recorded. Consumer reports remain available only to authorized roles. Disputes, incomplete coverage and provider warnings retain their meaning.
7. The deterministic engine applies the approved policy to usable inputs. Every criterion includes its evidence; unavailable inputs stay unavailable. The system assembles the review file and assigns the manager task with a due time.

### Flow D — Human review and controlled decision

1. The reviewer verifies that the correct household, unit, policy and evidence versions are presented. They can open the original source through restricted links.
2. The reviewer records an authorized decision or returns the file for further work. An ordinary "meets criteria" result still requires this review; it never sends a lease automatically.
3. A request for more documents or a permitted operational message is drafted or selected, individually approved, rechecked and sent. Its delivery status and next deadline are recorded.
4. A condition affecting applicant terms follows the company's compliance route before communication. The automation does not invent a condition or assume it is exempt from consumer-report notice duties.
5. A file involving a contemplated adverse outcome, disputed report, accommodation or other legally sensitive issue is handed to the designated human process. The automation records ownership and follows the internal task, without writing or sending the legal notice.
6. The authorized employee records the final disposition from that external process. A withdrawn or closed file stops future automated invitations, verification orders and lease actions. Company policy governs retention and deletion; lack of approval doesn't trigger immediate deletion.

### Flow E — Unit allocation and lease execution

1. A recorded approval identifies exact household members, unit, rent, deposit, dates, permitted addenda and required signers. The system confirms that the approval is current and within the employee's delegated authority.
2. It requests the unit reservation from the authoritative allocation process. Competing approvals cannot both claim the same available home. A conflict returns to the manager; another unit is not substituted without authorization and applicant agreement.
3. The reservation has an owner, expiration and release policy. Expiry is not an automatic denial. Staff resolve it and any financial implications through the normal process.
4. The lease is assembled from the approved template and authorized variables. Missing signers, unexpected values or changed terms stop preparation. The manager approves the send-ready agreement and applicant-facing communication; a separate click is unnecessary only if the earlier recorded approval explicitly covered this exact document and wording.
5. The signature service sends the agreement. The system records the provider reference and confirmed send, then tracks reminders and outstanding signers under the approved policy. A delivery failure is assigned; "sent" is not treated as "received."
6. Declined signatures, expiration, corrections and voiding go to authorized employees. The system does not amend an executed agreement or replace it with a newly generated lease on its own.
7. When all required signatures and countersignatures are complete, the final agreement and signing evidence are retrieved, filed and linked in the PMS. Missing final documents remain an exception even if the provider reports completion.
8. The PMS receives the authorized lease commitment and household transition. A failed write is reconciled; it does not cause another envelope to be sent. Reservation status follows the company's lease-allocation policy.

### Flow F — Onboarding and actual move-in

1. The executed lease opens the existing onboarding checklist with named owners and due dates. Welcome communication from this automation is individually approved under the post-screening message policy.
2. Accounting confirms charges and payment status through the normal ledger and payment systems. The automation does not collect card details or make refunds, adjust balances or move deposit funds without authorized financial controls.
3. Property operations completes readiness checks. Any required insurance, utilities or other prerequisites are handled through the company's approved processes, with an employee route for exceptions.
4. A readiness review separates complete items from blocked or pending ones. A signed lease doesn't override an unsafe or unavailable home. The checklist shows unresolved payments as unresolved, never as settled funds.
5. An authorized employee approves possession according to company policy. Keys or permanent resident access are released through the established access process. Temporary tour access is not repurposed as resident access.
6. The employee or approved handoff system confirms actual possession. The PMS activates the appropriate resident/move-in state and links the signed agreement, ledger and onboarding record. Ongoing resident operations takes ownership.

### Flow G — The continuous operating loop

While those flows run, background checks compare pending automation work with the authoritative systems. They detect overdue review tasks, missing provider responses, failed record updates, expired reservations, signatures awaiting action and onboarding blockers.

Each problem is assigned in the normal company queue. A timed escalation reaches the backup owner or supervisor when the first owner does not respond. If an external service fails, accepted work remains stored and routine work can resume safely after recovery. Staff can use the existing manual process while the affected automated action is paused.

After recovery, reconciliation verifies the actual outcome before completing or replaying an action. Staff are told which household steps were delayed. The business record and operational history agree before the exception closes.

## 9. Exceptions, edge cases and preventing lost work

### Business exceptions

| Situation | System behavior | Accountable owner and visible record | Resolution |
|---|---|---|---|
| Duplicate inquiry or household applying to several units | Keep source events; associate relationships without merging people by name | Leasing; linked lead/application records | Employee resolves ambiguous relationships and allocation priority |
| Missing/changed contact details | Do not disclose private file information to an unverified destination | Leasing; contact-verification task | Verify the new destination before resuming private communication |
| Unknown or stale property fact | Do not guess rent, policy or availability | Leasing/property data owner; factual-answer task | Correct/approve source facts, then respond |
| Sensitive question, accommodation or assistance request | Avoid inference and automated rejection; route privately to the designated employee | Authorized leasing/compliance role; restricted task | Apply the legally reviewed company process and record permitted operational instructions |
| Self-reported information does not fit a scheduling preference | Offer permitted alternatives or employee help; do not turn it into an eligibility decision | Leasing; open service request | Human-assisted scheduling/application route |
| Requested slot unavailable or unit no longer tourable | Do not confirm; offer real alternatives | Leasing; appointment exception | Prospect confirms an alternative or employee resolves |
| Self-guided access cannot be verified/issued | No code; do not represent access as ready | Tour/access owner; access task | Staff-guided alternative or approved rescheduling |
| No-show or unknown tour attendance | Use accurate wording; do not mark attended from a timer | Leasing; appointment outcome | Employee/platform confirms outcome; bounded follow-up |
| Incomplete household or co-applicant file | Show who/what remains outstanding; do not silently process a partial household as complete | Application coordinator; completeness task | Approved request, completed file or human disposition |
| Authorization absent or withdrawn | Do not initiate further affected verification; preserve required history | Application coordinator/compliance; authorization task | Secure corrected authorization or permitted manual/closed route |
| Unsupported bank/payroll or applicant chooses another method | Record unavailable, not failed criteria | Application reviewer; alternative-verification task | Approved document/manual/provider alternative |
| Gross/net, pay-period or income-coverage mismatch | Do not calculate a misleading variance or allege fraud | Application reviewer; evidence exception | Align basis/period or obtain additional authorized evidence |
| Unreadable document or uncertain extraction | Preserve original; exclude unsupported values | Reviewer; cited extraction exception | Employee corrects the factual record with source and actor |
| Identity mismatch or questionable document | No model identity decision or accusation | Approved identity reviewer; restricted task | Provider/manual resolution under company policy |
| Disputed, corrected or possibly misattributed report | Pause dependent actions; retain versions and provider status | Compliance/authorized reviewer; dispute task | Provider correction and human reassessment |
| Criteria not met or conditional terms contemplated | No automated outcome message or notice | Manager/compliance; controlled review handoff | Human process; externally completed disposition recorded |
| Manager unavailable or approval overdue | Escalate to an authorized backup, not to automated approval | Regional operations; overdue review task | Authorized review or reassignment |
| Policy, terms or material evidence change after approval | Stop the dependent action and invalidate stale authorization | Manager; renewed-approval task | Reassess the current version |
| Competing approved applications for one unit | Permit only the authoritative allocation; no silent substitution | Manager; reservation conflict | Apply published allocation policy and authorized applicant communication |
| Reservation or envelope expires | Stop stale actions; preserve contractual/financial context | Manager; allocation/signature task | Authorized extension, release, new offer or other disposition |
| Signer declines, countersigner missing or document needs correction | No false executed status; no unattended amendment | Lease administrator/manager; signature exception | Correct/void/reissue only with authorization |
| Applicant withdraws after actions have started | Stop new actions; review existing booking, report, envelope and money obligations separately | Leasing/manager/accounting; withdrawal checklist | Authorized cancellation and financial handling |
| Funds pending, returned or mismatched to ledger | Do not claim settled; do not auto-refund or change balances | Accounting; reconciliation task | Confirm financial treatment and communicate through approved route |
| Home not ready on agreed date | Do not release access or invent a new date/compensation | Site operations/manager; readiness exception | Human-approved operational and contractual response |
| Manual/paper application or lease | Employee records it through the existing process; suppress duplicate automated work | Leasing/lease administrator; manually completed milestone | Verify originals and update authority records |

### Technical and communication exceptions

| Situation | Safe behavior | Visible owner and recovery |
|---|---|---|
| Duplicate or older event | Recognize/reconcile it; no repeat charge, booking or lease send | Technical operator; audit record, business task only if conflict remains |
| Provider response missing or rate limit reached | Retain pending work; bounded retry and deadline | Technical support plus business owner; provider-delay task |
| Action timed out with unknown result | Check existing provider reference before any retry | Technical operator; outcome-unknown exception until verified |
| AI service unavailable or output invalid | No unsupported answer or invented extraction; safe acknowledgement where allowed | Leasing/reviewer task plus technical alert |
| Message rejected, bounced or opted out | Separate accepted from delivered; suppress disallowed channel | Leasing; delivery/permission task, approved alternate channel |
| PMS write fails after a real external action | Preserve provider outcome and retry/reconcile the record update only | Technical operator/business data owner; sync exception |
| Upload unsafe, mislabeled or tampered with | Quarantine; do not expose it to employees/model processing as trusted content | Security/document support; restricted upload exception |
| Unauthorized or suspicious event/approval | Reject it and alert; do not make a business change | Security/support; restricted incident record |
| Service outage or backlog | Pause affected sends/actions, preserve accepted work and invoke manual coverage | Technical operator/regional operations; incident and affected-work list |
| Broken integration silently stops sending events | Scheduled health tests and reconciliation detect the gap | Technical operator; integration incident and source-system catch-up |

### What makes work hard to lose

Here's the safeguard: an exception is a record, not an alert alone. It contains the affected business reference, last confirmed milestone, blocked action, accountable owner, due time, attempted recovery and required next step. Notifications point to that record; dismissing one doesn't close the work.

The company defines service targets by stage and operating hours. For example, an unanswered inquiry and an application review can have different escalation times. The deployment sets actual thresholds, named primary/backup owners and weekend coverage before going live; this document does not invent binding service promises.

The system checks whether a task was acknowledged and completed, not merely created. Repeated failure reaches a supervisor or support operator. If the PMS cannot accept a task update, a designated existing support channel receives a durable incident reference and an affected-work report. That fallback is tested independently of the integration it monitors.

Scheduled reconciliation looks for mismatches: a lease executed but not filed, an approved application without a reservation result, a reservation with no owner, an appointment changed outside the automation, or onboarding ready without possession confirmation. It also checks freshness so leaders can tell when a report is stale.

Backups, restore exercises, access reviews and safe replay are part of operation. Recovery preserves decisions and source evidence. It does not reset real applicants to a demo starting state. Sensitive records follow an approved retention and secure-disposal schedule, with legal holds honored.

### Measures the business should see

Track response time, appointments successfully confirmed, missing-document aging, ready-for-review backlog, human-review time, time from authorization to confirmed lease send, signature aging, onboarding blockers and unresolved exceptions. Show rates of human correction and fallback as well as throughput.

Measure saved administrative time against sampled baseline work. Separate system processing time from time waiting for applicants, employees or providers. Do not turn a criteria label or applicant demographic inference into a performance metric. Access to outcomes and any authorized fairness review follows the company's legal and privacy controls.

## 10. Complete production workflow map reference

This section is the drawing specification for Excalidraw. Use the stable IDs below so the diagram can be checked against the document. The map represents the proposed production system, not a claim that every connection is already deployed.

### 10.1 Drawing layout and visual language

Arrange the main workflow left to right:

Inquiry → assistance → tour or direct application → evidence preparation → human decision → unit allocation → lease execution → onboarding → confirmed possession.

Use five horizontal lanes:

1. Prospect/applicant and existing communication channels.
2. Existing company systems: CRM, PMS, calendar, portal and records.
3. Background automation: intake, fixed controls, state, queue and AI.
4. External verification, signature, payment and access services.
5. Human review and operations: leasing, manager, compliance, accounting, site team and support.

Draw systems as containers, actions as rectangles, decisions as diamonds, people as actor symbols and confirmed milestones as rounded outputs. Use solid arrows for work/data, dashed arrows for notifications, and clearly labeled exception arrows. Mark human approval gates visibly. Do not rely on color alone.

Place monitoring/reconciliation below the main flow, with connections to every externally executed action. Place the restricted compliance handoff on a separate branch; it does not reconnect to lease sending until a current authorized approval exists.

### 10.2 Actors

| ID | Actor | Main interaction |
|---|---|---|
| A1 | Prospect / applicant household | Ask questions, choose appointments, submit applications, complete provider steps and sign |
| A2 | Leasing employee / application coordinator | Handle conversations, missing information and scheduling exceptions |
| A3 | Authorized manager / application reviewer | Review evidence, decide, authorize exact terms and lease sending |
| A4 | Compliance/legal lead | Own sensitive review, policy approval and external notice/dispute process |
| A5 | Accounting employee | Confirm and reconcile financial requirements |
| A6 | Site operations employee | Confirm unit readiness and possession/access handoff |
| A7 | Regional operations leader | Own escalations, coverage and portfolio measures |
| A8 | Technical/security operator | Recover systems, investigate incidents and reconcile failed integrations |

### 10.3 System containers

Use S1–S20 from Section 5, without changing their meanings. For a particular prospect's diagram, put the actual vendor name beneath its business role only after discovery confirms access. Combine containers supplied by one platform, but retain labels for the distinct responsibilities.

Required separation: AI S9 does not connect directly to rental decisions, PMS writes, report ordering, money movement or access release. All such work passes through S14 controls and the relevant human authority. S15 audit/state is separate from S3 business authority and S18 ledger authority.

### 10.4 Main process boxes

| ID | Process | Input → output / principal system |
|---|---|---|
| P1 | Receive and preserve business event | Source event → accepted source reference / S14–S16 |
| P2 | Link company, property, lead and contact permissions | Source reference → verified business association or match task / S2–S3–S14 |
| P3 | Retrieve approved current property facts | Unit/policy reference → bounded fact set / S3–S13 |
| P4 | Answer factual question and collect permitted missing information | Fact set/message → validated response and recorded answers / S9–S14–S4 |
| P5 | Present actual tour slots and obtain selection | Current availability/request → prospect-confirmed slot / S5 |
| P6 | Book appointment and update business records | Selected permitted slot → confirmed booking / S5–S2 |
| P7 | Arrange approved tour access or staff coverage | Confirmed booking → access confirmation or guided assignment / S6–A2 |
| P8 | Record attendance outcome and prepare appropriate follow-up | Platform/employee outcome → accurate lead milestone / S5–S2 |
| P9 | Invite household to existing application process | Interested household → portal invitation / S4–S7 |
| P10 | Receive structured application and secure documents | Portal submission → household/adult files and restricted originals / S7–S3–S8 |
| P11 | Check completeness and verification prerequisites | Submitted file → ready file or assigned missing-item task / S14 |
| P12 | Extract cited document facts | Restricted originals → source-linked factual fields / S8–S9–S14 |
| P13 | Obtain authorized verification | Ready file/authorization → income, screening and identity results / S10–S11–S12 |
| P14 | Assemble usable evidence and apply approved fixed criteria | Source results/policy version → criteria evidence file / S13–S14–S15 |
| P15 | Present human review task | Evidence file → named reviewer, due time and requested action / S2–A3 |
| P16 | Record human disposition and exact authorization | Reviewer action → version-bound decision/terms / A3–S3–S15 |
| P17 | Carry out approved information request | Approved wording/request → delivery result and waiting task / A2/A3–S4 |
| P18 | Hand off to controlled compliance process | Sensitive/adverse/disputed file → restricted human task / A4 |
| P19 | Revalidate approval and request authoritative unit reservation | Current approval/unit → confirmed allocation or conflict / S3–S14 |
| P20 | Assemble approved lease and authorize its send | Reserved unit/template/terms → send-ready approved agreement / S13–A3–S14 |
| P21 | Send lease and record provider confirmation | Authorized agreement → envelope reference / S17–S15 |
| P22 | Track required signatures and permitted reminders | Envelope status → outstanding signer tasks or execution status / S17–S2 |
| P23 | Retrieve final agreement and reconcile lease records | Full execution → filed agreement and confirmed PMS update / S17–S8–S3 |
| P24 | Open established onboarding checklist | Executed lease → assigned financial/readiness/access tasks / S19 |
| P25 | Verify ledger requirements and unit readiness | Accounting/site confirmations → accurate readiness record / S18–A5–A6 |
| P26 | Authorize possession and arrange resident access | Satisfied requirements/current authority → approved handoff / A6–S19 |
| P27 | Confirm actual possession and resident transition | Actual handoff → PMS move-in and resident operations ownership / S3–S19 |
| P28 | Check overdue work and reconcile actual outcomes | Open tasks/provider/business states → corrections or exceptions / S20–S14 |
| P29 | Assign, escalate and recover blocked work | Exception → owner/deadline/manual coverage or verified retry / S2–S16–A7–A8 |
| P30 | Record withdrawal, manual completion or external disposition | Authorized closure evidence → stopped future actions and retained history / S2–S3–S15 |

### 10.5 Decision diamonds and branch labels

| ID | Decision | Branches |
|---|---|---|
| D1 | Event new, authentic and relevant? | New → link; duplicate/older → reconcile; unauthorized → security exception |
| D2 | Business association and contact route verified? | Yes → facts; uncertain → identity/contact task |
| D3 | Response supported and permitted now? | Yes → send/record; no → factual/sensitive task |
| D4 | What does the household want next? | Tour → scheduling; apply directly → portal; person → assigned help; no next action → bounded waiting |
| D5 | Selected slot available and within policy? | Yes → booking; conflict → alternatives; exception → human scheduling approval |
| D6 | Tour access prerequisites satisfied? | Yes → approved access; no → guided/reschedule task; guided tour → staff coverage |
| D7 | Application complete and prerequisites met? | Yes → evidence; incomplete → approved information request; no authorization → no verification |
| D8 | Evidence usable, correctly associated and comparable? | Yes → fixed criteria; unclear/unavailable → reviewer; disputed/sensitive → compliance |
| D9 | What did the authorized human decide? | Approve → reservation; more information → approved request; sensitive/conditional/adverse review → compliance; withdraw/close → recorded disposition |
| D10 | Approval current and unit reservation confirmed? | Yes → lease preparation; stale → renewed review; conflict → manager allocation task |
| D11 | Exact agreement, signers and send authorized? | Yes → send; no → lease-preparation task |
| D12 | What is the signature status? | Pending/partial → track; fully executed → final filing; declined/expired/voided → human signature task |
| D13 | Final documents and PMS update confirmed? | Yes → onboarding; no → filing/sync exception |
| D14 | Financial and readiness requirements satisfied? | Yes → possession review; no/unknown → accounting or readiness task |
| D15 | Possession authorized and actual handoff confirmed? | Yes → resident transition; pending/blocked → site task |
| D16 | Action outcome confirmed after failure? | Confirmed complete → reconcile; confirmed not done and retry permitted → controlled retry; unknown → no blind retry |
| D17 | Work overdue or ownership missing? | No → continue waiting/checking; yes → assignment/escalation |

### 10.6 Exception boxes and their owners

| ID | Exception / stop | Owner; resume condition |
|---|---|---|
| E1 | Identity, record-match or contact ambiguity | A2 / approved identity role; deterministic association or verified contact |
| E2 | Unsupported fact, sensitive question or requested human assistance | A2/A4 as appropriate; approved facts or human handling |
| E3 | Scheduling conflict or policy exception | A2/A3; confirmed permitted selection and any required approval |
| E4 | Access failure or uncertain tour outcome | A2/A6; approved access alternative or recorded outcome |
| E5 | Incomplete file or missing authorization | A2/A3; approved follow-up and satisfied prerequisites, or disposition |
| E6 | Unclear extraction, unavailable verification or incomparable evidence | A3; corrected/alternative evidence with source |
| E7 | Dispute, accommodation, conditional terms or contemplated adverse outcome | A4/A3; external human process and current disposition, no automated notice |
| E8 | Stale approval or unit allocation conflict | A3; renewed authorization and authoritative reservation |
| E9 | Lease preparation, signer, delivery or signature problem | A3/lease administrator; authorized correction and confirmed status |
| E10 | Executed agreement missing or business record not synchronized | A8 plus business record owner; final document and reconciled update |
| E11 | Financial status pending, returned or unresolved | A5; ledger-confirmed resolution |
| E12 | Unit readiness or possession problem | A6/A3; approved readiness and actual handoff |
| E13 | Delivery failure or channel opt-out | A2; permitted alternate route or human disposition |
| E14 | Provider/service failure or action outcome unknown | A8 plus stage owner; verified outcome and safe recovery |
| E15 | Unsafe upload, unauthorized event or security concern | A8/security; cleared incident under approved process |
| E16 | Unowned, overdue or abandoned work | A7; authorized reassignment, completion or disposition |

### 10.7 Output milestones

| ID | Confirmed output | Where visible |
|---|---|---|
| O1 | Inquiry recorded and factual response outcome known | CRM conversation and action history |
| O2 | Exact appointment booked | Calendar/tour system and lead record |
| O3 | Tour outcome recorded, including unknown when appropriate | Tour/CRM record |
| O4 | Application received with household/adult relationships | Portal/PMS and restricted document links |
| O5 | Evidence file ready for human review | Existing manager task and restricted evidence |
| O6 | Human decision recorded | Business record and audit history |
| O7 | Unit reservation confirmed | Authoritative allocation/PMS record |
| O8 | Lease send confirmed | Envelope record and business task |
| O9 | All required signatures complete and final agreement filed | Signature service, document repository and PMS |
| O10 | Onboarding requirements ready for possession review | Existing onboarding, accounting and site queues |
| O11 | Actual possession confirmed and resident operation owns the record | PMS resident/move-in record |
| O12 | External disposition or withdrawal recorded; automated actions stopped | Closed/handed-off business record with retained history |

### 10.8 Primary connector list

Draw these arrows with the labels stated below. O nodes are milestones on the relevant arrow, not additional work applications.

| Connection | Arrow label / meaning |
|---|---|
| A1 → S1 → S2 → P1 → D1 | Inquiry arrives through existing tools; source retained |
| D1 new → P2 → D2 | Associate business record and permitted contact |
| D2 yes → P3 → P4 → D3 | Retrieve facts, prepare bounded response and validate |
| D3 yes → S4 → A1; S4 → O1 → S2 | Send response; record acceptance/delivery state |
| O1 → D4 | Establish requested next service |
| D4 tour → P5 → D5 | Offer real times and obtain selection |
| D5 yes → P6 → O2 → P7 → D6 | Confirm booking, then arrange permitted access/coverage |
| D6 yes or guided → S6/A2 → P8 → O3 | Tour/access event or employee outcome recorded |
| O3 interested → P9; D4 direct application → P9 | Invite without assuming tour attendance is required |
| P9 → S4 → A1 → S7 → P10 → O4 → P11 → D7 | Existing portal submission and prerequisite checks |
| D7 yes → P12 and P13 | Read source documents and obtain authorized provider results |
| P12 and P13 → D8 | Check usable, associated, comparable evidence |
| D8 yes → P14 → O5 → P15 → A3 | Fixed criteria evidence enters human review task |
| A3 → P16 → O6 → D9 | Authenticated human disposition and exact authority |
| D9 more information → P17 → S4 → A1 → P10/P13 | Individually approved request; new information adds a version |
| D9 approve → P19 → D10 → O7 | Revalidate current authority and confirm unit reservation |
| O7 → P20 → A3 → D11 | Approved template/variables and explicit send authority |
| D11 yes → P21 → S17 → O8 → P22 → D12 | Confirm envelope send and track required signers |
| A1 and required company signer → S17 → D12 | Signature updates from the provider, not assumed from email |
| D12 pending/partial → P22 | Remain waiting; follow approved reminder/aging policy |
| D12 fully executed → P23 → D13 → O9 | Retrieve final documents and confirm business update |
| O9 → P24 → P25 → D14 | Existing onboarding tasks; ledger and readiness confirmation |
| D14 yes → O10 → P26 → A6 → D15 | Authorized possession review and access/handoff |
| D15 yes → P27 → O11 → S3/S19 | Actual move-in recorded; handoff to resident operations |
| D9 close/withdraw → P30 → O12 | Human disposition recorded; future automation stopped |

P12 and P13 can run independently after D7, but P14 must not treat the file as complete before required results or an authorized alternative are accounted for. If an external compliance process authorizes approval, it reconnects at P16 with current evidence and authority, not directly at P21.

### 10.9 Exception and recovery connectors

| Connection | Meaning and return path |
|---|---|
| D1 duplicate/older → P28 | Reconcile existing state; no repeat action |
| D1 unauthorized → E15 → P29 | Security investigation; no business change |
| D2 uncertain → E1 → P29 → P2 | Resolve association/contact before private disclosure |
| D3 no or D4 person → E2 → P29 → A2/A4 | Human response; return to P3/P4 only when facts and scope permit |
| D4 waiting → P28 | Bounded follow-up or recorded disposition; no endless contact |
| D5 conflict → E3 → P5 | Obtain another prospect-confirmed time |
| D5 policy exception → E3 → A2/A3 → P5/P6 | Human approves, then availability is checked again |
| D6 no or uncertain outcome at P8 → E4 → P29 | Guided/reschedule alternative or accurate outcome; resume P7/P8 |
| D7 incomplete/no authorization → E5 → A2/A3 → P17 | Individually approved follow-up; P11 rechecks prerequisites |
| D8 unclear/unavailable → E6 → A3 → P12/P13/P14 | Corrected evidence or documented authorized alternative |
| D8 disputed/sensitive or D9 compliance route → E7 → P18 → A4 | Restricted external human process, no automated adverse notice |
| A4 external disposition → P16 or P30 | Current approval goes through D9; closure records O12 |
| D10 stale/conflict → E8 → A3 → P15/P19 | Renewed authority/allocation before lease preparation |
| D11 no or D12 declined/expired/voided → E9 → P29 → A3 | Authorized resolution; resume P20/P22 or record disposition |
| D13 no → E10 → P29 → P23 | Retrieve/reconcile existing execution; do not resend lease |
| D14 financial issue → E11 → A5 → P25 | Ledger-confirmed resolution or authorized disposition |
| D14 readiness issue or D15 pending/blocked → E12 → A6/A3 → P25/P26 | Readiness and approved possession, never inferred from elapsed time |
| S4 failed delivery/opt-out → E13 → A2 → P29 | Permitted alternate channel or disposition; no prohibited retry |
| P12/P13/P21 or any external action failure → E14 → P29 → D16 | Check actual outcome before deciding on retry |
| D16 complete → P28; D16 not done/retry permitted → S16 → affected P box | Reconcile confirmed action or safely repeat only the failed action |
| D16 unknown → E14 → A8 | Hold and investigate; no blind resubmission |
| Unsafe upload/approval at any stage → E15 → A8 | Quarantine/investigate and resume only with clearance |
| Active records → P28 → D17 | Periodic overdue/ownership checks and reconciliation |
| D17 yes → E16 → P29 → A7 | Backup assignment and supervisor escalation |
| D17 no → S16 → P28 | Durable scheduled recheck, not a busy polling loop |
| Withdrawal/manual completion at any stage → P30 → O12/P28 | Stop affected future actions; reconcile completed manual work |

Every E box is linked to a visible task in S2 or the company's designated existing work system. P29 writes owner, due time and recovery history to S15. If task synchronization itself fails, S20 alerts A8/A7 through an independently tested company support route.

### 10.10 Common audit and control links

- All P boxes send their accepted inputs, authorization references and confirmed outcomes to S15, with sensitive content minimized.
- S13 supplies current policy/template versions to P3, P4, P11, P14, P19 and P20.
- S3 supplies current unit/household/lease state to P2, P3, P10, P19, P23 and P27.
- S8 supplies restricted originals to P12 and authorized reviewers; P23 files the executed agreement there.
- S16 preserves pending work for P1, P17, P21, P22, P28 and P29, and for other retryable external actions.
- S20 observes service health, reconciliation, deadlines and incident recovery; A7 sees business measures and A8 sees technical/security work.
- Material changes in S2/S3/S13 or verification sources return the affected record to P11/P15/P19 as appropriate. They cannot silently reuse an obsolete authorization.
- S18 confirms financial state to P25. S19 and A6 confirm readiness and actual possession. Neither AI output nor a chat reply supplies those confirmations.

### 10.11 Completion conditions for the map

The drawing is complete only if a prospect can trace both the ordinary path and a blocked file. It must visibly show:

- Existing systems remain the business workplace and record authority.
- AI prepares bounded factual work; fixed controls and people authorize consequential actions.
- Every application decision comes from an authorized human.
- Consumer-report-related adverse action leaves the automated notice path and enters the established human process.
- A confirmed unit reservation precedes lease sending.
- Full lease execution, payment status, readiness and possession are different milestones.
- Failed delivery, unclear evidence, competing allocation and unknown action outcomes do not silently complete.
- Exceptions have owners, deadlines, escalation and a defined return or closure path.
- Resident operations receives a confirmed handoff, not an assumed move-in.

The meeting explanation is simple: the company keeps its tools and decisions. The background system connects the work, prepares evidence, completes routine authorized steps and makes unfinished work visible. Its value comes from doing that consistently across the portfolio, not from letting AI decide who gets a home.
