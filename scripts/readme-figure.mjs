#!/usr/bin/env node
/**
 * The picture at the top of the README: one flow's diagram as the built site
 * draws it, in each theme. GitHub shows whichever matches the reader's.
 *
 *   npm run build && node scripts/readme-figure.mjs
 *
 * Run it again when the diagram's design changes, and commit the two files it
 * writes to docs/images/. Needs Chromium for Playwright, as the rendered
 * checks do.
 */
import { existsSync, mkdirSync, readFileSync, statSync } from "node:fs";
import { createServer } from "node:http";
import { createRequire } from "node:module";
import { extname, join, normalize } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const { chromium } = require("playwright");

/** The flow drawn. The README's picture links to the same page. */
const FLOW = "dpop";
const MARGIN = 24; // px of page around the diagram

const root = fileURLToPath(new URL("../dist/client/", import.meta.url));
const out = fileURLToPath(new URL("../docs/images/", import.meta.url));
if (!existsSync(join(root, "flows", FLOW, "index.html"))) {
  console.error("dist/client/ is missing. Run `npm run build` first.");
  process.exit(1);
}
mkdirSync(out, { recursive: true });

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

const browser = await chromium.launch();
for (const colorScheme of ["light", "dark"]) {
  const context = await browser.newContext({
    viewport: { width: 1280, height: 1000 },
    deviceScaleFactor: 2,
    colorScheme,
  });
  const page = await context.newPage();
  await page.goto(`${origin}/flows/${FLOW}/`, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
  // Measured against the whole page, which is what a full-page clip is cut from.
  const box = await page.locator("flow-diagram").evaluate((el) => {
    const r = el.getBoundingClientRect();
    return {
      x: r.x + scrollX,
      y: r.y + scrollY,
      width: r.width,
      height: r.height,
    };
  });
  const path = join(out, `flow-${FLOW}-${colorScheme}.png`);
  await page.screenshot({
    path,
    fullPage: true,
    clip: {
      x: box.x - MARGIN,
      y: box.y - MARGIN,
      width: box.width + 2 * MARGIN,
      height: box.height + 2 * MARGIN,
    },
  });
  console.log(
    `${path.slice(out.length - "docs/images/".length)}  ${Math.round(statSync(path).size / 1024)} kB`,
  );
  await context.close();
}
await browser.close();
server.close();
