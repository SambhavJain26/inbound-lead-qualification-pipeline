# How The System Works

Written for a property manager or owner. Nothing in this document requires knowing what
automation tool runs underneath it, and it does not name one. You should be able to read
this, understand exactly what the system does and refuses to do, and decide whether it is
worth a pilot, without any technical background.

**There is no client using this today.** It is a working proof of concept, tested against
synthetic messages written for the purpose. Everywhere this document says something was
verified, that means it passed a test, not that it produced a result for a real property
management company. That distinction is repeated deliberately, because it is the easiest
one to blur.

## The Problem

**A property manager receives maintenance requests as unstructured messages, has to read
every one to decide which cannot wait, and is not reading at 11pm on a Friday.**

What goes wrong operationally is more specific than "there is a lot of email."

Tenants report problems in whatever form feels natural. A long email that mentions the real
issue in the ninth sentence. A two-line text. A voicemail. A portal form filled in while
angry. There is no urgency field, and even when there is, the tenant is not a reliable judge
of their own emergency. People report a gas smell apologetically and a squeaking door in
capital letters.

Those messages land undifferentiated. Somebody reads each one, decides urgency in their
head, works out which trade it needs, checks whether they can authorize the spend, and
writes a reply. That judgment happens dozens of times a day, between other jobs, and it
appears on no report. Nobody is ever thanked for correctly deciding that something was
routine.

The failure is two-sided, which is what makes it hard rather than merely tedious. Under-
respond and a failed supply line becomes a five-figure claim across two units, plus a
habitability problem with legal weight. Over-respond and a running toilet becomes an
after-hours callout at weekend rates for a part worth sixty dollars. The same overloaded
person makes both errors on the same day, and neither shows up anywhere until the invoice
or the claim arrives.

Then there is the coverage gap. Standard business hours cover roughly forty of the
one hundred sixty-eight hours in a week. The rest is either an on-call rotation somebody
resents, an answering service that cannot assess anything and therefore dispatches, or
nothing at all until Monday.

## Is This A Real Industry Problem

Yes, and it is well documented. These are the sources this build was scoped against.

