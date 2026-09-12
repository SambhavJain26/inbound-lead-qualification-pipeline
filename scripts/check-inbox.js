/**
 * Lists recent messages in a mailbox over IMAP.
 *
 * Useful for proving mail actually arrived, and for debugging the Stage 3 IMAP
 * trigger without guessing from n8n's execution list.
 *
 * Usage:
 *   node scripts/check-inbox.js                 last 5 in the system mailbox
 *   node scripts/check-inbox.js --count 10
 *   node scripts/check-inbox.js --unseen        only unread
 *   node scripts/check-inbox.js --prospect      look at the prospect mailbox instead
 */

const { loadEnv } = require("./lib/env");
const { ImapClient } = require("./lib/imap");

const env = loadEnv();
const args = process.argv.slice(2);

function flagValue(name, fallback) {
  const index = args.indexOf(name);
  return index === -1 ? fallback : args[index + 1];
}

const useProspect = args.includes("--prospect");
const count = Number(flagValue("--count", 5));
const unseenOnly = args.includes("--unseen");

const mailbox = useProspect
  ? { user: env.PROSPECT_GMAIL_ADDRESS, password: env.PROSPECT_GMAIL_APP_PASSWORD, label: "prospect" }
  : { user: env.GMAIL_ADDRESS, password: env.GMAIL_APP_PASSWORD, label: "system" };

async function main() {
  if (!mailbox.user || !mailbox.password) {
    throw new Error(`${mailbox.label} mailbox credentials are not set in .env`);
  }

  const client = new ImapClient({
    host: useProspect ? env.PROSPECT_SMTP_HOST?.replace("smtp.", "imap.") || "imap.gmail.com"
                      : env.IMAP_HOST || "imap.gmail.com",
    port: Number(env.IMAP_PORT || 993),
    user: mailbox.user,
    password: String(mailbox.password).replace(/\s+/g, ""),
  });

  await client.connect();
  await client.login();
  const { exists } = await client.select("INBOX");

  console.log(`${mailbox.label} mailbox: ${mailbox.user}`);
  console.log(`INBOX holds ${exists} message(s)\n`);

  if (!exists) {
    await client.logout();
    return;
  }

  let range;
  if (unseenOnly) {
    const unseen = await client.search("UNSEEN");
    if (!unseen.length) {
      console.log("No unread messages.");
      await client.logout();
      return;
    }
    range = unseen.slice(-count).join(",");
  } else {
    range = `${Math.max(1, exists - count + 1)}:*`;
  }

  const messages = await client.fetchHeaders(range);

  for (const m of messages.reverse()) {
    console.log(`  ${m.date || "(no date)"}`);
    console.log(`  From:     ${m.from || "-"}`);
    if (m["reply-to"]) console.log(`  Reply-To: ${m["reply-to"]}`);
    console.log(`  Subject:  ${m.subject || "-"}`);
    console.log(`  Msg-ID:   ${m["message-id"] || "-"}`);
    console.log("");
  }

  await client.logout();
}

main().catch((error) => {
  console.error(`FAILED: ${error.message}`);
  process.exit(1);
});
