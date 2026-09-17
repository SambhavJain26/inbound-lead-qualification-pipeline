# The Full Flow, End To End

Last updated: 2026-09-17

What actually happens, from a stranger browsing a listing to a new resident holding a signed
lease. No technical detail — just the sequence, who does what, and how long it takes.

Maya's quoted messages below are historical output from earlier working runs.
The September 17 rehearsal uses the operator's authorized contact display name,
Sambhav Jain; all income, documents, identity checks and decisions stay synthetic.
Current operational authority is described below and in docs/manual-testing-flow.md.

---

## The cast

| Who | Their part |
|---|---|
| **The renter** | Finds the listing, asks questions, tours, applies, signs |
| **The property manager** | Sees intake, approves every tour, confirms attendance, reviews private/uncertain requests, decides the application and approves welcome delivery |
| **The system** | Public FAQ, fixed collection, preparation, guarded approved actions and visible follow-up |

The manager uses ordinary chat or buttons. Neither bot requires Reply. A message without a
reference works only when its target is unambiguous; otherwise the bot asks which record.
No resident/manager business step requires a script or command.

---

## Scene 1 — Thursday, 10:34pm

> **Involved:** the listing site · the property record

A renter is scrolling rentals on her phone. She finds the two-bedroom on Maple Street, opens
it, and reads the page: the rent, the deposit, what's included, the pet policy, the parking.

Everything on that page comes out of one record — the same record the assistant is about to be
allowed to quote from. They cannot drift apart.

She has two questions the listing doesn't quite answer, so she uses the contact form:

> *"Is parking included, and do you allow a small dog? Hoping to move early October."*

The office closed five hours ago. Normally this sits unread until tomorrow, and by then she's
messaged four other places.

She taps **Send message**.

---

## Scene 2 — 10:35pm, about a minute later

> **Involved:** the listing site · **Telegram** (the leasing assistant) · **OpenAI** (writes the reply) · the property record · **Airtable** (the lead appears on the board as *New*)

The page that comes back has a reference number and confirms: *We have sent you a message
with an answer to your question.*

She opens her messages. The answer to the question she just typed is **already waiting for
her**:

> One assigned surface parking space is included; a second space is $50/month if available.
> Small dogs are welcome under the 50-lb limit, with breed restrictions applying. The unit is
> available October 1, which fits an early-October move.
>
> Roughly what is your gross monthly income? This is just to check which units fit, not a
> decision.

Four things worth noticing.

**Every number is real.** The $50 second space, the 50 lb limit, the October 1st date — all
pulled from that specific unit's record. The system is physically prevented from stating a
figure that isn't there: a message containing an unknown number is stopped before it sends and
handed to a person instead.

**It answered both her questions**, and connected the answer to what she actually said — she
mentioned early October, so it told her the unit is available October 1st.

**It didn't ask about the move-in date.** She'd already said "early October" on the listing
page, so the system recorded it and moved on to the next thing it needs. It never asks twice.

**"To check which units fit, not a decision."** That phrasing is deliberate, it is fixed text,
and it matters later.

Nobody was awake. Nobody will know this happened until morning.

---

## Scene 3 — 10:41pm

> **Involved:** **Telegram** · **OpenAI** (pulls the answers out of her sentence) · the rules engine (checks them) · **Airtable** (*Prequalified*)

She replies in the same chat, in plain English, the way people actually type:

> *"About $5,000 a month gross, just me with one car."*

Three separate facts in one sentence. The system files all three:

- Income: **$5,000/month**
- One adult
- One car

Then it checks those against the manager's own rules and records its working:

> $5,000/mo stated against $1,650 rent = 3.03x — **unverified**

That word *unverified* is doing real work. Nothing here has been checked. She could have typed
any number. This step isn't deciding whether she can rent — it's only deciding whether booking
a tour is worth anyone's time.

**Nobody has been approved or turned down.** If she hadn't been a fit, she wouldn't have been
rejected either — she'd have been offered other options and passed to a human.

This is also where a chat earns its keep over email. She answered three questions in one
sentence, at her own pace, in an app she already had open. No subject line, no waiting for a
mail poll, no "reply to this address".

---

## Scene 4 — 10:42pm

