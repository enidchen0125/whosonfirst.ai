#!/usr/bin/env node
/**
 * WCAG contrast audit of the site's colours, in both themes.
 *
 * Reads the colour tokens straight from src/styles/tokens.css and checks each
 * text-on-surface pair the site actually uses. Exits 1 if any text pair falls
 * below 4.5:1, so it can gate a build.
 *
 *   node scripts/contrast-check.mjs            summary
 *   node scripts/contrast-check.mjs --verbose  every pair
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const file = fileURLToPath(
  new URL("../src/styles/tokens.css", import.meta.url),
);
const verbose = process.argv.includes("--verbose");
const AA = 4.5;

const lum = (hex) => {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? [...h].map((c) => c + c).join("") : h;
  const [r, g, b] = [0, 2, 4].map((i) => {
    const c = parseInt(full.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => {
  const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

/** { '--bg': { light: '#fff', dark: '#000' }, … } from the first rule block of the tokens file. */
function tokens(css) {
  const out = {};
  const block = css.slice(css.indexOf("{") + 1, css.indexOf("\n}"));
  for (const m of block.matchAll(
    /(--[\w-]+):\s*light-dark\(\s*(#[0-9a-fA-F]{3,8})\s*,\s*(#[0-9a-fA-F]{3,8})\s*\)/g,
  )) {
    out[m[1]] = { light: m[2], dark: m[3] };
  }
  return out;
}

const HUES = ["red", "blue", "violet", "green", "amber"];
const GROUNDS = ["--bg", "--bg-raised", "--bg-sunken"];

/** [text token, ground token] pairs that carry text somewhere on the site. */
function pairs() {
  const p = [];
  for (const g of GROUNDS)
    for (const t of ["--fg", "--fg-muted", "--fg-subtle", "--accent"])
      p.push([t, g]);
  for (const h of HUES) {
    for (const g of GROUNDS) p.push([`--${h}`, g]); // hue as text or outline label
    p.push([`--${h}`, `--${h}-soft`]); // a role's label on its own tint
    p.push(["--fg", `--${h}-soft`]); // text inside a role box
  }
  p.push(["--fg", "--accent-soft"]); // targeted entry
  p.push(["--on-accent", "--accent"]); // primary button
  return p;
}

let failures = 0;
let checked = 0;
const t = tokens(readFileSync(file, "utf8"));
const missing = pairs()
  .flat()
  .filter((k) => !t[k]);
if (missing.length) {
  console.error(`missing colour tokens: ${[...new Set(missing)].join(", ")}`);
  process.exit(1);
}
for (const theme of ["light", "dark"]) {
  const rows = pairs().map(([fg, bg]) => ({
    fg,
    bg,
    r: ratio(t[fg][theme], t[bg][theme]),
  }));
  const bad = rows.filter((x) => x.r < AA);
  const tightest = rows.reduce((a, b) => (b.r < a.r ? b : a));
  checked += rows.length;
  failures += bad.length;
  const status = bad.length ? `FAIL ${bad.length}` : "pass";
  console.log(
    `${theme.padEnd(5)} ${status.padEnd(7)} tightest ${tightest.r.toFixed(2)}  ${tightest.fg} on ${tightest.bg}`,
  );
  for (const x of verbose ? rows : bad) {
    console.log(
      `    ${x.r < AA ? "✗" : "✓"} ${x.r.toFixed(2).padStart(5)}  ${x.fg} on ${x.bg}`,
    );
  }
  // informational: control outlines are measured against 3:1, hairlines are not held to it
  const outline = ratio(t["--border-strong"][theme], t["--bg"][theme]);
  if (verbose)
    console.log(
      `    · ${outline.toFixed(2).padStart(5)}  --border-strong on --bg (non-text, 3:1 advisory)`,
    );
}

console.log(
  `\n${checked} text pairs checked in two themes, ${failures} below ${AA}:1.`,
);
process.exit(failures ? 1 : 0);
