// Compare local carousel sources without editing reference projects.
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { createRequire } = require('node:module');
const { execFileSync } = require('node:child_process');
const runtime = createRequire(path.join(process.env.CAROUSEL_NODE_MODULES ||
  'C:/Users/jains/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules', '_assessment.cjs'));
const { chromium } = runtime('playwright');
const sharp = runtime('sharp');
const reviewRoot = path.resolve(__dirname, '../tmp/carousel-comparison');
const snapshot = path.join(reviewRoot, 'leasing-v1.html');
fs.mkdirSync(reviewRoot, { recursive: true });
if (!fs.existsSync(snapshot)) {
  // Use the actual first proof even on a fresh checkout after the redesign.
  for (const [file, target] of [['b5-01-inquiry-to-lease.html', snapshot],
    ['carousel-template.css', path.join(reviewRoot, 'carousel-template.css')]]) {
    fs.writeFileSync(target, execFileSync('git', ['show', '8c016e9:carousel-kit/' + file],
      { cwd: path.resolve(__dirname, '..') }));
  }
}
const vendorRoot = 'D:/codex_projects/automation_projects/vendor-coi-chasing/docs/carousels';
const sources = ['post-01-what-ai-should-touch', 'post-04-what-ai-reading-costs',
  'post-07-twelve-things-wrong', 'post-13-questions-to-ask'].map(n => path.join(vendorRoot, n + '.html'));
sources.push(snapshot);
if (process.argv.includes('--current')) sources.push(path.join(__dirname, 'b5-01-inquiry-to-lease.html'));

(async () => {
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CAROUSEL_BROWSER ||
    'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  const results = [];
  try {
    for (const source of sources) {
      const page = await browser.newPage({ viewport: { width: 1080, height: 1350 } });
      await page.goto(pathToFileURL(source).href, { waitUntil: 'networkidle' });
      // The old combined family link can omit Zodiak. Load the same intended
      // face in this read-only rendering session; never edit vendor source files.
      await page.addStyleTag({ url: 'https://api.fontshare.com/v2/css?f[]=zodiak@700,701,800,801&display=swap' });
      await page.evaluate(async () => {
        await Promise.all([document.fonts.load('900 96px Switzer'),
          document.fonts.load('italic 800 192px Zodiak')]);
        await document.fonts.ready;
        const snap = [...document.scripts].find(s => s.textContent.includes('var UNIT = 24'));
        if (snap) (0, eval)(snap.textContent);
      });
      const slides = await page.evaluate(() => [...document.querySelectorAll('.slide')].map((slide, i) => {
        const body = slide.querySelector('.body'), band = body.getBoundingClientRect();
        const items = [...body.children].map(e => e.getBoundingClientRect());
        const top = Math.min(...items.map(r => r.top)), bottom = Math.max(...items.map(r => r.bottom));
        // innerText preserves visible breaks between list rows and <br> lines;
        // textContent would merge adjacent words and undercount sparse pages.
        const text = body.innerText.replace(/\s+/g, ' ').replace(/\s+([,.;:])/g, '$1').trim();
        const words = text.match(/[\p{L}\p{N}]+(?:['’.-][\p{L}\p{N}]+)*/gu) || [];
        const children = [...body.children].filter(e => !e.classList.contains('divider'))
          .map(e => e.className || [...e.querySelectorAll('[class]')].map(c => c.className).join(' '));
        return { slide: i + 1, words: words.length, text,
          contentHeight: Math.round(bottom - top), bandHeight: Math.round(band.height),
          bandFill: Number(((bottom - top) / band.height).toFixed(3)), layout: children.join(' / '),
          inverted: slide.classList.contains('slide--invert') };
      }));
      const label = path.basename(source, '.html'), dir = path.join(reviewRoot, label);
      fs.mkdirSync(dir, { recursive: true });
      const thumbs = [];
      for (let i = 0; i < slides.length; i++) {
        const png = path.join(dir, 'slide-' + (i + 1) + '.png');
        await page.locator('.slide').nth(i).screenshot({ path: png });
        thumbs.push({ input: await sharp(png).resize(270, 338).toBuffer(),
          left: 20 + (i % 3) * 290, top: 20 + Math.floor(i / 3) * 358 });
      }
      const sheet = path.join(dir, 'contact-sheet.png');
      await sharp({ create: { width: 890, height: 20 + Math.ceil(slides.length / 3) * 358,
        channels: 3, background: '#d9dcdf' } }).composite(thumbs).png().toFile(sheet);
      const words = slides.map(s => s.words), fill = slides.map(s => s.bandFill);
      const result = { source, label, pages: slides.length, totalWords: words.reduce((a, b) => a + b, 0),
        averageWords: Number((words.reduce((a, b) => a + b, 0) / words.length).toFixed(1)),
        minWords: Math.min(...words), maxWords: Math.max(...words),
        averageBandFill: Number((fill.reduce((a, b) => a + b, 0) / fill.length).toFixed(3)),
        minBandFill: Math.min(...fill), maxBandFill: Math.max(...fill),
        layoutShapes: [...new Set(slides.map(s => s.layout))], contactSheet: sheet, slides };
      results.push(result);
      console.log(JSON.stringify({ label, pages: result.pages, averageWords: result.averageWords,
        wordRange: [result.minWords, result.maxWords], averageBandFill: result.averageBandFill,
        layoutShapes: result.layoutShapes, contactSheet: sheet }));
      await page.close();
    }
    fs.writeFileSync(path.join(reviewRoot, 'comparison.json'), JSON.stringify(results, null, 2));
  } finally { await browser.close(); }
})().catch(e => { console.error(e); process.exitCode = 1; });
