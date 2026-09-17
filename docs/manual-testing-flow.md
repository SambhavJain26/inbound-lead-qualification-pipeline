# Full manual testing flow

Use this for your own rehearsal before recording. Follow the Maya happy path first;
run the separate optional checks only after it passes. This guide describes the
current build, including its demo setup steps, rather than an ideal future system.

## 1. What you are testing

You will play two people in separate Telegram chats:

- Renter: Maya Restrepo, using **@MapleGroveLeasingBot**.
- Manager: yourself, using **@sambhav_leasing_demo_bot**.

The journey is listing inquiry → factual conversation → prequalification → real
Cal.com booking → simulated tour completion → application → extraction and sandbox
checks → human approval → sandbox lease signature → welcome email.

Telegram stands in for SMS. The site receipt deliberately does not name Telegram
or an assistant, but the underlying bot still requires chat activation. This is
not a real SMS integration.

No real tenant, identity document, bank connection or consumer report is involved.
Use the fabricated details below, the supplied pay stub, and your existing demo
prospect Gmail address only as a delivery destination. Do not enter real SSNs,
birth dates, bank details, identity documents or payment information.

The finish line is a signed sandbox lease and welcome/status delivery. This build
does not collect rent/deposits, verify insurance, provision a real lock, hand over
keys or confirm physical move-in. The welcome email says those arrangements will
follow; it does not complete them.

## 2. Before starting

The last verified state was clean: two available units, no leads/applications,
and an empty Airtable mirror. If you have already made a new inquiry since then,
do not reset blindly—preserve anything you want to keep first.

### Cold start — if Docker and the tunnel were closed

Use this sequence before opening the listing or beginning the renter journey.
If everything is already running, skip directly to the Basic health check below.

1. Open **Docker Desktop** and wait until its engine is running.
2. Open PowerShell and move into the project folder:

```powershell
Set-Location 'D:\codex_projects\automation_projects\leasing-tenant-screening'
```

3. Run each command below in order. Wait for each command to finish successfully
   before running the next; if one fails, resolve that failure before continuing.

```powershell
docker compose up -d
node scripts/start-tunnel.js
node scripts/import-workflows.js
docker compose restart n8n
node scripts/register-calcom-webhook.js
node scripts/build-listing-site.js
node scripts/serve-listing-site.js --detach
```

What to expect and check:

- Compose starts the project's Postgres and n8n services. If Docker cannot be
  reached, wait for Docker Desktop's engine rather than repeatedly running commands.
- The tunnel helper establishes a new HTTPS hostname and repoints n8n. The
  previous tunnel address is no longer the address to use for this rehearsal.
- Workflow import resolves the current local credentials and new tunnel address.
  All five demo workflows should import successfully; none should report FAILED.
- The n8n restart applies the imported active workflows. Allow about a minute for
  webhook activation after restart; a briefly unavailable webhook is not proof
  of a broken form.
- Cal.com registration repoints its booking callback to the current tunnel.
  Do not omit it just because the calendar itself opens normally.
- The listing builder regenerates HTML from current Postgres state, and the
  detached server makes it available at http://localhost:8080.

4. Run the Basic health check below. Proceed only when the required services,
   credentials, tunnel and two distinct bots are working. Open the listing and
   confirm it renders before submitting an inquiry.

Closing Docker or restarting services **does not reset the database**. This
startup sequence deliberately does not clear any leads, applications or Airtable
rows. If you need a clean state, use the preserve/reset procedure in Section 16
and rebuild the listing afterward. Do not reset a journey you intend to finish.

Use the application link delivered during the new journey, not a saved preview
tab or a link containing the old tunnel hostname. Start a fresh listing inquiry
and bind its new R-reference in the renter chat as described in Sections 4–5.

Open these surfaces:

1. Listing site: http://localhost:8080
2. Renter Telegram chat: @MapleGroveLeasingBot
3. Manager Telegram chat: @sambhav_leasing_demo_bot
4. Your existing prospect Gmail inbox—the same account used for the previous lease test.
5. Airtable Leads table, existing Grid view. Additional views are intentionally skipped.
6. n8n: http://localhost:5678, Executions page, for troubleshooting.
7. PowerShell, in `D:\codex_projects\automation_projects\leasing-tenant-screening`.

