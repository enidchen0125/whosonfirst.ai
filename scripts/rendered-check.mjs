#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
/**
 * Rendered checks: what the token audit cannot see.
 *
 * contrast-check.mjs proves that declared color pairs pass. This script opens
 * the built site in a browser and measures what is actually drawn: the diagram
 * in each of its states, the size labels end up at, how long lines of prose
 * run, whether anything overflows, and whether the pieces a reader depends on
 * are present and work.
 *
 *   npm run build && node scripts/rendered-check.mjs
 *   node scripts/rendered-check.mjs --verbose           list every measurement
 *
 * Needs Chromium for Playwright: `npx playwright install chromium`.
 * Exits 1 if any check fails.
 */
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const axePath = require.resolve("axe-core/axe.min.js");

const root = fileURLToPath(new URL("../dist/client/", import.meta.url));
if (!existsSync(join(root, "index.html"))) {
  console.error("dist/client/ is missing. Run `npm run build` first.");
  process.exit(1);
}
const verbose = process.argv.includes("--verbose");

/* ---------- thresholds ---------- */
const AA = 4.5; // text contrast
const MIN_LABEL = 12; // px a diagram label may be drawn at
const MIN_PROSE = 16; // px for running text
const MAX_MEASURE = 82; // characters per line of running text

/* ---------- a static server for dist/client/ ---------- */
const TYPES = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "text/javascript",
  ".svg": "image/svg+xml",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".xml": "application/xml",
  ".txt": "text/plain",
  ".png": "image/png",
};
/**
 * The headers the host sends with every response: the `/*` block of the built
 * `_headers` file. This server sends them too, so a page that breaks the site's
 * own Content-Security-Policy fails here and not after it is deployed.
 */
const SITE_HEADERS = {};
{
  const file = join(root, "_headers");
  let everywhere = false;
  for (const line of existsSync(file)
    ? readFileSync(file, "utf8").split("\n")
    : []) {
    if (!line.trim() || line.trimStart().startsWith("#")) continue;
    if (!/^\s/.test(line)) {
      everywhere = line.trim() === "/*";
      continue;
    }
    const m = /^\s+([^:]+):\s*(.+)$/.exec(line);
    if (everywhere && m) SITE_HEADERS[m[1].toLowerCase()] = m[2].trim();
  }
}
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
      ...SITE_HEADERS,
      "content-type": TYPES[extname(file)] ?? "application/octet-stream",
    })
    .end(readFileSync(file));
});
await new Promise((r) => server.listen(0, "127.0.0.1", r));
const origin = `http://127.0.0.1:${server.address().port}`;

/* ---------- what is looked at ---------- */
const FLOW = "/flows/mcp-authorization/";
const LESSON = "/learn/tokens/";
const PAGES = [
  { path: "/", name: "home" },
  { path: "/learn/", name: "lessons index" },
  { path: LESSON, name: "lesson" },
  { path: FLOW, name: "flow" },
  { path: "/standards/", name: "standards" },
  { path: "/concepts/", name: "concepts" },
  { path: "/flows/", name: "flows index" },
  { path: "/guide/", name: "decision guide" },
  { path: "/deployments/kubernetes/", name: "deployment guide" },
];
const VIEWPORTS = [
  { name: "desktop", width: 1280, height: 900 },
  { name: "phone", width: 390, height: 844, isMobile: true, hasTouch: true },
];
const THEMES = ["light", "dark"];
// The narrowest window the site is held to: a small phone, or a desktop window
// zoomed to 400%. Only sideways overflow is measured there: on the pages above,
// on the About page, whose long addresses are the first thing to push a page
// past the window, and on every flow and every lesson, since each brings its
// own credentials, labels and figures.
const NARROW = { width: 320, height: 568 };
const under = (dir) =>
  readdirSync(join(root, dir), { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => `/${dir}/${d.name}/`)
    .sort();
const LESSONS = under("learn");
const NARROW_PAGES = [
  ...new Set([
    ...PAGES.map((p) => p.path),
    "/about/",
    ...under("flows"),
    ...LESSONS,
  ]),
];

const results = []; // { where, check, ok, detail }
const record = (where, check, ok, detail = "") =>
  results.push({ where, check, ok, detail });

/* ---------- measurements that run in the page ---------- */

/** Contrast of every label in the sequence diagram as drawn: fill × opacity, over what is behind it. */
const diagramLabels = () => {
  const cv = document.createElement("canvas");
  cv.width = cv.height = 1;
  const ctx = cv.getContext("2d", { willReadFrequently: true });
  const rgba = (css) => {
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = "#000";
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
    const f = (v) => {
      const c = v / 255;
      return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
    };
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
  };
  const ratio = (a, b) => {
    const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
    return (hi + 0.05) / (lo + 0.05);
  };
  const canvas = document.querySelector(".flow-canvas");
  const page = over(
    rgba(getComputedStyle(canvas).backgroundColor),
    rgba(getComputedStyle(document.body).backgroundColor),
  );
  const out = [];
  // the participant strip and the sequence are separate drawings at the same scale
  for (const el of canvas.querySelectorAll("svg text")) {
    const svg = el.ownerSVGElement;
    const scale = svg.getBoundingClientRect().width / svg.viewBox.baseVal.width;
    const cs = getComputedStyle(el);
    let alpha = 1;
    for (let n = el; n && n !== canvas; n = n.parentElement)
      alpha *= Number(getComputedStyle(n).opacity);
    const group = el.closest(".step, .actor, .phase");
    // what is painted behind the label: the row band, a note pill, a filled badge or an actor box
    let ground = page;
    const band = group?.querySelector(".hit");
    if (band) ground = over(rgba(getComputedStyle(band).fill), ground);
    const cls = el.getAttribute("class") ?? "";
    const shape = cls.includes("note-label")
      ? ".note"
      : cls.includes("badge-num")
        ? ".badge"
        : cls.includes("actor-")
          ? ".actor-box"
          : cls.includes("phase-")
            ? ".phase-band"
            : null;
    if (shape)
      ground = over(
        rgba(getComputedStyle(group.querySelector(shape)).fill),
        ground,
      );
    const ink = rgba(cs.fill);
    ink[3] *= alpha;
    out.push({
      text: el.textContent.trim(),
      state: group?.classList.contains("is-active")
        ? "current"
        : group?.classList.contains("is-done")
          ? "done"
          : group?.classList.contains("is-todo")
            ? "to come"
            : "static",
      ratio: ratio(over(ink, ground), ground),
      px: parseFloat(cs.fontSize) * scale,
    });
  }
  return out;
};

/** Size and line length of running text. */
const prose = () => {
  const out = [];
  for (const p of document.querySelectorAll(
    "main .prose p, main .article > p, main .lesson > p, main .step-body p, main .lede",
  )) {
    if (!p.offsetParent) continue;
    const cs = getComputedStyle(p);
    const lines = Math.round(
      p.getBoundingClientRect().height / parseFloat(cs.lineHeight),
    );
    out.push({
      size: parseFloat(cs.fontSize),
      lines,
      perLine: lines >= 3 ? p.textContent.trim().length / lines : 0,
    });
  }
  return out;
};

/** How far the page scrolls sideways and, if it does, what reaches furthest past its right edge. */
const sideways = () => {
  const doc = document.documentElement;
  const by = doc.scrollWidth - doc.clientWidth;
  let far = null;
  if (by > 0) {
    for (const el of document.querySelectorAll("body *")) {
      const right = el.getBoundingClientRect().right;
      if (right <= doc.clientWidth || (far && right < far.right)) continue;
      // what sits in a frame that scrolls or clips sideways does not widen the page
      let framed = false;
      for (
        let a = el.parentElement;
        a && a !== document.body && !framed;
        a = a.parentElement
      )
        framed = getComputedStyle(a).overflowX !== "visible";
      if (!framed) far = { el, right };
    }
  }
  const name = (el) => [el.localName, ...el.classList].join(".");
  return {
    by,
    what: far
      ? `${name(far.el)} “${far.el.textContent.trim().replace(/\s+/g, " ").slice(0, 48)}”`
      : "",
  };
};

/**
 * A scenario figure's path, in the variation showing: how many of its labels overlap
 * a box or another label, or reach outside the figure.
 */
const pathClean = (figure) => {
  const panel = [...document.querySelectorAll(`${figure} .sc-panel`)].find(
    (e) => e.offsetParent,
  );
  const chain = panel.querySelector(".sc-chain");
  const box = chain.getBoundingClientRect();
  const rects = (sel) =>
    [...chain.querySelectorAll(sel)].map((e) => e.getBoundingClientRect());
  const hit = (a, c) =>
    a.left < c.right - 0.5 &&
    c.left < a.right - 0.5 &&
    a.top < c.bottom - 0.5 &&
    c.top < a.bottom - 0.5;
  let bad = 0;
  const labels = rects(".sc-hop");
  labels.forEach((l, i) => {
    for (const n of rects(".sc-node")) if (hit(l, n)) bad++;
    labels.forEach((o, j) => {
      if (j > i && hit(l, o)) bad++;
    });
    if (l.left < box.left - 0.5 || l.right > box.right + 0.5) bad++;
  });
  return bad;
};

/* ---------- checks that need no browser ---------- */

/** Every page of the built site, as { path, html }. */
const built = [];
(function walk(dir, at) {
  for (const d of readdirSync(dir, { withFileTypes: true })) {
    if (d.isDirectory()) walk(join(dir, d.name), `${at}${d.name}/`);
    else if (d.name === "index.html")
      built.push({ path: at, html: readFileSync(join(dir, d.name), "utf8") });
  }
})(root, "/");

// The lessons in reading order, as the lessons index lists them.
const LESSON_ORDER = [
  ...built
    .find((p) => p.path === "/learn/")
    .html.matchAll(/<a href="(\/learn\/[^"/]+\/)"[^>]*>\s*<span class="n"/g),
].map((m) => m[1]);
record(
  "lessons",
  "the lessons index lists every lesson page",
  LESSON_ORDER.length === LESSONS.length &&
    LESSONS.every((l) => LESSON_ORDER.includes(l)),
  `${LESSON_ORDER.length} listed, ${LESSONS.length} built`,
);

