# Build 05 — Customer language: leasing and application coordination

Research checked: 2026-09-16. Intended use: LinkedIn content foundations, not applicant-facing policy or legal guidance.

This file records language and operating concerns for content about this build. It isn't customer validation. We haven't established interviews, service relationships or independently measured results for the operators cited below.

Read alongside [product-marketing.md](../../.agents/product-marketing.md). For current build facts, use [progress-notes.md](../../progress-notes.md); for the proposed deployed system, use the [production blueprint](../production-leasing-tenant-screening-blueprint.md).

## 1. What this research can and cannot establish

Property operators supply the strongest available material: application instructions and a leasing job description. Real tasks and terminology. It doesn't establish how often a smaller PM company experiences each problem, what it would pay to solve it, or which message would persuade it.

Vendor-hosted practitioner accounts add useful language about follow-up and visibility. They are selected marketing stories, not an independent sample of customer opinion. Trade-association survey findings establish the concerns of the respondents, not a fraud rate across all rental applications.

This research doesn't include private PM groups, client interviews, call transcripts, an independent customer review corpus or approved first-party testimonials. Here's the distinction. The suggested lines later in this file are writing hypotheses, not discovered customer quotations.

| Evidence label | Meaning | Permitted use | Limit |
| --- | --- | --- | --- |
| Operator-published | An operator describes its process or staff duties | Vocabulary, task context, examples of process variation | Not a universal rule or evidence of our customers' experience |
| Vendor-hosted practitioner | A named practitioner speaks on a supplier's website | Short attributed excerpts and qualified pain themes | Not independent validation or a testimonial for our build |
| Association survey | Reported responses from a defined sample | Carefully bounded industry context | Preserve year, population, denominator and question |
| Provider/regulator documentation | Official product definitions or regulatory guidance | Correct terminology and claim restrictions | Not proof that this demo has production access or legal certification |
| Build evidence | Stored test outcomes and recorded demo behavior | Claims about what the synthetic demonstration did | Not client ROI, production reliability or model accuracy |
| Constructed language | Wording developed for future content | A draft to test in conversations and content | Never attribute it to a customer or disguise it as an interview quote |

## 2. Short, sourced language excerpts

This inventory supplies short quotations for subsequent content. Keep the context. Quotation marks elsewhere mustn't turn invented phrasing into customer evidence; retain attribution and don't reproduce whole source paragraphs.

| ID | Exact excerpt | Speaker or publisher | What it helps us understand | Source quality |
| --- | --- | --- | --- | --- |
| Q1 | “Qualification requirements may vary in certain jurisdictions in accordance with applicable laws” | Progress Residential | Published criteria need local context; one national rule is not enough | Operator-published application guide |
| Q2 | “Proof of Income” | Progress Residential | Familiar applicant-facing terminology; do not lead with an API product name | Heading in the same operator guide |
| Q3 | “preparing follow-up and sales correspondence to prospective residents” | Greystar | Follow-up is a staff duty, alongside lease files and PMS entries | Published employer job description |
| Q4 | “my leasing team was buried underneath a mountain of follow-up” | Carlea Jelley, former Camden onsite manager and, at publication, Funnel Solutions Engineer | Repeated follow-up can compete with other leasing work | Vendor-hosted firsthand account, dated May 11, 2022 |
| Q5 | “without having to bother the site team” | Heather Justice, Director of Training, LCOR | Shared communication history can reduce internal interruptions | Vendor-curated customer case study |

