# How The Leasing & Tenant Screening System Works

Last updated: 2026-09-12

A plain-language description of what this build does, how it does it, and which problem it
solves. Written for a property manager or owner rather than a developer. Nothing here
requires knowing what n8n is.

## The Problem

**Problem statement:** The path from rental inquiry to signed lease is a chain of manual
handoffs, and every day it takes costs the owner rent while exposing the property to a kind
of fraud that has grown much faster than the process defending against it.

Two costs sit at opposite ends of the same funnel, and they pull against each other.

At the front, **being slow loses the lease**. A renter browsing at 10:30pm is usually looking
at four or five listings at once, and whoever answers first tends to win. But most inquiries
arrive outside office hours, and the unit sits empty in the meantime.

At the back, **the documents people send are often fake**. The pay stub attached to an
application can be produced in a few seconds with a free tool, and the person reviewing it is
doing so between phone calls.

These two pressures work against each other. Move fast and you risk letting in someone who
cannot pay. Move carefully and a competitor rents their unit first.

## Is This A Real Industry Problem?

Yes. Three separate bodies of evidence support three distinct parts of it.

### Application Fraud Is No Longer An Edge Case

This is the strongest evidence, and it comes from the industry's own trade association.

A National Multifamily Housing Council survey found that **93%** of rental housing providers
experienced fraud in the previous twelve months, and **85%** had received falsified or
fabricated pay stubs or other income documentation. **75%** named fake pay stubs as their
single largest fraud concern, and **70%** said fraud had become more frequent over that
period.
[NMHC survey findings, reported by Multifamily Dive](https://www.multifamilydive.com/news/how-to-combat-paystub-fraud-renter/722022/)

The downstream cost is not hypothetical. Respondents traced **23.8%** of their eviction
filings to fraudulent applications, and large operators attributed close to a quarter of
their bad debt — averaging around **$4 million written off per respondent in a single year** —
to nonpayment that began with a fraudulent application.
[NMHC Pulse Survey on rental application fraud and bad debt](https://www.nmhc.org/research-insight/research-report/nmhc-pulse-survey-analyzing-the-operational-impact-of-rental-application-fraud-and-bad-debt/)

### Vacancy Is Metered In Days

RealPage reported the average apartment sat vacant **34.4 days** at the end of 2024, up from
roughly 30 days in early 2020, and RentCafe's 2025 data puts the US average time-to-lease at
**41 days**. Against a national average rent near $1,740/month, each vacant day costs roughly
**$55–60** in rent that is simply gone.
[Industry summary of RealPage and RentCafe data](https://lula.life/articles/how-to-reduce-days-vacant-on-rental-properties)

Lost rent is also the largest single component of turnover cost. One apartment turn runs
roughly **$3,900–4,000 per unit**, with vacancy loss accounting for **30–60%** of that.
[Apartment turnover cost breakdown](https://rapideyeinspections.com/research/apartment-turnover-cost-statistics/)

### The Regulator Has Already Described The Right Architecture

In May 2024, HUD issued Fair Housing Act guidance covering algorithmic and AI-driven tenant
screening. Its central instruction reads almost like a specification:

> Tenant screening companies should serve to **implement, rather than set**, a housing
> provider's screening policies, and should offer customizability as to criteria, standards,
> and weights.

[HUD press release, May 2024](https://archives.hud.gov/news/2024/pr24-098.cfm)

The guidance is equally clear that a housing provider cannot hand its Fair Housing obligation
to a vendor or a model, and that a decision being algorithmic does not shield it from
civil-rights law.

Separately, the Fair Credit Reporting Act imposes a formal two-step adverse-action process on
any denial based on a consumer report. Class actions against apartment operators over exactly
that process are active.

**This is why the system is built the way it is.** The manager sets the criteria. A
deterministic engine applies them identically to everyone, with the evidence recorded. A
person makes every decision. That is not a compliance compromise — it is the architecture the
regulator described.

## What The System Does

Told as one renter's journey.

### 1. A renter gets in touch

Someone sees the listing on Zillow at 10:30pm and sends a message. It arrives in the property
manager's inbox, and the system picks it up.

### 2. It answers their questions — accurately

The renter asks about parking and whether a small dog is allowed. The system answers using
**only the recorded facts for that specific unit**.

This is not a stylistic preference. Every figure in an outgoing message is checked against the
unit's record before it sends, and a message containing a number that is not there is blocked
and routed to a person. The system cannot invent a rent, a fee, or a deposit, because a
message that does never leaves.

It also cannot answer questions it should not. Ask whether it is a good building for families
and it gives the factual property details instead, and logs that it declined.

### 3. It asks a few qualifying questions

Move-in date, approximate income, pets, vehicles, occupancy.

Nobody is turned down here. This is unverified, self-reported information, and it exists only
to decide whether booking a tour makes sense. The wording the renter sees says so explicitly:
*to check which units fit, rather than make a decision*.

### 4. It books the tour

The renter picks a time. Shortly before the slot they receive a one-time entry code for a
self-guided tour.

### 5. After the tour, the application goes out

No pressure, no obligation. If they liked it, they can apply immediately instead of waiting
for someone to email them tomorrow.

### 6. They apply

The application collects what a real one collects: identity, address history, employer and
income, occupants, pets, vehicles, the standard disclosures, and the written consent that
makes background checks legal at all. Plus their recent pay stubs.

The Social Security number is reduced to its last four digits the moment it arrives. The full
number is never stored.

### 7. The system reads their documents

It pulls the figures off the uploaded pay stub — employer, pay period, gross amount — and
records the exact line it read each one from, so a person can check it.

### 8. It verifies their income for real

This is the important step.

Instead of trusting the uploaded document, the applicant connects their bank account and the
system reads their **actual payroll deposits**. A pay stub can be edited in a photo editor. A
deposit history cannot.

### 9. It applies the manager's criteria

Now it compares everything against the rules the property manager set — income multiple,
credit threshold, eviction history.

These are **their** rules, stored in their settings, applied the same way to every single
applicant. The system does not invent criteria and does not weigh anyone differently. Every
result records which document, which field, and which value produced it.

One detail worth knowing: the income multiple is applied to the **tenant's share** of rent,
not the full rent. Requiring someone with a housing voucher to earn three times the whole
rent from their own income is treated as source-of-income discrimination in the 19 states,
DC, and 100+ localities that protect it — including six of the ten largest US cities.

### 10. A human decides

The property manager gets a message on their phone with the complete picture, and decides.
Approve, approve with conditions, or send it for a closer look.

The system never makes this call.

### 11. The lease goes out and comes back signed

On approval, the lease is filled in from verified data and sent for signature. When it comes
back signed, the unit is marked leased and the new resident gets their welcome information.

In testing, the welcome packet went out **23 seconds** after the signature completed.

## The Moment That Matters Most

An applicant submits a pay stub showing **$7,800 a month**. His bank deposits show
**$4,996 a month**.

| What he typed | What his pay stub says | What his bank shows |
|---|---|---|
| $7,800 | $7,800 | **$4,996** |

On paper he clears four times the rent and would have been approved. Verified against his
actual deposits he is at 2.56 times — below the threshold — with a 56% overstatement on top.

Then the system does something that surprises people: **nothing**. It stops, sends him
nothing at all, and hands the file to a human along with a note explaining what a lawful
decline actually requires.

That stop is deliberate. Declining someone over a background report is a formal legal process
involving a pre-notice, a copy of the report, a waiting period, and a final notice. Automating
that is how property companies end up in class actions.

## What The System Never Does

- **It never decides.** It gathers, reads, checks, organises, and hands over.
- **It never scores or ranks anyone.** There is no AI judgement about whether someone seems
  like a good tenant. The rules are arithmetic against published thresholds.
- **It never sends a rejection.**
- **It never asks or records anything about a protected class**, and refuses to answer renter
  questions that would require it to.

## What It Costs To Run

The AI, and nothing else — a few dollars.

Everything else is open source, a free tier, or a developer sandbox: the automation engine,
the database, email, the application form, tour booking, bank-based income verification, and
e-signature.

## What A Real Deployment Changes

- Credit and eviction checks become a real bureau account
- The database connects to their existing property software
- Text messaging is added once carrier registration completes
- Self-guided tours connect to real smart locks
- A proper FCRA decline process is added for the cases that need one

The shape of the system does not change. The demo runs the real structure with test-mode
parts plugged in, and the architecture diagram shows exactly which is which.

## Who This Is For

Property management companies, roughly 50 to 500 units.

Below that the volume does not justify it. Above that they are usually on an enterprise
platform already. In between sits a large group running all of this on spreadsheets, a shared
inbox, and a screening website — which is the gap this fills.

And unlike the enterprise platforms, there is nothing here for the team to learn. No new
dashboard, no migration, no per-seat licence. It works through the inbox and the messaging app
they already have open.
