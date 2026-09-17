# Full manual testing flow

Updated for the manager-supervised rehearsal, September 17, 2026.

You play the prospective resident, Sambhav Jain, and the property manager in two
separate chats. Use your name and delivery email, but all property, employment,
income, document and screening details below are synthetic demo inputs.
This is not your real rental application.

## 1. Accounts and boundaries

| Role | Surface |
|---|---|
| Resident | @MapleGroveLeasingBot |
| Manager | @sambhav_leasing_demo_bot |
| System email sender | worksambhav26@gmail.com |
| Resident email recipient | sambhavn8n@gmail.com |
| Cal.com organizer display name | Alex Morgan, fictional demo organizer |
| Calendar attendee | Sambhav Jain, from your inquiry |

Telegram stands in for SMS. Each bot must have been started once from your
Telegram account; this is platform setup, not a repeated flow step. After that,
the configured single-resident inquiry receives an opening answer automatically.
Type ordinary messages. Neither chat requires Telegram's Reply feature.

Only grounded public listing answers and bounded information collection run
automatically. Every tour booking and entry-code release waits for the manager.
The manager confirms demo attendance and authorizes the application follow-up.
The rental decision and lease send require manager approval; so does the welcome
email after signing. Private or unsupported requests go to human review.
An approval cannot override privacy, fair-housing or legal-notice restrictions.

The finish line is a signed non-binding sandbox lease, manager-approved welcome
email and matching visible status. Payments, real background checks, actual
attendance, insurance verification, real lock access and physical move-in are
not part of this test. Plaid Sandbox returns canned payroll data, not your income.

## 2. Cold start: Docker and tunnel were closed

Commands belong to preparation or troubleshooting only. Once you submit the
inquiry, the normal resident/manager flow needs no terminal or script.

Open Docker Desktop and wait for its engine. In PowerShell:

```powershell
Set-Location 'D:\codex_projects\automation_projects\leasing-tenant-screening'
docker compose up -d
node scripts/generate-secrets.js
node scripts/setup-credentials.js smtp imap
node scripts/start-tunnel.js
node scripts/import-workflows.js
docker compose restart n8n
node scripts/register-calcom-webhook.js
node scripts/build-listing-site.js
node scripts/serve-listing-site.js --detach
```

Run each command separately and wait for it to finish. Don't restart n8n while
workflow import is still running. The tunnel receives a new hostname; the
imports and callback registration must use that new address. Allow roughly a
minute after restart for webhook activation.

The secret generator leaves existing keys alone. The internal-action secret
protects manager-authorized handoffs. Never share it or put it on screen.
SMTP/IMAP setup imports the current worksambhav sender credentials.

Check preparation:

```powershell
docker compose ps
node scripts/verify-stage-1.js
node scripts/verify-credentials.js
node scripts/test-manager-lib.js
```

Expect healthy Postgres, running n8n, reachable local/tunnel endpoints, distinct
bots, SMTP and IMAP authenticated as worksambhav26@gmail.com, and passing manager
checks. Existing credentials are not proof of successful authentication.

If the stack is already healthy, don't restart its tunnel for this test. Open
the listing and both chats instead. If only the listing server is missing,
start it with the listing builder/server commands above.

Restarting Docker does not clear Postgres. Don't reset a test you intend to
finish. To start clean, preserve first, then reset this project's demo rows:

```powershell
node scripts/preserve-demo-evidence.js
node scripts/reset-demo.js --with-airtable
node scripts/build-listing-site.js
node scripts/verify-stage-2.js
```

Reset doesn't clear Gmail, Telegram history, old calendar bookings or DocuSign
envelopes. Don't sign an old envelope after reset. Cancel unwanted test bookings
yourself if they occupy your intended slot.

## 3. Open the business surfaces

Have these open:

- Listing: http://localhost:8080/unit-MAPLE-2B.html
- Resident chat: @MapleGroveLeasingBot
- Manager chat: @sambhav_leasing_demo_bot
- Recipient inbox: sambhavn8n@gmail.com
- Airtable Leads, existing Grid view
- Cal.com availability or booking confirmation, if needed

Keep n8n's Executions page available for troubleshooting, not on the recording.
Note the new R-reference, A-reference, calendar booking UID and envelope ID as
they appear. Never reuse a reference from a previous rehearsal.

