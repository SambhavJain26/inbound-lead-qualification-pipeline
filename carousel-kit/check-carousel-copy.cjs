// Read-only editorial structure checks. This is not rendered-PDF design approval.
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const root = path.resolve(__dirname, '..');
const scriptsPath = 'docs/build-5-content-strategy/linkedin-post-scripts.md';
const scripts = fs.readFileSync(path.join(root, scriptsPath), 'utf8').replace(/\r\n/g, '\n');
const plan = fs.readFileSync(path.join(root,
  'docs/build-5-content-strategy/linkedin-content-plan.md'), 'utf8').replace(/\r\n/g, '\n');
const blueprint = fs.readFileSync(path.join(root,
  'docs/build-5-content-strategy/carousel-design-blueprint.md'), 'utf8').replace(/\r\n/g, '\n');
const baseline = execFileSync('git', ['show', '7acef8d:' + scriptsPath],
  { cwd: root, encoding: 'utf8' }).replace(/\r\n/g, '\n');
const section = (text, id) => text.match(new RegExp('^## ' + id +
  ' — [\\s\\S]*?(?=^## |$(?![\\s\\S]))', 'm'))?.[0];
const words = s => (s.match(/[\p{L}\p{N}]+(?:['’.-][\p{L}\p{N}]+)*/gu) || []).length;
const banned = /\b(delve|leverage|robust|seamless|supercharge|unlock|empower|revolutionize|synergy|ecosystem|journey|elevate|streamline|utilize|comprehensive|impactful|actionable|very|really|quite|rather|somewhat|essentially|basically|actually|simply)\b/i;
const expected = { 'B5-01': 10, 'B5-04': 9, 'B5-06': 9, 'B5-09': 11, 'B5-11': 10 };
const report = [];
const lengthWarnings = [];
for (const [id, count] of Object.entries(expected)) {
  const text = section(scripts, id);
  if (!text) throw new Error('Missing carousel ' + id);
  const slides = [...text.matchAll(/#### Slide (\d+)\s+Title: ([^\n]+)\s+Body: ([^\n]+)\s+Footer: ([^\n]+)\s+Visual: ([^\n]+)/g)];
  if (slides.length !== count || count < 7 || count > 11) throw new Error(id + ' page count');
  const brief = plan.match(new RegExp('^### ' + id + ' — [\\s\\S]*?(?=^### B5-|^## |$(?![\\s\\S]))', 'm'))?.[0];
  if (!brief?.includes('Format: PDF carousel, ' + count + ' slides.')) throw new Error(id + ' brief count');
  if (!plan.includes('| ' + id + ' | Carousel, ' + count + ' slides |')) throw new Error(id + ' index count');
  const marks = { box: 0, underline: 0, circle: 0, highlight: 0 };
  const designSection = blueprint.match(new RegExp('^### ' + id + ' — [\\s\\S]*?(?=^### |^## |$(?![\\s\\S]))', 'm'))?.[0];
  const designPages = [...(designSection || '').matchAll(/^\| (\d+)(?: — dark)? \| ([^|]+) \| ([^|]+) \|$/gm)];
  if (designPages.length !== count) throw new Error(id + ' design map page count');
  const lengths = slides.map((slide, index) => {
    if (Number(slide[1]) !== index + 1) throw new Error(id + ' slide sequence');
    const publicCopy = slide.slice(2, 5).join(' ');
    if (/\bbuild\s+0?\d+\b/i.test(publicCopy)) throw new Error(id + ' public build number');
    if (banned.test(publicCopy)) throw new Error(id + ' banned copy: ' + publicCopy.match(banned)[0]);
    const main = slide[2] + ' ' + slide[3], length = words(main);
    if (length < 20 || length > 35) lengthWarnings.push(id + ' slide ' + (index + 1) + ': review ' + length + ' words for value and readability');
    const annotations = [...slide[5].matchAll(/(Blue box|Blue underline|Blue circle|Gold highlight): “([^”]+)”/g)];
    const plannedMarks = [...designPages[index][3].matchAll(/(box|underline|circle|highlight): “([^”]+)”/g)].map(m => [m[1], m[2]]);
    const scriptMarks = annotations.map(m => [m[1].replace(/^(Blue|Gold) /, ''), m[2]]);
    if (JSON.stringify(plannedMarks) !== JSON.stringify(scriptMarks)) throw new Error(id + ' design map marks on page ' + (index + 1));
    if (annotations.length > 2) throw new Error(id + ' focal mark budget');
    for (const [, label, phrase] of annotations) {
      if (!main.toLowerCase().includes(phrase.toLowerCase())) throw new Error(id + ' missing marked phrase ' + phrase);
      const kind = label.replace(/^(Blue|Gold) /, '');
      marks[kind] += 1;
    }
    return length;
  });
  // Check a varied deck, not a device quota or a mark on every page.
  if (Object.values(marks).filter(n => n > 0).length < 3)
    throw new Error(id + ' annotation inventory');
  const caption = text.split('### LinkedIn post\n\n')[1].split('\n### Carousel slides')[0];
  if (banned.test(caption)) throw new Error(id + ' banned caption copy');
  const captionLength = words(caption.replace(/\[([^\]]+)\]\([^)]*\)/g, '$1'));
  if (captionLength < 80 || captionLength > 140) throw new Error(id + ' caption length');
  report.push({ id, pages: count, words: lengths, averageWords: Number((lengths.reduce((a,b)=>a+b,0) / count).toFixed(1)), captionWords: captionLength, marks });
}
const postIds = [...scripts.matchAll(/^## (B5-\d{2}) — /gm)].map(m => m[1]);
// Post IDs identify artifacts, not publishing slots. Retired IDs stay retired.
const activeIds = Array.from({ length: 12 }, (_, i) => 'B5-' + String(i + 1).padStart(2, '0')).concat('B5-15');
if (JSON.stringify(postIds) !== JSON.stringify(activeIds))
  throw new Error('Thirteen-post active order changed');
const briefIds = [...plan.matchAll(/^### (B5-\d{2}) — /gm)].map(m => m[1]);
const slots = [...plan.matchAll(/^\| (\d+) \| (B5-\d{2}) \| /gm)];
if (JSON.stringify(briefIds) !== JSON.stringify(activeIds) || slots.length !== activeIds.length ||
    slots.some((slot, i) => Number(slot[1]) !== i + 1 || slot[2] !== activeIds[i]))
  throw new Error('Active plan briefs/publishing slots differ from scripts');
const formats = postIds.map(id => section(scripts, id).match(/^Format: ([^.]+)\./m)?.[1]);
const counts = { carousels: formats.filter(f => f?.startsWith('carousel,')).length,
  text: formats.filter(f => f === 'text').length,
  fullVideo: formats.filter(f => f?.startsWith('one native video,')).length,
  shortVideo: formats.filter(f => f?.startsWith('one short,')).length };
if (counts.carousels !== 5 || counts.text !== 6 || counts.fullVideo !== 1 || counts.shortVideo !== 1)
  throw new Error('Expected five carousels, six text posts and two videos');
for (const id of postIds.filter(id => !(id in expected))) {
  if (section(scripts, id) !== section(baseline, id)) throw new Error('Non-carousel post changed: ' + id);
}
if (2400 * 24 / 12 !== 4800 || 2400 * 26 / 12 !== 5200 || 5000 - 4100 !== 900)
  throw new Error('Illustrative arithmetic');
console.log(JSON.stringify({ status: 'PASS: copy structure and preserved posts only; visual QA is separate',
  activePosts: postIds.length, formatCounts: counts,
  totalPages: report.reduce((n,d)=>n+d.pages,0), nonCarouselPostsPreserved: 8, lengthWarnings, report }, null, 2));
