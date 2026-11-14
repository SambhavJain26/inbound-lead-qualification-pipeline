# How The Renewal Retention System Works

Last updated: 2026-08-22

A plain-language description of what this build does, how it does it, and which problem
it solves. Written for a property manager or owner rather than a developer. Nothing here
requires knowing what n8n is.

## The Problem

**Problem statement:** Property managers often enter the renewal conversation without a
timely, organized view of the resident concerns that may influence whether someone stays
or leaves.

Property teams often learn about a resident's real concern too late.

The formal renewal process may tell the team whether a resident plans to stay, but it does
not always reveal what has been shaping that decision: an unresolved repair, a recurring
parking problem, poor communication, a safety concern, or a question that no one has
answered.

By the time a renewal offer goes out, the resident may already have made a decision. And
because the offer is a number with a date attached, the reply that comes back is usually
about the number. Whatever was actually wrong never enters the conversation.

There is a second problem. Property managers spend much of their week on routine and
reactive work. That makes it hard to check in personally with every resident at the right
time, read every reply closely, and make sure the important ones reach the right person.

The result is a gap between lease administration and resident experience. The lease date is
known. The resident's concerns often are not.

## Is This A Real Industry Problem?

Yes. Current property-management research supports four parts of the problem.

### Turnover Has A Material Cost

