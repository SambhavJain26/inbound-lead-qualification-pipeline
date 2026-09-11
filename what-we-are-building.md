# What We Are Building

Last updated: 2026-09-11

A plain-language overview of this project. No technical background needed.

---

## In One Paragraph

We are building a system that handles the whole journey from "someone saw your listing" to
"the lease is signed." It answers a renter's questions within seconds at any hour, qualifies
them, books their tour, takes their application, reads their documents, checks their real
income against their bank records, applies the property manager's own approval rules, and
hands a complete file to a human to make the final call. If the human approves, it fills in
the lease and sends it for signature.

It does not decide who gets an apartment. A person always does that. The system just removes
the two or three days of manual work that normally sit in between.

---

## The Problem We Are Solving

There are two separate problems, and they sit at opposite ends of the same process.

### Problem 1: Being slow loses you the lease

A renter browsing at 10pm is usually looking at four or five listings at once. Whoever
answers first tends to win. But most inquiries arrive outside office hours, and the average
reply takes days, not minutes.

Meanwhile the apartment sits empty. The average unit takes **34 to 41 days** to lease, and
every empty day costs around **$55 to $60** in rent that is simply gone. Nobody gets it back.

So the front of the process leaks money in a way that is easy to ignore because it never
shows up as a bill.

### Problem 2: The documents people send you are often fake

This is the bigger problem, and the numbers are genuinely alarming.

A survey by the National Multifamily Housing Council — the industry's own trade body — found:

- **93%** of rental housing providers experienced fraud in the past twelve months
- **85%** had received falsified pay stubs or fake income documents
- **75%** said fake pay stubs were their single biggest fraud concern
- **23.8%** of their evictions traced back to a fraudulent application

Making a convincing fake pay stub used to take some skill. Now it takes a few seconds and a
free tool. The people reviewing those documents are leasing agents doing it between phone
calls.

And when a bad application slips through, the cost is not a bad month. It is an eviction:
three to nine months with no rent coming in, several thousand dollars in legal fees, and
often damage to repair afterwards.

### Putting them together

The property manager is squeezed from both sides. Move fast and you risk letting in someone
who cannot pay. Move carefully and the unit sits empty while a competitor rents theirs.

The system we are building removes that trade-off, because the checking is done by software
in minutes instead of by a person over days.

---

## What The System Actually Does

Here is the whole thing, told as one renter's journey.

### 1. A renter gets in touch

Someone sees the listing on Zillow at 10:30pm and sends a message. It arrives in the property
manager's inbox. The system picks it up straight away.

The same thing works from the property's own website, where a chat window handles it.

### 2. It answers their questions — accurately

The renter asks whether there is parking, whether a 40lb dog is allowed, whether utilities are
included. The system answers using **only the real facts about that specific unit**. It cannot
make things up, and if it does not know, it says so and passes the question to a person.

This is the part that runs 24 hours a day. No one is awake, and the renter still gets a real
answer in seconds.

### 3. It asks a few qualifying questions

When are you hoping to move in? Roughly what is your monthly income? Any pets or vehicles? How
many adults will be living there?

This is only to avoid booking tours that cannot go anywhere — someone whose move-in date is
four months away, for example. Nobody is turned down at this stage. If they are not a fit for
this unit, they are offered alternatives or passed to a human.

### 4. It books the tour

The renter gets a booking link, picks a time, and gets a confirmation. Shortly before the
tour, they receive their entry instructions and a one-time door code.

### 5. After the tour, it sends the application

Once the tour window closes, the renter gets a follow-up with a link to apply. No pressure —
if they are not interested they just ignore it. If they liked it, they can apply immediately
instead of waiting for someone to email them tomorrow.

### 6. They apply

The application collects what a real rental application collects: identity, address history,
employer and income, other occupants, pets, vehicles, and the legal consent form that allows
background checks to happen at all.

They upload a photo ID and their recent pay stubs.

### 7. The system reads their documents

It pulls the numbers out of the uploaded pay stubs automatically — employer, pay period, gross
amount — and records where each number came from.

### 8. It verifies their income for real

This is the important step.

Instead of trusting the uploaded pay stub, the renter connects their bank account. The system
reads their **actual payroll deposits** — real money that really arrived. A pay stub can be
edited in a photo editor. A deposit history cannot.

### 9. It checks the property manager's rules

Now the system compares everything against the rules the property manager set — income
multiple, credit threshold, rental history, whatever they use.

These are **their** rules, written in their settings, applied the same way to every single
applicant. The system does not invent criteria and does not weigh anyone differently.

### 10. A human decides

The property manager gets a message on their phone with the complete picture: verified income,
how it compares to rent, every check that passed or failed, and exactly which document each
number came from.

Then **they** decide. Approve, approve with conditions, or send it for a closer look.

The system never makes this call. That is deliberate, and it is explained further down.

### 11. The lease goes out and comes back signed

On approval, the system fills in the lease — names, rent, dates, deposit, pet and parking
details — and sends it for electronic signature. When it comes back signed, the unit is marked
as leased and the new resident gets their welcome information.

---

## The Moment That Matters Most