// Internal links: the page exists, and so does the anchor on it.
{
  const ids = new Map(
    built.map((p) => [
      p.path,
      new Set([...p.html.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1])),
    ]),
  );
  const broken = [];
  for (const p of built) {
    // links that a script writes into the page at run time are templates, not addresses
    const html = p.html.replace(/<script\b[\s\S]*?<\/script>/g, "");
    for (const [, href] of html.matchAll(/<a\s[^>]*?href="([^"]+)"/g)) {
      if (/^(https?:|mailto:)/.test(href)) continue;
      const url = new URL(href.replaceAll("&amp;", "&"), `http://x${p.path}`);
      const file = url.pathname.endsWith("/")
        ? url.pathname
        : `${url.pathname}/`;
      const anchor = decodeURIComponent(url.hash.slice(1));
      if (!ids.has(file)) {
        if (!existsSync(join(root, url.pathname)))
          broken.push(`${p.path} → ${href} (no such page)`);
      } else if (anchor && !ids.get(file).has(anchor)) {
        broken.push(`${p.path} → ${href} (no such anchor)`);
      }
    }
  }
  record(
    "links",
    "every internal link leads to a page, and every anchor to something on it",
    broken.length === 0,
    broken.slice(0, 12).join("; ") +
      (broken.length > 12 ? `; and ${broken.length - 12} more` : ""),
  );
}

// A line break in a template between a word and an inline element loses its
// space, and the two run together on the page ("calls thisclient credentials").
{
  const run = [];
  for (const p of built) {
    const main = p.html.slice(
      p.html.indexOf("<main"),
      p.html.indexOf("</main>"),
    );
    for (const m of main.matchAll(
      /[A-Za-z,.;:](<(?:strong|em|a|code)\b[^>]*>[^<]{0,24})/g,
    ))
      run.push(`${p.path} “…${m[0].replace(/<[^>]+>/, "|")}”`);
  }
  record(
    "text",
    "no word runs into the inline element after it",
    run.length === 0,
    run.slice(0, 8).join("; ") +
      (run.length > 8 ? `; and ${run.length - 8} more` : ""),
  );
}