Keep a note with four items as they appear: lead reference **R-**, application
reference **A-**, Cal.com booking UID, and DocuSign envelope ID. Never reuse the
old R-6343 or A-6686 references; their Postgres rows were reset.

### Basic health check

Run from the project directory:

```powershell
docker compose ps
node scripts/verify-stage-1.js
node scripts/verify-credentials.js
```

Expect Postgres healthy, n8n running, local n8n reachable, tunnel reachable, and
distinct manager/prospect bots. Read optional SKIP results too; a tunnel or
credential failure is relevant even if the script's required checks pass.

If you did not choose the cold-start test, do not restart a healthy tunnel just
for this rehearsal. Restarting it changes
its public hostname. If the listing server alone is missing, run:

```powershell
node scripts/build-listing-site.js
node scripts/serve-listing-site.js --detach
```

If the tunnel is actually unavailable, restore it in this order:

```powershell
node scripts/start-tunnel.js
node scripts/import-workflows.js
docker compose restart n8n
node scripts/register-calcom-webhook.js
```

Allow about a minute for webhook activation after restart. Then repeat the health
checks. Use newly delivered application/signing links, not old tunnel tabs.

## 3. Open and inspect the listing

Open the two-bedroom **MAPLE-2B** at http://localhost:8080/unit-MAPLE-2B.html.

Check the listing is available and has three supplied images, not placeholders.
The photos are AI-generated synthetic demo assets, not photographs of a real property.

Expected property facts:

- Address: 412 Maple Street, Apt 2B, Springfield.
- Monthly rent: $1,650; security deposit: $1,650.
- Two bedrooms, one bathroom, 880 square feet.
- Available October 1, 2026; lease term 12 months.
- One assigned parking space included; second space $50/month if available.
- Cats/dogs under 50 lb, maximum two pets, breed restrictions apply.
- Pet fee $35/month.
- Water, sewer and trash included; resident pays electric and gas.
- Shared laundry, central air and private balcony.

Pass: the listing facts match the facts subsequently quoted in chat. A second
parking space must not be promised unconditionally.

## 4. Submit Maya's inquiry

In the contact form enter:

- Name: **Maya Restrepo**.
- Email: **maya.restrepo.demo@example.com**. This is fabricated; it is not the
  inbox you will use later to receive the lease.
- Phone: leave blank, or use the fabricated **555-0142** if the field is present.
- Message:

> Is parking included, and do you allow a small dog?

Click **Send message** once.

Expect a rendered thank-you page, Maya's name, the MAPLE-2B address and a new
reference beginning **R-**. Copy the entire reference into your note.
The wording should say a message has been sent, with no chat button, app name
or assistant name. It must not download an HTML file or show raw JSON.

Check Airtable: one new row with this R-reference, Maya, MAPLE-2B, Status **New**,
Demo Data checked and Last Synced At populated. Refresh and allow a few seconds.

Important: the receipt wording does not prove bot activation or delivery. For
this fresh reference, perform the next step before expecting the answer.

## 5. Activate the renter conversation

Open **@MapleGroveLeasingBot**, not the manager bot. Send `/start` followed by a
space and the new R-reference you just copied. Example syntax:

```text
/start R-7759
```

R-7759 is a syntax example, not a reference to reuse. Replace it with your new
reference. Even if you started this bot in a previous run, send the new reference
to bind this rehearsal to the new lead.

Wait roughly 10–30 seconds; allow up to a minute before diagnosing a failure.
Do not send the next input while the previous reply is still being processed.

Expect an answer to the parking/small-dog question and a prequalification
question. Wording can vary because the factual answer is generated; facts cannot.
The answer should reflect one included parking space and the published pet policy.
It must not negotiate rent, promise availability, make a rental decision or invent facts.

The manager should not need to approve this ordinary factual reply. Airtable may
move to **Engaged**. It must remain the same R-row, not create another row.

If nothing arrives, first check the bot username and exact R-reference. Do not
keep sending `/start` repeatedly or submit a second application as a workaround.

## 6. Answer prequalification questions

Use these inputs in order, waiting for each reply:

> I would like to move in on October 5, 2026.

> My gross monthly income is $5,000 before taxes.

> Just me living there. I have one small dog weighing 18 pounds and one car.

If the system asks for one of these facts before you reach that line, answer it
then. It can extract several facts from one sentence, so do not insist that it
asks exactly one question for every line above. If it still asks about a missing
slot, answer that slot explicitly using the same values.

