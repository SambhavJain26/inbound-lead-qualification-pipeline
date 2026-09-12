/**
 * Minimal SMTP-over-TLS sender.
 *
 * Hand-rolled rather than pulling in nodemailer, so the project keeps zero npm
 * dependencies. It does exactly what the demo needs: implicit TLS on 465,
 * AUTH LOGIN, one message, one recipient set.
 *
 * This is used only to send demo mail AS THE PROSPECT. n8n does all real
 * outbound sending through its own SMTP credential.
 */

const tls = require("tls");
const crypto = require("crypto");

function b64(value) {
  return Buffer.from(String(value), "utf8").toString("base64");
}

/**
 * Runs a scripted SMTP conversation. Each step sends a line and waits for a
 * reply whose code is in `expect`; anything else rejects with the server's own
 * text, which is far more useful than a generic failure.
 */
function converse(socket, steps) {
  return new Promise((resolve, reject) => {
    let buffer = "";
    let index = 0;

    const timer = setTimeout(() => reject(new Error("SMTP timeout")), 30000);

    const done = (error, value) => {
      clearTimeout(timer);
      error ? reject(error) : resolve(value);
    };

    socket.on("error", (error) => done(error));

    socket.on("data", (chunk) => {
      buffer += chunk.toString("utf8");

      // A complete SMTP reply ends with "NNN " (space, not hyphen) on the last line.
      const match = buffer.match(/^(\d{3})(?: |\r?\n|$)/m);
      const lastLine = buffer.trim().split(/\r?\n/).pop() || "";
      if (!/^\d{3} /.test(lastLine)) return;

      const code = Number(lastLine.slice(0, 3));
      const step = steps[index];
      const text = buffer.trim();
      buffer = "";

      if (step.expect && !step.expect.includes(code)) {
        return done(new Error(`${step.label || "SMTP"}: ${text.split("\n").pop()}`));
      }

      index += 1;
      if (index >= steps.length) return done(null, text);

      const next = steps[index];
      if (next.send !== undefined) {
        socket.write(typeof next.send === "function" ? next.send() : next.send);
      }
    });
  });
}

/**
 * Sends one message.
 *
 * @param {object} options
 * @param {string} options.host      SMTP host
 * @param {number} options.port      465 (implicit TLS)
 * @param {string} options.user      login / envelope sender
 * @param {string} options.password  app password
 * @param {string} options.fromName  display name; the address is always `user`
 *                                   because Gmail rewrites a mismatched From
 * @param {string} options.to
 * @param {string} options.subject
 * @param {string} options.body      plain text
 * @param {string} [options.replyTo]
 * @param {string} [options.inReplyTo] message id being replied to
 * @returns {Promise<{messageId: string}>}
 */
async function sendMail(options) {
  const {
    host, port = 465, user, password, fromName, to, subject, body, replyTo, inReplyTo,
  } = options;

  const messageId = `<${crypto.randomUUID()}@${host.replace(/^smtp\./, "")}>`;

  const headers = [
    `From: ${fromName ? `"${fromName}" ` : ""}<${user}>`,
    `To: ${to}`,
    `Subject: ${subject}`,
    `Message-ID: ${messageId}`,
    `Date: ${new Date().toUTCString()}`,
    "MIME-Version: 1.0",
    'Content-Type: text/plain; charset="utf-8"',
  ];
  if (replyTo) headers.push(`Reply-To: ${replyTo}`);
  if (inReplyTo) {
    headers.push(`In-Reply-To: ${inReplyTo}`);
    headers.push(`References: ${inReplyTo}`);
  }

  // Dot-stuffing: a line that is just "." would otherwise terminate DATA early.
  const safeBody = body.replace(/\r?\n/g, "\r\n").replace(/^\./gm, "..");
  const message = `${headers.join("\r\n")}\r\n\r\n${safeBody}\r\n.\r\n`;

  const socket = tls.connect({ host, port, servername: host });

  await converse(socket, [
    { expect: [220], label: "greeting" },
    { send: "EHLO leasing.local\r\n", expect: [250], label: "EHLO" },
    { send: "AUTH LOGIN\r\n", expect: [334], label: "AUTH" },
    { send: `${b64(user)}\r\n`, expect: [334], label: "username" },
    { send: `${b64(password)}\r\n`, expect: [235], label: "password" },
    { send: `MAIL FROM:<${user}>\r\n`, expect: [250], label: "MAIL FROM" },
    { send: `RCPT TO:<${to}>\r\n`, expect: [250, 251], label: "RCPT TO" },
    { send: "DATA\r\n", expect: [354], label: "DATA" },
    { send: message, expect: [250], label: "message body" },
    { send: "QUIT\r\n", expect: [221], label: "QUIT" },
  ]);

  socket.destroy();
  return { messageId };
}

module.exports = { sendMail };