// A reader who has learned nothing should not be able to pass the lessons'
// questions by habit: "pick the middle one" or "pick the longest one". Across
// every question with three or more options, the right answer sits in no one
// place, and is neither the longest nor the shortest, more than half the time.
{
  const words = (h) =>
    h
      .replace(/<[^>]+>/g, "")
      .replace(/\s+/g, " ")
      .trim();
  const place = [];
  let total = 0;
  let longest = 0;
  let shortest = 0;
  for (const p of built.filter((b) => LESSONS.includes(b.path))) {
    for (const q of p.html
      .split(/<fieldset[^>]*class="[^"]*\bck-q\b/)
      .slice(1)) {
      const options = [
        ...q
          .split("</fieldset>")[0]
          .matchAll(
            /<li[^>]*class="[^"]*\b(is-right|is-wrong)\b[^>]*>[\s\S]*?class="[^"]*\bck-text\b[^>]*>([\s\S]*?)<\/span>\s*<\/label>/g,
          ),
      ];
      if (options.length < 3) continue;
      const lengths = options.map((m) => words(m[2]).length);
      const right = options.findIndex((m) => m[1] === "is-right");
      total++;
      place[right] = (place[right] ?? 0) + 1;
      if (lengths[right] === Math.max(...lengths)) longest++;
      if (lengths[right] === Math.min(...lengths)) shortest++;
    }
  }
  const most = Math.max(0, ...place.filter(Boolean));
  record(
    "lessons",
    "the right answer to a question cannot be guessed from its place in the list",
    total > 0 && most <= total / 2,
    `of ${total} questions, the right answer is ${place.map((n, i) => `${n ?? 0} times in place ${i + 1}`).join(", ")}`,
  );
  record(
    "lessons",
    "the right answer to a question cannot be guessed from its length",
    total > 0 && longest <= total / 2 && shortest <= total / 2,
    `of ${total} questions, the right answer is the longest in ${longest} and the shortest in ${shortest}`,
  );
}

// The headers every response carries. The browser pass below then holds every
// page to them.
{
  const csp = SITE_HEADERS["content-security-policy"] ?? "";
  const missing = [
    [/default-src 'self'/.test(csp), "a default of this origin only"],
    [/object-src 'none'/.test(csp), "no plugins"],
    [/base-uri 'self'/.test(csp), "a fixed base address"],
    [/frame-ancestors 'none'/.test(csp), "no framing"],
    [SITE_HEADERS["x-content-type-options"] === "nosniff", "nosniff"],
    [!!SITE_HEADERS["referrer-policy"], "a referrer policy"],
  ]
    .filter(([ok]) => !ok)
    .map(([, what]) => what);
  record(
    "headers",
    "every response carries a content security policy and the headers beside it",
    missing.length === 0,
    missing.length ? `missing: ${missing.join(", ")}` : "",
  );
}

// A figure that shows an agent being handed a password is a comparison, and a
// reader can take a comparison for a menu. Wherever that figure appears, the
// choice itself and its panel say not to build it.
{
  const shown = built.filter((p) => p.html.includes('data-option="password"'));
  const unmarked = shown
    .filter(
      (p) =>
        !/value="password"[^>]*>\s*<span[^>]*>[\s\S]{0,240}?class="[^"]*\bsc-flag\b/.test(
          p.html,
        ) ||
        !/data-option="password"[^>]*>[\s\S]{0,600}?class="[^"]*\bsc-avoid\b/.test(
          p.html,
        ),
    )
    .map((p) => p.path);
  record(
    "lessons",
    "handing an agent a password is marked “do not build” wherever it is shown",
    shown.length > 0 && unmarked.length === 0,
    shown.length ? unmarked.join(" ") : "the figure was not found on any page",
  );
}

/* ---------- run ---------- */
const browser = await chromium.launch();

