#!/usr/bin/env node
/**
 * Pictures for announcing the site: what goes in a post beside a link to it.
 *
 * Everything drawn here is read from the site as built, in a browser: the
 * question and the three ways in from the home page, the figure from the first
 * lesson, the list of flows, the tracker's counts, and one flow's diagram in
 * each of its steps. Nothing is typed in a second time, so a picture cannot
 * say what the site does not. Make them again when the content changes.
 *
 *   npm run build && node scripts/social-assets.mjs
 *   node scripts/social-assets.mjs --flow dpop     step through another flow
 *   node scripts/social-assets.mjs --no-video
 *
 * Writes to social/, which is not committed:
 *
 *   carousel.pdf                 pages of 1080 × 1350, for a document post
 *   carousel-01.png …            the same pages as pictures
 *   three-questions.png          one picture for a post: three credentials, three questions
 *   three-questions-wide.png     the same at 16:9, for where pictures are cropped wide
 *   flows.png                    every flow, grouped
 *   standards.png                how settled the specifications are
 *   flow-<slug>.mp4              one flow, stepped through, with flow-<slug>-cover.png
 *   repository.png               1280 × 640, for the repository's social preview
 *
 * Needs Chromium for Playwright, as the rendered checks do. The video also
 * needs ffmpeg on the path, and is left out with a note where there is none.
 */
import { spawnSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

const args = process.argv.slice(2);
const option = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i < 0 ? fallback : args[i + 1];
};
/** The flow the video steps through, and the carousel shows a step of. */
const FLOW = option("flow", "mcp-authorization");
const VIDEO = !args.includes("--no-video");

const ADDRESS = "whosonfirst.ai";
/** A post's picture: 4:5, the tallest a feed shows without cropping. */
const TALL = { width: 1080, height: 1350 };
const WIDE = { width: 1600, height: 900 };
const REPOSITORY = { width: 1280, height: 640 };
/** Seconds each step of the video is held, and the frames it takes to move to the next. */
const HOLD = 2.1;
const GLIDE = 8;
const FPS = 30;

const root = fileURLToPath(new URL("../dist/client/", import.meta.url));
const out = fileURLToPath(new URL("../social/", import.meta.url));
if (!existsSync(join(root, "flows", FLOW, "index.html"))) {
  console.error(
    existsSync(join(root, "index.html"))
      ? `There is no flow at /flows/${FLOW}/.`
      : "dist/client/ is missing. Run `npm run build` first.",
  );
  process.exit(1);
}
mkdirSync(out, { recursive: true });

