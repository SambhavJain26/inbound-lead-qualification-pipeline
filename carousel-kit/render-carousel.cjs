// Local HTML/PDF production, not application runtime or browser-account control.
const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { createRequire } = require('node:module');
const { execFileSync } = require('node:child_process');

const bundledRoot = process.env.CAROUSEL_NODE_MODULES ||
  'C:/Users/jains/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules';
const runtimeRequire = createRequire(path.join(bundledRoot, '_carousel-runtime.cjs'));
const { chromium } = runtimeRequire('playwright');
const sharp = runtimeRequire('sharp');
const name = process.argv[2] || 'b5-01-inquiry-to-lease';
if (!/^[a-z0-9-]+$/.test(name)) throw new Error('Use a lowercase hyphenated deck name.');
const source = path.join(__dirname, name + '.html');
const pdfDir = path.resolve(__dirname, '../output/pdf');
const previewDir = path.resolve(__dirname, '../output/carousels', name);
const scratch = path.resolve(__dirname, '../tmp/carousel-qa', name);
for (const dir of [pdfDir, previewDir, scratch]) fs.mkdirSync(dir, { recursive: true });

(async () => {
  const executablePath = process.env.CAROUSEL_BROWSER ||
    'C:/Program Files/Google/Chrome/Application/chrome.exe';
  const browser = await chromium.launch({ executablePath, headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1080, height: 1350 } });
    await page.goto(pathToFileURL(source).href, { waitUntil: 'networkidle' });
    await page.evaluate(async () => {
      await Promise.all([
        document.fonts.load('900 96px Switzer'),
        document.fonts.load('600 62px Switzer'),
        document.fonts.load('800 italic 192px Zodiak')
      ]);
      await document.fonts.ready;
    });
    // Re-run the unchanged snap after fonts settle; the HTML remains standalone.
    await page.evaluate(() => {
      const script = [...document.scripts].find(s => s.textContent.includes('var UNIT = 24'));
      if (!script) throw new Error('Missing baseline snap');
      (0, eval)(script.textContent);
    });
    const checks = await page.evaluate(() => {
      const faces = [...document.fonts].filter(f => f.status === 'loaded').map(f => f.family);
      if (!faces.some(f => /Switzer/.test(f)) || !faces.some(f => /Zodiak/.test(f)))
        throw new Error('Required webfonts did not load; do not export a fallback-font deck.');
      return [...document.querySelectorAll('.slide')].map((slide, i) => {
        const origin = slide.getBoundingClientRect();
        const body = slide.querySelector('.body');
        const footer = slide.querySelector('.footer').getBoundingClientRect();
        const byline = slide.querySelector('.byline')?.getBoundingClientRect();
        const children = [...body.children].map(e => e.getBoundingClientRect());
        const bottom = Math.max(...children.map(r => r.bottom));
        const top = Math.min(...children.map(r => r.top));
        const band = body.getBoundingClientRect();
        const violations = [];
        if (top < band.top - 1 || bottom > band.bottom + 1) violations.push('Content exceeds its band');
        if (bottom > (byline ? byline.top : footer.top) - 24) violations.push('Footer/byline clearance');
        for (const pen of slide.querySelectorAll('.pen')) {
          const r = pen.getBoundingClientRect(), css = getComputedStyle(pen);
          const maxHeight = parseFloat(css.fontSize) * (pen.classList.contains('pay') ? 1.15 : 1.55);
          if (r.height > maxHeight) violations.push('Pen text wraps: ' + pen.textContent);
          const mark = pen.querySelector('svg').getBoundingClientRect();
          if (mark.left < 56 || mark.right > 1030 || mark.bottom > footer.top - 24)
            violations.push('Pen clearance: ' + pen.textContent);
        }
        return { slide: i + 1, fonts: faces, top: top - origin.top,
          bottom: bottom - origin.top, bandBottom: band.bottom - origin.top,
          violations, bodyText: body.innerText, footerText: slide.querySelector('.footer span').innerText };
      });
    });
    fs.writeFileSync(path.join(scratch, 'layout-checks.json'), JSON.stringify(checks, null, 2));
    const problems = checks.filter(c => c.violations.length);
    if (problems.length) throw new Error(JSON.stringify(problems, null, 2));
    const postId = name.match(/^(b5-\d{2})/)?.[1].toUpperCase();
    if (postId) {
      const scripts = fs.readFileSync(path.resolve(__dirname,
        '../docs/build-5-content-strategy/linkedin-post-scripts.md'), 'utf8');
      const section = scripts.split('## ' + postId + ' — ')[1]?.split('\n## B5-')[0];
      if (!section) throw new Error('No approved copy found for ' + postId);
      const slides = [...section.matchAll(/#### Slide (\d+)\s+Title: ([^\n]+)\s+Body: ([^\n]+)\s+Footer: ([^\n]+)/g)];
      const normalize = s => s.replace(/\s+/g, ' ').replace(/\s+([,.;:])/g, '$1').trim();
      if (slides.length !== checks.length) throw new Error('Approved copy slide count differs.');
      slides.forEach((slide, i) => {
        if (normalize(checks[i].bodyText) !== normalize(slide[2] + ' ' + slide[3]) ||
          normalize(checks[i].footerText) !== normalize(slide[4]))
          throw new Error('Rendered slide ' + (i + 1) + ' differs from approved wording.');
      });
    }
    await page.emulateMedia({ media: 'print' });
    const pdf = path.join(pdfDir, name + '.pdf');
    await page.pdf({ path: pdf, preferCSSPageSize: true, printBackground: true,
      displayHeaderFooter: false, margin: { top: 0, right: 0, bottom: 0, left: 0 } });

    // Review the final PDF itself, not only its HTML source.
    const poppler = process.env.CAROUSEL_PDFTOPPM ||
      'C:/Users/jains/.cache/codex-runtimes/codex-primary-runtime/dependencies/native/poppler/Library/bin/pdftoppm.exe';
    execFileSync(poppler, ['-png', '-r', '96', pdf, path.join(previewDir, 'slide')]);
    const images = fs.readdirSync(previewDir).filter(n => /^slide-\d+\.png$/.test(n))
      .sort((a, b) => Number(a.match(/\d+/)[0]) - Number(b.match(/\d+/)[0]));
    if (images.length !== checks.length) throw new Error('Rendered PDF page count differs from HTML.');
    const tileWidth = 324, tileHeight = 405, gap = 24, columns = 3;
    const rows = Math.ceil(images.length / columns);
    const composite = await Promise.all(images.map(async (file, i) => ({
      input: await sharp(path.join(previewDir, file)).resize(tileWidth, tileHeight).toBuffer(),
      left: gap + (i % columns) * (tileWidth + gap),
      top: gap + Math.floor(i / columns) * (tileHeight + gap)
    })));
    await sharp({ create: { width: gap + columns * (tileWidth + gap),
      height: gap + rows * (tileHeight + gap), channels: 3, background: '#d9dcdf' } })
      .composite(composite).png().toFile(path.join(previewDir, 'contact-sheet.png'));
    console.log(JSON.stringify({ pdf, pages: checks.length, bytes: fs.statSync(pdf).size,
      preview: path.join(previewDir, 'contact-sheet.png'), checks }, null, 2));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
