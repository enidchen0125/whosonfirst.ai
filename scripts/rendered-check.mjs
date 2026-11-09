#!/usr/bin/env node
/**
 * Rendered checks: what the token audit cannot see.
 *
 * contrast-check.mjs proves that declared colour pairs pass. This script opens
 * the built site in a browser and measures what is actually drawn: the diagram
 * in each of its states, the size labels end up at, how long lines of prose
 * run, whether anything overflows, and whether the pieces a reader depends on
 * are present and work.
 *
 *   npm run build && node scripts/rendered-check.mjs
 *   node scripts/rendered-check.mjs --direction=all     every design direction
 *   node scripts/rendered-check.mjs --verbose           list every measurement
 *
 * Needs Chromium for Playwright: `npx playwright install chromium`.
 * Exits 1 if any check fails.
 */
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const axePath = require.resolve('axe-core/axe.min.js');

const root = fileURLToPath(new URL('../dist/', import.meta.url));
if (!existsSync(join(root, 'index.html'))) {
  console.error('dist/ is missing. Run `npm run build` first.');
  process.exit(1);
}
const arg = (k, d) => (process.argv.find((a) => a.startsWith(`--${k}=`)) ?? `--${k}=${d}`).split('=')[1];
const verbose = process.argv.includes('--verbose');
const ALL = ['scorecard', 'scoreboard', 'linemap', 'draft', 'draft01'];
const directions = arg('direction', 'draft01') === 'all' ? ALL : arg('direction', 'draft01').split(',');

/* ---------- thresholds ---------- */
const AA = 4.5; // text contrast
const MIN_LABEL = 12; // px a diagram label may be drawn at
const MIN_PROSE = 16; // px for running text
const MAX_MEASURE = 82; // characters per line of running text

/* ---------- a static server for dist/ ---------- */
const TYPES = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.woff': 'font/woff', '.xml': 'application/xml', '.txt': 'text/plain', '.png': 'image/png' };
const server = createServer((req, res) => {
  let file = normalize(join(root, decodeURIComponent(new URL(req.url, 'http://x').pathname)));
  if (!file.startsWith(root)) return res.writeHead(403).end();
  if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
  if (!existsSync(file)) return res.writeHead(404).end('not found');
  res.writeHead(200, { 'content-type': TYPES[extname(file)] ?? 'application/octet-stream' }).end(readFileSync(file));
});
await new Promise((r) => server.listen(0, '127.0.0.1', r));
const origin = `http://127.0.0.1:${server.address().port}`;

/* ---------- what is looked at ---------- */
const FLOW = '/flows/mcp-authorization/';
const PAGES = [
  { path: '/', name: 'home' },
  { path: FLOW, name: 'flow' },
  { path: '/standards/', name: 'standards' },
  { path: '/concepts/', name: 'concepts' },
  { path: '/flows/', name: 'flows index' },
  { path: '/guide/', name: 'decision guide' },
  { path: '/deployments/kubernetes/', name: 'deployment guide' },
];
const VIEWPORTS = [
  { name: 'desktop', width: 1280, height: 900 },
  { name: 'phone', width: 390, height: 844, isMobile: true, hasTouch: true },
];
const THEMES = ['light', 'dark'];

const results = []; // { where, check, ok, detail }
const record = (where, check, ok, detail = '') => results.push({ where, check, ok, detail });

/* ---------- measurements that run in the page ---------- */