/* ---------- a static server for dist/client/ ---------- */
const TYPES = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "text/javascript",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
};
const server = createServer((req, res) => {
  let file = normalize(
    join(root, decodeURIComponent(new URL(req.url, "http://x").pathname)),
  );
  if (!file.startsWith(root)) return res.writeHead(403).end();
  if (existsSync(file) && statSync(file).isDirectory())
    file = join(file, "index.html");
  if (!existsSync(file)) return res.writeHead(404).end("not found");
  res
    .writeHead(200, {
      "content-type": TYPES[extname(file)] ?? "application/octet-stream",
    })
    .end(readFileSync(file));
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const origin = `http://127.0.0.1:${server.address().port}`;

// As the rendered checks do: the same picture whatever the machine's font settings.
const browser = await chromium.launch({
  args: ["--font-render-hinting=none"],
});

/* ---------- what the site says ---------- */

/** Runs in the page. Text as a reader sees it: one line, single spaces. */
const HELPERS = `
  const text = (el) => (el?.textContent ?? "").replace(/\\s+/g, " ").trim();
  const one = (sel, from = document) => {
    const el = from.querySelector(sel);
    if (!el) throw new Error("nothing matches " + sel + " on " + location.pathname);
    return el;
  };
  const all = (sel, from = document) => [...from.querySelectorAll(sel)];
  const role = (el) => [...el.classList].find((c) => c.startsWith("role-")) ?? "";
`;
const inPage = (body) => `(() => { ${HELPERS} ${body} })()`;

async function readSite() {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 1000 },
    colorScheme: "light",
  });
  const page = await context.newPage();
  const open = (path) =>
    page.goto(`${origin}${path}`, { waitUntil: "networkidle" });

  await open("/");
  const home = await page.evaluate(
    inPage(`
      return {
        eyebrow: text(one(".hero .eyebrow")),
        question: text(one(".hero h1")),
        lede: text(one(".hero .lede")),
        figure: text(one(".hero .sc-title")),
        description: one('meta[name="description"]').content,
        descriptor: text(one(".site-footer p")).split(".")[0],
        // the facts under the figure: what kind of guide this is, and when it was checked
        // (a fact's label and its value are set apart by a margin, not a space)
        facts: all(".hero-meta .doc-fact").map((f) => {
          const key = text(f.querySelector(".doc-key"));
          return (key + " " + text(f).slice(key.length)).trim();
        }),
        // the footer's last line, without the address it opens with
        fine: text(one(".site-footer .fine")).replace(/^[^·]*·\\s*/, ""),
        start: one(".hero .routes").getAttribute("aria-label"),
        routes: all(".hero .routes li").map((li) => ({
          who: text(one(".who", li)),
          name: text(one("a", li)),
          href: one("a", li).getAttribute("href"),
          what: text(one(":scope > span:last-child", li)),
        })),
      };
    `),
  );
  if (!/reviewed/i.test(home.fine))
    throw new Error("the footer no longer says when the site was reviewed");

  // The first lesson has the figure in full: the home page leaves out its listings.
  await open("/learn/what-the-api-sees/");
  const figure = await page.evaluate(
    inPage(`
      const f = one("figure.sc#api-sees");
      const panels = all(".sc-panel", f);
      return {
        legend: text(one("legend", f)),
        asks: text(one(".sc-findings caption", f)),
        questions: all(".sc-findings th", panels[0]).map(text),
        cast: all(".sc-node", panels[0]).map((n) => ({
          label: text(one("strong", n)),
          sub: text(n.querySelector("span")),
          role: role(n),
        })),
        options: panels.map((p) => ({
          name: text(one(".sc-which strong", p)),
          hops: all(".sc-hop", p).map(text),
          listing: all(".sc-exhibit", p).map((x) => ({
            caption: text(one(".sc-label", x)),
            code: one("pre", x).textContent.trim(),
          }))[0],
          findings: all(".sc-findings tr", p).map((r) => ({
            verdict: [...one(".sc-mark", r).classList].find((c) => c.startsWith("is-")),
            word: text(one(".sc-mark", r)),
            // a note is words, and some of them are literal: a name as it was typed
            note: [...one(".sc-note", r).childNodes].map((n) => ({
              text: n.textContent.replace(/\\s+/g, " "),
              literal: n.nodeName === "CODE",
            })),
          })),
          // what the figure says in bold: its conclusion for this choice
          so: all(".sc-so strong", p).map(text).join(" "),
        })),
      };
    `),
  );

  await open("/flows/");
  const flows = await page.evaluate(
    inPage(`
      return {
        title: text(one(".page-head h1")),
        lede: text(one(".page-head .lede")),
        groups: all(".fl-group").map((g) => ({
          title: text(one("h2", g)),
          flows: all(".flow-card", g).map((a) => ({
            name: text(one("h3", a)),
            rating: text(all(".chip", a).at(-1)),
          })),
        })),
      };
    `),
  );

  await open("/standards/");
  const standards = await page.evaluate(
    inPage(`
      const items = all(".sx-item");
      return {
        title: text(one(".page-head h1")),
        lede: text(one(".page-head .lede")),
        count: text(one(".page-head .doc-fact")),
        // each status as the tracker's own filter names it, in its order, with
        // the marker its entries carry: a colored square, or none
        statuses: all('.sx-filters input[name="status"]').map((input) => {
          const mine = items.filter((li) => li.dataset.status === input.value);
          const chip = one(".chip", mine[0]);
          return {
            label: text(chip),
            count: mine.length,
            marker: chip.dataset.tone ? getComputedStyle(chip).color : "",
          };
        }),
      };
    `),
  );

  await context.close();
  // A list that comes back empty means a page has changed shape, and a picture
  // drawn from it would be blank where the list was.
  for (const [what, list] of Object.entries({
    "ways in on the home page": home.routes,
    "choices in the first lesson's figure": figure.options,
    "groups on the flows page": flows.groups,
    "statuses in the tracker": standards.statuses,
  }))
    if (!list.length) throw new Error(`found no ${what}`);
  return { home, figure, flows, standards };
}

/** One flow, in each of its steps: what its panel says, and its diagram as drawn. */
async function readFlow(slug) {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 1000 },
    deviceScaleFactor: 2,
    colorScheme: "light",
    reducedMotion: "reduce",
  });
  const page = await context.newPage();
  await page.goto(`${origin}/flows/${slug}/`, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  // Nothing may sit over the diagram while it is photographed, and its strip of
  // participants is taken apart from the sequence that scrolls beneath it.
  await page.addStyleTag({
    content:
      ".site-header, .flow-heads { position: static !important } .flow-canvas { overflow: visible !important }",
  });
  const flow = await page.evaluate(
    inPage(`
      const d = one("flow-diagram");
      const lines = one(".flow-lines", d).getBoundingClientRect();
      return {
        title: text(one(".page-head h1")),
        tagline: text(one(".page-head .lede")),
        count: text(one(".flow-stage-count", d)),
        width: lines.width,
        height: lines.height,
        steps: all(".flow-step", d).map((li, i) => {
          const row = one('svg .step[data-step="' + i + '"] .hit', d).getBoundingClientRect();
          const who = all(".step-route .who", li);
          return {
            part: text(li.querySelector(".step-phase-n")),
            phase: text(li.querySelector(".step-phase")).replace(text(li.querySelector(".step-phase-n")), "").trim(),
            from: { label: text(who[0]), role: role(who[0]) },
            to: who[1] ? { label: text(who[1]), role: role(who[1]) } : null,
            kind: text(one(".step-kind", li)),
            title: text(one("h3", li)),
            // where this step's row is in the sequence, as a share of its height
            at: (row.top + row.height / 2 - lines.top) / lines.height,
          };
        }),
      };
    `),
  );
  const uri = (png) => `data:image/png;base64,${png.toString("base64")}`;
  for (const [i, step] of flow.steps.entries()) {
    await page.locator(`.flow-progress [data-goto="${i}"]`).click();
    step.heads = uri(await page.locator(".flow-heads").screenshot());
    step.lines = uri(await page.locator(".flow-lines").screenshot());
  }
  await context.close();
  return { slug, ...flow };
}