// Every built page, loaded once under the site's own headers.
{
  const ctx = await browser.newContext();
  const page = await ctx.newPage();
  const refused = [];
  let at = "";
  page.on("console", (m) => {
    if (m.type() === "error" && /Content Security Policy/i.test(m.text()))
      refused.push(`${at} ${m.text().slice(0, 140)}`);
  });
  for (const p of built) {
    at = p.path;
    await page.goto(`${origin}${p.path}`, { waitUntil: "networkidle" });
  }
  record(
    "headers",
    "no page loads or runs anything its content security policy refuses",
    refused.length === 0,
    `${built.length} pages` +
      (refused.length
        ? `; ${refused.slice(0, 4).join("; ")}${refused.length > 4 ? `; and ${refused.length - 4} more` : ""}`
        : ""),
  );
  await ctx.close();
}
for (const theme of THEMES) {
  for (const vp of VIEWPORTS) {
    const ctx = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      isMobile: vp.isMobile,
      hasTouch: vp.hasTouch,
      colorScheme: theme,
      reducedMotion: "reduce",
    });
    for (const pg of PAGES) {
      const where = `${theme} ${vp.name} ${pg.name}`;
      const page = await ctx.newPage();
      const errors = [];
      page.on("pageerror", (e) => errors.push(String(e)));
      page.on("console", (m) => {
        if (m.type() === "error" && /Content Security Policy/i.test(m.text()))
          errors.push(m.text().slice(0, 140));
      });
      await page.goto(`${origin}${pg.path}`, { waitUntil: "networkidle" });
      await page.evaluate(() => document.fonts.ready);

      record(where, "no script errors", errors.length === 0, errors.join("; "));
      if (pg.name === "home") {
        const dest = [
          "/learn/",
          "/guide/",
          "/flows/",
          "/deployments/",
          "/standards/",
          "/glossary/",
        ];
        const visibleLinks = () =>
          page.evaluate(() =>
            [...document.querySelectorAll(".site-header a")]
              .filter((a) => {
                const r = a.getBoundingClientRect();
                return r.width > 0 && r.right <= innerWidth && r.left >= 0;
              })
              .map((a) => a.getAttribute("href")),
          );
        if (vp.name === "phone") {
          const closed = await visibleLinks();
          record(
            where,
            "header keeps the lessons in view",
            closed.includes("/learn/"),
            closed.join(" "),
          );
          await page.focus(".menu-toggle");
          await page.keyboard.press("Enter");
          const open = await visibleLinks();
          const size = await page.evaluate(() =>
            Math.min(
              ...[
                ...document.querySelectorAll(
                  ".site-header nav a, .menu-toggle",
                ),
              ].map((el) => el.getBoundingClientRect().height),
            ),
          );
          record(
            where,
            "menu opens from the keyboard and shows every destination",
            dest.every((d) => open.includes(d)),
            open.join(" "),
          );
          record(
            where,
            "menu targets are at least 44px tall",
            size >= 44,
            `smallest ${Math.round(size)}px`,
          );
          await page.keyboard.press("Tab");
          const focused = await page.evaluate(() => {
            const el = document.activeElement;
            const cs = getComputedStyle(el);
            return {
              href: el.getAttribute("href"),
              outline:
                cs.outlineStyle !== "none" && parseFloat(cs.outlineWidth) >= 2,
            };
          });
          record(
            where,
            "first menu link takes focus next, with a visible ring",
            focused.href === "/learn/" && focused.outline,
            JSON.stringify(focused),
          );
          await page.keyboard.press("Escape");
          const back = await page.evaluate(() => ({
            expanded: document
              .querySelector(".menu-toggle")
              .getAttribute("aria-expanded"),
            onToggle:
              document.activeElement === document.querySelector(".menu-toggle"),
          }));
          record(
            where,
            "Escape closes the menu and returns focus to its button",
            back.expanded === "false" && back.onToggle,
            JSON.stringify(back),
          );
        } else {
          const shown = await visibleLinks();
          record(
            where,
            "every destination is in the header",
            dest.every((d) => shown.includes(d)),
            shown.join(" "),
          );
        }
      }
      const overflow = await page.evaluate(
        () =>
          document.documentElement.scrollWidth -
          document.documentElement.clientWidth,
      );
      record(
        where,
        "no sideways overflow",
        overflow <= 0,
        overflow > 0 ? `${overflow}px` : "",
      );

      await page.addScriptTag({ path: axePath });
      const violations = await page.evaluate(async () => {
        const r = await window.axe.run(document, {
          runOnly: {
            type: "tag",
            values: ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"],
          },
        });
        return r.violations.map(
          (v) => `${v.id} (${v.nodes.length}): ${v.nodes[0].target.join(" ")}`,
        );
      });
      record(
        where,
        "axe: no WCAG A/AA violations",
        violations.length === 0,
        violations.join(" | "),
      );

      const text = await page.evaluate(prose);
      if (text.length) {
        const small = Math.min(...text.map((t) => t.size));
        record(
          where,
          `running text at least ${MIN_PROSE}px`,
          small >= MIN_PROSE,
          `smallest ${small.toFixed(1)}px`,
        );
        const long = Math.max(0, ...text.map((t) => t.perLine));
        if (long)
          record(
            where,
            `at most ${MAX_MEASURE} characters a line`,
            long <= MAX_MEASURE,
            `longest ${long.toFixed(0)}`,
          );
      }

      if (pg.name === "home") {
        // The figure in the hero is lesson 1's, without its listings. It has to make
        // its point before anything is clicked, and without a page of scrolling.
        const first = await page.evaluate(() => {
          const fig = document.querySelector(".hero .sc");
          const panel = [...fig.querySelectorAll(".sc-panel")].find(
            (p) => p.offsetParent,
          );
          return panel
            ? {
                rows: panel.querySelectorAll(".sc-findings tbody tr").length,
                marks: [...panel.querySelectorAll(".sc-mark")].map((m) =>
                  m.textContent.trim(),
                ),
                so: panel.querySelector(".sc-so").textContent.trim().length,
                height: fig.getBoundingClientRect().height,
              }
            : null;
        });
        record(
          where,
          "explainer shows a complete first state",
          !!first && first.rows === 3 && first.so > 0,
          first ? first.marks.join(", ") : "not visible",
        );
        // beside the text on a wide screen it fits the window; on a phone, where
        // its path runs down the page, it may run a little past one
        const room = vp.name === "phone" ? vp.height * 1.3 : vp.height;
        record(
          where,
          "explainer fits in about one screen",
          !!first && first.height <= room,
          first
            ? `${Math.round(first.height)}px, allowed ${Math.round(room)}px`
            : "",
        );
        const keyPath = await page.evaluate(pathClean, ".hero .sc");
        await page.check('.hero .sc input[value="token"]', { force: true });
        const second = await page.evaluate(() =>
          [...document.querySelectorAll(".hero .sc-panel")]
            .filter((p) => p.offsetParent)
            .map((p) => p.dataset.option),
        );
        record(
          where,
          "choosing another credential changes the panel",
          second.length === 1 && second[0] === "token",
          second.join(","),
        );
        const tokenPath = await page.evaluate(pathClean, ".hero .sc");
        record(
          where,
          "explainer path: no label overlaps a box or another label, or leaves the figure, in either state",
          keyPath === 0 && tokenPath === 0,
          JSON.stringify({ keyPath, tokenPath }),
        );
        // both answers to "whose authority" are on screen together, before either list of flows
        const au = await page.evaluate(() => {
          const choices = [
            ...document.querySelectorAll(".au-choices label"),
          ].map((l) => l.getBoundingClientRect());
          const branch = [...document.querySelectorAll(".au-branch")].find(
            (b) => b.offsetParent,
          );
          return {
            n: choices.length,
            lastChoiceBottom: Math.max(...choices.map((r) => r.bottom)),
            firstChoiceTop: Math.min(...choices.map((r) => r.top)),
            branchTop: branch?.getBoundingClientRect().top ?? 0,
            shown: [...document.querySelectorAll(".au-branch")]
              .filter((b) => b.offsetParent)
              .map((b) => b.dataset.authority),
          };
        });
        record(
          where,
          "both authority answers shown before either branch",
          au.n === 2 &&
            au.lastChoiceBottom <= au.branchTop &&
            au.lastChoiceBottom - au.firstChoiceTop <= vp.height,
          `${Math.round(au.lastChoiceBottom - au.firstChoiceTop)}px for both`,
        );
        await page.check('.au-choices input[value="agent"]', { force: true });
        const after = await page.evaluate(() =>
          [...document.querySelectorAll(".au-branch")]
            .filter((b) => b.offsetParent)
            .map((b) => b.dataset.authority),
        );
        record(
          where,
          "one branch at a time, switched by the answer",
          au.shown.join() === "person" && after.join() === "agent",
          `${au.shown} then ${after}`,
        );
        const routes = await page.evaluate(() =>
          [...document.querySelectorAll(".routes li > a")].map((a) =>
            a.getAttribute("href"),
          ),
        );
        record(
          where,
          "three ways in: lessons, guide, flows",
          ["/learn/", "/guide/", "/flows/"].every((h) => routes.includes(h)),
          routes.join(" "),
        );
        const path = await page.evaluate(() =>
          [...document.querySelectorAll("ol.path a")].map((a) =>
            a.getAttribute("href"),
          ),
        );
        record(
          where,
          "every lesson is listed, in order",
          path.join() === LESSON_ORDER.join(),
          path.join(" "),
        );
      }

      if (pg.name === "lesson") {
        // the figure: a complete first state, every variation in the table beneath,
        // and a choice that changes what is shown
        const fig = await page.evaluate(() => {
          const sc = document.querySelector(".lesson .sc");
          const shown = () =>
            [...sc.querySelectorAll(".sc-panel")]
              .filter((p) => p.offsetParent)
              .map((p) => p.dataset.option);
          const options = [...sc.querySelectorAll(".sc-choices input")].map(
            (i) => i.value,
          );
          return {
            options,
            first: shown(),
            findings: [...sc.querySelectorAll(".sc-panel")]
              .find((p) => p.offsetParent)
              .querySelectorAll(".sc-findings tbody tr").length,
            glanceRows: sc.querySelectorAll(".sc-glance tbody tr").length,
            glanceMarks: sc.querySelectorAll(".sc-glance .sc-mark").length,
            questions: sc.querySelectorAll(".sc-glance thead th").length - 1,
          };
        });
        record(
          where,
          "figure shows one complete variation before anything is chosen",
          fig.first.length === 1 && fig.findings > 0,
          `${fig.first.join()} with ${fig.findings} answers`,
        );
        record(
          where,
          "every variation is in the table beneath, so nothing depends on clicking",
          fig.glanceRows === fig.options.length &&
            fig.glanceMarks === fig.options.length * fig.questions,
          `${fig.glanceRows} of ${fig.options.length} rows, ${fig.glanceMarks} answers`,
        );
        const last = fig.options.at(-1);
        await page.check(`.lesson .sc input[value="${last}"]`, { force: true });
        const after = await page.evaluate(() =>
          [...document.querySelectorAll(".lesson .sc-panel")]
            .filter((p) => p.offsetParent)
            .map((p) => p.dataset.option),
        );
        record(
          where,
          "choosing a variation shows it, and only it",
          after.join() === last,
          after.join(","),
        );
        const clean = await page.evaluate(pathClean, ".lesson .sc");
        record(
          where,
          "figure path: no label overlaps a box or another label, or leaves the figure",
          clean === 0,
          `${clean} collisions`,
        );
        // check yourself: nothing is given away until an answer is chosen, and the
        // explanation that then appears is the chosen answer's own
        const quiz = await page.evaluate(() => {
          const q = document.querySelector(".ck.closing fieldset");
          const open = () =>
            [...q.querySelectorAll(".ck-why")].filter((w) => w.offsetParent)
              .length;
          const before = open();
          const wrong = q.querySelector("li.is-wrong input");
          wrong.click();
          const afterWrong = [...q.querySelectorAll("li")]
            .filter((li) => li.querySelector(".ck-why").offsetParent)
            .map((li) => li.className);
          q.querySelector("li.is-right input").click();
          const afterRight = [...q.querySelectorAll("li")]
            .filter((li) => li.querySelector(".ck-why").offsetParent)
            .map((li) => li.className);
          return {
            before,
            afterWrong,
            afterRight,
            questions: document.querySelectorAll(".ck.closing fieldset").length,
            right: document.querySelectorAll(".ck.closing li.is-right").length,
          };
        });
        record(
          where,
          "check yourself: no explanation shows until an answer is chosen",
          quiz.before === 0,
          `${quiz.before} showing`,
        );
        record(
          where,
          "check yourself: the chosen answer, and only it, is explained",
          quiz.afterWrong.join() === "is-wrong" &&
            quiz.afterRight.join() === "is-right",
          `${quiz.afterWrong} then ${quiz.afterRight}`,
        );
        record(
          where,
          "check yourself: each question has exactly one right answer",
          quiz.questions > 0 && quiz.right === quiz.questions,
          `${quiz.right} right answers for ${quiz.questions} questions`,
        );
        // the shape every lesson shares
        const shape = await page.evaluate(() => {
          const top = (sel) => {
            const el = document.querySelector(sel);
            return el ? el.getBoundingClientRect().top + scrollY : null;
          };
          return {
            order: [
              top(".lesson .sc"),
              top("#check-yourself"),
              top("#keep"),
              top("#names"),
              top("#deeper"),
              top(".pager"),
            ],
            here: document
              .querySelector(".path a[aria-current='page']")
              ?.getAttribute("href"),
            steps: document.querySelectorAll(".path a").length,
            next: document.querySelector(".pager .next")?.getAttribute("href"),
          };
        });
        record(
          where,
          "lesson runs in its order: figure, questions, what to keep, names, go deeper, next",
          shape.order.every((y) => y !== null) &&
            shape.order.every((y, i) => i === 0 || y > shape.order[i - 1]),
          shape.order
            .map((y) => (y === null ? "missing" : Math.round(y)))
            .join(" "),
        );
        record(
          where,
          "lesson says where it sits among the others, and what comes next",
          shape.here === LESSON &&
            shape.steps === LESSON_ORDER.length &&
            shape.next === LESSON_ORDER[LESSON_ORDER.indexOf(LESSON) + 1],
          `${shape.here} of ${shape.steps}, next ${shape.next}`,
        );
      }

      if (pg.name === "flow" || pg.name === "standards") {
        const facts = await page.evaluate(() => {
          const line = document.querySelector(".page-head .doc-line");
          const more = document.querySelector(".page-head .doc-details");
          return line
            ? {
                text: line.textContent.replace(/\s+/g, " "),
                links: [...line.querySelectorAll("a")].map((a) =>
                  a.getAttribute("href"),
                ),
                closed: more ? !more.open : null,
              }
            : null;
        });
        record(
          where,
          "review date is on the page\u2019s first line of facts",
          !!facts && /reviewed\s*\w+ \d{4}/i.test(facts.text),
          facts ? facts.text.trim() : "no page facts",
        );
        record(
          where,
          "supporting details start closed and open on request",
          !!facts &&
            facts.closed === true &&
            (await page.evaluate(() => {
              const d = document.querySelector(".page-head .doc-details");
              d.querySelector("summary").click();
              return d.open && d.querySelector("dl").offsetParent !== null;
            })),
        );
        if (pg.name === "flow")
          record(
            where,
            "specification is named and linked beside the review date",
            !!facts &&
              facts.links.some((h) => h.startsWith("/standards/#")) &&
              /based on/i.test(facts.text),
            facts?.links.join(" ") ?? "",
          );
        if (pg.name === "standards") {
          const lookup = await page.evaluate(() => ({
            search:
              document.querySelector(".sx-search input").getBoundingClientRect()
                .top + scrollY,
            first:
              document.querySelector(".sx-item").getBoundingClientRect().top +
              scrollY,
            moved:
              document.querySelector("#moved").getBoundingClientRect().top +
              scrollY,
          }));
          record(
            where,
            "search and the first entry are within the first two screens",
            lookup.first < vp.height * 2 && lookup.search < vp.height * 1.5,
            `search at ${Math.round(lookup.search)}px, first entry at ${Math.round(lookup.first)}px`,
          );
          record(
            where,
            "history sits after the lookup",
            lookup.moved > lookup.first,
          );
        }
      }

      if (pg.name === "flow") {
        const count = await page.evaluate(() =>
          Number(document.querySelector(".flow").dataset.count),
        );
        // The overview: the steps in a few parts that between them cover every step,
        // each party's part under its name, and both before the diagram.
        const ov = await page.evaluate(() => {
          const top = (sel) =>
            document.querySelector(sel).getBoundingClientRect().top + scrollY;
          const starts = [...document.querySelectorAll(".ov-phases a")].map(
            (a) => Number(a.getAttribute("href").replace("#step-", "")),
          );
          const parties = [...document.querySelectorAll(".ov-parts > div")].map(
            (d) => ({
              name: d.querySelector("dt").textContent.trim(),
              words: d.querySelector("dd > span").textContent.trim().length,
              steps: d.querySelectorAll(".ov-steps a").length,
            }),
          );
          return {
            starts,
            parties,
            before: top("#in-short") < top("#walkthrough"),
            bands: [...document.querySelectorAll("svg .phase")].map((g) => [
              Number(g.dataset.first) + 1,
              Number(g.dataset.last) + 1,
            ]),
          };
        });
        record(
          where,
          "overview: a few parts, in order, starting at step 1, before the diagram",
          ov.before &&
            ov.starts.length >= 2 &&
            ov.starts[0] === 1 &&
            ov.starts.every((n, i) => i === 0 || n > ov.starts[i - 1]) &&
            ov.starts.at(-1) <= count,
          `parts start at steps ${ov.starts.join(", ")} of ${count}`,
        );
        record(
          where,
          "overview: each party's part is said, with the steps it takes part in",
          ov.parties.length >= 2 &&
            ov.parties.every((p) => p.words > 20 && p.steps > 0),
          ov.parties.map((p) => `${p.name} (${p.steps})`).join("; "),
        );
        record(
          where,
          "diagram is divided into the same parts, and they cover every step",
          ov.bands.length === ov.starts.length &&
            ov.bands.every(([first], i) => first === ov.starts[i]) &&
            ov.bands.every(
              ([, last], i) => last === (ov.starts[i + 1] ?? count + 1) - 1,
            ),
          ov.bands.map((b) => b.join("–")).join(" "),
        );
        // A glossary term in the text shows its definition in place, and goes away again.
        const term = await page.evaluate(async () => {
          const settle = () => new Promise((r) => setTimeout(r, 60));
          const a = document.querySelector(".intro a.term");
          if (!a) return null;
          a.scrollIntoView({ block: "center" });
          await settle();
          a.click();
          await settle();
          const tip = document.querySelector("#term-tip");
          const r = tip.getBoundingClientRect();
          const open = {
            shown: tip.matches(":popover-open"),
            says: tip.querySelector(".term-tip-def")?.textContent.length ?? 0,
            expanded: a.getAttribute("aria-expanded"),
            inWindow:
              r.left >= 0 &&
              r.right <= innerWidth + 0.5 &&
              r.top >= 0 &&
              r.bottom <= innerHeight + 0.5,
            more: tip.querySelector("a")?.getAttribute("href"),
            href: a.getAttribute("href"),
          };
          a.click();
          await settle();
          return {
            ...open,
            terms: document.querySelectorAll("main a.term").length,
            closed: !tip.matches(":popover-open"),
            collapsed: a.getAttribute("aria-expanded"),
          };
        });
        record(
          where,
          "a glossary term shows its definition in place, inside the window",
          !!term &&
            term.shown &&
            term.says > 20 &&
            term.expanded === "true" &&
            term.inWindow &&
            term.more === term.href,
          term ? `${term.terms} terms marked on the page` : "no term marked",
        );
        record(
          where,
          "the definition goes away when its term is pressed again",
          !!term && term.closed && term.collapsed === "false",
        );
        if (vp.name === "desktop") {
          // the stepper: measure the diagram at its first, a middle and its last step
          for (const step of [1, Math.ceil(count / 2), count]) {
            await page.evaluate((n) => {
              location.hash = `#step-${n}`;
            }, step);
            await page.waitForTimeout(80);
            const labels = await page.evaluate(diagramLabels);
            const worst = labels.reduce((a, b) => (b.ratio < a.ratio ? b : a));
            record(
              where,
              `diagram at step ${step}: every label at least ${AA}:1 as drawn`,
              worst.ratio >= AA,
              `lowest ${worst.ratio.toFixed(2)} (“${worst.text}”, ${worst.state})`,
            );
            const tiny = labels.reduce((a, b) => (b.px < a.px ? b : a));
            record(
              where,
              `diagram at step ${step}: labels drawn at ${MIN_LABEL}px or more`,
              tiny.px >= MIN_LABEL - 0.05,
              `smallest ${tiny.px.toFixed(1)}px (“${tiny.text}”)`,
            );
            const held = await page.evaluate(() => {
              const li = [...document.querySelectorAll(".flow-step")].find(
                (s) => !s.hidden,
              );
              return {
                shown: document.querySelectorAll(".flow-step:not([hidden])")
                  .length,
                route: li
                  ?.querySelector(".step-route")
                  ?.textContent.replace(/\s+/g, " ")
                  .trim(),
              };
            });
            record(
              where,
              `step ${step}: one step shown, with who is talking to whom`,
              held.shown === 1 && !!held.route,
              held.route ?? "",
            );
          }
          // a link to a step (from the overview, or from elsewhere) brings the diagram into view
          await page.evaluate(() => scrollTo(0, 0));
          await page.click(".ov-phases li:nth-child(2) a");
          await page.waitForTimeout(150);
          const linked = await page.evaluate(() => {
            const r = document.querySelector(".flow").getBoundingClientRect();
            return {
              count: document.querySelector(".flow-count").textContent,
              inView: r.top < innerHeight * 0.5 && r.bottom > 0,
              phase: document
                .querySelector(".flow-step:not([hidden]) .step-phase-n")
                ?.textContent.trim(),
              active: document.querySelectorAll("svg .phase.is-active").length,
            };
          });
          record(
            where,
            "a part's link shows its first step, with the diagram in view and the part marked",
            linked.inView &&
              linked.count.startsWith(`Step ${ov.starts[1]} `) &&
              /^Part 2 of/.test(linked.phase ?? "") &&
              linked.active === 1,
            JSON.stringify(linked),
          );
          // the last part starts a screen or more down the diagram: its row has to be
          // brought into view too, not only the top of the diagram
          await page.evaluate(() => scrollTo(0, 0));
          await page.click(".ov-phases li:last-child a");
          await page.waitForTimeout(200);
          const late = await page.evaluate(() => {
            const row = document
              .querySelector("svg .step.is-active .hit")
              .getBoundingClientRect();
            const canvas = document
              .querySelector(".flow-canvas")
              .getBoundingClientRect();
            const header = document
              .querySelector(".site-header")
              .getBoundingClientRect().bottom;
            const top = Math.max(header, canvas.top);
            const bottom = Math.min(innerHeight, canvas.bottom);
            return {
              count: document.querySelector(".flow-count").textContent,
              inView: row.top >= top - 1 && row.bottom <= bottom + 1,
              row: [Math.round(row.top), Math.round(row.bottom)],
              window: [Math.round(top), Math.round(bottom)],
            };
          });
          record(
            where,
            "a link to a late part leaves that step\u2019s row in view in the diagram",
            late.inView && late.count.startsWith(`Step ${ov.starts.at(-1)} `),
            JSON.stringify(late),
          );
          await page.evaluate((n) => {
            location.hash = `#step-${n}`;
          }, count);
          await page.waitForTimeout(80);
          // keyboard: Left and Right step, Down is left to scrolling, and focus is never stranded
          // (the loop above ends on the last step, where Next is disabled and Previous is not)
          await page.focus('[data-act="prev"]');
          await page.keyboard.press("ArrowLeft");
          const afterLeft = await page.evaluate(
            () => document.querySelector(".flow-count").textContent,
          );
          await page.keyboard.press("ArrowDown");
          const afterDown = await page.evaluate(
            () => document.querySelector(".flow-count").textContent,
          );
          record(
            where,
            "arrow keys: Left steps back, Down does not change the step",
            afterLeft.includes(`${count - 1} of`) && afterDown === afterLeft,
            `${afterLeft} | ${afterDown}`,
          );
          await page.click('[data-act="next"]');
          const handed = await page.evaluate(() => ({
            disabled: document.querySelector('[data-act="next"]').disabled,
            onPrev:
              document.activeElement ===
              document.querySelector('[data-act="prev"]'),
          }));
          record(
            where,
            "last step: focus moves from the disabled Next to Previous",
            handed.disabled && handed.onPrev,
            JSON.stringify(handed),
          );
          const holders = await page.evaluate(
            () => document.querySelectorAll(".flow-step .held dt").length,
          );
          record(
            where,
            "steps say who holds which credential",
            holders > 0,
            `${holders} holder entries`,
          );
        } else {
          // the phone: a narrative of every step, with the diagram on demand at full size
          const state = await page.evaluate(() => ({
            shown: document.querySelectorAll(".flow-step:not([hidden])").length,
            open: document.querySelector(".flow-stage").open,
            summary: !!document.querySelector(".flow-stage > summary")
              ?.offsetParent,
          }));
          record(
            where,
            "every step is readable as a narrative",
            state.shown === count,
            `${state.shown} of ${count}`,
          );
          record(
            where,
            "diagram is offered on demand, not forced",
            !state.open && state.summary,
          );
          await page.click(".flow-stage > summary");
          await page.waitForTimeout(80);
          const labels = await page.evaluate(diagramLabels);
          const tiny = Math.min(...labels.map((l) => l.px));
          record(
            where,
            `opened diagram keeps labels at ${MIN_LABEL}px or more`,
            tiny >= MIN_LABEL - 0.05,
            `smallest ${tiny.toFixed(1)}px`,
          );
          const worst = labels.reduce((a, b) => (b.ratio < a.ratio ? b : a));
          record(
            where,
            `opened diagram: every label at least ${AA}:1 as drawn`,
            worst.ratio >= AA,
            `lowest ${worst.ratio.toFixed(2)} (“${worst.text}”)`,
          );
          const still = await page.evaluate(
            () =>
              document.documentElement.scrollWidth -
              document.documentElement.clientWidth,
          );
          record(
            where,
            "opened diagram scrolls inside its own frame",
            still <= 0,
            still > 0 ? `${still}px` : "",
          );
          await page.click(".flow-back button");
          await page.waitForTimeout(80);
          const left = await page.evaluate(() => {
            const s = document.querySelector(".flow-stage > summary");
            const r = s.getBoundingClientRect();
            return {
              open: document.querySelector(".flow-stage").open,
              focus: document.activeElement === s,
              inView: r.top >= 0 && r.bottom <= innerHeight,
            };
          });
          record(
            where,
            "leaving the diagram closes it and lands on its control, in view",
            !left.open && left.focus && left.inView,
            JSON.stringify(left),
          );
        }
      }
      await page.close();
    }
    await ctx.close();
  }
}
// the narrowest window: nothing scrolls sideways, on the pages above or on any flow
const ctx = await browser.newContext({
  viewport: NARROW,
  isMobile: true,
  hasTouch: true,
  reducedMotion: "reduce",
});
const page = await ctx.newPage();
for (const path of NARROW_PAGES) {
  await page.goto(`${origin}${path}`, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  const over = await page.evaluate(sideways);
  record(
    `${NARROW.width}px ${path}`,
    `no sideways overflow at ${NARROW.width}px`,
    over.by <= 0,
    over.by > 0 ? `${over.by}px: ${over.what}` : "",
  );
}
await ctx.close();
// color theme: the page follows the system setting, live, and a theme picked
// with the header button lasts only until the system setting next changes
{
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 900 },
    colorScheme: "light",
  });
  const page = await ctx.newPage();
  await page.goto(`${origin}/`, { waitUntil: "networkidle" });
  const settle = () =>
    page.evaluate(
      () =>
        new Promise((r) =>
          requestAnimationFrame(() => requestAnimationFrame(r)),
        ),
    );
  const read = async () => {
    await settle();
    return page.evaluate(() => {
      const [r, g, b] = getComputedStyle(document.body)
        .backgroundColor.match(/[\d.]+/g)
        .map(Number);
      return {
        dark: r + g + b < 384,
        picked: document.documentElement.dataset.theme ?? null,
        stored: localStorage.getItem("theme"),
      };
    });
  };
  const steps = [];
  const step = async (name, want) => {
    const got = await read();
    const ok =
      got.dark === want.dark &&
      got.picked === want.picked &&
      got.stored === want.picked;
    steps.push(ok ? null : `${name}: ${JSON.stringify(got)}`);
  };
  await step("light system", { dark: false, picked: null });
  await page.emulateMedia({ colorScheme: "dark" });
  await step("system changes to dark", { dark: true, picked: null });
  await page.emulateMedia({ colorScheme: "light" });
  await page.click("button.theme");
  await step("button on a light system", { dark: true, picked: "dark" });
  await page.reload({ waitUntil: "networkidle" });
  await step("reload keeps the choice", { dark: true, picked: "dark" });
  await page.emulateMedia({ colorScheme: "dark" });
  await step("system changes to dark: choice dropped", {
    dark: true,
    picked: null,
  });
  await page.emulateMedia({ colorScheme: "light" });
  await step("system changes to light: page follows", {
    dark: false,
    picked: null,
  });
  const wrong = steps.filter(Boolean);
  record(
    "theme",
    "theme follows the system setting, and a picked theme ends when it changes",
    wrong.length === 0,
    wrong.join("; "),
  );
  await ctx.close();
}
// decision guide: after "Start over", an answer chosen before can be chosen again at once
{
  const ctx = await browser.newContext({
    viewport: { width: 1280, height: 900 },
  });
  const page = await ctx.newPage();
  const again = [];
  for (const url of ["/guide/", "/guide/?principal=user"]) {
    await page.goto(`${origin}${url}`, { waitUntil: "networkidle" });
    const answer = page.locator(
      'decision-guide input[name="principal"][value="user"]',
    );
    if (!(await answer.isChecked())) await answer.check({ force: true });
    await page.click('decision-guide button[type="reset"]');
    await answer.click({ force: true });
    await page.waitForTimeout(50);
    again.push(await answer.isChecked());
  }
  record(
    "decision guide",
    "an answer can be chosen again straight after Start over",
    again.every(Boolean),
    again.every(Boolean) ? "" : `selected after one click: ${again.join(", ")}`,
  );
  await ctx.close();
}
// comparison on a flow page: a table where there is room, blocks of labeled fields where there
// is not. One of the two is shown, and only that one reaches assistive technology.
{
  const url = "/flows/workload-identity-federation/";
  for (const [width, shown, hidden] of [
    [320, ".compare-narrow", ".compare-wide"],
    [375, ".compare-narrow", ".compare-wide"],
    [1280, ".compare-wide", ".compare-narrow"],
  ]) {
    const ctx = await browser.newContext({ viewport: { width, height: 800 } });
    const page = await ctx.newPage();
    await page.goto(`${origin}${url}`, { waitUntil: "networkidle" });
    const seen = await page.evaluate(
      ([shown, hidden]) => {
        const box = (sel) => {
          const el = document.querySelector(sel);
          return {
            display: getComputedStyle(el).display,
            sideways: el.scrollWidth - el.clientWidth,
          };
        };
        const blocks = [...document.querySelectorAll(".compare-narrow .env")];
        return {
          shown: box(shown),
          hidden: box(hidden),
          rows: document.querySelectorAll(".compare tbody tr").length,
          blocks: blocks.length,
          // every value in a block sits under a label of its own
          unlabeled: blocks.filter((b) =>
            [...b.querySelectorAll("dl > div")].some(
              (d) =>
                d.querySelectorAll("dt").length !== 1 ||
                d.querySelectorAll("dd").length !== 1 ||
                !d.querySelector("dt").textContent.trim(),
            ),
          ).length,
        };
      },
      [shown, hidden],
    );
    const tree = await page
      .locator('section[aria-labelledby="comparison"]')
      .ariaSnapshot();
    const tables = tree.split("- table").length - 1;
    const terms = tree.split("- term").length - 1;
    const narrow = shown === ".compare-narrow";
    const problems = [
      seen.shown.display === "none" && `${shown} is not shown`,
      seen.hidden.display !== "none" && `${hidden} is also shown`,
      seen.shown.sideways > 1 &&
        `${shown} scrolls sideways by ${seen.shown.sideways}px`,
      seen.rows !== seen.blocks &&
        `${seen.rows} table rows but ${seen.blocks} blocks`,
      seen.unlabeled > 0 &&
        `${seen.unlabeled} blocks have a value without one label`,
      narrow && tables > 0 && "the hidden table is exposed",
      narrow && terms === 0 && "the blocks expose no labels",
      !narrow && terms > 0 && "the hidden blocks are exposed",
      !narrow && tables !== 1 && `${tables} tables exposed`,
    ].filter(Boolean);
    record(
      `${width}px ${url}`,
      "comparison: one presentation shown and exposed, each value under its label",
      problems.length === 0,
      problems.join("; "),
    );
    await ctx.close();
  }
}
await browser.close();
server.close();