Check that it collects October 5, $5,000, one occupant, one car and an 18 lb dog,
and stops collecting once the required facts are complete. It should invite you
to schedule a tour. The prequalification wording should make clear this is not
a rental decision. It must not say Maya's application is approved.

Expected arithmetic: self-reported $5,000 ÷ $1,650 rent ≈ **3.03x**, still
**unverified**. Airtable should become **Prequalified**, with Stated Income 5000
and Move In October 5. Verified Income should still be empty at this stage.
No screening decision or lease should exist yet.

## 7. Book one real tour

Choose a real available Cal.com slot, preferably 2pm on a future day, inside
9am–6pm property time and more than 24 hours away. The configured minimum notice
is 12 hours; choosing more than 24 keeps this happy-path test away from the boundary.

The property timezone is **America/New_York**, not your India desktop timezone.
Check the timezone displayed if you inspect the Cal.com page. In September,
2pm New York is 11:30pm India and 18:00 UTC. Use the property-local date/time in chat.

Send a fully specified request, substituting your chosen future date:

> Could you book me for Thursday, September 17, 2026 at 2:00 PM?

That is a sample, not guaranteed availability. If that date has passed or its
slot is occupied by a previous run, choose another available date/time.

Expect a checking/booking message, then a confirmation with the property address,
the actual booked date/time and a six-digit entry code. The code is **MOCK**;
there is no real lock and you should not try to use it on any door.

If the exact slot is unavailable, the build can choose a nearby real slot within
its tolerance and state the changed time, or offer alternatives if no close slot
exists. Check what it actually confirmed; do not assume the requested time was booked.

Check:

- Cal.com shows one booking, named **Unit Tour**, for the confirmed time.
- The attendee delivery address is the configured demo prospect Gmail; the build
  overrides the fabricated inquiry email because Cal.com requires a deliverable address.
- Airtable becomes **Tour Booked**, with Tour populated and Next Action **Attend tour**.
- The same R-row remains; no duplicate row appears.
- No manager approval is needed for this inside-policy booking.
- No misleading unmatched-booking alert appears for this successfully recorded booking.

Wait for confirmation before continuing. Do not send multiple booking requests
just because the first API call is taking a few seconds.

## 8. Simulate tour completion as the operator

You do not need to wait until the real calendar date. For the demo, the operator
posts a synthetic completion event. The current build does not detect attendance
or automatically infer that a renter completed a tour.

In PowerShell, run this. The prompt asks for your actual new R-reference:

```powershell
$rehearsalRef = Read-Host 'Paste the new R-reference from this rehearsal'
if ($rehearsalRef -notmatch '^R-\d{4}$') { throw 'Expected an R-reference such as R-1234' }
$tourCompletionBody = @{ ref_token = $rehearsalRef } | ConvertTo-Json -Compress
Invoke-RestMethod -Method Post -Uri 'http://localhost:5678/webhook/tour-completed' -ContentType 'application/json' -Body $tourCompletionBody
```

Expect the renter chat to receive a follow-up and rental application link.
Check the link contains **ref_token=your current R-reference**. Airtable becomes
**Toured**, with Next Action **Submit application**.

Click this newly delivered link once. Do not use a saved preview URL or an old
R-6343 form tab. The form should show seven readable sections and the synthetic
data/verification warnings. The reference is hidden; you should not need to type it.

## 9. Complete the application manually

Use the following values. This form is an application for consideration, not
the lease, and submission must not automatically approve the applicant.

| Form field | Input |
|---|---|
| Home you are applying for | MAPLE-2B |
| Full name | Maya Restrepo |
| Email address | Your configured demo prospect Gmail, the same inbox used for the earlier signing test |
| Phone number | 555-0142 |
| Demo identity code (last four digits only) | 1234 |
| Current address | 88 Cedar Lane, Apt 4, Springfield |
| Previous address | 17 Birch Court, Springfield |
| Requested move-in date | October 5, 2026 |
| Employer or income provider | Northgate Dental Group |
| Job title (if applicable) | Dental Hygienist |
| Gross monthly income ($) | 5000 |
| Monthly rental assistance amount ($) | 0 |
| Total number of occupants | 1 |
| Pets | One dog, 18 lbs |
| Vehicles needing parking | One blue Honda Civic |
| Have you had an eviction filing? | No |
| Have you broken a rental lease? | No |
| Have you filed bankruptcy in the past seven years? | No |
| Upload your most recent pay stub (PDF) | fixtures/paystub-maya.pdf |
| Demo verification authorization | I authorize the synthetic demo checks |