The National Apartment Association reported an average turn cost of about **$4,000 per
unit**, including lost rent, concessions, and maintenance. Its report also noted a gap
between why property managers think residents leave and what residents report: renters
ranked rent, safety, poor maintenance, and management communication among their leading
concerns. [National Apartment Association: Resident Retention at All-Time High](https://naahq.org/news/resident-retention-all-time-high)

That does not mean every resident can or should be retained. It means avoidable turnover
deserves attention because one missed concern can carry a real operating cost.

### Managers And Residents Do Not Always See The Same Problem

Zego's 2026 resident-experience research reports that average retention fell from 60% in
2024 to 57%. Property managers tended to attribute non-renewals to external life changes,
while renters pointed to controllable factors such as rent increases, poor maintenance, and
security concerns. [Zego: 2026 Resident Experience Management Report](https://www.gozego.com/publications-media/state-of-resident-experience-management/)

This is the visibility problem the system addresses. It gives residents an earlier
opportunity to say what is happening, rather than asking the property team to infer it from
a renewal outcome.

### Property Teams Are Stuck In Reactive Work

Research from the National Apartment Association and AppFolio surveyed 1,984 industry
professionals in 2025. The report says property-management leaders spend 66% of their time
on routine operational and reactive work, while only 33% goes to stakeholder engagement and
strategic work. [AppFolio and NAA: 2025 property-management performance findings](https://www.appfolio.com/newsroom/technology-implementation-now-a-top-challenge-for-real-estate-leaders)

That supports demand for a workflow that handles timing, first drafts, logging, and routing
while leaving judgment and resident relationships with the property team.

### The Market Is Already Asking For Automation With Human Oversight

Buildium reports that property-management AI adoption rose from 20% in 2024 to 58% in 2025,
but only 8% of companies had fully automated any process. Its research also links proactive
maintenance with owner value, trust, and resident retention. [Buildium: 2026 State of the Property Management Industry](https://www.buildium.com/resource/2026-property-management-industry-report/)

AppFolio's 2025 AI research identifies resident communication as the most common
property-management AI use case. The same research stresses human oversight, checking
outputs, and using AI within existing policies and laws. [AppFolio: State of AI in Property Management](https://www.appfolio.com/blog/ai-report)

Taken together, these findings point to demand for systems that remove repetitive
coordination and help people respond sooner, with the property manager still in control.

## What The Research Does And Does Not Prove

The evidence validates the problem: retention matters, turnover is costly, maintenance and
communication influence resident decisions, property teams are heavily reactive, and the
industry is adopting AI for resident communication.

It does **not** prove that this proof of concept increases renewals. That claim would
require a live pilot with real portfolios, a comparison group or baseline, and measured
outcomes over a renewal cycle.

The cited studies are industry and vendor-sponsored surveys rather than controlled academic
trials. They provide directional evidence of market demand and operating priorities, but
they should not be presented as guaranteed financial results.

## The Solution

**Solution statement:** Ask every resident one open question ninety days before their lease
ends, read what the answer actually means, and put anything that needs a person in front of
a person.

The system creates an early-warning loop before the formal renewal conversation.

It uses the lease end date to identify residents approaching renewal, prepares a short
check-in that is **structurally forbidden from mentioning rent, renewal terms or
deadlines**, requires a manager to approve each message individually, sends it by email, and
watches for the reply.

When a reply arrives, the system looks for the signal underneath the words. A resident can
sound positive and still mention a repair that has been ignored for months. Another may ask
for an accommodation. A third may be leaving, wavering, or asking not to be emailed again.

The system brings those signals to the property manager, drafts a response for them, and
records whether the issue was closed. It does not decide anything on its own.

## The Four-Stage Cadence

Residents are grouped by how far they are from their lease ending. The group decides what
happens, and only two of the four groups produce a resident email at all.

| Window | What happens | Does the resident hear from you? |
|---|---|---|
| **120 days** | Watchlist only. The resident appears in the pipeline and nothing else | No |
| **90 days** | The check-in. One open question, no mention of money | Yes, once a manager approves it |
| **60 days** | A lighter nudge, and **only** to residents who never replied to the 90-day message | Yes, once a manager approves it |
| **30 days** | An internal handoff to whoever runs leasing | **No.** Nothing is sent |

The thirty-day silence is deliberate. At that point the resident is inside the renewal-offer
window, and a soft "is everything okay" landing in the same week as a rate reads as a
tactic rather than a check-in. The automation's job there is to tell a person and stop
talking.

Group membership comes from the lease end date and nothing else. Not payment history, not
maintenance ticket counts, not tenure, not any score predicting who is likely to leave. A
smarter system could rank residents by risk. This one deliberately does not, because the
moment resident selection depends on behavior, somebody has to be able to explain that
choice later.

## The Complete Flow

### 1. The roster lives in Airtable

The property manager's lease data sits in an Airtable base they own: resident name, unit,
email, move-in date, lease end date.

Rows with problems stay visible instead of being quietly dropped. A misspelled email domain,
a duplicate unit number, a date nobody can parse, a missing address: each is flagged with
the reason attached, waiting for a person to correct. The row you silently delete is a
resident nobody contacts.

For this proof of concept the roster is synthetic. A production version receives approved
data from the client's property-management system or reporting process.

### 2. Residents group themselves by date

Days-to-expiry and the cohort are computed from the lease end date and written back to the
table as a color-coded field, so a manager can see the whole pipeline at a glance.

### 3. The check-ins are drafted

For the ninety-day group, OpenAI writes a short, individual message for each resident. It
uses their first name, refers naturally to how long they have lived there, and asks one
open question about whether anything is unresolved.

**Then the message is checked before any person sees it.** Rent, renewal terms, lease
changes, legal wording, deadlines, monetary amounts, dates, generic greetings and any
mention of automation are all rejected. A draft that fails is rewritten once. If it fails
twice it is marked as needing the manager's own wording rather than being quietly passed
through.

This is not the model being careful. Those words are blocked by fixed rules, and a draft
containing them does not reach the manager.

### 4. Every draft waits for a person

Each draft arrives in Telegram as a card carrying the resident, the unit, the lease end
date, how long they have lived there, and the full message.

The manager can:

- **Approve and send it**
- **Skip it**
- **Edit the wording** by typing a replacement straight into the chat
- **Move to the next draft** and work through the queue

Wording can also be edited directly in Airtable. Whatever the record holds at the moment of
approval is what sends.

**Ignoring the card is a valid decision.** Nothing goes out on a timer, and nothing goes out
because nobody answered.

### 5. The checks run a second time

When a message is approved, the same rules run again against whatever the record currently
says.

This matters because a manager can rewrite a draft after it was written. The first check
examines the model's words; the second examines the message that is actually about to be
sent. Wording a person typed themselves is checked exactly like wording the model produced,
and a message containing rent or a deadline is refused with the specific reasons listed.

### 6. One email goes out

Gmail sends the approved check-in from the client's own mailbox. The subject carries a short
reference code. The resident does nothing with it; it is how the system will recognize their
reply later.

Approving the same message twice does nothing. The system checks the resident's current
state before sending, so a nervous second tap cannot email somebody twice.

### 7. The resident replies normally

The resident hits reply in whatever email client they already use. There is no portal, no
app, no account, and nothing to install.

### 8. The reply is matched to a resident, or to nobody

The system checks for new replies on its own, about once a minute, and stays silent unless
something arrives.

Matching is deterministic and never delegated to the model:

1. The reference code carried in the subject line
2. Failing that, an exact match on the sender's email address

**If neither matches, the system says so and attaches the reply to nobody.** It raises an
unmatched-reply alert with the sender, subject and full text so a person can identify them
manually. It does not guess, because attaching a message to the wrong resident is worse than
attaching it to none.

### 9. What the reply means

Certain categories are identified by fixed rules **before** the model is consulted at all:
accommodation requests, habitability complaints, legal threats, discrimination concerns,
opt-outs, and obvious out-of-office replies. These are too consequential to depend on a
model noticing them.

Everything else goes to OpenAI, which classifies the message into a fixed set of fields:
what the resident intends, whether a grievance is present and of what kind, how urgent it
is, whether it touches a compliance-sensitive category, and how confident the reading is.

Then fixed rules decide what happens:

| The reply is | What happens |
|---|---|
| A clean, confident positive with no grievance and no question | Recorded as `STAYING`. No alert needed |
| Anything needing judgment | Becomes `AT_RISK`, opens an issue, and alerts a person |
| An opt-out | Written permanently to the record and excluded from every future run, and still routed to a person |
| An out-of-office auto-reply | Logged quietly. The resident is not moved and nobody is alerted |
| Unmatched | Alerted with no resident assigned |

**The case this exists for:** a resident writes *"We're happy here but the extractor fan has
been broken since summer and I've reported it twice."* The first four words read as good
news. What the system records is a maintenance grievance at high urgency, with an
instruction to check the work order history and call the resident today, because the part
that matters is that the problem has lasted months and the resident already used the process
and the process did nothing.

### 10. The manager gets a person-sized instruction

The Telegram alert carries the resident and unit, the lease end date and days remaining, the
classification badges, the resident's own words quoted in full, a confidence level, and one
specific next action.

Compliance-sensitive replies keep their own flag and read: *Nothing has been sent to the
resident. Compliance-sensitive: read it yourself before replying.*

### 11. The system drafts the reply; the manager sends it

The manager can ask for a suggested response. OpenAI writes one that names the specific
issue in the resident's own terms and says what happens next.

It is checked against its own rules: no promised dates, no costs, no guaranteed outcomes, no
rent, renewal or legal wording. The manager can edit it, then approves it, and only then
does it reach the resident.

**Every category gets a drafted reply at the same speed, including compliance-flagged ones.**
An earlier version of this build refused to draft anything for accommodation requests, which
looked cautious and was arguably the opposite: published fair-housing analysis warns that an
automated system giving instant service to ordinary questions while routing protected-class
requests into a slower queue can itself create a problem. The flag now changes what the
**manager** sees, not what the **resident** waits for.

### 12. The loop closes

When the issue is dealt with, the manager marks it resolved. The system records how long it
took, moves the resident out of the at-risk group, and drafts one final message asking the
resident to confirm it is genuinely sorted. That message also requires a separate approval.

Issue found, answered, fixed, and confirmed with the resident, with the resolution time
recorded.

### 13. The scoreboard keeps itself current

A metrics table refreshes automatically after every approval, send, reply and resolution. It
carries residents in the current window, check-ins sent, replies received, issues found,
issues resolved, average resolution time, how many residents are currently at risk, and the
turnover cost attached to them.

That last figure is presented as **exposure surfaced** and **exposure recovered**. It is the
client's own turnover cost applied to the residents currently flagged, and it moves to
recovered when an issue is closed. It is not money earned and should never be presented that
way.

### 14. The daily sweep, and failures that cannot hide

Each morning the system recalculates lease timing and cohorts from the lease end dates,
escalates any resident who was contacted and never meaningfully replied past the threshold,
refreshes the scoreboard, and posts a short summary.

Separately, if any part of the system fails, the manager is told: which workflow, which
step, the error, and when. A silent failure is the one outcome this must never have.

## What Each Tool Does

| Tool | Role |
|---|---|
| **Airtable** | The manager's screen and the system of record. Every resident, status, draft, reply, issue and metric lives here. Drafts can be edited directly in the table |
| **Telegram** | The action surface. Approvals, edits, alerts and resolutions all happen through buttons in a private chat with the property bot |
| **n8n** | Runs the five workflows that connect everything. Invisible during normal use |
| **OpenAI** | Writes the first draft of every outbound message and reads the meaning of every reply. It never decides who a reply belongs to and never sends anything |
| **Gmail** | The only channel that reaches a resident |

There is no separate web application to log into, and nothing to install. Both surfaces are
tools the client already owns.

## The Human Boundaries

These are enforced in code, not by prompting:

- **No resident-facing message is ever sent automatically.** OpenAI drafts; a manager
  approves each individual message before it leaves. Check-ins, replies and fix-confirmations
  all require a separate, explicit approval.
- **Guardrails run twice** — when a message is drafted and again at the moment it is sent.
  Wording a manager typed themselves is checked exactly like wording the model produced.
  Rent, renewal terms, lease changes, legal language, deadlines, monetary amounts and
  promised outcomes are all refused.
- **Resident selection uses the lease end date and nothing else.** No behavioral data, no
  payment history, no personal characteristics.
- **Replies are matched deterministically** by reference code, then by exact sender address.
  If neither matches, the system says it cannot identify the sender rather than attaching the
  reply to a guessed resident.
- **Compliance-sensitive replies are flagged before the model is consulted**, by fixed rules
  rather than by asking a language model to notice.
- **Opting out is permanent** and removes the resident from all future outreach.
- **A double tap cannot send twice.** Every send checks the resident's current state first.
- **Failures are loud.** A failed send is recorded and reported; a failed workflow alerts the
  manager with the workflow, step and error.

## What The System Will Not Do

Stated plainly, because the limits are part of the design rather than gaps in it:

- It does not price a renewal or recommend a rent figure.
- It does not predict who will renew, and produces no risk score.
- It does not negotiate, make promises, or commit the property to a repair.
- It does not send legal notices, renewal offers, or lease documents.
- It does not contact residents in the thirty-day window at all.
- It does not write into a property-management system.
- It does not reply to a resident without a person approving that specific message.

## What The Proof Of Concept Proves Today

The build has been run end to end against forty synthetic residents, with real Gmail, real
Telegram, real OpenAI and a real Airtable base. Verified:

- Forty residents load with eight problem rows visible and flagged, and cohorts derived from
  lease end dates alone.
- Fourteen check-ins drafted in about twenty-five seconds, with **fourteen of fourteen**
  passing the wording checks.
- An unsafe edit typed by hand is refused at send time with the specific violations listed.
- Approving one resident sends exactly one email. Approving again sends nothing.
- Skip is refused on a resident who has already been contacted.
- A real reply is matched by reference code on the first attempt and classified as a
  high-urgency maintenance grievance with a specific next action.
- An accommodation request is flagged before the model runs.
- A drafted reply is sent only after a separate approval.
- An issue is closed, the resolution time recorded, and a confirmation sent after another
  approval.
- An unmatched reply alerts with full detail and is attached to no resident.
- An audit of the activity log confirms **every outbound email corresponded to an explicit
  human tap**.

**This is testing, not a customer result.** There is no client yet. Nothing above should be
presented as an outcome achieved for a property management company.

## What A Client Pilot Must Measure

A real pilot should test whether this process changes operating outcomes. Useful measures:

- Percentage of eligible residents reached at the intended time
- Draft approval, edit, and rejection rates
- **Resident reply rate** — the number the pilot lives or dies on. A check-in nobody answers
  produces nothing, and this should be measured in the first month rather than assumed
- Number and type of concerns found before formal renewal
- Time from alert to manager follow-up
- Number of issues closed before the renewal decision
- Renewal rate compared with the client's prior baseline
- Avoided turnover cost, using the client's own accounting

The last two matter most, and both require a complete renewal cycle. The proof of concept
should not promise them in advance.

## What Production Would Add

This is a local proof of concept, not a production deployment. A production version would
require:

- Connection to the client's approved property-management system or data export
- Client-approved message policy and brand voice
- Defined team ownership and response deadlines
- Proper user access and authentication
- Security, privacy, retention, and audit policies
- Compliance and legal review for the client's location and portfolio
- Production email setup with the client's own sender identity
- Monitoring, support, and recovery procedures
- Pilot reporting against the client's baseline

A second channel is the most likely first addition. Email is the right choice for a proof of
concept because every lease roster carries an address and replies come back as text that can
be matched deterministically. SMS reaches more people, and would require the client's own
registered provider and 10DLC setup.
