# Recording Checklist

What to have open, what to run, and what to say. The whole run is about seven minutes.

---

## Before you start

**Bring everything up**

```bash
docker compose up -d
node scripts/start-tunnel.js
node scripts/import-workflows.js
docker compose restart n8n
node scripts/register-calcom-webhook.js
node scripts/reset-demo.js --with-airtable
```

The tunnel hostname changes on every run, which is why the import and the Cal.com
registration come after it. Skipping `register-calcom-webhook.js` means tour bookings go
nowhere and **Cal.com will not tell you** — it fails silently.

**Verify before you hit record**

```bash
node scripts/verify-stage-1.js --telegram
node scripts/verify-credentials.js
```

**Tidy the screen**

- Prospect inbox: ideally an empty throwaway Gmail. Anything older on screen is a
  distraction, and a real inbox on camera is a privacy problem.
- Telegram: clear the chat with the bot so the demo's cards are the only ones visible.
- Cal.com: rename the event type to **Unit Tour** if you have not already — the prospect
  sees that title on the booking page.
- Close the n8n editor unless you plan to show it. A wall of nodes impresses engineers and
  loses property managers.

**Windows to arrange**

| Window | Shows |
|---|---|
| Prospect inbox | What the renter receives |
| Telegram | The manager's decision card |
| Airtable board | The lead moving through the pipeline |
| Terminal | Only if you want to show the commands |

---

## The run

### 1. The lead arrives — 30 seconds

```bash
node scripts/send-as-prospect.js lead
```

> "A renter finds the listing on Zillow at half ten at night and asks about parking and
> whether they can bring a dog. This is the email the property manager gets."

Wait for the reply to land in the prospect inbox. About a minute — the IMAP trigger polls.

### 2. The instant reply — the first real beat

Open the reply.

> "That came back without anyone being awake. Every number in it — the fifty dollar second
> parking space, the fifty pound weight limit, the thirty-five dollar pet fee — is from this
> property's own record. The system physically cannot make one up; if a figure isn't in the
> facts, the message is blocked before it sends."

> "And notice what it asks at the end, and how it asks it: *to check which units fit, rather
> than make a decision*. That wording is deliberate."

### 3. Pre-qualification

```bash
node scripts/send-as-prospect.js reply "Re: 412 Maple Street, Apt 2B, Springfield [R-xxxx]" "October 5th works for me. I make about \$5,000 a month gross. One small dog, 18 lbs. One car. Just me living there."
```

Replace `R-xxxx` with the token in the reply's subject line.

> "They answer in plain English. The system pulls out the move-in date, the income, the pet,
> the car, and the occupancy, and checks it against the manager's own criteria."

Show the Airtable board — the lead has moved to pre-qualified.

> "Nobody has been approved or turned down here. This is unverified, self-reported
> information, and it's only deciding whether a tour is worth booking."

### 4. Tour booked

Open the tour link from the email and book a slot.

> "Self-guided tour. They get a one-time entry code just before the slot. In a real
> deployment that comes from the smart lock; here it's simulated, and I'll show you exactly
> where that swap happens at the end."

Then:

```bash
curl -X POST "$TUNNEL/webhook/tour-completed" -H "Content-Type: application/json" -d '{"ref_token":"R-xxxx"}'
```

> "Tour's done, and the application link goes out on its own."

### 5. The application

```bash
node scripts/submit-application.js maya
```

> "Identity, address history, employer, income, occupants, pets, vehicles, the disclosures,
> and the FCRA consent that makes any of the checks legal. Plus a pay stub."

### 6. The clean approval — Telegram

Wait about forty seconds, then show the Telegram card.

> "Here's the whole file. Three income numbers: what she typed, what her pay stub says, and
> what her bank actually shows. They agree."

> "Underneath, every criterion with the evidence behind it. Not 'approved' — the system
> doesn't do that. It hands this to you and you decide."

Tap **Approve**.

### 7. The lease

> "Lease populated from verified data and sent for signature."

Show it arriving in the prospect inbox, sign it.

> "And that's it — unit marked leased, welcome packet out. The watermark is the free DocuSign
> developer account; production is the same API without it."

### 8. The moment that sells it — Devon

```bash
node scripts/submit-application.js devon
```

> "Now the same process with a different applicant."

Show the Telegram card.

> "His pay stub says seven thousand eight hundred a month. On paper that's four times the
> rent — he'd sail through. His actual payroll deposits say four thousand nine hundred and
> ninety-six. Fifty-six percent overstated."

> "A pay stub can be edited in a photo editor. A deposit history can't. Ninety-three percent
> of operators hit fraud last year and eighty-five percent saw falsified income documents —
> this is that, caught in about forty seconds."

> "And look at what the system does with it: nothing. It stops. It doesn't send him a
> rejection, because turning someone down over a background report is a formal legal process
> with notices and a waiting period. That's a decision for a person, so it hands it to you."

### 9. The diagram

Open `docs/architecture.excalidraw` (exported to PNG).

> "Green is running today. Amber is simulated, and it's labelled everywhere it appears —
> credit and eviction data needs a credentialed bureau contract, which is a licensing barrier
> rather than a money one. Grey underneath is what a real deployment puts in its place."

> "The shape doesn't change. That's the point."

---

## If something goes wrong

| Symptom | Cause | Fix |
|---|---|---|
| No reply to the lead email | IMAP polls; or the tunnel died | Wait a minute, then `node scripts/start-tunnel.js` and re-import |
| Tour booking does nothing | Cal.com webhook points at a dead tunnel | `node scripts/register-calcom-webhook.js` |
| Form 404s | Webhook registration lags a restart | Wait 20 seconds, submit again |
| Telegram card has no buttons | Old card from a previous run | Re-trigger; keyboards are baked in at send time |
| Airtable board is stale | Mirror failed or hit the free cap | `node scripts/sync-airtable.js` — Postgres is unaffected |

The pipeline never depends on Airtable. If the board is wrong, the demo is still fine.

---

## Things worth saying

- **"It never decides."** Say it early and let them test it. There is no approve button that
  fires automatically and no denial anywhere in the system.
- **"That's a real Plaid call."** Sandbox, but the same API thousands of fintech apps use.
  Most demos in this space mock income verification entirely.
- **"Nothing new for your team to learn."** No dashboard, no migration, no per-seat licence.
  It plugs into email and a messaging app they already have open.
- **HUD's 2024 guidance** says screening tools should *implement, rather than set* the
  provider's criteria. That's exactly this architecture, and it's worth naming if the
  prospect is sophisticated.