Q1–Q2: [Progress Residential — Before You Apply](https://rentprogress.com/residents/leasing-guide/before-you-apply).

Q3: [Greystar — Leasing Professional, Nash Springs](https://jobs.greystar.com/job/colorado-springs/leasing-professional-nash-springs/35302/100395931200).

Q4: [Funnel — Former property manager's account](https://funnelleasing.com/articles/four-ways-funnel-transformed-multifamily-operations-through-the-eyes-of-a-former-property-manager).

Q5: [Funnel — LCOR training and performance case study](https://funnelleasing.com/case-study/lcor-training-performance).

Do not present Carlea's experience as independent of Funnel: the article explicitly identifies her supplier employment. Do not borrow LCOR's conversion or tour results to describe this build.

## 3. Operating observations behind the language

### Leasing work is more than responding to a lead

Greystar's role description includes file assembly, established lease documents, signing appointments, record security and data entry in Yardi/OneSite. That supports content about the administrative work surrounding leasing. It does not show that every PM business uses those systems or has the same job structure. [Greystar role description](https://jobs.greystar.com/job/colorado-springs/leasing-professional-nash-springs/35302/100395931200).

Content implication: name the handoff. An inquiry reply, a complete application file, a manager decision and a signed lease are different events. A reply bot alone does not complete all four.

### Household and reservation processes vary

Progress publishes a reservation point tied to all applicants signing and security deposits being collected. Mynd's published process describes separate adult applications and a holding fee after approval. These are examples of different operating policies, not recommendations to copy either company's criteria or fees. [Progress guide](https://rentprogress.com/residents/leasing-guide/before-you-apply), [Mynd application process](https://support.mynd.co/kb/guide/en/what-is-mynds-rental-application-process-3g1uG8Z9A9/Steps/291442).

Content implication: avoid declaring one universal application-to-move-in sequence. A production design needs the client's household rules, allocation controls and legal review. Checking that a home can be offered is not the same as declaring it reserved.

### Visibility matters to people beyond the leasing agent

The LCOR case describes access to communication history for training and operational oversight. This supports a visibility theme. It does not establish that our demo records telephone calls, operates a training platform, or provides the same reporting. [LCOR case study](https://funnelleasing.com/case-study/lcor-training-performance).

Content implication: show the record of the action, not a decorative dashboard. A status badge, an attempted send, successful delivery and a human reading a message are different forms of evidence.

### Income comparisons need context

Plaid distinguishes bank-derived net income from payroll-derived gross income. A difference between a stated amount, a pay document and bank deposits is not automatically a lie. Periods, coverage and income basis matter. [Plaid Bank Income](https://plaid.com/docs/income/bank-income/), [Plaid Payroll Income](https://plaid.com/docs/income/payroll-income/).

Content implication: say that evidence needs review, not that AI caught a dishonest renter. Our Sandbox comparison is a test fixture, not a production fraud detector.

## 4. Vocabulary for this build

Choose terms by the business event and the reader, not by a blanket rule that every PM says the same thing.

| Term | Use it for | Avoid confusing it with |
| --- | --- | --- |
| Prospect / prospective resident | Someone asking about or touring a home | An approved applicant or current resident |
| Applicant | Someone who has submitted an application | Someone who has only asked a question |
| Household | Linked people applying to occupy one home | One person, one message thread or one form |
| Resident / tenant | Appropriate post-tenancy context; operator terminology varies | Every incoming lead |
| Inquiry | An initial request or question | A complete rental application |
| Lead | CRM/pipeline context | A value judgment about the person |
| Guest card | A common multifamily prospect record; use when the audience uses it | A universal name for every PMS record |
| Follow-up | The next contact or task after an event | An endless sequence of automated reminders |
| Tour / showing | A scheduled property visit | Verified attendance |
| Available slot | A time returned by the scheduling system | A booking already confirmed |
| Pre-qualification | Self-reported information used here for scheduling triage | Verified screening or a rental decision |
| Rental application | Information submitted for the company's review | A lease or a promise of approval |
| Complete application file | The required information and evidence collected under policy | A file that necessarily meets criteria |
| Proof of income | The evidence requested by the business | One mandatory bank-connection route for everyone |
| Income verification | A defined provider/evidence process with a stated basis | A model treating an uploaded figure as unquestionably true |
| Screening report | A report from an authorized provider in production | Our fabricated credit/eviction result |
| Published criteria | Business rules reviewed for the relevant property and jurisdiction | AI preferences or automatically lawful rules |
| Criteria result | An evidence-backed deterministic classification in this demo | The manager's final rental decision |
| Needs review | A defined human task | A hidden risk score or a euphemism for rejection |
| Approval | An authorized human's recorded decision | A model suggestion that silently becomes a decision |
| Lease | The approved agreement sent through the signing process | The application that precedes it |
| Signature complete | The specified signature event has been confirmed | All production move-in obligations satisfied |
| Move-in ready | Company-specific readiness requirements have been checked | A single signature callback |
| Possession / access | The authorized handover of the home | A fabricated demo tour PIN |
| PM software / PMS | The company's property management system | Our demo's Postgres database |
| Leasing CRM | Prospect communication and pipeline records | Necessarily the accounting or lease system of record |
| Exception | A task that cannot proceed normally and needs an owner | A technical error that nobody sees |
| Units / homes / apartments / doors | Match the property type and operator's vocabulary | A rule that only “doors” sounds authentic |

For a small residential PM, property manager or leasing coordinator may be natural. Larger multifamily companies may use onsite team, leasing professional and centralized leasing team. Ask which titles fit. Don't import an enterprise org chart without checking the company's roles.

## 5. Constructed operational language bank

This section supplies proposed wording for the build. Drafts, not quotes. None of these lines comes from an interview, source excerpt or validated customer statement, so don't introduce one with a customer told me without adding a real approved source.

| ID | Moment / perspective | Constructed phrasing | What the content should demonstrate |
| --- | --- | --- | --- |
| L1 | Inquiry; leasing employee | The same property questions keep pulling us away from other work. | A factual answer grounded in the approved property record |
| L2 | Inquiry; ops leader | Who owns the inquiries that arrive when the team is busy? | Contact permission, response routing and a visible human fallback |
| L3 | Contact handoff; employee | I need to see what we already told this prospect. | Logged communication without implying call recording exists |
| L4 | Tour; coordinator | Booking the tour shouldn't mean another round of calendar emails. | A checked slot followed by an actual confirmed booking |
| L5 | Tour exception; manager | A scheduled tour doesn't tell me whether anyone attended. | The demo's operator-triggered completion, clearly labelled |
| L6 | Application; coordinator | We have an application, but we're still missing part of the file. | Completeness versus eligibility; approved document requests |
| L7 | Document review; manager | Show me where that number came from. | Extracted value with its source, not a model's recommendation |
| L8 | Income; reviewer | These amounts don't match. Are we comparing the same thing? | Period, gross/net basis, coverage and alternative evidence |
| L9 | Household; ops leader | One person finishing doesn't mean the whole household is ready. | A production requirement, not a tested multi-applicant feature |
| L10 | Decision; principal | Help us prepare the file. Don't choose who gets the home. | AI boundaries, deterministic evidence and recorded human decision |
| L11 | Screening communication; manager | I want to approve what goes to the applicant at this stage. | Individual approval and guardrails at send time |
| L12 | Lease; coordinator | Has the lease been sent, or has it been signed? | Separate recorded states and confirmed signing callback |
| L13 | Lease exception; manager | The signing link expired. Who is following up? | Production exception ownership, not a promise of a tested recovery feature |
| L14 | Internal visibility; ops leader | I shouldn't need to ask three people for an application update. | Current status, actor and next owner in existing tools where available |
| L15 | Reliability; principal | If an integration stops working, I need to know what is waiting. | The production recovery design versus local demo limitations |
| L16 | Adoption; employee | I don't want another screen to check all day. | Existing-tool production fit, conditional on approved integrations |
| L17 | Purchase evaluation; buyer | We already pay for leasing software. What's missing? | A gap assessment; recommend native functionality when sufficient |
| L18 | Capacity; owner | Can the team handle more applications without more copy-and-paste? | A measurable pilot question, not a staffing reduction promise |
| L19 | Applicant perspective | I sent the information. What happens next? | Approved status updates without implying approval or possession |
| L20 | Move-in; ops leader | Signed is one milestone. Ready to hand over the home is another. | The production distinction; physical move-in is outside demonstrated scope |

Use the underlying situations as content subjects. That's the purpose. Don't publish the table as if twenty customers described these problems.

## 6. Pain, desired change and evidence boundary

| Concern | Business consequence to investigate | Desired change | Evidence status |
| --- | --- | --- | --- |
| Repeated questions and follow-up | Staff interruptions and delayed responses | Routine factual communication handled consistently | Published practitioner context; local answer path demonstrated |
| Scattered application evidence | More checking and less clear review | One reviewable file with source references | Staff duties supported by operator source; synthetic extraction demonstrated |
| Unclear ownership | Waiting work may not get followed up | Named owner and due time for exceptions | Production design; prevalence unmeasured |
| Re-entering status across tools | Extra admin and inconsistent records | Event-based updates back into approved business tools | Demo state/mirror demonstrated; PMS write-back not implemented |
| Uncontrolled application communication | An outcome-sensitive message may leave without review | Human-approved screening-stage messages | Demo design and documented approval flow |
| Signing follow-up | Staff may need to check another system | Confirmed signing event reflected in the record | Sandbox callback demonstrated; production recovery proposed |
| Extra application to monitor | Adoption burden | Employees use existing surfaces where feasible | Production objective; demo still uses separate tools |
| More volume | More administrative work if each case requires repeated handling | Lower staff handling time without abandoning review | Hypothesis requiring a client baseline and pilot |

The emotional territory is less chasing, fewer interruptions and clearer control. Treat that as a positioning hypothesis. Do not write that the build removed stress from a real team without first-party evidence.

## 7. Quantitative source gate

### Optional industry context: use only with the full denominator

NMHC's January 2024 survey collected responses from 75 NMHC/NAA member apartment owners, developers and managers between November 15, 2023 and January 9, 2024. Seventy reported fraud in the preceding twelve months. Of those seventy, fifty-nine, or 84.3%, reported falsified or fabricated paystubs, employment references or other income documentation. [NMHC full survey results, page 1](https://www.nmhc.org/globalassets/research--insight/survey/nmhc_pulse_survey_operational_impact_rental_fraud_bad_dept_full_results.pdf).

Do not shorten this to 85% of landlords, 85% of applications are fraudulent, or a current 2026 fraud rate. It is a respondent experience measure from a specific survey, not application-level prevalence or evidence that our build detects fraud.

Recommended editorial choice: lead with the demonstrated coordination problem instead. Fraud statistics can overwhelm the build's real claim and encourage misleading fraud-prevention positioning.

### Internal numbers are not business results

The project records 69 checks across leasing, screening, application-form and mirror checks. That is a test count, not 69 real applicants, 69 client deployments, 100% extraction accuracy or a reliability benchmark. Recheck the current evidence before using it in a post.

The production blueprint's capacity and vacancy examples are labelled hypothetical. Its illustrative hours and dollar figures must not become a headline about savings achieved by this build.

## 8. Claims and wording to reject

| Do not write | Better direction | Reason |
| --- | --- | --- |
| AI screens and approves tenants | AI prepares information; an authorized person decides | The model never makes rental decisions |
| Find the best tenants | Help the team review application evidence | No scoring, ranking or protected-class inference |
| Caught an applicant lying | The test evidence differed and required review | A discrepancy is not proof of fraud |
| Verified their real bank income | Used a Plaid Sandbox income response | No real applicant bank connection occurred |
| Ran a background check | Used labelled synthetic credit/eviction fixtures | No real consumer reports were obtained |
| Sent a real SMS | Used Telegram as the demo messaging stand-in | An SMS-like receipt does not change the transport |
| The renter completed a self-guided tour | Simulated access and recorded operator-triggered tour completion | No physical attendance or lock integration was proved |
| Fully compliant screening | Built controls with legal review required for deployment | Human approval and fixed rules are not certification |
| No human involvement | Routine steps run automatically; decisions and sensitive messages stay controlled | Human review is intentional, not a defect |
| End-to-end move-in automation | Demonstrated inquiry through sandbox lease signing and welcome delivery | Deposits, readiness and possession were not implemented |
| Integrates with every PMS | Production integration depends on approved access and system capabilities | Demo PMS integration does not exist |
| Saves X hours every month | Measure staff handling time in a pilot | No client time study exists for this build |
| Never loses a lead | Tracks work and designs explicit exception handling | No absolute guarantee or production uptime proof |
| Bank data cannot be wrong | Check evidence basis, coverage and discrepancies | Provider outputs can be incomplete or unsuitable |

Rental adverse action is not synonymous with denial: consumer-report-based conditions can also trigger obligations. Do not state that every rental case requires the employment-style two-step pre-adverse process. The business's authorized human/legal process owns applicable notices; this build does not draft or send them. [FTC landlord guidance](https://www.ftc.gov/business-guidance/resources/using-consumer-reports-what-landlords-need-know).

## 9. Copy rules for the next documents

1. Start with one piece of work: a property question, booked tour, application file, manager review or signing event.
2. Name who has the problem. The principal, leasing employee and applicant do not have identical concerns.
3. Speak as the builder. Do not imply that the author managed these properties or observed client results.
4. Say what ran, what was synthetic and what remains a production design.
5. Explain software only when it helps the reader understand the outcome or control.
6. Prefer clear ownership and evidence over impressive automation counts.
7. Keep applicant dignity intact. Avoid bad tenants, risky people, red flags and scare-based stories.
8. Do not imply that faster review means bypassing a person's rights or the company's policy.
9. Never borrow a competitor's customer outcome or testimonial as our own proof.
10. Do not assume tour-first is universal; application-first processes also need discovery.
11. Explain that applicant approval, home allocation, required signatures and possession are separate.
12. Ask process questions without soliciting real applications, reports or sensitive documents in comments or DMs.
13. Use one grounded claim per post. A source list cannot rescue a misleading headline.
14. Do not use the sourced short excerpts as fabricated dialogue in a demo scene.

## 10. Questions that would improve real customer-language evidence

These are discovery questions for later conversations, not a research claim that those conversations happened.

- Walk me through the last application that needed extra follow-up. Where did it wait?
- Which leasing tasks already work well in your PMS or CRM?
- What do employees still copy between email, calendar, application portal and PM software?
- Who owns an application when the usual reviewer is away?
- How do you tell that a tour happened, not only that it was scheduled?
- What counts as a complete application file for one household?
- Which information can come from your approved income provider, and what alternatives do you accept?
- Which messages require approval today, and who approves them?
- When is a home offered, held, reserved and removed from availability under your policy?
- What has to happen after signatures before you release possession?
- Which existing screen should display waiting work and exceptions?
- What volume and staff handling-time baseline would make a pilot worthwhile?
- What would you call this problem in your own words?
- May we record and quote your wording, with the intended attribution agreed in advance?

Capture role, portfolio context, exact wording, consent, date and the event discussed. Keep sensitive resident/applicant information out of the marketing research file. Mark customer-permission restrictions before using any statement publicly.

## 11. Source register

Research check date: 2026-09-16. It isn't a publication date. Job and product pages may change; recheck before making a current capability claim.

| ID | Source | Type / age | Supported use |
| --- | --- | --- | --- |
| S1 | [Progress Residential application guide](https://rentprogress.com/residents/leasing-guide/before-you-apply) | Operator page; publication date not stated | Applicant vocabulary and process variation |
| S2 | [Mynd application process](https://support.mynd.co/kb/guide/en/what-is-mynds-rental-application-process-3g1uG8Z9A9/Steps/291442) | Operator help page; publication date not stated | Household and holding-process context |
| S3 | [Greystar leasing role](https://jobs.greystar.com/job/colorado-springs/leasing-professional-nash-springs/35302/100395931200) | Operator job description; live role page | Administrative tasks and vocabulary, not buyer research |
| S4 | [Carlea Jelley's Funnel article](https://funnelleasing.com/articles/four-ways-funnel-transformed-multifamily-operations-through-the-eyes-of-a-former-property-manager) | Vendor-hosted practitioner article; May 11, 2022 | Attributed follow-up language; dated account |
| S5 | [LCOR / Funnel case study](https://funnelleasing.com/case-study/lcor-training-performance) | Vendor-curated customer account; page date not stated | Attributed visibility language, not our results |
| S6 | [NMHC full fraud survey](https://www.nmhc.org/globalassets/research--insight/survey/nmhc_pulse_survey_operational_impact_rental_fraud_bad_dept_full_results.pdf) | Association survey; January 2024 | Exact denominator-limited optional context |
| S7 | [FTC landlord consumer-report guidance](https://www.ftc.gov/business-guidance/resources/using-consumer-reports-what-landlords-need-know) | Regulator guidance | Claim boundaries; not individualized legal advice |
| S8 | [Plaid Bank Income](https://plaid.com/docs/income/bank-income/) | Provider documentation | Bank/net-income terminology |
| S9 | [Plaid Payroll Income](https://plaid.com/docs/income/payroll-income/) | Provider documentation | Payroll/gross-income terminology |

The Build 01/02 maintenance-triage content foundations supplied a structural reference, not evidence about leasing customers. Their prices, portfolio cutoffs, customer statements and maintenance-specific language are not carried over.

## 12. Handoff to the content plan

This document supplies vocabulary, qualified pain themes, source-backed excerpts, proposed language and claim restrictions. The companion product-marketing file supplies audience, positioning, objections and proof.

The next-stage [content plan](linkedin-content-plan.md) now assigns each post a reader, business event, evidence source, demonstration boundary and purpose. It uses one full demo video, one same-footage short, six carousels and seven text posts; no standalone image posts.

The completed [post scripts](linkedin-post-scripts.md) now provide all fifteen posts, exact carousel copy, full-demo narration and the original-audio short edit brief. Recording and asset production remain later tasks. No content has been published and no customer language has been presented as validated interview evidence.

2026-09-17 — Carousel-only rewrite: all six decks now deliver practical checklists and worksheets, with 10/9/9/11/10/11 pages. See the current scripts and carousel design blueprint. Earlier PDF proofs are superseded; new asset exports await one design proof. Positioning, legal/proof boundaries, seven text posts and the single-master video contract are unchanged.
