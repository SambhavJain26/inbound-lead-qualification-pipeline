// Public prose comes from Markdown; diagram labels explain the same build.
const fs = require('fs'), path = require('path');
const root = path.resolve(__dirname, '../..'), kit = path.join(root, 'carousel-kit');
const source = fs.readFileSync(path.join(root, 'docs/build-5-content-strategy/technical-retrospective-carousel.md'), 'utf8').replaceAll('\r\n', '\n');
const esc = s => s.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const paths = {
  circle: '<svg viewBox="0 0 300 100" preserveAspectRatio="none"><path d="M23,52 C20,20 88,6 160,7 C238,8 286,25 283,53 C280,81 210,95 138,94 C66,93 20,79 17,49 C15,32 32,19 58,11"/><path d="M43,13 C115,1 215,11 269,31 C293,40 296,59 273,73" opacity=".65"/></svg>',
  under: '<svg viewBox="0 0 300 20" preserveAspectRatio="none"><path d="M4,12 C62,3 148,4 214,9 C250,12 274,12 296,7"/><path d="M12,18 C72,10 150,11 222,15" opacity=".55"/></svg>',
  strike: '<svg viewBox="0 0 300 12" preserveAspectRatio="none"><path d="M2,7 C74,3 168,10 298,4"/></svg>',
};
function a(text, type, color = 'blue') {
  const s = esc(text);
  if (type === 'hl') return `<span class="hl${color === 'blue' ? ' hl--blue' : ''}">${s}</span>`;
  if (type === 'sel') return `<span class="sel${color === 'gold' ? ' sel--gold' : ''}">${s}<i></i><i></i><i></i><i></i></span>`;
  return `<span class="pen pen--${type} pen--${color}">${s}${paths[type]}</span>`;
}
const chain = (nodes) => `<div class="v-chain v-chain--${nodes.length}">${nodes.map((n, i) => `${i ? '<div class="v-arrow">→</div>' : ''}<div class="v-node">${n}</div>`).join('')}</div>`;
const lane = (label, content) => `<div class="v-lane"><div class="v-label">${label}</div>${content}</div>`;
const table = (headers, rows, cls = '') => `<table class="v-table ${cls}"><thead><tr>${headers.map(x => `<th>${x}</th>`).join('')}</tr></thead><tbody>${rows.map(row => `<tr>${row.map(x => `<td>${x}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
const steps = (rows) => `<ol class="v-steps">${rows.map((r, i) => `<li><b>${String(i + 1).padStart(2, '0')}</b><h3>${r[0]}</h3><p>${r[1]}</p></li>`).join('')}</ol>`;

const diagrams = {
  2: steps([['Move fast', 'Slow replies lose renters to competitors.'], [a('Verify thoroughly', 'hl', 'gold'), 'Rushing invites fake pay stubs and evictions.']]),
  3: lane('Front of funnel', chain(['Inquiry', 'Grounded Q&A', a('Approved tour', 'hl', 'gold')])) + lane('Underwriting', chain(['Application', 'Verify income', 'Manager signs'])) + '<div class="v-rail">Every rental decision and lease send requires human approval.</div>',
  4: `<div class="v-columns"><div class="v-column"><h3>AI assists</h3><p>Answer property facts</p><p>Read uploaded pay stubs</p><p>Draft status messages</p></div><div class="v-column"><h3>Manager decides</h3><p>Review income proof</p><p>Set rental criteria</p><p>${a('Approve every lease', 'sel', 'blue')}</p></div></div>`,
  5: steps([['Stated income', 'What the applicant typed on the form.'], [a('Document income', 'under', 'blue'), 'What the pay stub PDF actually states.'], ['Verified payroll', 'Direct deposit data from verified bank records.']]),
  6: lane('The gap', chain(['Stated income', 'Assistant echoes', 'Safety block'])) + `<p class="v-gap">${a('Unlisted figure blocked', 'under', 'gold')}</p>` + lane('The fix', chain(['Stated income', a('Allow user figures', 'sel', 'blue'), 'Send reply'])),
  7: lane('The bug', chain(['Send link', 'Markdown parse', a('Unclosed tag', 'strike', 'gold')])) + lane('The fix', chain(['Escape text', a('Pin HTML mode', 'hl', 'blue'), 'Link delivered'])) + '<p class="v-quiet">An underscore in the link token was read as formatting.</p>',
  8: table(['Screening outcome', 'Workflow action'], [['Meets all criteria', 'Ready for manager'], ['Income mismatch', a('Flag for review', 'hl', 'gold')], ['Criteria not met', a('Stop for human review', 'under', 'blue')]], 'v-results'),
  9: `<div class="v-route"><p>The question</p><p class="v-route-arrow">↓</p><p>The ${a('user reply', 'circle', 'gold')}</p><p class="v-route-arrow">↓</p><p>The ${a('guardrail check', 'under', 'blue')}</p><p class="v-route-arrow">↓</p><p>The verified delivery</p></div>`,
  10: table(['I checked', 'Recorded behavior'], [['Grounded answers', 'Only verified facts quoted'], ['Income mismatch', a('Flagged with three numbers', 'under', 'blue')], ['Link delivery', 'HTML token links sent intact'], ['Repeated approval', a('No duplicate lease sent', 'hl', 'gold')]], 'v-results'),
  11: steps([['Multi-applicant files', 'Evaluate combined household income and co-signers.'], ['Conversational reschedule', 'Manage tour cancellations and changes in chat.'], [a('Interrupted send recovery', 'hl', 'gold'), 'Reconcile webhook delivery if logging is interrupted.']]),
};

const titleMarks = {
  1: [],
  2: ['vacancy', 'under', 'blue'],
  3: ['lease', 'hl', 'blue'],
  4: ['decides', 'hl', 'gold'],
  5: ['three', 'circle', 'gold'],
  8: ['person', 'sel', 'blue'],
  11: ['next', 'circle', 'blue']
};

const slides = [...source.matchAll(/### Slide (\d+)\n\n\*\*Title:\*\* ([^\n]+)\n\n\*\*Body:\*\* ([^\n]+)\n\n\*\*Footer:\*\* ([^\n]+)/g)];
if (slides.length !== 11) throw Error('Expected eleven slide fields, found: ' + slides.length);

const shells = slides.map(m => {
  const n = +m[1], title = m[2], body = m[3], footer = m[4];
  let h = esc(title);
  if (titleMarks[n]?.length) {
    const [word, type, color] = titleMarks[n];
    if (!h.includes(word)) throw Error('Missing title mark: ' + word + ' in ' + h);
    h = h.replace(word, a(word, type, color));
  }
  if (n === 5) h = h.replace('</span> income', '</span><br>income');
  if (n === 7) h = h.replace('broke ', 'broke<br>');
  let content;
  if (n === 1) {
    h = 'Fast leasing<br>without the<br><span class="pay pen pen--under pen--gold">shortcuts' + paths.under + '</span>';
    content = `<h1 class="display v-cover">${h}</h1><p class="tech-copy">${esc(body)}</p>`;
  } else {
    const heading = `<h2 class="tech-title">${h}</h2>`, copy = `<p class="tech-copy">${esc(body)}</p>`, visual = `<div class="v-visual">${diagrams[n]}</div>`;
    content = heading + visual + copy;
  }
  return `<section class="slide technical technical--visual${n === 9 ? ' slide--invert' : ''}" data-slide="${n}"><div class="eyebrow"><span>BUILD NOTES · LEASING &amp; TENANT SCREENING</span></div><div class="body">${content}</div><div class="footer"><span>${esc(footer)}</span><b>${String(n).padStart(2, '0')}</b></div></section>`;
});

const snapScript = `<script>
(function () {
  var UNIT = 24, PHASE = 71.5;
  document.querySelectorAll('.slide').forEach(function (slide) {
    var body = slide.querySelector('.body');
    if (!body) { return; }
    var host = body.querySelector('.display, .lead, .head, .group, .lead-in, .claim, .fig, .close-lead, .pay, .checks li, .tech-title');
    if (!host) { host = body.firstElementChild; }
    if (!host) { return; }

    var probe = document.createElement('span');
    probe.style.cssText = 'display:inline-block;width:0;height:0;overflow:hidden';
    host.insertBefore(probe, host.firstChild);
    var baseline = probe.getBoundingClientRect().bottom - slide.getBoundingClientRect().top;
    probe.remove();

    var delta = Math.round((baseline - PHASE) / UNIT) * UNIT + PHASE - baseline;
    body.style.transform = 'translateY(' + delta.toFixed(2) + 'px)';
  });
})();
</script>`;

const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Fast leasing without the shortcuts</title><link rel="preconnect" href="https://api.fontshare.com"><link rel="preconnect" href="https://cdn.fontshare.com" crossorigin><link href="https://api.fontshare.com/v2/css?f[]=switzer@400,500,600,700,800,900&display=swap" rel="stylesheet"><link href="https://api.fontshare.com/v2/css?f[]=zodiak@700,701,800,801&display=swap" rel="stylesheet"><link href="carousel-template.css" rel="stylesheet"></head><body>${shells.join('\n')}${snapScript}</body></html>`;

const out = path.join(kit, 'technical-retrospective-leasing-screening.html');
fs.writeFileSync(out, html);
console.log('Generated: ' + out);
