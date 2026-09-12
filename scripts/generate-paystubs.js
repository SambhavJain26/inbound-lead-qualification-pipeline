/**
 * Generates the two fixture paystub PDFs.
 *
 * Written as raw PDF rather than pulling in a PDF library, because the project
 * has no npm dependencies and a one-page text document does not need one. The
 * output is real, valid PDF: n8n's Extract from File node reads it, and it
 * looks like a paystub on screen during the demo.
 *
 * EVERYTHING IN THESE DOCUMENTS IS FABRICATED - employers, names, amounts, and
 * the deliberately wrong figure on Devon's stub.
 *
 * Usage:
 *   node scripts/generate-paystubs.js
 */

const fs = require("fs");
const path = require("path");
const { REPO_ROOT } = require("./lib/env");
const { applicants } = require("../fixtures/demo-data");

const FIXTURE_DIR = path.join(REPO_ROOT, "fixtures");

/** Escapes the three characters that are special inside a PDF string literal. */
function pdfString(text) {
  return String(text).replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

function money(value) {
  return `$${Number(value).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Builds the page content stream. `lines` is a list of
 * { text, x, y, size, font } drawing instructions.
 */
function contentStream(lines, rules) {
  const parts = [];

  for (const rule of rules) {
    parts.push(`${rule.w || 0.5} w`);
    parts.push(`${rule.x1} ${rule.y} m ${rule.x2} ${rule.y} l S`);
  }

  for (const line of lines) {
    parts.push("BT");
    parts.push(`/${line.font || "F1"} ${line.size || 10} Tf`);
    parts.push(`${line.x} ${line.y} Td`);
    parts.push(`(${pdfString(line.text)}) Tj`);
    parts.push("ET");
  }

  return parts.join("\n");
}

/** Assembles a single-page PDF with a correct xref table. */
function buildPdf(stream) {
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] " +
      "/Resources << /Font << /F1 5 0 R /F2 6 0 R >> >> /Contents 4 0 R >>",
    `<< /Length ${Buffer.byteLength(stream, "latin1")} >>\nstream\n${stream}\nendstream`,
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>",
  ];

  let pdf = "%PDF-1.4\n";
  const offsets = [];

  objects.forEach((body, index) => {
    offsets.push(Buffer.byteLength(pdf, "latin1"));
    pdf += `${index + 1} 0 obj\n${body}\nendobj\n`;
  });

  const xrefOffset = Buffer.byteLength(pdf, "latin1");
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (const offset of offsets) {
    pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\n`;
  pdf += `startxref\n${xrefOffset}\n%%EOF\n`;

  return Buffer.from(pdf, "latin1");
}

function buildPaystub(applicant) {
  const stub = applicant.paystub;
  const gross = stub.gross_this_period;

  // Plausible deduction breakdown. These are demo numbers, not tax advice.
  const federal = Math.round(gross * 0.114 * 100) / 100;
  const state = Math.round(gross * 0.041 * 100) / 100;
  const fica = Math.round(gross * 0.0765 * 100) / 100;
  const medical = 48.2;
  const totalDeductions = Math.round((federal + state + fica + medical) * 100) / 100;
  const net = Math.round((gross - totalDeductions) * 100) / 100;

  const ytdFactor = 18; // mid-year-ish, keeps YTD looking sane
  const L = 60;   // left column
  const R = 340;  // right column
  const lines = [];
  const rules = [];

  lines.push({ text: stub.employer, x: L, y: 730, size: 18, font: "F2" });
  lines.push({ text: "Earnings Statement", x: L, y: 710, size: 11 });
  lines.push({ text: "PAYROLL ADVICE - NON NEGOTIABLE", x: R + 40, y: 730, size: 8 });
  rules.push({ x1: L, x2: 552, y: 700, w: 1 });

  lines.push({ text: "Employee", x: L, y: 680, size: 9, font: "F2" });
  lines.push({ text: stub.employee, x: L, y: 666, size: 10 });
  lines.push({ text: `Employee ID: EMP-${applicant.ref_token.replace("A-", "")}`, x: L, y: 652, size: 9 });
  lines.push({ text: `SSN: XXX-XX-${applicant.ssn_last4}`, x: L, y: 638, size: 9 });

  lines.push({ text: "Pay Period", x: R, y: 680, size: 9, font: "F2" });
  lines.push({ text: `${stub.pay_period_start}  to  ${stub.pay_period_end}`, x: R, y: 666, size: 10 });
  lines.push({ text: `Pay Frequency: ${stub.pay_frequency}`, x: R, y: 652, size: 9 });
  lines.push({ text: `Pay Date: ${stub.pay_period_end}`, x: R, y: 638, size: 9 });
  rules.push({ x1: L, x2: 552, y: 624 });

  lines.push({ text: "EARNINGS", x: L, y: 604, size: 10, font: "F2" });
  lines.push({ text: "Description", x: L, y: 586, size: 9, font: "F2" });
  lines.push({ text: "Hours", x: 250, y: 586, size: 9, font: "F2" });
  lines.push({ text: "This Period", x: 350, y: 586, size: 9, font: "F2" });
  lines.push({ text: "Year to Date", x: 460, y: 586, size: 9, font: "F2" });
  rules.push({ x1: L, x2: 552, y: 578 });

  lines.push({ text: "Regular", x: L, y: 562, size: 10 });
  lines.push({ text: "80.00", x: 250, y: 562, size: 10 });
  lines.push({ text: money(gross), x: 350, y: 562, size: 10 });
  lines.push({ text: money(gross * ytdFactor), x: 460, y: 562, size: 10 });

  rules.push({ x1: 340, x2: 552, y: 546 });
  lines.push({ text: "Gross Pay", x: L, y: 532, size: 10, font: "F2" });
  lines.push({ text: money(gross), x: 350, y: 532, size: 10, font: "F2" });
  lines.push({ text: money(gross * ytdFactor), x: 460, y: 532, size: 10, font: "F2" });

  lines.push({ text: "DEDUCTIONS", x: L, y: 498, size: 10, font: "F2" });
  rules.push({ x1: L, x2: 552, y: 488 });

  const deductions = [
    ["Federal Income Tax", federal],
    ["State Income Tax", state],
    ["Social Security / Medicare", fica],
    ["Medical - Employee Portion", medical],
  ];

  let y = 472;
  for (const [label, amount] of deductions) {
    lines.push({ text: label, x: L, y, size: 10 });
    lines.push({ text: money(amount), x: 350, y, size: 10 });
    lines.push({ text: money(amount * ytdFactor), x: 460, y, size: 10 });
    y -= 18;
  }

  rules.push({ x1: 340, x2: 552, y: y + 6 });
  y -= 8;
  lines.push({ text: "Total Deductions", x: L, y, size: 10, font: "F2" });
  lines.push({ text: money(totalDeductions), x: 350, y, size: 10, font: "F2" });

  y -= 34;
  rules.push({ x1: L, x2: 552, y: y + 18, w: 1 });
  lines.push({ text: "NET PAY", x: L, y, size: 12, font: "F2" });
  lines.push({ text: money(net), x: 350, y, size: 12, font: "F2" });

  y -= 40;
  lines.push({
    text: `Direct deposit to account ending ${applicant.ssn_last4} - ${money(net)}`,
    x: L,
    y,
    size: 9,
  });

  lines.push({
    text: "SAMPLE DOCUMENT - GENERATED FOR DEMONSTRATION. NOT A REAL PAYROLL RECORD.",
    x: L,
    y: 90,
    size: 8,
  });
  lines.push({
    text: `${stub.employer} - Payroll Services - Springfield`,
    x: L,
    y: 76,
    size: 8,
  });

  return buildPdf(contentStream(lines, rules));
}

function main() {
  fs.mkdirSync(FIXTURE_DIR, { recursive: true });

  for (const applicant of applicants) {
    const pdf = buildPaystub(applicant);
    const outPath = path.join(FIXTURE_DIR, `paystub-${applicant.key}.pdf`);
    fs.writeFileSync(outPath, pdf);

    const stub = applicant.paystub;
    console.log(
      `${path.relative(REPO_ROOT, outPath).padEnd(28)} ` +
        `${stub.employee.padEnd(16)} ` +
        `${money(stub.gross_this_period)} ${stub.pay_frequency} ` +
        `-> implies ${money(stub.implied_monthly)}/mo  (${pdf.length} bytes)`
    );
  }

  console.log(
    "\nMaya's stub agrees with Plaid Sandbox ($4,996/mo). Devon's does not - it claims\n" +
      "$7,800/mo against $4,996/mo of actual payroll deposits."
  );
}

main();
