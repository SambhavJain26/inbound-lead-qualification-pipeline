/**
 * Minimal IMAP-over-TLS client.
 *
 * Hand-rolled to keep the project dependency-free. Enough to log in, select a
 * mailbox, search, and fetch headers - which is all the demo tooling needs for
 * checking that mail actually arrived.
 *
 * n8n does the real inbound handling through its own IMAP credential; this is
 * for verification and debugging from the command line.
 */

const tls = require("tls");

class ImapClient {
  constructor({ host, port = 993, user, password, timeoutMs = 20000 }) {
    Object.assign(this, { host, port, user, password, timeoutMs });
    this.tag = 0;
    this.buffer = "";
    this.pending = null;
  }

  connect() {
    return new Promise((resolve, reject) => {
      this.socket = tls.connect({ host: this.host, port: this.port, servername: this.host });

      const onError = (error) => reject(error);
      this.socket.once("error", onError);

      this.socket.on("data", (chunk) => {
        this.buffer += chunk.toString("utf8");
        if (!this.pending) {
          // Server greeting.
          if (/^\* (OK|PREAUTH)/m.test(this.buffer)) {
            this.buffer = "";
            this.socket.off("error", onError);
            resolve();
          }
          return;
        }

        const { tag, resolve: done, reject: fail, timer } = this.pending;
        const completion = new RegExp(`^${tag} (OK|NO|BAD)(.*)$`, "m");
        const match = this.buffer.match(completion);
        if (!match) return;

        clearTimeout(timer);
        const response = this.buffer;
        this.buffer = "";
        this.pending = null;

        if (match[1] === "OK") done(response);
        else fail(new Error(`${match[1]}${match[2]}`));
      });
    });
  }

  /** Sends one command and resolves with the full untagged + tagged response. */
  command(text) {
    return new Promise((resolve, reject) => {
      this.tag += 1;
      const tag = `a${this.tag}`;
      const timer = setTimeout(
        () => reject(new Error(`IMAP timeout on: ${text.split(" ")[0]}`)),
        this.timeoutMs
      );
      this.pending = { tag, resolve, reject, timer };
      this.socket.write(`${tag} ${text}\r\n`);
    });
  }

  login() {
    // Quoted so a password containing spaces still works.
    return this.command(`LOGIN "${this.user}" "${this.password}"`);
  }

  async select(mailbox = "INBOX") {
    const response = await this.command(`SELECT "${mailbox}"`);
    const exists = response.match(/^\* (\d+) EXISTS/m);
    return { exists: exists ? Number(exists[1]) : 0 };
  }

  /** Returns message sequence numbers matching an IMAP search key. */
  async search(criteria = "ALL") {
    const response = await this.command(`SEARCH ${criteria}`);
    const line = response.match(/^\* SEARCH([^\r\n]*)/m);
    if (!line || !line[1].trim()) return [];
    return line[1].trim().split(/\s+/).map(Number);
  }

  /** Fetches selected headers for a sequence range, e.g. "5:*". */
  async fetchHeaders(range, fields = ["FROM", "TO", "SUBJECT", "DATE", "MESSAGE-ID", "REPLY-TO"]) {
    const response = await this.command(
      `FETCH ${range} (BODY.PEEK[HEADER.FIELDS (${fields.join(" ")})])`
    );

    const messages = [];
    // Each message arrives as "* N FETCH (... {len}\r\n<headers>)".
    const blocks = response.split(/^\* \d+ FETCH /m).slice(1);

    for (const block of blocks) {
      const headers = {};
      let lastKey = null;

      for (const line of block.split(/\r?\n/)) {
        if (/^\)/.test(line) || /^a\d+ OK/.test(line)) break;
        if (/^\s/.test(line) && lastKey) {
          headers[lastKey] += ` ${line.trim()}`;
          continue;
        }
        const match = line.match(/^([A-Za-z-]+):\s*(.*)$/);
        if (match) {
          lastKey = match[1].toLowerCase();
          headers[lastKey] = match[2].trim();
        }
      }

      if (Object.keys(headers).length) messages.push(headers);
    }
    return messages;
  }

  /** Fetches the plain-text body of one message by sequence number. */
  async fetchBody(seq) {
    const response = await this.command(`FETCH ${seq} (BODY.PEEK[TEXT])`);
    // The literal payload starts after the "{<length>}" marker and its CRLF.
    const marker = response.match(/\{\d+\}\r?\n/);
    if (!marker) return "";
    const body = response.slice(marker.index + marker[0].length);
    // Trim the IMAP framing that follows the literal.
    return body.replace(/\r?\n\)\r?\n[\s\S]*$/, "").trim();
  }

  async logout() {
    try {
      await this.command("LOGOUT");
    } catch {
      /* server may close first */
    }
    this.socket.destroy();
  }
}

module.exports = { ImapClient };