Somewhere in step 8, the demo does something that makes the whole thing click for anyone
watching.

An applicant submits a pay stub showing **$7,800 a month**. Their bank deposits show
**$4,150 a month**.

The system puts three numbers side by side:

| What they typed on the form | What their pay stub says | What their bank actually shows |
|---|---|---|
| $7,800 | $7,800 | **$4,150** |

Then it stops and flags it for a human.

That is the 85% statistic from earlier, made real in about fifteen seconds. A leasing agent
reading that pay stub between phone calls would very likely have approved it.

---

## What The System Deliberately Does Not Do

This matters as much as what it does, because tenant screening is one of the most legally
sensitive things in property management.

**It never decides who gets an apartment.** It gathers, reads, checks, organises, and hands
over. A person decides, every time.

**It never scores or ranks anyone.** There is no AI judgement about whether someone seems
like a good tenant. The approval rules are ordinary arithmetic against the property manager's
own published thresholds — the same rules, applied identically, to everyone.

**It never sends a rejection.** If an application does not meet the criteria, the system stops
and hands it to a human. Turning someone down based on a credit or background report has a
strict legal process attached to it, and automating that process is how property companies end
up in lawsuits. So we simply do not.

**It never asks or records anything it is not allowed to.** No questions about children,
disability, religion, nationality, or anything else protected by fair housing law. The chat
assistant will not answer those questions either, even if a renter asks.

### Why this is a selling point, not a limitation

In May 2024, HUD published guidance on using AI in tenant screening. Its core instruction was
that screening tools should **implement, rather than set**, the property manager's own
policies, and should let them control the criteria.

That is an almost exact description of how this system is built. We are not being cautious at
the expense of capability — this is the architecture the regulator asked for.

---

## The Tools We Are Using

Everything here is free, free-tier, or a developer test mode. **The only thing that costs money
is the AI.**

| Tool | What it does in this build | Cost |
|---|---|---|
| **n8n** | The engine. Connects everything together and runs the logic. Self-hosted on your own machine | Free |
| **OpenAI** | Reads documents, answers renter questions, drafts messages | **Paid — the only cost** |
| **Postgres** | The database. Stores every lead, application, check, and decision | Free |
| **Gmail** | Receives listing-site leads and sends emails to renters | Free |
| **Telegram** | Where the property manager sees applications and taps approve | Free |
| **Plaid (Sandbox)** | The real bank-verification service, running on test data. This is what verifies income | Free |
| **Cal.com** | Tour booking and calendar | Free tier |
| **DocuSign (Developer)** | Sends the lease for signature | Free test mode (pages carry a demo watermark) |
| **Excalidraw** | The architecture diagram that explains the production version | Free |

### Why Plaid matters

Plaid is the service that thousands of real fintech apps use to connect to bank accounts. We
are using their **sandbox** — a free testing environment with realistic fake bank data, but
the genuine API.

That means the income verification step in this demo is not a simulation. It is a real call to
a real verification service. That is unusual for a portfolio demo and it is worth pointing out
when showing it.

---

## What Is Real And What Is Pretend

Being straight about this is part of the pitch, not a weakness in it.

**Real, working integrations:** the automation engine, the AI, the database, email, the chat
window, the application form, tour booking, bank-based income verification, and electronic
signature.

**Simulated, and clearly labelled:**

| Simulated | Why |
|---|---|
| Credit score, eviction and criminal records | Getting this data legally requires a signed contract with a credit bureau, a registered business, and usually an inspection of your office. There is no test version for anyone to use. This is a licensing barrier, not a money one. |
| Identity document check | The free tools available only return pre-set answers, so it would not demonstrate anything |
| Smart door lock codes | Real smart-lock platforms are paid hardware and subscription services |
| The listing-site connection | Zillow has no public connection for this. But Zillow really does send leads by email, so reading a lead email is genuinely how it works |
| Text messages to renters | Sending business SMS in the US now requires carrier registration, which takes weeks. Email and chat cover it in the demo |

Every simulated piece is drawn on the architecture diagram next to the real service that would
replace it in an actual deployment. The credit check is built to match the exact format the
real TransUnion service returns, so swapping it in later is a small change, not a rebuild.

---

## What This Costs To Run

The AI, and nothing else. A few dollars to build and rehearse it.

Everything else is free by design — either open source, a free tier, or a developer sandbox.

---

## What Would Change In A Real Deployment

Worth knowing, because prospects will ask:

- Credit and eviction checks become a real bureau account
- The database is replaced by, or connected to, their existing property software
  (Yardi, AppFolio, Entrata, or similar)
- Text messaging is added once carrier registration is done
- Self-guided tours connect to real smart locks
- A proper legal rejection process is added — the formal notices the law requires when someone
  is turned down based on a background report
- It runs on a server instead of a laptop

The shape of the system does not change. The demo shows the real structure with test-mode
parts plugged in.

---

## Who This Is For

Property management companies, roughly 50 to 500 units.

Below that, the volume does not justify it. Above that, they are usually already on an
enterprise platform. In the middle sits a large group of operators doing all of this with
spreadsheets, a shared inbox, and a screening website — which is exactly the gap this fills.
