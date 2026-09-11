# Stage 1 — One-Time Setup

Everything that needs a human. Work through it once and the rest of the build runs
without coming back here.

Already done for you: Docker Compose stack, Postgres, n8n, encryption key, Postgres
password, and all the setup scripts.

---

## 0. Create the n8n owner account

Open **http://localhost:5678** and create the owner account when prompted. Local only —
use whatever email and password you like, it never leaves your machine.

This is the one thing that cannot be scripted.

---

## 1. OpenAI — the only paid item

1. https://platform.openai.com/api-keys → **Create new secret key**
2. Paste into `.env`:

```
OPENAI_API_KEY=sk-...
```

Expect a few dollars total for the whole build.

---

## 2. Telegram bot

1. Message **@BotFather** on Telegram → `/newbot` → pick a name and username
2. Copy the token into `.env`:

```
TELEGRAM_BOT_TOKEN=1234567890:AA...
```

3. Send your new bot any message (say "hi"), then run:

```bash
node scripts/get-telegram-chat-id.js
```

That writes `TELEGRAM_MANAGER_CHAT_ID` into `.env` for you.

---

## 3. Plaid — sandbox, free

1. Sign up at https://dashboard.plaid.com/signup
2. Go to **Developers → Keys**
3. Copy the **client_id** and the **Sandbox** secret (not Development, not Production):

```
PLAID_CLIENT_ID=...
PLAID_SANDBOX_SECRET=...
```

No card required. Sandbox is free and unlimited.

---

## 4. Cal.com — free plan

1. Sign up at https://cal.com
2. **Settings → Developer → API keys** → create one
3. Create an event type for tours (e.g. "Unit Tour", 30 min)

```
CALCOM_API_KEY=cal_live_...
```

`CALCOM_EVENT_TYPE_ID` gets filled in during Stage 3 — leave it blank for now.

---

## 5. DocuSign — developer sandbox, free

The fiddliest one. Fifteen minutes.

1. Sign up at https://developers.docusign.com → **Create a developer account**
2. Go to **Settings → Apps and Keys**
3. Note these two values from that page:
   - **User ID** (a GUID, under "My Account Information")
   - **API Account ID** (also a GUID)
4. Click **Add App and Integration Key**, name it anything
5. Under **Authentication**, pick **JWT** / Service Integration
6. Under **Service Integration**, click **Generate RSA** — you get a private key **once**.
   Save it to the repo root as `docusign-private.key` (already gitignored)
7. Add a redirect URI — `http://localhost:5678/rest/oauth2-credential/callback` works fine
8. Fill `.env`:

```
DOCUSIGN_INTEGRATION_KEY=<the Integration Key GUID>
DOCUSIGN_USER_ID=<User ID GUID>
DOCUSIGN_ACCOUNT_ID=<API Account ID GUID>
```

9. **Grant consent once** — open this in a browser, replacing the key, and click Accept:

```
https://account-d.docusign.com/oauth/auth?response_type=code&scope=signature%20impersonation&client_id=<DOCUSIGN_INTEGRATION_KEY>&redirect_uri=http://localhost:5678/rest/oauth2-credential/callback
```

You will land on a page that fails to load. That is expected — the consent is what matters.

> Keep a small fixed set of recipient email addresses for testing. Developer accounts have
> an undocumented cumulative recipient cap, and burning through it mid-build is annoying.

---

## 6. Airtable — display mirror only

1. https://airtable.com/create/tokens → **Create token**
2. Scopes: `schema.bases:write`, `data.records:read`, `data.records:write`
3. Grant it access to a new empty base
4. Copy the base id from its URL (`airtable.com/appXXXXXXXX/...`)

```
AIRTABLE_PAT=pat...
AIRTABLE_BASE_ID=app...
```

Remember this is a **mirror**, not the database. If it breaks, the pipeline keeps running.

---

## 7. Email — SMTP and IMAP

No Google Cloud project, no OAuth consent screen. Just an App Password.

1. Turn on **2-Step Verification** on the Gmail account if it is not already on —
   https://myaccount.google.com/security (required; App Passwords do not exist without it)
2. Go to https://myaccount.google.com/apppasswords
3. Create an app password, name it anything (e.g. "n8n leasing demo")
4. Copy the 16-character password — spaces don't matter, it works either way
5. Fill `.env`:

```
GMAIL_ADDRESS=you@gmail.com
GMAIL_APP_PASSWORD=abcd efgh ijkl mnop
```

Host and port defaults are already set (`smtp.gmail.com:465`, `imap.gmail.com:993`).

6. Set where demo mail should land while testing:

```
DEMO_RECIPIENT_EMAIL=your-test-inbox@gmail.com
DEMO_FROM_EMAIL=the-gmail-above@gmail.com
```

That's it — `setup-credentials.js` creates both credentials for you. Because it's plain
SMTP/IMAP, this also works with any other mailbox provider, which matters for a real
client deployment.

> Note: Gmail stopped accepting plain account passwords for IMAP/SMTP in May 2022. The App
> Password is the supported path, and it still works in 2026.

---

## 8. Import everything into n8n

Once every value above is in `.env`:

```bash
node scripts/setup-credentials.js
```

That creates **every** credential — Postgres, SMTP, IMAP, OpenAI, Telegram, Airtable,
Cal.com, Plaid and DocuSign. It reports each one separately, so a single failure does not
block the rest. Nothing has to be typed into the n8n credential screens.

---

## 9. Tunnel

Needed for Telegram Trigger, Cal.com webhooks, and DocuSign Connect:

```bash
node scripts/start-tunnel.js
```

It gets a hostname, writes it into `.env`, and recreates the n8n container.

**The hostname changes every run.** After any tunnel death or Docker restart, run it again
and re-import the workflows that own inbound webhooks.

---

## 10. Verify

```bash
node scripts/verify-stage-1.js --telegram
```

All checks pass and a Telegram message arrives → Stage 1 is done.

---

## Daily commands after this

```bash
docker compose up -d                  # start the stack
node scripts/start-tunnel.js          # fresh tunnel, recreates n8n
node scripts/verify-stage-1.js        # confirm everything is alive
docker compose logs -f n8n            # watch n8n
docker compose down                   # stop
```

## Notes

- The Python task runner warning in the n8n logs is expected and harmless — the workflows
  use JavaScript Code nodes.
- Postgres is on host port **5433**, not 5432, to avoid clashing with any local install.
- Never change `N8N_ENCRYPTION_KEY` once credentials exist; they become unreadable.
