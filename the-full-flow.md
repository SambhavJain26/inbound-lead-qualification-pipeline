# The Full Flow, End To End

Last updated: 2026-09-12

What actually happens, from a stranger clicking a listing to a new resident holding a signed
lease. No technical detail — just the sequence, who does what, and how long it takes.

Every timing below is from real runs of the working system.

---

## The cast

| Who | Their part |
|---|---|
| **The renter** | Finds the listing, asks questions, tours, applies, signs |
| **The property manager** | Sets the criteria once. Then makes one decision per applicant |
| **The system** | Everything in between |

The important thing to notice as you read: the property manager appears **twice**. Once at the
start to set the rules, and once per applicant to make the call. That's it.

---

## Scene 1 — Thursday, 10:34pm

> **Involved:** the listing site (Zillow) · **Gmail**

A renter is scrolling listings on her phone. She finds the two-bedroom on Maple Street, likes
it, and taps *Contact*.

> *"Hi! I saw the 2 bedroom on Maple Street and I'm really interested. Is parking included,
> and do you allow a small dog? I'm hoping to move in early October."*

The office closed five hours ago. Normally this sits unread until tomorrow, and by then she's
messaged four other places.

**The system picks it up.**

---

## Scene 2 — 10:35pm, about a minute later

> **Involved:** **Gmail** (receives, then sends) · **OpenAI** (writes the reply) · the property record (holds the facts it is allowed to use) · **Airtable** (the lead appears on the board as *Engaged*)

She gets a reply:

> Hi Maya,
>
> Thanks for your interest in the two-bedroom at 412 Maple Street, Apt 2B. One assigned
> surface parking space is included, and a second space may be available for $50/month. Small
> dogs are welcome if they are under 50 lbs; breed restrictions apply. The monthly pet fee is
> $35, with a maximum of two pets. The unit is available starting October 1, 2026, which may
> fit an early-October move-in.
>
> To check which units fit, rather than make a decision, could you share your intended move-in
> date, approximate gross monthly income, pets, number of vehicles, and how many adults will
> be living there?

Three things worth noticing.

**Every number is real.** The $50 second space, the 50 lb limit, the $35 pet fee, the October
1st date — all pulled from that specific unit's record. The system is physically prevented
from stating a figure that isn't there: a message containing an unknown number is stopped
before it sends and handed to a person instead.

**It answered her actual questions**, in order, and then asked its own.

**"Rather than make a decision."** That phrasing is deliberate, and it matters later.

Nobody was awake. Nobody will know this happened until morning.

---

## Scene 3 — 10:41pm

> **Involved:** **Gmail** · **OpenAI** (pulls the answers out of her sentence) · the rules engine (checks them) · **Airtable** (*Prequalified*)

She replies in plain English:

> *"October 5th works for me. I make about $5,000 a month gross. One small dog, 18 lbs. One
> car. Just me living there."*

The system reads it and files:

- Move-in: **October 5th** (it worked out the actual date from "October 5th")
- Income: **$5,000/month**
- One 18lb dog, one car, one adult

Then it checks those against the manager's own rules and records its working:

> $5,000/mo stated against $1,650 rent = 3.03x — **unverified**

That word *unverified* is doing real work. Nothing here has been checked. She could have typed
any number. This step isn't deciding whether she can rent — it's only deciding whether booking
a tour is worth anyone's time.

**Nobody has been approved or turned down.** If she hadn't been a fit, she wouldn't have been
rejected either — she'd have been offered other options and passed to a human.

---

## Scene 4 — 10:42pm

> **Involved:** **Cal.com** (the booking page and calendar) · smart lock — **simulated** (the entry code) · **Gmail** (confirmation) · **Airtable** (*Tour Booked*)

She gets a booking link, picks Saturday at 11am, and gets a confirmation.

Shortly before her slot, an entry code arrives:

> Entry code: 457194
>
> The code works during your booked slot only. Let yourself in, take your time, and pull the
> door closed when you leave.

Self-guided. No agent drives across town.

---

## Scene 5 — Saturday, just after the tour