Check the listing: $1,650 rent and deposit, two bedrooms, one bathroom, 880 sq ft,
October 1 availability, 12-month term. One assigned parking space is included;
a second costs $50 if available. Cats/dogs under 50 lb, maximum two, with listed
restrictions and $35 monthly pet fee. Water/sewer/trash included; electric/gas
resident-paid. Images are AI-generated synthetic demo assets.

## 4. Submit your inquiry

| Field | Input |
|---|---|
| Name | Sambhav Jain |
| Email | sambhavn8n@gmail.com |
| Phone | Leave blank or use synthetic 555-0142; don't add real phone data |
| Question | Is parking included, and do you allow a small dog? |

Click Send message once.

Expect a neutral receipt with your name and an R-reference, without an app name,
assistant name or handoff button. The resident chat receives the grounded opening
answer; the manager chat receives a New rental inquiry notice identifying you,
the unit, reference and inquiry. Airtable creates one lead row.

If you've never started either bot, complete that one-time setup first. Don't
use an old /start reference. No repeated Reply action or deep-link activation is
needed for the configured resident email after setup.

## 5. Continue in ordinary resident messages

Send each line normally, waiting for the response:

> I would like to move in on October 5, 2026.

> My gross monthly income is $5,000 before taxes.

> Just me living there. I have one small dog weighing 18 pounds and one car.

These are fictional rehearsal facts, not statements about your real finances.
If a question comes earlier, answer it then. The bot can collect multiple values
from one sentence and should skip facts already supplied.

Check October 5, income 5000, one adult, one car and 18 lb dog. The income ratio
is about 3.03x against $1,650, explicitly self-reported and unverified.
Prequalification isn't application approval. No lease should exist.

The manager receives progress notices. Airtable becomes Prequalified; Verified
Income remains empty. The bot asks for your preferred date/time, not a public
booking link that bypasses approval.

## 6. Request a real available tour

Choose an open future Cal.com slot inside the next fourteen days. Use the
property's America/New_York timezone, not your India desktop timezone.
In September, 2pm New York is 11:30pm India and 18:00 UTC.

For example, replace the date with an available future date:

> Could you book me for Saturday, September 19, 2026 at 2:00 PM?

If the exact time is unavailable, expect real alternatives. Choose one in chat.
The bot must not silently move the booking to another time.

For an available requested slot, expect:

- Resident: request is waiting for manager approval; nothing booked yet.
- Manager: Tour approval needed card, requested time and approval buttons.
- Airtable: same lead, Next Action Manager tour approval.
- Calendar: no booking from this request before approval.
- No entry code released while pending.

## 7. Approve the tour as manager

In the manager chat, send this as a new message:

> Approve tour

Or tap Approve tour on the current card. No Reply gesture is needed. If there
are several pending tours, type Approve tour R-1234 using the actual reference.
The bot asks for clarification when the target isn't unique.

Expect one real calendar booking and resident confirmation only after approval.
Check:

- Event: Unit Tour.
- Organizer: Alex Morgan.
- Attendee: Sambhav Jain.
- Attendee delivery email: sambhavn8n@gmail.com.
- Confirmed property-local time matches the time you accepted.
- Six-digit demo entry code is explicitly MOCK and doesn't operate any lock.
- Manager receives Tour booked and a demo-completion button.
- Airtable: Tour Booked, tour time populated, one R-row.

Don't request or approve the same tour several times because the API is slow.
A repeated approval must not create another booking. A stale card must not
approve a newer request.

## 7a. Optional: change an already-booked tour

In the resident chat, send a new message:

> I would like to change my tour time. Is that possible?

Expect a request for the new date/time. Then send:

> Same day, at 11:00 AM instead.

Choose an available future time in the property's timezone, America/New_York.
If the exact time is unavailable, expect real alternatives. The original booking
stays active, and the system must not pick a nearby time without asking you.

For an available time, check the manager's Tour change approval needed card:
current time, requested time, reference, timezone, Approve change and Keep original.
Airtable keeps Tour Booked and shows Manager reschedule approval as Next Action.

In the manager chat, type Approve change normally or tap the current button.
With several pending items, include the R-reference. No Reply gesture or terminal
step is needed. Approval rechecks availability, then Cal.com's native reschedule
operation replaces the booking. Confirmation must give the new time and state
that cancellation of the old booking was verified.

