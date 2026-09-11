# Account Setup — Detailed Walkthrough

Step-by-step for the four accounts that need more than a copy-paste: **Telegram**, **Plaid**,
**Cal.com**, **DocuSign**.

`docs/stage-1-setup.md` is the short checklist. This is the long version, with the gotchas.

Everything here is free. No card required anywhere.

---

# 1. Telegram Bot

**Time:** 3 minutes · **Cost:** free · **What it gives us:** the manager's approval surface

### Step 1 — Create the bot

1. Open Telegram (phone or desktop)
2. Search for **`@BotFather`** — it has a blue verified check. Start a chat
3. Send: `/newbot`
4. BotFather asks for a **display name** — this is what shows in chats. Anything works:
   ```
   Leasing Demo
   ```
5. BotFather asks for a **username** — this **must end in `bot`** and must be globally unique.
   Try something like:
   ```
   sambhav_leasing_demo_bot
   ```
   If it's taken, BotFather says so and you try again.

6. BotFather replies with your token. It looks like:
   ```
   7823456789:AAFm3kQxYz-9pLmNoPqRsTuVwXyZ1234567
   ```

### Step 2 — Put the token in `.env`

```
TELEGRAM_BOT_TOKEN=7823456789:AAFm3kQxYz-9pLmNoPqRsTuVwXyZ1234567
```

> This token is a password. Anyone with it controls your bot. It's gitignored — keep it that way.

### Step 3 — Message your bot

Telegram will not let a bot message you first. You have to open the conversation.

1. Click the `t.me/<your_bot_username>` link BotFather sent you
2. Click **Start**, or just send `hi`

### Step 4 — Get your chat id

```bash
node scripts/get-telegram-chat-id.js
```

It prints your bot's name and the chats it can see, then writes `TELEGRAM_MANAGER_CHAT_ID`
into `.env` automatically.

### Gotchas

- **"No messages yet"** → you skipped Step 3. Send the bot a message and re-run.
- **"A webhook is registered"** → a Telegram Trigger workflow is already active. Telegram
  allows one webhook per bot and it blocks the polling API. Deactivate the workflow, re-run
  this, then reactivate.
- Optional polish for the demo: send BotFather `/setname`, `/setdescription`, or
  `/setuserpic` to make the bot look like a real product on camera.

---

# 2. Plaid Sandbox

**Time:** 3 minutes · **Cost:** free, always · **What it gives us:** real income verification

This is the most impressive part of the demo and it costs nothing. Sandbox usage is free
forever and supports unlimited test accounts.

### Step 1 — Sign up

1. Go to **https://dashboard.plaid.com/signup**
2. Sign up with email. **No credit card.**
3. It may ask what you're building — anything reasonable is fine, it doesn't gate Sandbox
4. Verify your email

### Step 2 — Get your keys

1. Go to **https://dashboard.plaid.com/developers/keys**
   (or in the dashboard: **Developers → Keys**)
2. You'll see:
   - **client_id** — one value, used for every environment
   - **Sandbox secret** — click to reveal
   - Production/other secrets — **ignore these**

### Step 3 — Fill `.env`

```
PLAID_CLIENT_ID=65f2a9b8c1d4e70012345678
PLAID_SANDBOX_SECRET=a1b2c3d4e5f60718293a4b5c6d7e8f
PLAID_ENV=sandbox
```

### Gotchas

- **Use the Sandbox secret, not Production.** They look similar. A Production secret against
  `sandbox.plaid.com` fails with an auth error.
- Sandbox does **no OCR or image processing**, which is why we use Plaid for income only and
  mock the identity-document check.
- Test credentials that will appear later in the build: username `user_good`, password
  `pass_good`, SSN last-4 `1234`. Payroll income in Sandbox only works with the `user_good`
  user and institution `ins_135842`.
- Optional: **Sandbox Studio** in the dashboard lets you poke at products without code.
  Useful for seeing the shape of a payroll income response before we wire it up.