> **Involved:** the rules engine (decides she's ready) · **Cal.com** (real availability, and the booking) · **Telegram**

Nothing is outstanding and nothing failed, so the same message invites her to pick a time. She
answers the way anyone would:

> *"Can I come by next Tuesday at 2pm?"*

She doesn't get a public calendar link. An available exact time goes to the manager, while
she hears that nothing is booked yet. The manager types Approve tour or taps its button.
Only after that recorded approval can Cal.com booking and a labelled mock code be released.
If the exact time is unavailable, she chooses from real alternatives; there is no automatic
nearby-time substitution. A pending request is not a calendar reservation.

The following quote records the older autonomous-booking policy, now superseded:

> I'm checking whether a self-guided tour is available Tuesday, September 15 at 2:00 PM.
>
> Booking you in for Tuesday, September 15 at 1:30 PM. One moment.
>
> Your self-guided tour of 412 Maple Street, Apt 2B is confirmed for Tuesday, September 15 at
> 1:30 PM.
>
> Entry code: 469266
>
> The code works during your booked slot only. Let yourself in, take your time, and pull the
> door closed when you leave.

Read that middle line again, because it is the honest part. She asked for **2pm**. 2pm was not
free. It booked **1:30pm** — the nearest time that genuinely existed — and *said so*. It did not
quietly shift her by half an hour and hope she didn't check.

Two things are worth separating here.

**The assistant cannot invent a time.** It reads Cal.com's actual availability and can only
book a slot that is really there. If nothing is close, it offers the nearest real alternatives
instead of guessing.

**The manager authorizes every booking.** Published hours and notice rules are still checked
and exceptions appear on the card; being within policy no longer skips human approval.

### Historical out-of-policy example (the same approval gate now covers every tour)

Suppose she'd asked for **8pm on Thursday**, because she works late. Nothing is booked. She gets:

> I have put a hold on Thursday, September 17 at 8:00 PM. That one needs a quick check with the
> team — I will confirm shortly.

And the manager gets one card:

> **Tour request outside the usual policy**
> Maya Restrepo (R-9974) · MAPLE-2B
> Requested: Thursday, September 17 at 8:00 PM
>
> Held because: outside self-guided hours (9:00–18:00)
>
> Nothing is booked and they have not been given a time. Your call.
>
> [ Approve tour ] [ Not that time ]

If they approve, it books and she gets the confirmation and her code. If they decline, she is
offered another time — and the slot **was never booked in the first place**, so nothing has to
be cancelled and no one else was blocked out of it.

The current division is public answers and collection automatically, consequential actions
with recorded manager authority. Approval cannot override privacy or the screening stop.

Self-guided either way. No agent drives across town.

---

## Scene 5 — Saturday, just after the tour

> **Involved:** **Telegram** (the follow-up and application link) · **Airtable** (*Toured*)

The manager types Tour completed for the resident or taps the completion button. This is
synthetic attendance, not a physical tour or an inference from elapsed time. That action
authorizes the application follow-up in the same chat:

> Hope the tour of 412 Maple Street, Apt 2B went well. If you would like to apply, here is the
> application:
>
> …/form/rental-application?ref_token=R-1574
>
> There is no obligation — applying just puts you forward for consideration. If it was not the
> right fit, tell me what did not work and we will look for something closer.

No pressure, and a genuine invitation to say no. If she walks away, she walks away — and the
manager learns why, which is worth something too.

**It is now Saturday lunchtime. A property manager has not touched this once.**

---

## Scene 6 — She applies

> **Involved:** the online application form · the database (stores the file, masks the SSN)

The form asks what a real application asks: who she is, where she's lived, her employer and
income, who else is moving in, pets, vehicles, the standard disclosures, and the written
consent that makes background checks legal at all.

She uploads a recent pay stub.

Her Social Security number is cut down to its last four digits the moment it arrives. The rest
is never stored.

---

## Scene 7 — The next forty seconds

> **Involved:** **OpenAI** (reads the pay stub) · **Plaid** (verifies income against her actual bank deposits) · credit bureau — **simulated** · the rules engine (applies the criteria and records the evidence)

This is where the work happens.

**It reads her pay stub.** Employer, pay period, gross amount — and records the exact line it
read each figure from, so a person can check it against the document.

**It checks her income against her bank, not against her paperwork.** The system asks Plaid —
the service thousands of banking apps use — what her payroll deposits actually say, and
compares that to the pay stub.

This is the part that matters most. A pay stub is a picture. It can be edited in a photo
editor in about thirty seconds, and there are websites that generate convincing ones for free.
A deposit history can't be.

**Being precise about what runs in the demo:** the Plaid call is real — real API, real
credentials, real response — but it runs against Plaid's *Sandbox*, which returns fixed test
figures rather than anyone's genuine banking data. Two things are therefore missing compared
with a production deployment: the renter never sees the bank-login screen (Plaid Link, which
Sandbox lets you skip), and the number that comes back is the same for every applicant. What
is being demonstrated is the plumbing and the comparison logic, not a real bank lookup.
Switching it on is adding the Link screen and changing one URL.

**It runs a background check.** Credit and eviction history.

**It applies the manager's rules** — income multiple, credit threshold, eviction history —
and records, for each one, which document and which value produced the result.

One detail worth mentioning because most systems get it wrong: the income multiple is applied
to *the tenant's share* of the rent, not the full rent. If someone has a housing voucher,
requiring them to earn three times the whole rent from their own pocket is something roughly
twenty states and a hundred-plus cities treat as illegal discrimination.

---

## Scene 8 — The manager's turn

> **Involved:** **Telegram** (the card and the buttons) · the database (records who decided what, and when)

The property manager's phone buzzes. **This is the first time they've been involved.**

It arrives in a different chat, from a different bot — the renter and the manager never share
a conversation.

> **Application A-8745 — Maya Restrepo**
> MAPLE-2B at $1,650/mo
>
> Income verified, documents agree
>
> Claimed on form: $5,000/mo
> Pay stub says: $4,996/mo
> Bank verified: $4,996/mo
>
> **Criteria**
> PASS income multiple — $4,996/mo verified against $1,650 rent = 3.03x, threshold 3.00x
> PASS income document match — pay stub implies $4,996/mo against $4,996/mo verified, 0% variance
> PASS credit score — 712 against a 650 threshold
> PASS eviction history — 0 filings in the last 5 years, maximum 0
> PASS identity check — document and applicant details matched
>
> Engine result: meets criteria
>
> *Nothing has been sent to the applicant. Your call.*
>
> [ Approve ] [ Conditional ] [ Send to review ]

Three income figures side by side. Every rule with its evidence. And a sentence making it
explicit that nothing has gone out.

The manager reads it and taps **Approve**. Elapsed: about fifteen seconds.

---

## Scene 9 — The lease

> **Involved:** **DocuSign** (the lease and the signature) · email (the lease and the welcome message) · the database (unit marked leased) · **Airtable** (*Leased*)

The lease fills itself in from verified data — her name, the address, the rent, the deposit,
the term, her move-in date — and goes out for signature.

She signs it on her phone.

The moment it comes back signed:

- The lease is recorded as signed
- The unit flips from *available* to *leased*
- The manager receives a welcome approval card; Send welcome authorizes the fixed email

In the earlier policy test, all three happened **4.7 seconds** after the signature came back.
That historical timing does not describe the new separate welcome approval:

```
18:40:07   Signature completed      (signature service)
18:40:12   Welcome packet sent, MAPLE-2B marked leased
```

Nobody touched anything in between.

The lease and the welcome packet go by **email**, not chat. That's deliberate: a chat is the
right place for a conversation, and email is the right place for a document somebody needs to
keep and be able to find again in a year.

---

## Now the other one

> **Involved:** exactly the same parts as Maya. Nothing special runs for Devon — the difference is entirely in what **Plaid** reports back.

Same process. Different applicant.

Devon applies for the three-bedroom at $1,950. His pay stub says **$7,800 a month** — over
four times the rent. On paper he's the stronger applicant of the two. A leasing agent reading
that PDF between phone calls would approve him without hesitating.

His bank deposits say **$4,996**.

> **Application A-1921 — Devon Clarke**
> MAPLE-5A at $1,950/mo
>
> **INCOME MISMATCH — 56% above verified**
>
> Claimed on form: $7,800/mo
> Pay stub says: $7,800/mo
> Bank verified: $4,996/mo
>
> **Criteria**
> FAIL income multiple — $4,996/mo verified against $1,950 rent = 2.56x, threshold 3.00x
> FAIL income document match — pay stub implies $7,800/mo against $4,996/mo verified, 56% variance
> PASS credit score — 688 against a 650 threshold
> PASS eviction history — 0 filings
>
> **STOPPED.** This file does not meet the published criteria, so the system has taken no
> further action and sent the applicant nothing.

Two separate problems. He can't actually afford it, *and* the document says otherwise.

Then the system does the thing that surprises people. **Nothing.**

No rejection email. No "unfortunately". It stops, tells the manager what it found, and
explains what a lawful decline actually requires:

> Declining on the basis of a consumer report is a formal process and must be done by a person:
> - Pre-adverse-action notice, including a copy of the consumer report
> - A copy of the FCRA Summary of Rights
> - A waiting period for the applicant to dispute
> - A final adverse-action notice naming the bureau that supplied the report

That stop is the most deliberate thing in the entire system. Turning someone down over a
background report has legal steps attached, and companies get sued for skipping them. So it
doesn't guess — it hands the decision to a person.

---

## What the manager actually did

For the whole journey — first contact at 10:34pm Thursday to a signed lease:

| | |
|---|---|
| Questions answered | 0 |
| Messages written | 0 |
| Tours scheduled | 0 |
| Documents reviewed | 0 |
| Pay stubs squinted at | 0 |
| **Decisions made** | **1** |
| **Time spent** | **About 15 seconds** |

Plus a one-time setup: writing down the criteria they already use.

---

## Before and after

| | Today | With this |
|---|---|---|
| After-hours inquiry | Sits until morning | Answered in a minute |
| Answering the same questions | Every single time | Never |
| Asking the same question twice | Constantly | Never — it remembers what you told it |
| Pre-qualifying | A phone call | Already done, in chat |
| Booking tours | Back-and-forth | Settled in the chat, in one message |
| Out-of-hours tour requests | Ignored, or agreed and forgotten | Held, and put in front of a person |
| Checking income | Reading a PDF and hoping | Verified against the bank |
| Fake pay stub | Usually works | Caught in seconds |
| Applying the rules | From memory, roughly | Identically, recorded |
| The decision | Theirs | Still theirs |
| Time per applicant | An hour, spread over days | 15 seconds |

---

## The one line that matters

**The system never decides.**

It reads, checks, verifies, organises, and hands over. It never scores anyone, never ranks
anyone, never guesses at anything it wasn't told, and never sends a rejection.

There's a second version of that worth saying out loud, because it's the part people assume
can't be true of a chatbot: **the AI doesn't even decide what to ask next.** The rules engine
works out what's still outstanding, and the question it asks is fixed wording written in
advance. The AI answers what was asked and pulls the facts out of the reply. That's all it
does.

The property manager sets the rules. The system applies them the same way to everybody and
shows its working. A person makes every call.

That isn't caution getting in the way of the product. It's the whole reason the product is
safe to use — and it happens to be exactly what the housing regulator asked for when it wrote
its guidance on AI in tenant screening in 2024.

---

## Every part, and what it does

| Part | Where it shows up | What it does |
|---|---|---|
| **The listing site** | Scenes 1, 2 | Where the renter finds the home and sends the first message. Every page is generated from the property record, so the listing and the assistant quote the same facts |
| **Telegram** | Scenes 2–5, 8 | Two separate chats. The renter talks to the leasing assistant; the manager gets the decision card. They never share a conversation |
| **OpenAI** | Scenes 2, 3, 7 | Answers from the property's own facts, pulls answers out of plain-English messages, and reads figures off the uploaded pay stub. It never decides anything |
| **Cal.com** | Scene 4 | The real calendar. The assistant reads actual availability from it and books into it, so it can only ever offer a time that genuinely exists |
| **The application form** | Scene 6 | The online form, including the document upload |
| **Plaid** | Scene 7 | Checks income against bank deposits rather than against the paperwork. The single most important check in the system. Running against Plaid's Sandbox here, so the figure is test data and there is no bank-login step |
| **DocuSign** | Scene 9 | Sends the lease, collects the signature, and tells the system when it is done |
| **Email** | Scenes 9 | Carries the documents — the lease and the welcome packet. Also a second way leads can arrive, for listing sites that send them by email |
| **Airtable** | Scenes 2, 3, 4, 5, 9 | The board. Shows every lead and where it has got to, so anyone can see the pipeline at a glance |
| **The database** | Throughout | The actual record of everything. Airtable is a display of it, not the thing itself |

Three of these are worth separating out, because they do different jobs that people often lump
together.

**Airtable is a window, not the engine.** It shows the pipeline so a person can glance at it.
If it broke tomorrow, nothing would stop — the system would carry on and the board would just
be out of date until it caught up.

**Telegram is where a person actually does something.** Everything else runs on its own. That
one card is the entire human interface, which is the point: there is no new software for the
team to learn, no dashboard to log into, and no training. They already have Telegram open.

**The listing site is the front door, and it is the part most easily swapped.** In a real
deployment the renter arrives from Zillow, Apartments.com, or the company's own website
instead. What matters is what happens after they hit send, and that is identical either way —
the system already handles leads arriving by email as well.

---

## What's real in the demo

Worth being straight about, because it's part of the pitch.

**Genuinely running:** the listing site, the conversation, the document reading, the
**bank-based income check** (a real connection to the service thousands of banking apps use,
running against its Sandbox, so the figures are test data and the renter never sees the
bank-login screen), the criteria engine, tour booking against a real calendar, electronic signature, and every
message.

**Simulated, and labelled everywhere it appears:** the credit and eviction check, the identity
document check, and the smart-lock code.

The credit check in particular isn't a shortcut — getting that data requires a signed contract
with a credit bureau, a registered business, and usually an inspection of your office. It's a
licensing barrier, not a money one. The demo talks to it in exactly the format the real service
uses, so switching it on is a small change rather than a rebuild.

Everything else is the real thing.