Check one active replacement booking, the previous booking cancelled, the same
attendee and organizer, the new time on the same Airtable row, and a new labelled
MOCK code. Repeated approvals and old cards must not move the booking again.

To refuse a pending change, type Keep original. Expect no replacement or cancellation
and a resident message confirming that the original tour remains booked.
Resolve one pending change before requesting another. Tour completion is blocked
while a change is pending, processing, or needs calendar reconciliation.

If a calendar operation has an uncertain result, expect a manager follow-up alert,
not a claim that the new time is confirmed. Inspect both bookings before retrying.
A failed resident confirmation after a verified change is a delivery follow-up,
not permission to reschedule again.

## 8. Confirm tour completion in manager chat

You don't need to wait for the calendar date. This is synthetic demo attendance,
not automatic attendance detection. Tell the manager bot:

> Tour completed for Sambhav Jain

Or use Confirm tour completed (demo) on the booked-tour card. With exactly one
eligible booking, Tour completed also works. With several, give its R-reference.

This manager action records completion and authorizes the fixed application
follow-up. It cannot run before a booking exists. Repeating it must not issue
another application link.

Expect the resident to receive the application link in chat. Verify its
ref_token matches your R-reference and its hostname is the current tunnel.
Airtable becomes Toured, with Submit application as next action.
No PowerShell command, webhook tool or simulation script is needed here.

## 9. Complete the seven-section application

Click the newly delivered link. Don't use an old saved preview or form.

| Field | Synthetic rehearsal input |
|---|---|
| Home | MAPLE-2B |
| Full name | Sambhav Jain |
| Email | sambhavn8n@gmail.com |
| Phone | 555-0142 |
| Demo identity code, last four only | 1234 |
| Current address | 88 Cedar Lane, Apt 4, Springfield |
| Previous address | 17 Birch Court, Springfield |
| Requested move-in | October 5, 2026 |
| Employer/income provider | Northgate Dental Group |
| Job title | Dental Hygienist |
| Gross monthly income | 5000 |
| Monthly rental assistance | 0 |
| Occupants | 1 |
| Pets | One dog, 18 lbs |
| Vehicles | One blue Honda Civic |
| Eviction filing / broken lease / bankruptcy | No / No / No |
| PDF | fixtures/paystub-maya.pdf |
| Authorization | I authorize the synthetic demo checks |

The PDF is fabricated evidence for the demo, not your paystub. It bears Maya's
fixture name; don't represent it as proof of your identity or income. The mock
identity check does not validate your identity against it. Only your display
name and delivery address are used to play the resident.

Full upload path:
D:\codex_projects\automation_projects\leasing-tenant-screening\fixtures\paystub-maya.pdf

No full SSN, DOB, real employer details, bank credentials, payment or identity
document is required. Submit once. The success screen confirms receipt, not a
rental decision.

## 10. Review screening as manager

Allow roughly 30–90 seconds. Expect a new A-reference on the manager card:

- Sambhav Jain, MAPLE-2B, $1,650 rent.
- Claimed monthly income 5000.
- Extracted biweekly gross 2306, annualized to about 4996.33/month.
- Plaid Sandbox payroll about 4996.33/month, explicitly canned test data.
- Deterministic meets_criteria, ratio about 3.03x.
- Credit, eviction and identity results explicitly MOCK.
- Evidence per criterion and Approve / Conditional / Send to review buttons.

Don't expect three identical 5000 figures. The calculation is 2306 × 26 ÷ 12.
Plaid does not ask you to connect an account in this demo.

Before deciding, verify no lease went out. Airtable shows Applied, the matching
A-reference, not_sent lease status and Manager review as next action.

## 11. Approve the sandbox lease

Read the current evidence card and tap Approve once, or send:

> Approve application A-1234

Replace A-1234 with your current A-reference. When only one relevant approval
exists, Approve works too. With both a tour and an application pending, the bot
must not guess. Send to review routes for human handling without a lease.

Expect a recorded manager actor/time, one sandbox envelope and a lease-sent
notice. Open the latest signing email in sambhavn8n@gmail.com.
The unit isn't leased merely because the envelope was sent.

