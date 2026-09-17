# Recording Checklist

What to have open, what to run, and what to say. The whole run is about seven minutes.

**Hard recording rule:** every command in this checklist is preparation or an off-camera operator action. Start screen capture on the listing page. Never include a terminal, command prompt, script execution, Docker/tunnel startup, n8n editor, webhook setup, API console, database query or credential screen in the published video. Pause capture for an operator-only trigger, perform it off-camera, and resume on the labeled business-facing result.

For exact manual rehearsal inputs, current demo setup boundaries and outcome
checks, use [Full manual testing flow](manual-testing-flow.md). This recording
outline is not a substitute for that testing guide.

---

## Before you start

**Bring everything up**

```bash
docker compose up -d
node scripts/start-tunnel.js
node scripts/import-workflows.js
docker compose restart n8n
node scripts/register-calcom-webhook.js
node scripts/build-listing-site.js
node scripts/serve-listing-site.js --detach
node scripts/preserve-demo-evidence.js
node scripts/reset-demo.js --with-airtable
node scripts/build-listing-site.js
```

The tunnel hostname changes on every run, which is why the import and the Cal.com
registration come after it. Skipping `register-calcom-webhook.js` means tour bookings go
nowhere and **Cal.com will not tell you** — it fails silently.

The listing site does **not** depend on the tunnel: its contact form posts to local n8n. Only
rebuild it if you changed a unit.

Reset restores unit availability, so rebuild the listing site after a reset too.
See `docs/pipeline-board.md` for the board fields, views and mirror recovery.

**Verify before you hit record**

```bash
node scripts/verify-stage-1.js --telegram
node scripts/verify-credentials.js
```

`verify-credentials.js` must show **Telegram bots are distinct**. If both tokens are the same
bot, activating WF1 quietly steals the manager bot's webhook and every approve button stops
working — with no error anywhere.

**Tidy the screen**

- Prospect inbox: ideally an empty throwaway Gmail. It only carries the lease and the welcome
  packet now, but it is on camera in scene 7.
- Telegram: clear **both** chats — the leasing assistant and the manager bot — so the demo's
  messages are the only ones visible. There is no API for this; delete them by hand.
- Browser: have the listing site open at `http://localhost:8080` on a clean tab.
- Cal.com: rename the event type to **Unit Tour** if you have not already — the prospect
  sees that title on the booking page.
- Close the n8n editor before recording. It is not part of the LinkedIn demo.

**Windows to arrange**

| Window | Shows |
|---|---|
| Listing site | Where the renter starts |
| Telegram — leasing assistant | The renter's side of the conversation |
| Telegram — manager bot | The decision card, and any out-of-hours tour request |
| Airtable board | The lead moving through the pipeline |

The two Telegram chats are the heart of the demo, and keeping them visibly separate is the
point: the renter and the manager never share a conversation. If you are recording on one
screen, a phone for the renter's chat and the desktop app for the manager's reads best.

---

## The run

### 1. The renter finds the listing — 30 seconds

Open `http://localhost:8080`, scroll the two listings, open the two-bedroom.

> "This is the front door. Everything on this page — the rent, the deposit, the pet policy,
> the parking — comes out of one property record. Hold that thought, because the assistant is
> about to quote the same record."

Fill in the contact form as the renter, at half ten at night:

> *"Is parking included, and do you allow a small dog? Hoping to move early October."*

Hit **Send and continue on Telegram**.

### 2. The handoff — the first real beat

The confirmation page comes back with a reference and confirms that a message has been sent.
Switch to the renter's messages to continue.

> "The answer is already there. Nobody was awake."

Show the reply.

> "Every number in it — the fifty dollar second space, the fifty pound weight limit, the
> October 1st date — is from this property's own record. The system physically cannot make one
> up; if a figure isn't in the facts, the message is blocked before it sends and a person gets
> told."

> "And notice what it *didn't* ask. She said 'early October' on the listing page, so it already
> has the move-in date. It never asks the same question twice."