The upload's full path is
`D:\codex_projects\automation_projects\leasing-tenant-screening\fixtures\paystub-maya.pdf`.
Select it through the upload control; do not upload your own pay stub.

The fabricated fixture addresses intentionally lack real ZIP/state details. Use
them as supplied rather than adding real residential information. Use 1234 only,
not a full SSN. No payment or bank login should be required.

Check the selected unit, delivery email, move-in date, PDF and authorization before
clicking the submission button. Click once. Expect the form's success confirmation;
that confirms receipt, not completion of screening. Do not resubmit while waiting.

## 10. Inspect screening as the manager

Switch to **@sambhav_leasing_demo_bot**. Allow roughly 30–60 seconds; model/network
calls can take longer. Copy the new **A-reference** from the manager card into your note.
It is different from the R-reference, and fixture example references are not reused.

Expected manager card:

- Maya Restrepo, MAPLE-2B, $1,650 rent.
- Claimed income: **$5,000/month**.
- Document-extracted income: approximately **$4,996.33/month**.
- Plaid Sandbox verified income: approximately **$4,996.33/month**.
- No material document-to-verified income mismatch.
- Deterministic result: **meets_criteria**; verified ratio approximately **3.03x**.
- Credit score **712**, zero eviction filings, identity match—all **MOCK**, not
  real consumer-report or identity checks.
- Per-criterion evidence, plus buttons such as **Approve**, **Conditional** and
  **Send to review**.

The PDF contains $2,306 gross biweekly: $2,306 × 26 ÷ 12 = $4,996.33/month.
Small display rounding to $4,996 is expected. The $5,000 self-report is close but
not identical; do not expect all three figures to be literally 5000.

Check Airtable: the original R-row becomes **Applied**, its Application Reference
matches this A-reference, Verified Income is about 4996, Lease Status is **not_sent**,
and Next Action is **Manager review**. Detailed evidence lives on the manager
card, not in extra Airtable tables.

Before tapping any decision, verify **no lease email was sent** and no decision
was recorded automatically. A criteria classification is not a manager approval.

## 11. Approve as the manager

Read the card, check its new A-reference and then tap **Approve** once on that
card. Do not tap an older card from an earlier journey.

Expect the manager's action to be recorded with actor and timestamp, followed
by a lease-sent notification. This triggers the DocuSign developer sandbox—not
a production lease. Airtable may briefly show **Decided**, then **Lease Sent**.
The intermediate state can be too quick to see; that alone is not a failure.

Check final state before signing:

- Decision is approved by the manager, not by AI.
- Lease Status is **sent**, Next Action **Await signature**.
- One new DocuSign envelope ID exists for this A-reference.
- Prospect Gmail receives one new lease signing email.
- The unit is not yet marked leased merely because an envelope was sent.

Do not use Conditional for this main test. In the current build that button also
starts a sandbox lease; it is not a separate document-request waiting stage.

## 12. Review and sign the sandbox lease as Maya

In the prospect Gmail inbox, open the latest DocuSign email belonging to this
application. Check its application reference/name, then open its signing link.
Ignore older emails and old envelopes left from previous tests.

Review the demo lease before signing:

- Resident: Maya Restrepo.
- MAPLE-2B, 412 Maple Street, Apt 2B, Springfield.
- Monthly rent **$1,650.00**, security deposit **$1,650.00**.
- Lease term **12 months**.
- Intended move-in **October 5, 2026**.
- Application reference matches the current manager card.
- Demonstration/synthetic wording and sandbox watermark are expected.

Proceed through DocuSign's consent/Continue/Start controls as shown. Select the
signature field. If a saved operator signature is offered, change/adopt a signature
for the fabricated **Maya Restrepo**, initials **MR**, rather than signing as yourself.

Apply the signature and select **Finish** when the document is correct. Closing
the tab or placing a signature without Finish is not a completed envelope.

Expect DocuSign's completion confirmation. Do not manually post a fake signature
callback; this test needs the real sandbox Connect event generated by Finish.