/** Contrast of every label in the sequence diagram as drawn: fill × opacity, over what is behind it. */
const diagramLabels = () => {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 1;
  const ctx = cv.getContext('2d', { willReadFrequently: true });
  const rgba = (css) => {
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = '#000';
    ctx.fillStyle = css;
    ctx.fillRect(0, 0, 1, 1);
    const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
    return [r, g, b, a / 255];
  };
  const over = (top, under) => {
    const a = top[3];
    return [0, 1, 2].map((i) => top[i] * a + under[i] * (1 - a)).concat(1);
  };
  const lum = ([r, g, b]) => {
    const f = (v) => ((v /= 255) <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4);
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const ratio = (a, b) => {
    const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
  };
  const canvas = document.querySelector('.flow-canvas');
  const svg = canvas.querySelector('svg');
  const scale = svg.getBoundingClientRect().width / svg.viewBox.baseVal.width;
  const page = over(rgba(getComputedStyle(canvas).backgroundColor), rgba(getComputedStyle(document.body).backgroundColor));
  const out = [];
  for (const el of svg.querySelectorAll('text')) {
    const cs = getComputedStyle(el);
    let alpha = 1;
    for (let n = el; n && n !== canvas; n = n.parentElement) alpha *= Number(getComputedStyle(n).opacity);
    const group = el.closest('.step, .actor');
    // what is painted behind the label: the row band, a note pill, a filled badge or an actor box
    let ground = page;
    const band = group?.querySelector('.hit');
    if (band) ground = over(rgba(getComputedStyle(band).fill), ground);
    const cls = el.getAttribute('class') ?? '';
    const shape = cls.includes('note-label') ? '.note' : cls.includes('badge-num') ? '.badge' : cls.includes('actor-') ? '.actor-box' : null;
    if (shape) ground = over(rgba(getComputedStyle(group.querySelector(shape)).fill), ground);
    const ink = rgba(cs.fill);
    ink[3] *= alpha;
    out.push({
      text: el.textContent.trim(),
      state: group?.classList.contains('is-active') ? 'current' : group?.classList.contains('is-done') ? 'done' : group?.classList.contains('is-todo') ? 'to come' : 'static',
      ratio: ratio(over(ink, ground), ground),
      px: parseFloat(cs.fontSize) * scale,
    });
  }
  return out;
};

/** Size and line length of running text. */
const prose = () => {
  const out = [];
  for (const p of document.querySelectorAll('main .prose p, main .article > p, main .step-body p, main .lede')) {
    if (!p.offsetParent) continue;
    const cs = getComputedStyle(p);
    const lines = Math.round(p.getBoundingClientRect().height / parseFloat(cs.lineHeight));
    out.push({ size: parseFloat(cs.fontSize), lines, perLine: lines >= 3 ? p.textContent.trim().length / lines : 0 });
  }
  return out;
};

/* ---------- run ---------- */
const browser = await chromium.launch();
for (const direction of directions) {
  for (const theme of THEMES) {
    for (const vp of VIEWPORTS) {
      const ctx = await browser.newContext({
        viewport: { width: vp.width, height: vp.height },
        isMobile: vp.isMobile,
        hasTouch: vp.hasTouch,
        colorScheme: theme,
        reducedMotion: 'reduce',
      });
      for (const pg of PAGES) {
        const where = `${direction} ${theme} ${vp.name} ${pg.name}`;
        const page = await ctx.newPage();
        const errors = [];
        page.on('pageerror', (e) => errors.push(String(e)));
        await page.goto(`${origin}${pg.path}?direction=${direction}`, { waitUntil: 'networkidle' });
        await page.evaluate(() => document.fonts.ready);
        // the direction switcher is an exploration aid, not part of the page under test
        await page.addStyleTag({ content: 'design-switcher{display:none!important}' });

        record(where, 'no script errors', errors.length === 0, errors.join('; '));
        const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
        record(where, 'no sideways overflow', overflow <= 0, overflow > 0 ? `${overflow}px` : '');

        await page.addScriptTag({ path: axePath });
        const violations = await page.evaluate(async () => {
          const r = await window.axe.run(document, { runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'] } });
          return r.violations.map((v) => `${v.id} (${v.nodes.length}): ${v.nodes[0].target.join(' ')}`);
        });
        record(where, 'axe: no WCAG A/AA violations', violations.length === 0, violations.join(' | '));

        const text = await page.evaluate(prose);
        if (text.length) {
          const small = Math.min(...text.map((t) => t.size));
          record(where, `running text at least ${MIN_PROSE}px`, small >= MIN_PROSE, `smallest ${small.toFixed(1)}px`);
          const long = Math.max(0, ...text.map((t) => t.perLine));
          if (long) record(where, `at most ${MAX_MEASURE} characters a line`, long <= MAX_MEASURE, `longest ${long.toFixed(0)}`);
        }

        if (pg.name === 'home') {
          const first = await page.evaluate(() => {
            const panel = [...document.querySelectorAll('.lhb-panel')].find((p) => p.offsetParent);
            return panel ? { rows: panel.querySelectorAll('tbody tr').length, marks: [...panel.querySelectorAll('.lhb-mark')].map((m) => m.textContent.trim()) } : null;
          });
          record(where, 'last-hop explainer shows a complete first state', !!first && first.rows === 4, first ? first.marks.join(', ') : 'not visible');
          await page.check('.lhb input[value="delegated"]', { force: true });
          const second = await page.evaluate(() => [...document.querySelectorAll('.lhb-panel')].filter((p) => p.offsetParent).map((p) => p.dataset.arrangement));
          record(where, 'choosing the other credential changes the panel', second.length === 1 && second[0] === 'delegated', second.join(','));
          const routes = await page.evaluate(() => [...document.querySelectorAll('.routes li > a')].map((a) => a.getAttribute('href')));
          record(where, 'three ways in: guide, roles, flows', ['/guide/', '/concepts/#roles', '/flows/'].every((h) => routes.includes(h)), routes.join(' '));
        }

        if (pg.name === 'flow' || pg.name === 'standards') {
          const facts = await page.evaluate(() => {
            const dl = document.querySelector('.page-head .doc-meta');
            return dl ? { text: dl.textContent.replace(/\s+/g, ' '), links: [...dl.querySelectorAll('a')].map((a) => a.getAttribute('href')) } : null;
          });
          record(where, 'page states when it was last reviewed', !!facts && /last reviewed\s*\w+ \d{4}/i.test(facts.text), facts ? '' : 'no page facts');
          if (pg.name === 'flow') record(where, 'page links its primary specification', !!facts && facts.links.some((h) => h.startsWith('/standards/#')), facts?.links.join(' ') ?? '');
        }

        if (pg.name === 'flow') {
          const count = await page.evaluate(() => Number(document.querySelector('.flow').dataset.count));
          if (vp.name === 'desktop') {
            // the stepper: measure the diagram at its first, a middle and its last step
            for (const step of [1, Math.ceil(count / 2), count]) {
              await page.evaluate((n) => { location.hash = `#step-${n}`; }, step);
              await page.waitForTimeout(80);
              const labels = await page.evaluate(diagramLabels);
              const worst = labels.reduce((a, b) => (b.ratio < a.ratio ? b : a));
              record(where, `diagram at step ${step}: every label at least ${AA}:1 as drawn`, worst.ratio >= AA, `lowest ${worst.ratio.toFixed(2)} (“${worst.text}”, ${worst.state})`);
              const tiny = labels.reduce((a, b) => (b.px < a.px ? b : a));
              record(where, `diagram at step ${step}: labels drawn at ${MIN_LABEL}px or more`, tiny.px >= MIN_LABEL - 0.05, `smallest ${tiny.px.toFixed(1)}px (“${tiny.text}”)`);
              const held = await page.evaluate(() => {
                const li = [...document.querySelectorAll('.flow-step')].find((s) => !s.hidden);
                return { shown: document.querySelectorAll('.flow-step:not([hidden])').length, route: li?.querySelector('.step-route')?.textContent.replace(/\s+/g, ' ').trim() };
              });
              record(where, `step ${step}: one step shown, with who is talking to whom`, held.shown === 1 && !!held.route, held.route ?? '');
            }
            const holders = await page.evaluate(() => document.querySelectorAll('.flow-step .held dt').length);
            record(where, 'steps say who holds which credential', holders > 0, `${holders} holder entries`);
          } else {
            // the phone: a narrative of every step, with the diagram on demand at full size
            const state = await page.evaluate(() => ({
              shown: document.querySelectorAll('.flow-step:not([hidden])').length,
              open: document.querySelector('.flow-stage').open,
              summary: !!document.querySelector('.flow-stage > summary')?.offsetParent,
            }));
            record(where, 'every step is readable as a narrative', state.shown === count, `${state.shown} of ${count}`);
            record(where, 'diagram is offered on demand, not forced', !state.open && state.summary);
            await page.click('.flow-stage > summary');
            await page.waitForTimeout(80);
            const labels = await page.evaluate(diagramLabels);
            const tiny = Math.min(...labels.map((l) => l.px));
            record(where, `opened diagram keeps labels at ${MIN_LABEL}px or more`, tiny >= MIN_LABEL - 0.05, `smallest ${tiny.toFixed(1)}px`);
            const worst = labels.reduce((a, b) => (b.ratio < a.ratio ? b : a));
            record(where, `opened diagram: every label at least ${AA}:1 as drawn`, worst.ratio >= AA, `lowest ${worst.ratio.toFixed(2)} (“${worst.text}”)`);
            const still = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
            record(where, 'opened diagram scrolls inside its own frame', still <= 0, still > 0 ? `${still}px` : '');
          }
        }
        await page.close();
      }
      await ctx.close();
    }
  }
}
await browser.close();
server.close();

/* ---------- report ---------- */
const failed = results.filter((r) => !r.ok);
const byCheck = new Map();
for (const r of results) {
  const key = r.check.replace(/step \d+/g, 'step N');
  const row = byCheck.get(key) ?? { pass: 0, fail: 0 };
  row[r.ok ? 'pass' : 'fail']++;
  byCheck.set(key, row);
}
if (verbose) for (const r of results) console.log(`${r.ok ? '✓' : '✗'} ${r.where.padEnd(44)} ${r.check}${r.detail ? `  — ${r.detail}` : ''}`);
else for (const r of failed) console.log(`✗ ${r.where.padEnd(44)} ${r.check}${r.detail ? `  — ${r.detail}` : ''}`);
console.log(`\n${directions.join(', ')}: ${PAGES.length} pages × ${VIEWPORTS.length} viewports × ${THEMES.length} themes`);
for (const [check, { pass, fail }] of byCheck) console.log(`  ${fail ? '✗' : '✓'} ${String(pass).padStart(3)}/${String(pass + fail).padEnd(3)} ${check}`);
console.log(`\n${results.length} rendered checks, ${failed.length} failed.`);
process.exit(failed.length ? 1 : 0);
