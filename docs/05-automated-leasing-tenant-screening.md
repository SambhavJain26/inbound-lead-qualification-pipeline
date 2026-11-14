# Automated Leasing & Tenant Screening — Problem Statement

Last updated: 2026-09-11

Why this build exists, who has the problem, and what the evidence says. Every claim here
carries a source. Where a number comes from a vendor's own marketing research rather than
an industry body or a data provider, it is labelled as such.

## The Problem

**Problem statement:** The path from rental inquiry to signed lease is a chain of manual
handoffs — answering the same questions, qualifying, scheduling, chasing documents,
verifying income by hand — and every day that chain takes costs the owner rent while
exposing the property to a category of fraud that has grown faster than the process
defending against it.

Two costs sit at opposite ends of the same funnel.

At the front, **speed loses leases**. Inquiries arrive around the clock, most of them
outside office hours, and a prospect comparing four listings rents the one that answers
first.

At the back, **documents lie**. The pay stub a prospect uploads is trivially fabricated,
and the people reviewing it are doing so between phone calls.

Between the two sits a leasing team with a finite number of hours.

## Is This A Real Industry Problem?

Yes. Four independent bodies of evidence support four distinct parts of it.

### Vacancy Is Metered In Days, And The Meter Is Running

Time-to-lease is not a rounding error. RealPage reported the average apartment sat vacant
**34.4 days** at the end of 2024, up from roughly 30 days in early 2020, and RentCafe's 2025
market data puts the U.S. average time-to-lease at **41 days**. Against a national average
rent near $1,740/month, each vacant day costs roughly **$55–$60** in lost rent alone.
[RealPage / RentCafe market data via industry summaries](https://lula.life/articles/how-to-reduce-days-vacant-on-rental-properties)

Lost rent is also the single largest component of turnover cost. Industry estimates put one
apartment turn at roughly **$3,900–$4,000 per unit**, with vacancy loss accounting for
**30–60%** of that total.
[Apartment turnover cost breakdown](https://rapideyeinspections.com/research/apartment-turnover-cost-statistics/)

This is the part of the problem a property manager already feels. It is also the part where
a few days of compressed cycle time converts directly into money.

### Application Fraud Is No Longer An Edge Case

This is the strongest evidence in the whole problem statement, and it comes from the
industry's own trade association.

A National Multifamily Housing Council survey found that **93%** of rental housing providers
experienced fraud in the previous twelve months, and **85%** had seen falsified or fabricated
pay stubs, employment references, or other income documentation. **75%** named fake pay stubs
as their single largest fraud concern, and **70%** said fraud had become more frequent over
that period.
[NMHC survey findings, reported by Multifamily Dive](https://www.multifamilydive.com/news/how-to-combat-paystub-fraud-renter/722022/)

The downstream cost is not hypothetical. Respondents traced **23.8%** of their eviction
filings to fraudulent applications, and large operators attributed close to a quarter of
their bad debt — averaging around **$4 million written off per respondent in a single year** —
to nonpayment originating in application fraud.
[NMHC Pulse Survey: Operational Impact of Rental Application Fraud and Bad Debt](https://www.nmhc.org/research-insight/research-report/nmhc-pulse-survey-analyzing-the-operational-impact-of-rental-application-fraud-and-bad-debt/)

The mechanism has gotten worse on its own. Generating a convincing pay stub used to require
some skill; it now requires a prompt.

**This is the centre of gravity for this build.** A document a human eyeballs is not
verification. Comparing what an applicant *claims*, what their *document says*, and what
their *bank actually shows* is.

### Response Speed Decides Who Gets The Lease

The front-of-funnel evidence is real but thinner, and it comes mostly from vendors selling
leasing automation — worth weighting accordingly.

Vendor research reports that roughly **62%** of real-estate inquiries arrive outside 9–5
Monday–Friday, that a 2019 study found **18%** of multifamily lead requests received no
response at all (clustered outside business hours), and that industry-average response time
sits around **2.5 days** against a recommended target of under five minutes.
[Leasey.AI after-hours lead analysis](https://www.leasey.ai/resources/research/what-happens-to-apartment-inquiries-on-weekends-and-after-hours-multifamily-lead-conversion-analysis) ·
[LetHub speed-to-lead analysis](https://www.lethub.co/blog/rental-inquiry-response-time-speed-to-lead)

Treat the precise figures as directional. The underlying claim — that rental inquiries
cluster outside office hours and that a prospect shopping several listings rewards the first
reply — is uncontroversial and matches how the ILS marketplaces behave.

### The Market Has Already Decided It Wants This

Adoption is not the question any more; execution is.

Industry research reports **94%** of multifamily operators are implementing AI or planning to
within twelve months, and that among operators already using it, **85%** report measurable
improvement in lead-to-lease conversion. AI leasing assistants — EliseAI, Funnel, Zuma,
BetterBot, LeaseHawk — are now a recognised category integrating natively with Yardi,
RealPage, and Knock.
[2026 State of AI in Multifamily Housing](https://www.myaifrontdesk.com/multifamily/reports/2026-state-of-multifamily-ai)

Two implications for positioning:

1. A prospect may already use one of these. The pitch is not "AI can answer inquiries" —
   that is table stakes. It is the *screening* half, where the tooling is expensive,
   enterprise-tier, and rarely reaches the smaller operator.
2. The enterprise platforms serve enterprise portfolios. Operators in the 50–500 unit range
   are the ones assembling this out of spreadsheets, email, and a screening website.

### The Legal Frame Is The Differentiator, Not The Obstacle

HUD issued Fair Housing Act guidance on 2 May 2024 covering algorithmic and AI-driven tenant
screening. Its central instruction is remarkably close to a specification:

> Tenant screening companies should serve to **implement, rather than set**, a housing
> provider's screening policies, and should offer customizability as to criteria, standards,
> and weights.

[HUD press release, May 2024](https://archives.hud.gov/news/2024/pr24-098.cfm) ·
[Analysis of the guidance](https://www.consumerfinancialserviceslawmonitor.com/2024/05/hud-issues-guidance-on-applicability-of-the-fair-housing-act-to-tenant-screening-and-housing-related-advertising-that-relies-upon-algorithms-and-ai/)

The guidance is equally clear that a housing provider cannot transfer its Fair Housing
obligation to a vendor or a model, and that a decision being algorithmic does not insulate it
from civil-rights law.

Separately, the Fair Credit Reporting Act imposes a formal two-step adverse-action process on
any denial based on a consumer report — pre-adverse notice with a copy of the report and the
FCRA Summary of Rights, a waiting period, then the final notice. Class actions against
apartment operators over exactly this process are active.
[FCRA adverse action requirements](https://blog.tenantevaluation.ai/fcra-adverse-action-letter-software/)

**This is why the build is designed the way it is.** A system where the manager sets the
criteria, a deterministic engine applies them identically to everyone with a per-criterion
evidence trail, and a human makes the decision is not a compliance compromise — it is
precisely the architecture HUD describes. The AI does extraction, grounded answers, and
drafting. It never scores anyone.

## What This Build Demonstrates

A proof of concept covering both halves of the funnel at medium-high fidelity:

**Front of funnel** — a lead arrives, gets an accurate answer grounded in property facts
within seconds, is pre-qualified on unverified self-reported criteria, books a tour, and
receives an application link afterwards.

**Screening engine** — the application is received, documents are parsed, income is verified
against a real open-banking API, a deterministic criteria engine applies the manager's
published thresholds with an evidence trail, and the complete file goes to a human who
decides. On approval, a lease is populated and sent for signature.

**The signature moment:** a fixture applicant whose uploaded pay stub says one thing and
whose verified payroll deposits say another. Three numbers on screen — claimed, extracted,
verified — with their sources. That is the NMHC statistic made concrete in fifteen seconds.

## What It Does Not Do, And Why

Stated plainly because prospects will ask, and because the honesty is the point:

- **It does not pull credit, eviction, or criminal records.** That requires FCRA
  permissible-purpose credentialing — a bureau contract, a business entity, and in most cases
  a site inspection. No developer sandbox exists. That step is mocked in the real
  TransUnion response shape so the swap is a single node.
- **It does not decide.** The criteria engine classifies; a human decides.
- **It does not generate adverse-action notices.** A file that fails criteria stops and is
  handed to a human, with the FCRA two-step requirement noted. Automating a denial letter is
  how operators end up in class actions.
- **It does not send SMS.** US A2P 10DLC registration is a genuine barrier; email and the
  web chat widget carry the prospect conversation in the demo.

Each of these is drawn in the architecture diagram with its production counterpart, so the
prospect sees the whole system and knows exactly which parts are real today.