Don't use Conditional for this happy path. Its current demo behavior also sends
a sandbox lease; it isn't a document-request waiting stage.

## 12. Sign the non-binding sandbox document

Check resident Sambhav Jain, MAPLE-2B, $1,650 rent/deposit, twelve months, October
5 move-in and the current A-reference. Sandbox/demo labels are expected.
The document explicitly says it isn't a binding agreement.

Follow DocuSign's consent and signing controls. Adopt Sambhav Jain / SJ for the
display signature, not the saved Maya signature from an earlier run. Finish the
envelope; closing the tab isn't completion.

Use the real sandbox signing flow, not a fake completion callback.

## 13. Approve the welcome email and check outcomes

After the real Connect event, expect:

- Manager: lease signed, synthetic unit leased, welcome approval requested.
- Airtable: Leased, signed lease, Next Action Manager welcome approval.
- No welcome email before that separate approval.

In manager chat, type:

> Send welcome

Or tap Approve welcome email. If several signed files are waiting, include the
A-reference. Expect one email from worksambhav26@gmail.com to sambhavn8n@gmail.com
and a manager delivery confirmation. Check Spam/All Mail if needed.

The welcome says insurance, utilities and permanent entry arrangements will
follow. It doesn't provision a real lock or complete physical move-in.
Airtable then shows Complete move-in handoff, same R-row and matching A-reference.

Postgres remains authoritative if Airtable fails. A stale mirror is recoverable
with sync-airtable as an off-flow troubleshooting step, not a business approval.
The listing is generated static HTML; its availability won't change merely by
refreshing. Rebuild it during preparation for the next rehearsal, not mid-video.

## 14. Separate exception tests

After the happy path, test these on clearly separate demo records:

| Test | Expected |
|---|---|
| Ask for owner's phone / master code | Fixed human-review reply; manager alerted; no private fact or code released |
| Manager Send message: Water is included. | Grounded human-approved reply delivered without Reply gesture |
| Manager sends invented rent or private code | Send-time check blocks it; nothing delivered |
| Not that time on pending tour | No booking/code; resident asked for another time |
| Approve tour again after booking | No second booking; no matching pending item |
| Tour completed again | No second application follow-up |
| Old approval card after a newer request | Stale card rejected |
| Send to review on an application | Human handoff; no lease |
| Two pending approvals, then Approve | Clarification, no guessed action |
| Another Telegram account tries to approve | No state change; only configured manager is authorized |
| Send welcome twice | One welcome email |
| Provider failure | Visible manager/resident follow-up; no silent booking/code release |

Devon's existing fabricated MAPLE-5A mismatch fixture remains a separate
screening stop-path check: claimed/document 7800 versus canned Sandbox 4996.33,
about 56% variance and 2.56x ratio. No automated denial, adverse-action notice or
lease. A mismatch is a review fact, not proof of fraud.

## 15. Troubleshooting and final pass

Stop at the failed step. Keep its reference and timestamp; don't reset or create
several replacement applications before inspecting the execution.

| Symptom | First check |
|---|---|
| No first resident message | Configured recipient email, previously started prospect bot, new inquiry, WF1 execution |
| No new-lead manager notice | Correct manager chat, started manager bot, manager notification node result |
| No tour approval card | Requested slot exists; prequalification complete; WF5 execution |
| Manager says ambiguous | Supply the current R/A-reference; don't Reply to old cards |
| Approved but no booking | WF5 Cal.com result; calendar may have changed; don't blindly retry |
| No application link | Booked lead and current manager completion message; WF1 execution |
| Form 404 | Live tunnel, current link, active form after restart |
| No screening card | File extraction/Plaid/model execution; don't resubmit immediately |
| No signing email | Recorded approval, current recipient, envelope result, Spam/All Mail |
| Signed but welcome missing | Separate Send welcome approval and SMTP result |
| Mirror stale | Compare Postgres; recover mirror outside the resident flow |

Pass means the manager sees the lead from the start, every requested action
waits for its approval, normal messages work in both chats, no in-flow scripts
are used, and the real sandbox signature completes the approved handoff.

Save your references/screenshots. Preserve and reset only when nothing you want
to finish is still running. For the recording, start a fresh inquiry on a clean
listing. Don't show commands, n8n, credentials or developer verification tools.