| Finding | Source |
|---|---|
| Maintenance ranks as the #2 operational challenge for property managers; 38% of owners name it their top source of stress; slow response is the #1 factor in non-renewal | [Buildium / NARPM, 2026 State of the Property Management Industry Report](https://www.buildium.com/blog/2026-property-management-industry-trends/) (n=1,000+ property managers) |
| Owners evaluate their manager on five factors, two of which are maintenance execution and communication speed | Buildium 2026 Rental Owners' Survey (n=300 US owners, 95% owning 1–20 units), fieldwork May 2025 |
| 3.3 maintenance requests per unit per year, up from 2.93 in 2020; median resolution 13.1 days | Hemlane analysis of 193,000+ rental maintenance requests. First-party operational data; note that Hemlane sells maintenance coordination |
| 15–25 requests per 100 doors per week; P1–P4 prioritization schemes with auto-escalation | [OxMaint, The Property Manager's Guide to Maintenance Work Order Prioritization](https://oxmaint.com/industries/property-management/property-manager-guide-maintenance-work-order-prioritization) |
| Emergency / Urgent / Routine definitions, and an explicit recommendation to automate routing for water leaks and gas smells | [Buildium, How to Track Property Management Emergency Maintenance Issues](https://www.buildium.com/blog/how-to-track-property-management-emergency-maintenance-issues/) |
| Implied warranty of habitability, state-varying response windows, repair-and-deduct exposure | [Breasy, Property Maintenance Response Times](https://joinbreasy.com/knowledge/maintenance-response-times/) |
| 31% of renewal-uncertain tenants would stay given more responsive maintenance | Cited in 2026 industry trend reporting |

It is also worth being straight about the competitive picture, because this build is not
the first attempt at it. [Property Meld](https://valuecore.ai/valuehub/organizations/propertymeld/pricing)
(~$1.60–2.00 per unit per month), [Latchel](https://latchel.com/) (~$25 per unit per month
managed, often resident-paid inside a benefits package) and
[Vendoroo](https://vendoroo.ai/) (from ~$3 per door per month) all sell AI maintenance
triage today. Latchel advertises "23% solved at intake" and "48% of emergencies
de-escalated." Vendoroo carries an explicit "If the AI makes an error, we will pay for it"
guarantee.

Nothing in this build is a new idea. What differs is a design choice, described in "The
Human Boundaries" below, and one that runs in the opposite direction to at least one
established product.

## What The Research Does And Does Not Prove

**It proves the problem is real, widespread, expensive, and already worth money to
somebody.** Multiple independent surveys, first-party operational data across 193,000+
requests, and an existing paid category all point the same way.

**It proves nothing whatsoever about this build.** No survey above was conducted on this
system. No number above was produced by it. The research justified building something; it
does not validate what was built. Anyone who tells you otherwise is conflating a market
with a product.

The only evidence about this specific system is in "What The Proof Of Concept Proves
Today," and all of it is testing.

## The Solution

**Every maintenance message is read, sorted, and prepared for a decision before it reaches
the manager, and the manager still makes every decision that reaches a tenant or a vendor.**

The system reads each incoming message and works out how urgent it is and what trade it
needs. Separately from that reading, a fixed list of dangerous words and phrases is checked
against the same message, and that check is allowed to raise the urgency but never lower
it. If detail is missing, the tenant is asked for it directly, in a bounded way, before the
manager is interrupted at all. When a request is complete, matching vendors are proposed
and the manager gets one message with real choices in it. Choosing a vendor sends one
email. Choosing Hold sends nothing.

## Cadence, And Where The System Is Deliberately Silent

The system runs on a fixed rhythm rather than reacting to everything at once.

| What runs | How often | What it does |
|---|---|---|
| Reading and sorting a new message | Immediately, at any hour | Classifies, applies safety rules, records the request |
| Manager alert | Immediately, but only for requests that qualify | One message with vendor choices, or a review-only message |
| Conversation sync to the manager workspace | Every 5 minutes | Copies tenant conversation into the visible workspace |
| Unanswered-emergency check | Every 15 minutes | Re-alerts on an emergency nobody has acknowledged |
| Quiet-inbox check | Every 15 minutes | Warns the operator if messages have stopped arriving |
| Daily summary | Once daily at 07:00 | Open emergencies, breached targets, overdue items |

The last two ship switched off and stay off until somebody turns them on.

**Now the part that is easy to miss.** Evaluation happens instantly and continuously.
Notification does not. Those are separate decisions, and the gap between them is where most
of the design work went.

A routine request generates no alert at all. It appears in the workspace and waits. Age
alone never generates a phone alert either: an old request becomes a flag on a list and a
line in the daily summary, and that is all it ever becomes. A vague opening message creates
nothing whatsoever, not a request, not a workspace record, not a manager alert, not a
drafted vendor email; it is held to one side and answered with a question. Five messages
overnight, of which three are routine, one is urgent and one might be a gas smell, produce
exactly one interruption.

This restraint is the least visible design decision in the build and probably the most
important one. An alert channel is only worth having if it never cries wolf, and the way
you get there is by refusing to send most of what you could justify sending.

## The Complete Flow

In the order it happens.

1. **A message arrives**, by email, through the web form, or directly to the tenant
   messaging bot. All three land in the same place, so a test message and a real 2am email
   travel identical logic.

2. **If it is only a greeting, nothing is created.** Opening the messaging bot without
   describing a problem gets a welcome and a request to describe the issue. No request
   exists yet.

3. **If it is vague, it is held rather than guessed at.** "There's a problem in my bathroom"
   is kept to one side, up to roughly 4,000 characters of accumulated conversation, and the
   tenant is asked for a concrete symptom. Still no request, no workspace record, no manager
   alert. This exists because a vague message was once enough to trigger a vendor approval,
   which is a mistake worth engineering against.

4. **The system checks whether this is genuinely new.** A message identical to one already
   seen, or a reply to a conversation already open, attaches to the existing request instead
   of creating a second one.

5. **An AI model reads the message** and returns a structured judgment: urgency, trade,
   whether a unit was named, what detail is missing, and whether the request touches
   anything legally sensitive. The model is never asked whether a safety rule should apply.

6. **A fixed safety check runs afterward, separately.** It looks for ten specific
   categories: gas, carbon monoxide, smoke or fire, flooding, sewage, no heat, no water, no
   cooling, a security or lock failure, and electrical danger. A match forces the request to
   the highest urgency regardless of what the model concluded. It can raise urgency and can
   never lower it.

7. **Anything the system cannot read confidently is marked for a person** rather than
   guessed at. That includes a failed or unusable model response, a message too garbled to
   act on, and a message that mentions something dangerous while appearing not to be a
   maintenance request at all.

8. **The request is recorded no matter what happened above.** Even a total failure of the
   reading step produces a stored request with the original text and a flag asking for human
   attention. There is no path where a message quietly disappears.

9. **It appears in the manager's workspace** with its reference number, urgency, trade,
   what is missing, and the full conversation.

10. **If detail is missing, the tenant is asked, not the manager.** Up to three questions in
    one reply, repeated as needed while required detail is still missing. The manager is not
    interrupted during this. The system does not ask for a phone number when it already has
    a live conversation channel, and does not ask a known tenant which property they live in.

11. **Email and form requests get exactly one automatic email**, containing a link to
    continue in the messaging app. It carries a marker in the subject line so that the shared
    mailbox cannot read its own outgoing mail back in as a new request. That specific loop
    happened during testing.

12. **When the request is complete, up to three matching vendors are proposed**, filtered by
    the property and the trade, ordered by a priority number on the vendor record. If nothing
    matches, the request is marked as needing manual assignment and no vendor option is
    offered.

13. **The manager receives one message** with the reference, urgency, property and unit, the
    issue summary, the exact wording of the email that would go out, and buttons for only the
    vendors that actually matched, plus Hold. Sensitive and review-only requests get a
    Hold-only message with no vendor button on it at all.

14. **Choosing a vendor sends one email to that vendor.** Choosing Hold sends nothing.
    Tapping the same button again sends nothing, and says so.

15. **Only after that email succeeds is the tenant told** that a provider has been contacted.
    If the send fails, the manager sees the failure and the tenant is told nothing, because
    telling somebody help is coming when it is not is worse than silence.

16. **Status questions are answered truthfully and separately.** "When will this be fixed?"
    is recognized as a question rather than a new problem. The reply lists each open request
    once, up to ten, and says either that it is with the manager or that a provider has been
    contacted. It never invents an arrival time, and it never creates a new request. It used
    to do both.

## What Each Tool Does

| Tool | What it is responsible for |
|---|---|
| The AI model | Reading a message and describing what it says. It never decides what happens next |
| The fixed safety rules | Raising urgency on dangerous language, independently of the model |
| The record store | The authoritative history: every request, every message, every approval, and the guarantee that a vendor is emailed at most once |
| The manager workspace (Airtable) | The visible, browsable view of requests, conversations, tenants, and vendors |
| The manager's messaging app (Telegram) | Where alerts arrive and where vendor approval physically happens |
| The tenant's messaging bot (Telegram) | The tenant's conversation channel after the first contact |
| The shared mailbox (Gmail) | Receiving emailed requests, sending the one onboarding email, sending the approved vendor email |
| The scheduled checks | Digest, quiet-inbox warning, unanswered-emergency re-alert, workspace sync |

## The Human Boundaries

These are enforced in code, not by asking the AI nicely. That difference matters. A written
instruction to a model is a request it can misread or be argued out of; a condition in code
either passes or does not.

- **No vendor is contacted without a manager tapping a specific vendor.** The one place that
  can send a vendor email cannot be reached except from a manager button press.
- **A vendor can be emailed at most once per request.** This is enforced by the record store
  refusing a second claim, not by the system remembering it already sent one.
- **Urgency can be raised by the fixed rules and never lowered by them.**
- **A legally sensitive request never gets an automatically drafted reply**, and cannot be
  approved into one.
- **A request with missing detail cannot reach the vendor-approval stage** until the detail
  is supplied or a person intervenes.
- **The tenant is never told a provider is coming until an email to that provider has
  actually been sent successfully.**
- **Age never escalates anything to a phone alert.**

On the third of those: at least one established product in this category advertises
automatic de-escalation of emergencies as a feature. This build runs the opposite way on
purpose. That is a design disagreement, not an accusation; de-escalation backed by a staffed
human call center is a legitimate choice. This build simply does not have a call center, so
it does not take that option.

## What The System Will Not Do

Framed as design, because that is what it is.

- It will not dispatch a vendor, schedule an appointment, or confirm an arrival time.
- It will not send anything to a vendor without an explicit manager selection.
- It will not close a request or decide that one does not matter.
- It will not write into a property management system. It has no such connection at all.
- It will not reply to a tenant in free form. Its automatic messages are limited to
  acknowledging receipt, asking a fixed set of clarifying questions, reporting status
  truthfully, and confirming a provider was contacted after that actually happened.
- It will not tell you anything about your legal obligations.
- It will not interpret a photo. It records that one was attached.
- It will not handle a phone call or a voicemail.
- It will not learn from corrections by itself. When it is wrong, that is recorded, a person
  changes a rule, and the change is deliberate and visible.

## What The Proof Of Concept Proves Today

Verified behaviours, all against synthetic test messages:

- A message describing a gas smell in understated language is escalated to the highest
  urgency by the fixed rules even when the model rated it lower.
- A request marked urgent in capital letters about a squeaking door stays routine.
- A long message whose real issue appears in the ninth sentence is summarized around the
  real issue.
- A Spanish-language message is handled and answered in Spanish.
- An accommodation request produces no drafted reply at all and routes to human review.
- A vague opening produces no request, no workspace record, no manager alert and no drafted
  vendor email.
- A status question produces one truthful consolidated answer and creates no new request.
- A second tap on the same vendor approval button sends no second email.
- A failed vendor send leaves the request unsent and tells the tenant nothing.
- Six standard test messages were run five times from a clean state and produced the same
  urgency every time, with no vendor emails and no tenant messages generated.
- A separate structural check runs 32 assertions over the committed build before it can be
  published.

**All of the above is testing.** Six messages, run repeatedly, that were written to exercise
specific behaviours. It is not an accuracy rate, it is not a customer outcome, and it does
not tell you how the system behaves on your mail. A separate, larger 30-message test set
exists and has **not** been passed; that result is recorded in the project's own notes as a
failure and is deliberately not quoted as a percentage anywhere.

There is still no client. Nothing in this section came from a property management company.

## What A Client Pilot Must Measure

A pilot exists to answer questions the fixture tests structurally cannot.

**The one variable a pilot turns on is real inbound mail.** Everything else stays as it is.
That single change is what makes the results mean anything, and it is also the only change
that carries risk.

What has to be measured:

- **Agreement rate on urgency**, comparing what the system flagged against what your team
  actually did, on your own messages, for at least a few hundred requests.
- **Missed escalations**, counted separately and treated as the only metric that can fail the
  pilot on its own.
- **Unnecessary escalations**, and what each one actually costs you in practice.
- **How often the clarification questions get a useful answer** rather than being ignored,
  which is the assumption the whole "ask the tenant, not the manager" design rests on.
- **Vendor match quality**, meaning how often the proposed vendor is the one you would have
  chosen.
- **Time from message arriving to a manager being able to decide**, against your current
  baseline. You need the baseline first, which most companies do not have written down.
- **How many messages the system declined to handle**, because that number being low is not
  automatically good.

The honest way to run week one is with nothing sending. Read, sort, draft, alert nobody, and
compare at the end of the week. That costs you a forwarding rule and tells you whether it
reads your mail correctly before anything it does can reach a tenant.

## What Production Would Add

Not built, and not pretended to be:

- **Verified tenant identity.** Today the link that connects a tenant's messaging app to
  their request is a convenience with no identity proof behind it. Anyone holding the link
  could use it. This is acceptable for a demo and unacceptable for real residents.
- **Multi-tenant support on the messaging channel.** The tenant bot currently serves one
  known tenant, the way a dedicated phone number would. Real deployment needs per-tenant
  identity binding.
- **Email deliverability from your own domain**, properly authenticated, so an
  acknowledgment does not land in spam.
- **A work-order connection**, if you want one. Today the manager still creates the work
  order.
- **Hosting you own**, with backups, monitoring, and an actual uptime story rather than one
  operator and one machine.
- **A data-handling agreement and retention policy** in writing.
- **A real accuracy program**: the larger test set passing, ongoing measurement, and a
  review loop for corrections.
- **Alert grouping** for the case where one burst pipe generates six requests in ten minutes.
