#!/usr/bin/env node
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
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
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");
const axePath = require.resolve("axe-core/axe.min.js");

const root = fileURLToPath(new URL("../dist/", import.meta.url));
if (!existsSync(join(root, "index.html"))) {
  console.error("dist/ is missing. Run `npm run build` first.");
  process.exit(1);
}
const arg = (k, d) =>
  (process.argv.find((a) => a.startsWith(`--${k}=`)) ?? `--${k}=${d}`).split(
    "=",
  )[1];
const verbose = process.argv.includes("--verbose");
const ALL = ["scorecard", "scoreboard", "linemap", "draft", "draft01"];
const directions =
  arg("direction", "draft01") === "all"
    ? ALL
    : arg("direction", "draft01").split(",");

/* ---------- thresholds ---------- */
const AA = 4.5; // text contrast
const MIN_LABEL = 12; // px a diagram label may be drawn at
const MIN_PROSE = 16; // px for running text
const MAX_MEASURE = 82; // characters per line of running text

/* ---------- a static server for dist/ ---------- */
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

/* ---------- what is looked at ---------- */
const FLOW = "/flows/mcp-authorization/";
const PAGES = [
  { path: "/", name: "home" },
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
// past the window, and on every flow, since each flow brings its own
// credentials and labels.
const NARROW = { width: 320, height: 568 };
const NARROW_PAGES = [
  ...new Set([
    ...PAGES.map((p) => p.path),
    "/about/",
    ...readdirSync(join(root, "flows"), { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => `/flows/${d.name}/`)
      .sort(),
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
    const group = el.closest(".step, .actor");
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
    "main .prose p, main .article > p, main .step-body p, main .lede",
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
        reducedMotion: "reduce",
      });
      for (const pg of PAGES) {
        const where = `${direction} ${theme} ${vp.name} ${pg.name}`;
        const page = await ctx.newPage();
        const errors = [];
        page.on("pageerror", (e) => errors.push(String(e)));
        await page.goto(`${origin}${pg.path}?direction=${direction}`, {
          waitUntil: "networkidle",
        });
        await page.evaluate(() => document.fonts.ready);
        // the direction switcher is an exploration aid, not part of the page under test
        await page.addStyleTag({
          content: "design-switcher{display:none!important}",
        });

        record(
          where,
          "no script errors",
          errors.length === 0,
          errors.join("; "),
        );
        if (pg.name === "home") {
          const dest = [
            "/guide/",
            "/flows/",
            "/concepts/",
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
              "header keeps the flow chooser in view",
              closed.includes("/guide/"),
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
                  cs.outlineStyle !== "none" &&
                  parseFloat(cs.outlineWidth) >= 2,
              };
            });
            record(
              where,
              "first menu link takes focus next, with a visible ring",
              focused.href === "/guide/" && focused.outline,
              JSON.stringify(focused),
            );
            await page.keyboard.press("Escape");
            const back = await page.evaluate(() => ({
              expanded: document
                .querySelector(".menu-toggle")
                .getAttribute("aria-expanded"),
              onToggle:
                document.activeElement ===
                document.querySelector(".menu-toggle"),
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
            (v) =>
              `${v.id} (${v.nodes.length}): ${v.nodes[0].target.join(" ")}`,
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
          const first = await page.evaluate(() => {
            const panel = [...document.querySelectorAll(".vb-panel")].find(
              (p) => p.offsetParent,
            );
            const box = document.querySelector(".vb").getBoundingClientRect();
            return panel
              ? {
                  rows: panel.querySelectorAll("tbody tr").length,
                  marks: [...panel.querySelectorAll(".vb-mark")].map((m) =>
                    m.textContent.trim(),
                  ),
                  height: box.height,
                }
              : null;
          });
          record(
            where,
            "explainer shows a complete first state",
            !!first && first.rows === 3,
            first ? first.marks.join(", ") : "not visible",
          );
          record(
            where,
            "explainer fits in one screen",
            !!first && first.height <= vp.height,
            first ? `${Math.round(first.height)}px of ${vp.height}px` : "",
          );
          const pathClean = () =>
            page.evaluate(() => {
              const panel = [...document.querySelectorAll(".vb-panel")].find(
                (e) => e.offsetParent,
              );
              const path = panel.querySelector(".vb-path");
              const box = path.getBoundingClientRect();
              const rects = (s) =>
                [...path.querySelectorAll(s)].map((e) =>
                  e.getBoundingClientRect(),
                );
              const hit = (a, c) =>
                a.left < c.right - 0.5 &&
                c.left < a.right - 0.5 &&
                a.top < c.bottom - 0.5 &&
                c.top < a.bottom - 0.5;
              let bad = 0;
              const labels = rects(".vb-label");
              labels.forEach((l, i) => {
                for (const n of rects(".vb-node")) if (hit(l, n)) bad++;
                labels.forEach((o, j) => {
                  if (j > i && hit(l, o)) bad++;
                });
                if (l.left < box.left - 0.5 || l.right > box.right + 0.5) bad++;
              });
              const broken = [
                ...panel.querySelectorAll(".vb-reads code"),
              ].filter((c) => c.getClientRects().length > 1).length;
              return { bad, broken };
            });
          const keyPath = await pathClean();
          await page.check('.vb input[value="delegated"]', { force: true });
          const second = await page.evaluate(() =>
            [...document.querySelectorAll(".vb-panel")]
              .filter((p) => p.offsetParent)
              .map((p) => p.dataset.credential),
          );
          record(
            where,
            "choosing the other credential changes the panel",
            second.length === 1 && second[0] === "delegated",
            second.join(","),
          );
          const tokenPath = await pathClean();
          record(
            where,
            "explainer path: no label overlaps a box or is clipped, no claim is broken, in either state",
            keyPath.bad + keyPath.broken + tokenPath.bad + tokenPath.broken ===
              0,
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
            "three ways in: guide, roles, flows",
            ["/guide/", "/concepts/#roles", "/flows/"].every((h) =>
              routes.includes(h),
            ),
            routes.join(" "),
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
                document
                  .querySelector(".sx-search input")
                  .getBoundingClientRect().top + scrollY,
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
          if (vp.name === "desktop") {
            // the stepper: measure the diagram at its first, a middle and its last step
            for (const step of [1, Math.ceil(count / 2), count]) {
              await page.evaluate((n) => {
                location.hash = `#step-${n}`;
              }, step);
              await page.waitForTimeout(80);
              const labels = await page.evaluate(diagramLabels);
              const worst = labels.reduce((a, b) =>
                b.ratio < a.ratio ? b : a,
              );
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
              shown: document.querySelectorAll(".flow-step:not([hidden])")
                .length,
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
    await page.goto(`${origin}${path}?direction=${direction}`, {
      waitUntil: "networkidle",
    });
    await page.evaluate(() => document.fonts.ready);
    await page.addStyleTag({
      content: "design-switcher{display:none!important}",
    });
    const over = await page.evaluate(sideways);
    record(
      `${direction} ${NARROW.width}px ${path}`,
      `no sideways overflow at ${NARROW.width}px`,
      over.by <= 0,
      over.by > 0 ? `${over.by}px: ${over.what}` : "",
    );
  }
  await ctx.close();
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
  `\n${directions.join(", ")}: ${PAGES.length} pages × ${VIEWPORTS.length} viewports × ${THEMES.length} themes, and ${NARROW_PAGES.length} pages at ${NARROW.width}px`,
);
for (const [check, { pass, fail }] of byCheck)
  console.log(
    `  ${fail ? "✗" : "✓"} ${String(pass).padStart(3)}/${String(pass + fail).padEnd(3)} ${check}`,
  );
console.log(`\n${results.length} rendered checks, ${failed.length} failed.`);
process.exit(failed.length ? 1 : 0);