## 13. Check all final outcomes

Allow roughly 5–30 seconds for Connect processing and another short delay for
email delivery. Inspect all of these, not just the signing screen:

1. **Manager Telegram:** a signed notification naming the current A-reference and
   MAPLE-2B, indicating the unit is leased and the welcome packet was sent.
2. **Prospect Gmail:** a new welcome email carrying the current A-reference.
   It confirms the signed lease and says insurance, utilities and permanent entry
   arrangements will follow. Do not expect a real permanent lock code in this email.
3. **Airtable:** the same R-row is **Leased**, Application Reference matches,
   Lease Status **signed**, Next Action **Complete move-in handoff**, fresh Last
   Synced At, Demo Data checked. There should be one lead row, not one row per phase.
4. **Postgres:** current application status **lease_signed**, lease_status **signed**,
   decision **approved**, manager actor/time present; MAPLE-2B status **leased**.
5. **n8n Executions:** the application, manager action, lease-send and signature
   executions succeeded. Open the actual executed node details if anything differs.

The listing is generated static HTML, so its availability does not update just
because you refresh it. To verify the leased property on the site, regenerate:

```powershell
node scripts/build-listing-site.js
```

Refresh the listing afterward. MAPLE-2B should no longer be presented as available;
MAPLE-5A should remain available.

### Optional read-only Postgres checks

These queries show recent synthetic records without changing anything:

```powershell
docker compose exec -T postgres psql -U leasing -d leasing -c "SELECT l.ref_token AS lead_reference, a.ref_token AS application_reference, u.unit_code, a.status, a.criteria_result, a.decision, a.decided_by, a.decided_at, a.lease_status, a.envelope_id FROM applications a LEFT JOIN leads l ON l.id=a.lead_id JOIN units u ON u.id=a.unit_id ORDER BY a.id DESC LIMIT 5;"
docker compose exec -T postgres psql -U leasing -d leasing -c "SELECT unit_code,status FROM units ORDER BY unit_code;"
docker compose exec -T postgres psql -U leasing -d leasing -c "SELECT ref_token,direction,channel,subject,created_at FROM message_log ORDER BY id DESC LIMIT 15;"
```

Airtable delays/failures must not prevent the signed lease or welcome processing.
If Postgres is correct but the board is stale, run once:

```powershell
node scripts/sync-airtable.js
```

That recovers the display; it does not repair a failed business workflow.

## 14. Optional separate checks

These are not necessary to repeat the already-verified happy path. They create
additional test messages/records and, for bookings, actual calendar entries.

### A. Repeated inquiry

Before tour completion, resubmit the same contact details and unit once. Expect
the same active lead reference and no second Airtable row. Do not generalize this
to repeated application submission: applications are not covered by the same
inquiry idempotency rule, so submit the application only once.

### B. Grounded FAQ and unsupported input

On a separate lead, ask **Which utilities are included?** Expect water/sewer/trash
included and resident-paid electric/gas. Send a sticker or voice note: expect a
text-based fallback rather than an invented answer or silence. Ask **Can you lower
the rent to $1,400?** Expect no negotiation or commitment; the system should stay
within fixed facts or hand off to a person.

### C. Out-of-policy tour

Use a separate fresh lead and complete prequalification. Inspect available slots
first. If a real 8pm slot exists, request it with an explicit date. Expect a manager
tour-approval card, no booked slot and no code while pending. On the manager card,
choose **Not that time** to test decline: renter gets alternatives, no booking or
code is created. Alternatively choose **Approve tour** to test the approval path:
only then should the actual slot and code be issued.

If Cal.com offers no outside-policy slot, the expected result is an availability
response, not necessarily a manager card. Do not treat absence of a nonexistent
8pm slot as a broken policy gate.

### D. Human-review decision

Use a separate submitted Maya application. Tap **Send to review**, not Approve.
Expect its row to become **Stopped For Review**, with human review as next action.
No lease should be sent. Do not then use the same decided card to test approval;
the already-decided guard should prevent another decision.

### E. Devon's mismatch/stop path

For a quick screening-only check, run:

```powershell
node scripts/submit-application.js devon --standalone
```

The explicit standalone flag prevents Devon from being accidentally linked to
Maya's most recent lead. It bypasses the manual listing/tour/form-entry steps, so
call it a scripted fixture test, not another genuine renter journey.