> "The question it does ask is fixed wording: *to check which units fit, not a decision*. The
> AI didn't write that sentence, and it didn't choose to ask it."

### 3. Pre-qualification, in the chat

Type as the renter, in the same chat:

> *"About $5,000 a month gross, just me with one car."*

> "Three facts in one sentence, the way people actually type. It files the income, the
> occupancy and the car, checks them against the manager's own criteria, and records its
> working — three point oh three times the rent, marked unverified."

Show the Airtable board moving to *Prequalified*.

> "Nobody has been approved or turned down. This is unverified, self-reported information and
> it's only deciding whether a tour is worth booking. If she hadn't been a fit she'd have been
> offered alternatives, not a refusal."

### 4. The tour books itself

Type a time, the way a renter would — pick one inside 9am-6pm and at least a day out:

> *"Can I come by next Tuesday at 2pm?"*

> "No link, no back-and-forth. It reads the real calendar and books a slot that actually
> exists."

Point at the time it booked.

> "And notice it tells you the time it booked. If two o'clock isn't free it takes the nearest
> real slot and says so — it doesn't quietly move you by half an hour and hope you don't check."

> "They get a one-time entry code for the slot. In a real deployment that comes from the smart
> lock; here it's simulated, and I'll show you exactly where that swap happens at the end."

**Optional, and it's a strong beat if you have the time.** Do it again from a second lead with
an out-of-hours time — *"Could I see it Thursday at 8pm? I work late."*

> "Nothing was booked. The manager published when self-guided tours can happen, and 8pm isn't
> in it — so it puts a hold on the slot and asks."

Show the card on the manager bot, tap **Approve tour**, show the confirmation arriving.

> "Ordinary bookings never wait for anyone. Only the unusual one does, and the rule deciding
> which is which was written down in advance."

Pause screen capture, trigger the simulated tour-completed event using the manual testing
runbook, then resume on the clearly labeled result and the application link. Do not show the
operator command or terminal.

> "Tour's done, and the application link goes out on its own — same chat."

### 5. The application

Open Maya's application link and complete the seven-section form on screen with the synthetic
values from the manual testing flow. Upload `fixtures/paystub-maya.pdf`. Do not use or show the
submission helper script in the recording.

> "Identity, address history, employer, income, occupants, pets, vehicles, the disclosures,
> and the FCRA consent that makes any of the checks legal. Plus a pay stub."

### 6. The clean approval — Telegram

Wait about forty seconds, then switch to the **manager** bot — a different chat, a different
bot from the one the renter has been talking to.

> "This is the first time a property manager has been involved at all. And note it's a
> separate chat — the renter and the manager never share a conversation."

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
| Contact form does nothing | n8n is down, or WF1 is not active | `docker compose ps`, then re-import and restart |
| Listing site will not load | Static server not running | `node scripts/serve-listing-site.js --detach` |
| No reply in the Telegram chat | Tunnel died, so the bot webhook points nowhere | `node scripts/start-tunnel.js`, re-import, restart n8n |
| Approve button does nothing | Both bot tokens are the same bot, so WF1 stole the manager webhook | `node scripts/verify-credentials.js` — check "bots are distinct" |
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
- **"It doesn't even decide what to ask."** The rules engine works out what is still
  outstanding and the question is fixed wording written in advance. The AI answers what was
  asked and pulls facts out of the reply. That is the whole of its job, and it is a stronger
  claim than most people expect from a chatbot.
- **"The listing site is the part you'd replace."** In a real deployment the renter arrives
  from Zillow or the company's own site. What happens after they hit send is identical — the
  system already handles leads arriving by email too.
- **"That's a real Plaid call."** Sandbox, but the same API thousands of fintech apps use.
  Most demos in this space mock income verification entirely.
- **"Nothing new for your team to learn."** No dashboard, no migration, no per-seat licence.
  It plugs into email and a messaging app they already have open.
- **HUD's 2024 guidance** says screening tools should *implement, rather than set* the
  provider's criteria. That's exactly this architecture, and it's worth naming if the
  prospect is sophisticated.