---

# 3. Cal.com

**Time:** 5 minutes · **Cost:** free plan · **What it gives us:** tour booking

### Step 1 — Sign up

1. Go to **https://cal.com/signup**
2. Sign up. The onboarding asks for a username, timezone, and availability
3. Set your availability to something wide (e.g. 9am–6pm weekdays) — this is a demo, you
   want plenty of bookable slots on camera

### Step 2 — Create the tour event type

1. Go to **Event Types** → **New**
2. Fill in:
   - **Title:** `Unit Tour`
   - **URL slug:** `unit-tour`
   - **Duration:** `30` minutes
3. Save

### Step 3 — Get the event type ID

1. Click into the **Unit Tour** event type you just made
2. Look at the browser URL — it ends with the numeric id:
   ```
   https://app.cal.com/event-types/1234567?tabName=setup
                                    ^^^^^^^
   ```
3. That number is your event type ID

### Step 4 — Create an API key

1. Go to **Settings → Security → API keys**
   (direct: **https://app.cal.com/settings/developer/api-keys**)
2. Click **Add** / **New API key**
3. Give it a name, set expiry to **Never** (it's a demo — you don't want it dying mid-build)
4. Copy the key. It starts with `cal_`

### Step 5 — Fill `.env`

```
CALCOM_API_KEY=cal_live_a1b2c3d4e5f6...
CALCOM_EVENT_TYPE_ID=1234567
```

### Gotchas

- **API keys live under Security, not Developer** — easy to hunt for in the wrong place.
- Cal.com **cloud webhooks require HTTPS and reject private IPs.** A booking cannot reach
  `localhost:5678`. This is why the cloudflared tunnel is required before Stage 3.
- We'll register the booking webhook in Stage 3, once the tunnel URL exists. Leaving it
  until then is deliberate — the tunnel hostname changes on every run, and a webhook
  pointing at a dead hostname just fails silently.
- The key is shown once. If you lose it, delete and make a new one.

---

# 4. DocuSign Developer Sandbox

**Time:** ~15 minutes · **Cost:** free · **What it gives us:** lease e-signature

The longest one. Take it slowly — **step 5 shows you a private key exactly once**, and if you
close that window you have to start that part over.

### Step 1 — Create a developer account

1. Go to **https://developers.docusign.com**
2. Click **Create a free developer account** (or **Sign up**)
3. Fill in the form and verify your email
4. Set a password and log in

You land on the developer dashboard. This is a **demo** account — separate from production,
free, and every document it produces is watermarked.

### Step 2 — Open Apps and Keys

1. Click your **profile icon, top right**
2. Choose **My Apps and Keys**

Direct link: **https://apps-d.docusign.com/admin/apps-and-keys**

### Step 3 — Copy your two account GUIDs

At the top of this page, under **My Account Information**, you'll see:

- **User ID** — a GUID like `8f2c1e90-4a7b-11ee-be56-0242ac120002`
- **API Account ID** — a different GUID

Copy both now:

```
DOCUSIGN_USER_ID=8f2c1e90-4a7b-11ee-be56-0242ac120002
DOCUSIGN_ACCOUNT_ID=3b9d7f41-2c88-4a15-9e3d-7a1b4c5d6e7f
```

> These are two different values and they are easy to mix up. User ID is *who we impersonate*;
> Account ID is *which account the envelope belongs to*.

### Step 4 — Create the app

1. Click **Add App and Integration Key**
2. **App name:** `Leasing Demo`
3. Click **Create App**

You're now on the app's edit screen. The **Integration Key** (another GUID) is shown at the
top:

```
DOCUSIGN_INTEGRATION_KEY=a4f81b22-9c3e-4d15-b7a8-1e2f3c4d5e6f
```

### Step 5 — Generate the RSA keypair ⚠️

**Read this whole step before clicking.**

1. Scroll to the **Authentication** section
2. Click **Add RSA Keypair**
3. A modal appears showing a **public key** and a **private key** in plain text

**This modal is shown once. There is no reveal button later.** Once it closes, only the
keypair ID remains.

4. Copy the **private key** — the entire block, including these lines:
   ```
   -----BEGIN RSA PRIVATE KEY-----
   MIIEpAIBAAKCAQEA...
   ...
   -----END RSA PRIVATE KEY-----
   ```
5. Save it in the repo root as exactly:
   ```
   docusign-private.key
   ```
   It's gitignored — verify with `git check-ignore -v docusign-private.key` if you want to be sure.

6. Only now close the modal

> If you closed it too early: delete that keypair and click **Add RSA Keypair** again. No harm
> done, just redo the step.

### Step 6 — Add a redirect URI

Still on the app edit screen:

1. Find **Additional Settings** → **Redirect URIs**
2. Click **Add URI** and enter:
   ```
   http://localhost:5678/rest/oauth2-credential/callback
   ```
3. **Save**

With JWT grant this URI is only used during the one-time consent step, but DocuSign refuses
the consent flow without it.

### Step 7 — Grant consent (required — JWT fails without it)

JWT impersonation needs a one-time human consent. Skip this and every API call fails with
`consent_required`.

1. Take this URL and replace `<INTEGRATION_KEY>` with your actual key:

```
https://account-d.docusign.com/oauth/auth?response_type=code&scope=signature%20impersonation&client_id=<INTEGRATION_KEY>&redirect_uri=http://localhost:5678/rest/oauth2-credential/callback
```

2. Paste it into your browser
3. Log in with your DocuSign developer account if asked
4. Click **Allow** / **Accept**
5. The browser then tries to load `localhost:5678/rest/oauth2-credential/callback` and shows
   an error page or a blank screen

**That error is expected and fine.** The consent was recorded on DocuSign's side the moment
you clicked Accept. The redirect just has nowhere useful to land.

### Step 8 — Fill in the rest of `.env`

```
DOCUSIGN_INTEGRATION_KEY=a4f81b22-9c3e-4d15-b7a8-1e2f3c4d5e6f
DOCUSIGN_USER_ID=8f2c1e90-4a7b-11ee-be56-0242ac120002
DOCUSIGN_ACCOUNT_ID=3b9d7f41-2c88-4a15-9e3d-7a1b4c5d6e7f
DOCUSIGN_BASE_PATH=https://demo.docusign.net/restapi
DOCUSIGN_AUTH_BASE=https://account-d.docusign.com
DOCUSIGN_PRIVATE_KEY_PATH=docusign-private.key
```

The last three are already set correctly — don't change them. They point at the **demo**
environment; production uses different hosts.

### Gotchas

- **Every page is watermarked.** Expected on a developer account, and fine for a demo. Worth
  saying out loud when you record: "that watermark is the free developer sandbox."
- **`consent_required` error** → step 7 wasn't completed, or was done for a different
  integration key.
- **Undocumented recipient cap.** Developer accounts limit total recipients across envelopes
  within some window, and DocuSign won't say what the number is. Use a **small fixed set of
  test email addresses** rather than a new one each time. If you hit it, DocuSign support can
  lift it.
- **Going live later** requires 20 consecutive error-free demo API calls to certify the
  integration key, then a paid plan from ~$50/month. Good detail to mention to a prospect —
  it shows you know the production path.

---

# When all four are done

```bash
node scripts/setup-credentials.js
```

Then the tunnel and the gate:

```bash
node scripts/start-tunnel.js
node scripts/verify-stage-1.js --telegram
```

A Telegram message arriving means Stage 1 is complete.

### If something failed

`setup-credentials.js` reports each credential separately, so you'll see exactly which one
broke. Re-run it for just that one:

```bash
node scripts/setup-credentials.js docusign
```

Valid names: `postgres`, `smtp`, `imap`, `openai`, `telegram`, `airtable`, `calcom`,
`plaid`, `docusign`.