Expect a new A-reference for Devon Clarke, MAPLE-5A, $1,950 rent; claimed/document
income $7,800, Plaid Sandbox income about $4,996.33, about 56% document variance,
verified income ratio about 2.56x, result **does_not_meet** and application
**stopped_for_human**. Airtable shows **Stopped For Review**, with its standalone
A-reference as the row key. Credit 688 and zero eviction filings are MOCK.

Expect a human-review notification and no automated denial, adverse-action notice
or lease. This demo does not implement a real legal adverse-action process. Do
not reinterpret the mismatch as proof of real fraud or these sandbox figures as
a real person's financial records.

## 15. If a step fails

Stop at the failing step and keep its reference/time. Do not reset the evidence
or create several replacement applications before checking the execution.

| Problem | First check / action |
|---|---|
| Listing unavailable | Start the listing server; confirm port 8080 |
| Receipt missing or raw JSON/download | Check WF1 execution and HTML response node |
| No renter answer | Correct prospect bot, new `/start R-reference`, active workflow and live tunnel |
| Repeated collection question | Answer the missing fact explicitly; inspect recorded slots if repetition continues |
| Booking time differs | Read the confirmed actual slot and property timezone; check calendar availability |
| No application link | Confirm the operator completion POST used the correct new R-reference |
| Form 404 | Check tunnel and webhook activation; wait after restart; use the newest link |
| Application linked incorrectly | Compare link's R-reference and stored lead_id; do not proceed to signing |
| No manager card after 90 seconds | Inspect WF2 execution, upload/extraction/Plaid errors; do not immediately resubmit |
| Manager tap has no effect | Correct bot/current card; check WF3 execution and distinct bot credentials |
| No lease email | Verify manager decision, WF4 send execution, recipient and Gmail Spam/All Mail |
| DocuSign completed but no final updates | Inspect signature/Connect execution and matching envelope ID |
| Welcome says sent but email not visible | Check recipient, Spam/All Mail and SMTP node result; a log alone is not inbox proof |
| Airtable stale | Compare Postgres, inspect mirror-node error, then run sync-airtable once |

## 16. Preserve, reset and prepare to record

After the rehearsal passes, note the four references and save screenshots of
the manager evidence card, signature completion, welcome email and final board.
Then run:

```powershell
node scripts/preserve-demo-evidence.js
node scripts/reset-demo.js --with-airtable
node scripts/build-listing-site.js
node scripts/verify-stage-2.js
```

The first command writes a recoverable local Postgres dump under ignored `tmp/`.
The reset deliberately removes this project's synthetic leads, applications,
messages and Airtable mirror rows, restoring the two units to available. Stage 2
should pass and Airtable should be empty. Do not reset while an execution or
unsigned test you intend to finish is still in progress.

Reset does **not** clean Gmail, Telegram history, Cal.com bookings or sandbox
envelopes. Manually tidy visible mail/chats as you planned. Cancel old test
bookings if necessary to free the slot you intend to demonstrate. Old envelopes
can remain, but do not sign them after reset.

For recording, begin with another **new listing inquiry and new R-reference**.
Keep this guide off-camera if desired; the tour-completion command is the one
operator simulation needed in the happy-path journey.

## Pass checklist

- [ ] Listing facts and six synthetic site images render correctly.
- [ ] Receipt gives a fresh reference and SMS-style wording without a button.
- [ ] New reference binds to the correct renter chat; grounded answer arrives.
- [ ] Prequalification records the stated values and remains explicitly unverified.
- [ ] One real tour is booked at the confirmed property-local time; code is MOCK.
- [ ] No misleading unmatched alert appears for the recorded API booking.
- [ ] Operator completion event delivers a correctly referenced application link.
- [ ] Manual application submission uses the synthetic PDF and explicit authorization.
- [ ] Manager card shows three income figures, criteria evidence and mock labels.
- [ ] No decision or lease occurs before your manager approval.
- [ ] Approval records the actor and creates one sandbox envelope.
- [ ] Maya's synthetic signature is completed using Finish on the current envelope.
- [ ] Real Connect event produces signed state, leased unit, manager alert and received welcome email.
- [ ] Airtable keeps one R-row with the matching A-reference and final signed status.
- [ ] Evidence is saved; recording starts from another clean, fresh inquiry.
