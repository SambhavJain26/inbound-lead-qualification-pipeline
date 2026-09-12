/**
 * Sends demo mail AS THE PROSPECT, into the system mailbox.
 *
 * The lead email and any prospect reply must originate from a different account
 * than the one n8n reads. Gmail delivers self-addressed mail to INBOX as well as
 * Sent, so if the system mailbox sent these to itself the IMAP trigger would
 * re-process our own outbound mail.
 *
 * Usage:
 *   node scripts/send-as-prospect.js lead
 *       Sends the Zillow-format inquiry for Maya / MAPLE-2B.
 *
 *   node scripts/send-as-prospect.js reply "Re: subject line" "message body"
 *       Sends an arbitrary reply, e.g. answering the pre-qualification questions.
 *
 *   node scripts/send-as-prospect.js --dry-run lead
 *       Prints what would be sent without connecting.
 */

const { loadEnv } = require("./lib/env");
const { sendMail } = require("./lib/smtp");
const { leadEmail } = require("../fixtures/demo-data");

const env = loadEnv();
const dryRun = process.argv.includes("--dry-run");
const args = process.argv.slice(2).filter((a) => !a.startsWith("--"));
const mode = args[0] || "lead";

const FROM = env.PROSPECT_GMAIL_ADDRESS;
const PASSWORD = (env.PROSPECT_GMAIL_APP_PASSWORD || "").replace(/\s+/g, "");
const TO = env.GMAIL_ADDRESS;

function requireConfig() {
  const missing = [];
  if (!FROM) missing.push("PROSPECT_GMAIL_ADDRESS");
  if (!PASSWORD) missing.push("PROSPECT_GMAIL_APP_PASSWORD");
  if (!TO) missing.push("GMAIL_ADDRESS");

  if (missing.length) {
    console.error(`Missing in .env: ${missing.join(", ")}`);
    console.error("\nThe prospect account needs its own Gmail App Password (2FA required):");
    console.error("  https://myaccount.google.com/apppasswords");
    process.exit(1);
  }

  if (FROM.toLowerCase() === TO.toLowerCase()) {
    console.error(
      "PROSPECT_GMAIL_ADDRESS and GMAIL_ADDRESS are the same account.\n" +
        "They must differ, or the IMAP trigger will re-process our own outbound mail."
    );
    process.exit(1);
  }
}

function buildMessage() {
  if (mode === "lead") {
    return {
      // Gmail rewrites a From address that is not the authenticated user, so the
      // address is always the prospect account. The display name still reads as
      // the listing site, which is what appears in the inbox.
      fromName: leadEmail.from_name,
      replyTo: leadEmail.reply_to,
      subject: leadEmail.subject,
      body: leadEmail.body,
    };
  }

  if (mode === "reply") {
    const subject = args[1];
    const body = args[2];
    if (!subject || !body) {
      console.error('Usage: node scripts/send-as-prospect.js reply "Re: subject" "body text"');
      process.exit(1);
    }
    return { fromName: leadEmail.prospect_name, subject, body };
  }

  console.error(`Unknown mode "${mode}". Use "lead" or "reply".`);
  process.exit(1);
}

async function main() {
  const message = buildMessage();

  if (dryRun) {
    console.log(`From:    "${message.fromName}" <${FROM || "<unset>"}>`);
    console.log(`To:      ${TO || "<unset>"}`);
    if (message.replyTo) console.log(`Reply-To: ${message.replyTo}`);
    console.log(`Subject: ${message.subject}\n`);
    console.log(message.body);
    return;
  }

  requireConfig();

  const { messageId } = await sendMail({
    host: env.PROSPECT_SMTP_HOST || "smtp.gmail.com",
    port: Number(env.PROSPECT_SMTP_PORT || 465),
    user: FROM,
    password: PASSWORD,
    to: TO,
    ...message,
  });

  console.log(`Sent "${message.subject}"`);
  console.log(`  from ${FROM} -> ${TO}`);
  console.log(`  message-id ${messageId}`);
  console.log("\nThe IMAP trigger polls, so allow a few seconds before it appears in n8n.");
}

main().catch((error) => {
  console.error(`\nFAILED: ${error.message}`);
  process.exit(1);
});