/* ---------- how a picture is drawn ---------- */

const esc = (s) =>
  String(s).replace(
    /[&<>"]/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c],
  );
const words = (parts) =>
  parts
    .map((p) => (p.literal ? `<code>${esc(p.text)}</code>` : esc(p.text)))
    .join("")
    .trim();

const face = (family, weight) => {
  const file = require.resolve(
    `@fontsource/ibm-plex-${family}/files/ibm-plex-${family}-latin-${weight}-normal.woff2`,
  );
  const name = family === "mono" ? "IBM Plex Mono" : "IBM Plex Sans";
  return `@font-face { font-family: "${name}"; font-weight: ${weight}; src: url(data:font/woff2;base64,${readFileSync(file).toString("base64")}) format("woff2"); }`;
};
const FACES = [
  ["sans", 400],
  ["sans", 500],
  ["sans", 600],
  ["mono", 400],
  ["mono", 500],
  ["mono", 600],
]
  .map(([family, weight]) => face(family, weight))
  .join("\n");
/** The site's own values. A picture is seen on someone else's page, so it keeps to the light ones. */
const TOKENS = readFileSync(
  new URL("../src/styles/tokens.css", import.meta.url),
  "utf8",
);
const MARK = `data:image/svg+xml;base64,${readFileSync(new URL("../public/favicon.svg", import.meta.url)).toString("base64")}`;

const CSS = `
${FACES}
${TOKENS}
:root { color-scheme: light; }
* { box-sizing: border-box; }
html, body { margin: 0; }
body {
  background: var(--bg);
  color: var(--fg);
  font-family: var(--font-body);
  -webkit-font-smoothing: antialiased;
}
p, h1, h2, h3, ul, ol, table { margin: 0; padding: 0; }
.role-human { --role: var(--red); --role-soft: var(--red-soft); }
.role-agent { --role: var(--blue); --role-soft: var(--blue-soft); }
.role-authz { --role: var(--violet); --role-soft: var(--violet-soft); }
.role-resource { --role: var(--green); --role-soft: var(--green-soft); }
.role-infra { --role: var(--amber); --role-soft: var(--amber-soft); }

/* The frame every picture shares: the name over a rule, the address under one. */
.slide {
  position: relative;
  display: flex;
  flex-direction: column;
  width: var(--w);
  height: var(--h);
  padding: 58px 72px 50px;
  overflow: hidden;
  background: var(--bg);
  break-after: page;
}
.top {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 26px;
  border-bottom: 2px solid var(--fg);
}
.brand {
  display: flex;
  align-items: center;
  gap: 18px;
  font: 600 32px/1 var(--font-display);
  letter-spacing: -0.015em;
}
.brand img { width: 46px; height: 46px; }
.tag, .eyebrow, .label {
  font-family: var(--font-label);
  font-weight: 500;
  letter-spacing: 0.09em;
  text-transform: uppercase;
  color: var(--fg-muted);
}
.tag { font-size: 21px; }
.eyebrow { font-size: 23px; line-height: 1.35; margin-bottom: 26px; }
.label { font-size: 21px; line-height: 1.3; }
.main {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 34px 0;
}
.main.from-top { justify-content: flex-start; padding-top: 44px; }
.foot {
  flex: none;
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 32px;
  padding-top: 22px;
  border-top: 1px solid var(--border);
  font-size: 23px;
  color: var(--fg-muted);
}
.addr { flex: none; font: 500 24px/1.2 var(--font-mono); color: var(--accent); }
h1 { font: 600 82px/1.08 var(--font-display); letter-spacing: -0.03em; }
h2 { font: 600 58px/1.1 var(--font-display); letter-spacing: -0.03em; }
.lede { margin-top: 30px; font-size: 35px; line-height: 1.42; color: var(--fg-muted); }
.lede.small { font-size: 30px; }
code {
  font-family: var(--font-mono);
  font-size: 0.9em;
  background: var(--bg-sunken);
  padding: 0.08em 0.3em;
  border-radius: 2px;
}

/* who is on the path, and what passes between them */
.chain { display: flex; align-items: stretch; }
.node {
  flex: none;
  min-width: 196px;
  padding: 15px 20px 16px;
  border: 2px solid var(--role);
  border-radius: 4px;
  background: var(--role-soft);
  text-align: center;
}
.node strong { display: block; font-size: 29px; font-weight: 600; line-height: 1.25; }
.node span { display: block; font-size: 22px; line-height: 1.3; color: var(--fg-muted); }
.hop { flex: 1; position: relative; }
.hop i {
  position: absolute;
  left: 8px;
  right: 10px;
  top: 50%;
  height: 2px;
  background: var(--fg);
}
.hop i::after {
  content: "";
  position: absolute;
  right: -8px;
  top: -6px;
  border-left: 12px solid var(--fg);
  border-top: 7px solid transparent;
  border-bottom: 7px solid transparent;
}
.chain.said { padding-bottom: 66px; }
.hop span {
  position: absolute;
  left: -40px;
  right: -40px;
  top: calc(100% + 12px);
  font-size: 22px;
  font-weight: 600;
  line-height: 1.25;
  text-align: center;
}

/* yes, no, partly: drawn as the site draws them */
.mark {
  display: inline-flex;
  align-items: center;
  gap: 0.42em;
  font: 600 25px/1 var(--font-label);
  letter-spacing: 0.04em;
  text-transform: uppercase;
  white-space: nowrap;
}
.mark::before { content: ""; flex: none; width: 0.74em; height: 0.74em; border-radius: 50%; }
.is-yes { color: var(--green); }
.is-yes::before { background: currentColor; }
.is-no { color: var(--red); }
.is-no::before { box-shadow: inset 0 0 0 3px currentColor; }
.is-partly { color: var(--amber); }
.is-partly::before {
  box-shadow: inset 0 0 0 3px currentColor;
  background: linear-gradient(to right, currentColor 50%, transparent 50%);
}

/* one choice: what arrives, and what the API can tell from it */
.listing { margin-top: 34px; }
.listing pre {
  margin: 10px 0 0;
  padding: 18px 22px;
  border: 1px solid var(--border);
  border-left: 3px solid var(--fg);
  background: var(--bg-sunken);
  font: 400 23px/1.5 var(--font-mono);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}
.findings { margin-top: 34px; width: 100%; border-collapse: collapse; }
.findings caption { text-align: left; padding-bottom: 12px; }
.findings tr { border-top: 1px solid var(--border); }
.findings tr:first-child { border-top: 2px solid var(--fg); }
.findings th, .findings td { padding: 17px 0; vertical-align: top; text-align: left; }
.findings th { width: 262px; font-size: 27px; font-weight: 600; line-height: 1.35; }
.findings td.v { width: 150px; padding-top: 22px; }
.findings td.n { font-size: 26px; line-height: 1.4; color: var(--fg-muted); }
.so {
  margin-top: 34px;
  padding-left: 22px;
  border-left: 4px solid var(--fg);
  font-size: 31px;
  font-weight: 600;
  line-height: 1.38;
}

/* every choice against every question */
.grid { width: 100%; border-collapse: collapse; }
.grid th, .grid td { padding: 22px 0; text-align: left; vertical-align: middle; }
.grid thead th {
  padding: 0 0 14px;
  font: 500 19px/1.3 var(--font-label);
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--fg-muted);
  vertical-align: bottom;
}
.grid thead th + th { width: 196px; }
.grid tbody tr { border-top: 1px solid var(--border); }
.grid tbody tr:first-child { border-top: 2px solid var(--fg); }
.grid tbody tr:last-child { border-bottom: 1px solid var(--border); }
.grid tbody th { font-size: 31px; font-weight: 600; line-height: 1.25; }

/* the flows, by group; a flow's rating is a marker, named in the key beneath */
.flows h2 { font-size: 50px; }
.flows .lede { font-size: 28px; margin-top: 22px; }
.groups { margin-top: 30px; columns: 2; column-gap: 56px; }
.group { break-inside: avoid; padding-bottom: 30px; }
.group .label { padding-bottom: 8px; border-bottom: 2px solid var(--fg); color: var(--fg); }
.group li, .key span {
  display: flex;
  align-items: center;
  gap: 14px;
  font-size: 25px;
  line-height: 1.3;
  list-style: none;
}
.group li { padding: 9px 0; border-bottom: 1px solid var(--border); font-weight: 500; }
.rating { flex: none; width: 15px; height: 15px; border: 2px solid var(--fg); }
.rating.r0 { background: var(--fg); }
.rating.r1 { background: linear-gradient(to right, var(--fg) 50%, transparent 50%); }
.key { display: flex; gap: 40px; margin-top: 10px; }
.key span { font-size: 22px; color: var(--fg-muted); }

/* the tracker: one bar a status, on one scale. The bars are one color, because
   length is what they say; a status keeps the marker the tracker gives it. */
.count { margin-top: 44px; font: 600 40px/1 var(--font-display); letter-spacing: -0.02em; }
.bars { margin-top: 22px; }
.bar { display: grid; grid-template-columns: 330px 1fr; align-items: center; padding: 22px 0; border-top: 1px solid var(--border); }
.bar:first-child { border-top: 2px solid var(--fg); }
.bar:last-child { border-bottom: 1px solid var(--border); }
.bar b { display: flex; align-items: center; gap: 14px; font-size: 30px; font-weight: 600; }
.bar u { flex: none; width: 15px; height: 15px; }
.bar div { display: flex; align-items: center; gap: 14px; }
.bar i { display: block; height: 36px; border-radius: 0 4px 4px 0; background: var(--fg); }
.bar span { font: 600 30px/1 var(--font-mono); }
.fine { margin-top: 34px; font-size: 28px; line-height: 1.45; color: var(--fg-muted); }

/* three ways in */
.routes { margin-top: 40px; }
.routes li { list-style: none; padding: 26px 0 28px; border-top: 1px solid var(--border); }
.routes li:first-child { border-top: 2px solid var(--fg); }
.routes li:last-child { border-bottom: 1px solid var(--border); }
.routes b { display: block; margin-top: 8px; font-size: 39px; font-weight: 600; line-height: 1.25; }
.routes p { margin-top: 6px; font-size: 28px; line-height: 1.4; color: var(--fg-muted); }
.routes .addr { display: block; margin-top: 10px; }

/* a flow in one of its steps: the diagram in a window, the step beneath it */
.flow-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 24px; }
.flow-head h2 { font-size: 50px; }
.flow-head .label { flex: none; padding-bottom: 8px; }
.ticks { display: flex; gap: 6px; margin-top: 20px; }
.ticks i { flex: 1; height: 8px; border-radius: 2px; background: var(--bg-inset); }
.ticks i.done { background: var(--fg-subtle); }
.ticks i.now { background: var(--accent); }
.window {
  position: relative;
  margin-top: 24px;
  height: var(--window);
  border: 1px solid var(--border-strong);
  border-radius: 2px;
  overflow: hidden;
  background: var(--bg);
}
.window img { position: absolute; left: 0; width: 100%; display: block; }
.window .heads { top: 0; z-index: 1; border-bottom: 1px solid var(--border); background: var(--bg); }
.step { margin-top: 26px; }
.step .label { display: flex; gap: 18px; }
.step .label span:first-child { flex: none; color: var(--fg); }
.route { display: flex; flex-wrap: wrap; align-items: center; gap: 10px 14px; margin-top: 16px; font-size: 27px; font-weight: 600; white-space: nowrap; }
.route .n {
  flex: none;
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border-radius: 50%;
  background: var(--role);
  color: var(--on-accent);
  font: 600 22px/1 var(--font-mono);
}
.route .who { display: inline-flex; align-items: center; gap: 9px; }
.route .who::before { content: ""; width: 15px; height: 15px; border: 2px solid var(--role); background: var(--role-soft); }
.route .to { flex: none; width: 30px; height: 2px; background: var(--fg); position: relative; }
.route .to::after { content: ""; position: absolute; right: -2px; top: -5px; border-left: 9px solid var(--fg); border-top: 6px solid transparent; border-bottom: 6px solid transparent; }
.route .kind { margin-left: auto; font: 500 19px/1 var(--font-label); letter-spacing: 0.08em; text-transform: uppercase; color: var(--fg-muted); }
.step h3 { margin-top: 16px; font-size: 40px; font-weight: 600; line-height: 1.2; letter-spacing: -0.01em; }

/* wide: the question beside the answer */
.wide .main { flex-direction: row; align-items: center; gap: 64px; padding: 30px 0; }
.wide .main > div { flex: 1; min-width: 0; }
.wide h1 { font-size: 62px; }
.wide .lede { font-size: 28px; margin-top: 24px; }
.wide .grid thead th + th { width: 150px; }
.wide .grid tbody th { font-size: 26px; }
.wide .mark { font-size: 22px; }
`;

const top = (tag = "") => `
  <div class="top">
    <div class="brand"><img src="${MARK}" alt="">Who’s on First</div>
    ${tag ? `<div class="tag">${esc(tag)}</div>` : ""}
  </div>`;
// A long address takes the line to itself: both are set in known sizes, so
// whether they fit side by side can be worked out from their lengths.
const foot = (path, note, width) => {
  const fits = (ADDRESS + path).length * 14.5 + note.length * 11 + 40 < width;
  return `
  <div class="foot">
    <div class="addr">${ADDRESS}${esc(path)}</div>
    ${fits ? `<div>${esc(note)}</div>` : ""}
  </div>`;
};
const slide = ({
  tag,
  body,
  path = "",
  note = "",
  cls = "",
  main = "",
  width = TALL.width,
}) => `
  <section class="slide ${cls}">${top(tag)}<div class="main ${main}">${body}</div>${foot(path, note, width - 144)}</section>`;

const chain = (cast, hops) => `
  <div class="chain ${hops ? "said" : ""}">${cast
    .map(
      (a, i) => `
    <div class="node ${a.role}"><strong>${esc(a.label)}</strong><span>${esc(a.sub)}</span></div>
    ${i < cast.length - 1 ? `<div class="hop"><i></i>${hops ? `<span>${esc(hops[i])}</span>` : ""}</div>` : ""}`,
    )
    .join("")}
  </div>`;
const mark = (f) => `<span class="mark ${f.verdict}">${esc(f.word)}</span>`;
const grid = (figure) => `
  <table class="grid">
    <thead><tr><th>${esc(figure.legend)}</th>${figure.questions.map((q) => `<th>${esc(q)}</th>`).join("")}</tr></thead>
    <tbody>${figure.options
      .map(
        (o) =>
          `<tr><th>${esc(o.name)}</th>${o.findings.map((f) => `<td>${mark(f)}</td>`).join("")}</tr>`,
      )
      .join("")}</tbody>
  </table>`;

/** The pages of the carousel. Each also stands as a picture by itself. */
function pages({ home, figure, flows, standards }, flow) {
  const descriptor = home.descriptor;
  const n = (i, of) => `${i} / ${of}`;
  const list = [];

  list.push({
    name: "cover",
    body: `
      <p class="eyebrow">${esc(home.eyebrow)}</p>
      <h1>${esc(home.question)}</h1>
      <p class="lede">${esc(home.lede)}</p>`,
    note: descriptor,
  });

  for (const o of figure.options) {
    list.push({
      name: "choice",
      main: "from-top",
      body: `
        <p class="eyebrow">${esc(figure.legend)}</p>
        <h2>${esc(o.name)}</h2>
        <div style="margin-top:38px">${chain(figure.cast, o.hops)}</div>
        ${
          o.listing
            ? `<div class="listing"><p class="label">${esc(o.listing.caption)}</p><pre>${esc(o.listing.code)}</pre></div>`
            : ""
        }
        <table class="findings">
          <caption class="label">${esc(figure.asks)}</caption>
          ${o.findings
            .map(
              (f, i) =>
                `<tr><th>${esc(figure.questions[i])}</th><td class="v">${mark(f)}</td><td class="n">${words(f.note)}</td></tr>`,
            )
            .join("")}
        </table>
        <p class="so">${esc(o.so)}</p>`,
      path: "/learn/what-the-api-sees",
      note: home.figure,
    });
  }

  list.push({
    name: "three-questions",
    body: `
      <p class="eyebrow">${esc(home.figure)}</p>
      <h2>${esc(home.question)}</h2>
      <div style="margin-top:44px">${chain(figure.cast)}</div>
      <div style="margin-top:44px">${grid(figure)}</div>
      <p class="lede small">${esc(home.lede)}</p>`,
    note: descriptor,
  });

  // How settled each flow is, in the words the flows page uses, from most to least:
  // a full square, a half and an empty one, with the words beside them in the key.
  const ratings = [
    ...new Set(flows.groups.flatMap((g) => g.flows.map((f) => f.rating))),
  ];
  if (ratings.length > 3)
    throw new Error(
      `the flows page has ${ratings.length} ratings, and there are markers for three`,
    );
  const rating = (r) => `<i class="rating r${ratings.indexOf(r)}"></i>`;
  const half = Math.ceil(flows.groups.length / 2);
  list.push({
    name: "flows",
    cls: "flows",
    main: "from-top",
    body: `
      <h2>${esc(flows.title)}</h2>
      <p class="lede">${esc(flows.lede)}</p>
      <div class="groups">${flows.groups
        .map(
          (g, i) => `
        <div class="group" ${i === half ? 'style="break-before:column"' : ""}>
          <p class="label">${esc(g.title)}</p>
          <ul>${g.flows.map((f) => `<li>${rating(f.rating)}${esc(f.name)}</li>`).join("")}</ul>
        </div>`,
        )
        .join("")}
      </div>
      <p class="key">${ratings.map((r) => `<span>${rating(r)}${esc(r)}</span>`).join("")}</p>`,
    path: "/flows",
    note: descriptor,
  });

  const shown = Math.min(
    flow.steps.length - 1,
    Math.floor(flow.steps.length / 2),
  );
  list.push({
    name: "flow",
    main: "from-top",
    body: step(flow, shown, offset(flow, shown)),
    path: `/flows/${flow.slug}`,
    note: flow.tagline.length > 62 ? descriptor : flow.tagline,
  });

  const most = Math.max(...standards.statuses.map((s) => s.count));
  list.push({
    name: "standards",
    main: "from-top",
    body: `
      <h2>${esc(standards.title)}</h2>
      <p class="lede small">${esc(standards.lede)}</p>
      <p class="count">${esc(standards.count)}</p>
      <div class="bars">${standards.statuses
        .map(
          (s) => `
        <div class="bar"><b><u style="background:${s.marker || "none"}"></u>${esc(s.label)}</b><div><i style="width:${((s.count / most) * 80).toFixed(1)}%"></i><span>${s.count}</span></div></div>`,
        )
        .join("")}
      </div>
      <p class="fine">${esc(home.fine)}</p>`,
    path: "/standards",
    note: descriptor,
  });

  list.push({
    name: "routes",
    body: `
      <p class="eyebrow">${esc(home.facts.join(" · "))}</p>
      <h2>${esc(home.start)}</h2>
      <ul class="routes">${home.routes
        .map(
          (r) => `
        <li>
          <span class="label">${esc(r.who)}</span>
          <b>${esc(r.name)}</b>
          <p>${esc(r.what)}</p>
          <span class="addr">${ADDRESS}${esc(r.href.replace(/\/$/, ""))}</span>
        </li>`,
        )
        .join("")}
      </ul>`,
    note: descriptor,
  });

  return list.map((p, i) => ({
    ...p,
    html: slide({ ...p, tag: n(i + 1, list.length) }),
  }));
}

/* ---------- a flow, one step at a time ---------- */

/** The window the diagram is seen through, and how much of the sequence fits in it. */
const WINDOW = 580;
const INNER = TALL.width - 2 * 72 - 2;

/** How far down the sequence the window starts, so that step `i` sits near its middle. */
function offset(flow, i) {
  const scale = INNER / flow.width;
  const headsH = HEADS(flow) * scale;
  const room = WINDOW - headsH;
  const tall = flow.height * scale;
  const want = flow.steps[i].at * tall - room * 0.46;
  return Math.max(0, Math.min(want, tall - room));
}
/** The strip of participants is a fixed height in the diagram's own units. */
const HEADS = () => 64;

function step(flow, i, y) {
  const s = flow.steps[i];
  const scale = INNER / flow.width;
  const headsH = HEADS(flow) * scale;
  const who = (p) => `<span class="who ${p.role}">${esc(p.label)}</span>`;
  return `
    <div class="flow-head">
      <h2>${esc(flow.title)}</h2>
      <p class="label">Step ${i + 1} of ${flow.steps.length}</p>
    </div>
    <div class="ticks">${flow.steps.map((_, k) => `<i class="${k < i ? "done" : k === i ? "now" : ""}"></i>`).join("")}</div>
    <div class="window" style="--window:${WINDOW}px">
      <img class="heads" src="${s.heads}" alt="">
      <img src="${s.lines}" alt="" style="top:${(headsH - y).toFixed(1)}px">
    </div>
    <div class="step">
      <p class="label"><span>${esc(s.part)}</span><span>${esc(s.phase)}</span></p>
      <div class="route ${s.from.role}">
        <span class="n">${i + 1}</span>${who(s.from)}${s.to ? `<span class="to"></span>${who(s.to)}` : ""}
        <span class="kind">${esc(s.kind)}</span>
      </div>
      <h3>${esc(s.title)}</h3>
    </div>`;
}

/* ---------- drawing ---------- */

const doc = (
  size,
  html,
) => `<!doctype html><html lang="en"><head><meta charset="utf-8">
<style>@page { size: ${size.width}px ${size.height}px; margin: 0; } :root { --w: ${size.width}px; --h: ${size.height}px; } ${CSS}</style>
</head><body>${html}</body></html>`;

const written = [];
const note = (file) => {
  const kb = Math.round(statSync(join(out, file)).size / 1024);
  written.push(`${`social/${file}`.padEnd(40)} ${String(kb).padStart(6)} kB`);
};

async function sheet(size, scale = 2) {
  const context = await browser.newContext({
    viewport: size,
    deviceScaleFactor: scale,
    colorScheme: "light",
  });
  const page = await context.newPage();
  const draw = async (html) => {
    await page.setContent(doc(size, html), { waitUntil: "load" });
    await page.evaluate(() => document.fonts.ready);
    // A picture that has outgrown its frame is cut off without a word. Say so.
    const over = await page.evaluate(() =>
      [...document.querySelectorAll(".slide")].flatMap((s, i) => {
        const main = s.querySelector(".main");
        const last = main.lastElementChild?.getBoundingClientRect();
        return last && last.bottom > main.getBoundingClientRect().bottom + 1
          ? [
              `page ${i + 1} runs ${Math.round(last.bottom - main.getBoundingClientRect().bottom)}px past its frame`,
            ]
          : [];
      }),
    );
    return over;
  };
  return { page, draw, close: () => context.close() };
}

const problems = [];
async function picture(file, size, html) {
  const s = await sheet(size);
  for (const p of await s.draw(html)) problems.push(`${file}: ${p}`);
  await s.page.screenshot({ path: join(out, file) });
  await s.close();
  note(file);
}

const site = await readSite();
const flow = await readFlow(FLOW);
const deck = pages(site, flow);

// The carousel: one document, and each page as a picture.
{
  const s = await sheet(TALL, 1);
  for (const p of await s.draw(deck.map((p) => p.html).join("")))
    problems.push(`carousel.pdf: ${p}`);
  await s.page.pdf({
    path: join(out, "carousel.pdf"),
    width: `${TALL.width}px`,
    height: `${TALL.height}px`,
    printBackground: true,
  });
  await s.close();
  note("carousel.pdf");
}
for (const [i, p] of deck.entries())
  await picture(`carousel-${String(i + 1).padStart(2, "0")}.png`, TALL, p.html);

// Pictures that go out alone carry no page number.
const alone = (name) => {
  const p = deck.find((p) => p.name === name);
  return slide({ ...p, tag: "" });
};
await picture("three-questions.png", TALL, alone("three-questions"));
await picture("flows.png", TALL, alone("flows"));
await picture("standards.png", TALL, alone("standards"));
await picture(
  "three-questions-wide.png",
  WIDE,
  slide({
    cls: "wide",
    body: `
      <div>
        <p class="eyebrow">${esc(site.home.eyebrow)}</p>
        <h1>${esc(site.home.question)}</h1>
        <p class="lede">${esc(site.home.lede)}</p>
      </div>
      <div>
        <p class="eyebrow">${esc(site.home.figure)}</p>
        ${chain(site.figure.cast)}
        <div style="margin-top:36px">${grid(site.figure)}</div>
      </div>`,
    note: site.home.descriptor,
    width: WIDE.width,
  }),
);
await picture(
  "repository.png",
  REPOSITORY,
  slide({
    body: `
      <h1 style="font-size:66px">${esc(site.home.question)}</h1>
      <p class="lede small">${esc(site.home.description)}</p>`,
    width: REPOSITORY.width,
  }),
);

// The video: a cover, each step held and then moved on from, and where to find the rest.
const cover = slide({
  tag: "Flow",
  body: `
    <p class="eyebrow">${esc(flow.count)}</p>
    <h1>${esc(flow.title)}</h1>
    <p class="lede">${esc(flow.tagline)}</p>`,
  path: `/flows/${flow.slug}`,
});
await picture(`flow-${flow.slug}-cover.png`, TALL, cover);

if (VIDEO) {
  const has = spawnSync("ffmpeg", ["-version"]).status === 0;
  if (!has) {
    console.log("ffmpeg is not on the path: no video was made.");
  } else {
    const dir = mkdtempSync(join(tmpdir(), "social-"));
    const s = await sheet(TALL, 1);
    const frames = [];
    const frame = async (html, seconds) => {
      const file = join(dir, `${String(frames.length).padStart(4, "0")}.png`);
      for (const p of await s.draw(html))
        tight.add(p.replace(/^page 1/, "a step"));
      await s.page.screenshot({ path: file });
      frames.push({ file, seconds });
    };
    const tight = new Set();
    const at = (i, y) =>
      slide({
        tag: "Flow",
        main: "from-top",
        body: step(flow, i, y),
        path: `/flows/${flow.slug}`,
      });
    await frame(cover, 1.8);
    for (const i of flow.steps.keys()) {
      const to = offset(flow, i);
      const from = i === 0 ? to : offset(flow, i - 1);
      // the diagram glides to the next step; where it does not have to move, it does not
      const moves = Math.abs(to - from) > 0.5 ? GLIDE : 0;
      for (let k = 1; k <= moves; k++) {
        const t = k / (moves + 1);
        const ease = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
        await frame(at(i, from + (to - from) * ease), 1 / FPS);
      }
      await frame(at(i, to), HOLD - moves / FPS);
    }
    await frame(
      slide({
        body: `
          <p class="eyebrow">${esc(site.flows.title)}</p>
          <h1>${esc(site.home.question)}</h1>
          <p class="lede">${esc(site.flows.lede)}</p>`,
        path: "/flows",
        note: site.home.descriptor,
      }),
      3.2,
    );
    await s.close();
    // The last picture is named twice: the format takes a length from the line after it.
    const listing = `${frames.map((f) => `file '${f.file}'\nduration ${f.seconds.toFixed(4)}`).join("\n")}\nfile '${frames.at(-1).file}'\n`;
    writeFileSync(join(dir, "frames.txt"), listing);
    const file = `flow-${flow.slug}.mp4`;
    const made = spawnSync(
      "ffmpeg",
      [
        "-y",
        "-loglevel",
        "error",
        "-f",
        "concat",
        "-safe",
        "0",
        "-i",
        join(dir, "frames.txt"),
        "-vf",
        `fps=${FPS},format=yuv420p`,
        "-c:v",
        "libx264",
        "-preset",
        "slow",
        "-crf",
        "18",
        "-movflags",
        "+faststart",
        join(out, file),
      ],
      { encoding: "utf8" },
    );
    rmSync(dir, { recursive: true, force: true });
    for (const t of tight) problems.push(`${file}: ${t}`);
    if (made.status !== 0)
      problems.push(`${file}: ffmpeg failed. ${made.stderr}`);
    else note(file);
  }
}

await browser.close();
server.close();

console.log(written.join("\n"));
if (problems.length) {
  console.error(`\n${problems.join("\n")}`);
  process.exit(1);
}