/* ---------- report ---------- */
const failed = results.filter((r) => !r.ok);
const byCheck = new Map();
for (const r of results) {
  const key = r.check.replace(/step \d+/g, "step N");
  const row = byCheck.get(key) ?? { pass: 0, fail: 0 };
  row[r.ok ? "pass" : "fail"]++;
  byCheck.set(key, row);
}
if (verbose)
  for (const r of results)
    console.log(
      `${r.ok ? "✓" : "✗"} ${r.where.padEnd(44)} ${r.check}${r.detail ? `  — ${r.detail}` : ""}`,
    );
else
  for (const r of failed)
    console.log(
      `✗ ${r.where.padEnd(44)} ${r.check}${r.detail ? `  — ${r.detail}` : ""}`,
    );
console.log(
  `\n${PAGES.length} pages × ${VIEWPORTS.length} viewports × ${THEMES.length} themes, and ${NARROW_PAGES.length} pages at ${NARROW.width}px`,
);
for (const [check, { pass, fail }] of byCheck)
  console.log(
    `  ${fail ? "✗" : "✓"} ${String(pass).padStart(3)}/${String(pass + fail).padEnd(3)} ${check}`,
  );
console.log(`\n${results.length} rendered checks, ${failed.length} failed.`);
process.exit(failed.length ? 1 : 0);