> **Involved:** **Gmail** (the follow-up and application link) · **Airtable** (*Toured*)

The tour window closes and she gets a follow-up:

> Hope the tour went well. If you'd like to apply, here's the application.
>
> There's no obligation — applying just puts you forward for consideration. If it wasn't the
> right fit, reply and tell us what didn't work and we'll look for something closer.

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

**It verifies her income for real.** She connects her bank, and the system reads her *actual
payroll deposits*.

This is the part that matters most. A pay stub is a picture. It can be edited in a photo
editor in about thirty seconds, and there are websites that generate convincing ones for free.
A deposit history can't be.

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

> **Application A-9135 — Maya Restrepo**
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

> **Involved:** **DocuSign** (the lease and the signature) · **Gmail** (welcome message) · the database (unit marked leased) · **Airtable** (*Leased*)

The lease fills itself in from verified data — her name, the address, the rent, the deposit,
the term, her move-in date — and goes out for signature.

She signs it on her phone.

The moment it comes back signed:

- The lease is recorded as signed
- The unit flips from *available* to *leased*
- She gets a welcome message about insurance, utilities, and her permanent entry code

In testing, the welcome email went out **23 seconds** after the signature completed.

```
08:27:07   Lease completed        (signature service)
08:27:30   Welcome to 412 Maple   (the system)
```

Nobody touched anything in between.

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
| Emails written | 0 |
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
| Pre-qualifying | A phone call | Already done |
| Booking tours | Back-and-forth | Self-service |
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

The property manager sets the rules. The system applies them the same way to everybody and
shows its working. A person makes every call.

That isn't caution getting in the way of the product. It's the whole reason the product is
safe to use — and it happens to be exactly what the housing regulator asked for when it wrote
its guidance on AI in tenant screening in 2024.

---

## Every part, and what it does

| Part | Where it shows up | What it does |
|---|---|---|
| **Gmail** | Scenes 1, 2, 3, 4, 5, 9 | Carries every message to and from the renter. The listing-site lead arrives here, and every reply, confirmation, application link and welcome message goes out from here |
| **OpenAI** | Scenes 2, 3, 7 | Writes the reply from the property's own facts, pulls the answers out of a plain-English email, and reads figures off the uploaded pay stub |
| **Cal.com** | Scene 4 | The booking page the renter picks a tour slot on, and the calendar behind it |
| **The application form** | Scene 6 | The online form the renter fills in, including the document upload |
| **Plaid** | Scene 7 | Verifies income against the renter's actual bank deposits. The single most important check in the system |
| **Telegram** | Scene 8 | Where the property manager sees the complete file and taps a decision. The only place a human is involved |
| **DocuSign** | Scene 9 | Sends the lease, collects the signature, and tells the system when it is done |
| **Airtable** | Scenes 2, 3, 4, 5, 9 | The board. Shows every lead and where it has got to, so anyone can see the pipeline at a glance |
| **The database** | Throughout | The actual record of everything. Airtable is a display of it, not the thing itself |

Two of these are worth separating out, because they do different jobs that people often lump
together.

**Airtable is a window, not the engine.** It shows the pipeline so a person can glance at it.
If it broke tomorrow, nothing would stop — the system would carry on and the board would just
be out of date until it caught up.

**Telegram is where a person actually does something.** Everything else runs on its own. That
one card is the entire human interface, which is the point: there is no new software for the
team to learn, no dashboard to log into, and no training. They already have Telegram open.

---

## What's real in the demo

Worth being straight about, because it's part of the pitch.

**Genuinely running:** the reply engine, the document reading, the **bank-based income
verification** (a real connection to the service thousands of banking apps use, running on
test data), the criteria engine, tour booking, electronic signature, and every email.

**Simulated, and labelled everywhere it appears:** the credit and eviction check, the identity
document check, the smart-lock code, and the listing-site connection.

The credit check in particular isn't a shortcut — getting that data requires a signed contract
with a credit bureau, a registered business, and usually an inspection of your office. It's a
licensing barrier, not a money one. The demo talks to it in exactly the format the real service
uses, so switching it on is a small change rather than a rebuild.

Everything else is the real thing.
