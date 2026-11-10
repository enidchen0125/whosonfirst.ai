#!/usr/bin/env node
/**
 * Builds the publishable design system from the site's own sources.
 *
 *   src/styles/directions/*.css  →  tokens.json (one pair of themes per direction)
 *   src/styles/global.css        →  components/bundle.css (plus each direction's rules)
 *   design-system/**             →  README, component guidelines and previews
 *   dist/ (a built site)         →  the sequence diagram used in one preview
 *
 * Output: design-system/out/project/. Run `npm run build` first, then
 * `npm run ds:build`. Nothing here is hand-copied, so the published system
 * cannot drift from the stylesheet.
 */
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = (p) => readFileSync(join(root, p), "utf8");
const out = join(root, "design-system/out/project");
rmSync(join(root, "design-system/out"), { recursive: true, force: true });
const write = (p, text) => {
  mkdirSync(dirname(join(out, p)), { recursive: true });
  writeFileSync(join(out, p), text);
};

const DIRECTIONS = [
  { id: "scorecard", name: "Scorecard" },
  { id: "scoreboard", name: "Scoreboard" },
  { id: "linemap", name: "Line Map" },
  { id: "draft", name: "Internet-Draft" },
];

/* ---------- read each direction's token block ---------- */
const css = Object.fromEntries(
  DIRECTIONS.map((d) => [d.id, src(`src/styles/directions/${d.id}.css`)]),
);
const tokenBlock = (text) =>
  text.slice(text.indexOf("{") + 1, text.indexOf("\n}"));
const colours = {}; // id -> { name: {light, dark} }
const others = {}; // id -> [ [name, value] ] for non-colour tokens
for (const d of DIRECTIONS) {
  const block = tokenBlock(css[d.id]).replace(/\/\*[\s\S]*?\*\//g, "");
  colours[d.id] = {};
  others[d.id] = [];
  for (const decl of block.split(";")) {
    const m = /^\s*(--[\w-]+):\s*([\s\S]+?)\s*$/.exec(decl);
    if (!m) continue;
    const ld =
      /^light-dark\(\s*(#[0-9a-fA-F]{3,8})\s*,\s*(#[0-9a-fA-F]{3,8})\s*\)$/.exec(
        m[2],
      );
    if (ld) colours[d.id][m[1].slice(2)] = { light: ld[1], dark: ld[2] };
    else others[d.id].push([m[1], m[2].replace(/\s+/g, " ")]);
  }
}

/* ---------- tokens.json ---------- */
const USAGE = {
  bg: "The page.",
  "bg-raised": "Cards, panels and code blocks that sit on `bg`.",
  "bg-sunken":
    "Wells, hovered rows and the footer. In Scoreboard and Line Map, the band behind page titles.",
  "bg-inset": "The deepest surface step. Rare.",
  fg: "Body text and headings on `bg`, `bg-raised`, `bg-sunken`, `accent-soft` and every soft hue.",
  "fg-muted":
    "Ledes, captions and secondary text on `bg`, `bg-raised` and `bg-sunken`.",
  "fg-subtle":
    "The lightest text allowed, on `bg`, `bg-raised` and `bg-sunken`. Counts and fine print.",
  border:
    "Hairlines between rows and around cards. Supplementary, so it is not held to 3:1.",
  "border-strong": "Control outlines and rules that must be seen.",
  accent:
    "Links, focus rings, the primary button and the current item, on `bg`, `bg-raised` and `bg-sunken`. Never a role.",
  "accent-soft": "The highlight behind a targeted entry. Carries `fg`.",
  "on-accent": "Text on an `accent` fill.",
  red: "Human principals. Also danger, “no” and cautions. Text and outlines on `bg`, `bg-raised`, `bg-sunken` and `red-soft`.",
  "red-soft": "Fill for human role boxes and red chips. Carries `fg` or `red`.",
  blue: "Agents and clients. Also working group drafts. Text and outlines on `bg`, `bg-raised`, `bg-sunken` and `blue-soft`. Teal in Internet-Draft, to stay clear of link blue.",
  "blue-soft":
    "Fill for agent role boxes and blue chips. Carries `fg` or `blue`.",
  violet:
    "Authorization servers and issuers. Also projects. Text and outlines on `bg`, `bg-raised`, `bg-sunken` and `violet-soft`.",
  "violet-soft":
    "Fill for authorization role boxes and violet chips. Carries `fg` or `violet`.",
  green:
    "Resources. Also success, “yes” and published standards. Text and outlines on `bg`, `bg-raised`, `bg-sunken` and `green-soft`. Teal in Scoreboard, where plain green is the ground.",
  "green-soft":
    "Fill for resource role boxes and green chips. Carries `fg` or `green`.",
  amber:
    "Infrastructure. Also “partly”, individual drafts and out-of-band messages. Text and outlines on `bg`, `bg-raised`, `bg-sunken` and `amber-soft`.",
  "amber-soft":
    "Fill for infrastructure role boxes and amber chips. Carries `fg` or `amber`.",
};
const themes = DIRECTIONS.flatMap((d) => [
  { id: `${d.id}-light`, name: `${d.name} · light` },
  { id: `${d.id}-dark`, name: `${d.name} · dark` },
]);
const colourTokens = Object.keys(USAGE).map((name) => {
  const value = {};
  for (const d of DIRECTIONS) {
    const c = colours[d.id][name];
    if (!c) throw new Error(`${d.id}: missing colour token --${name}`);
    value[`${d.id}-light`] = c.light.toLowerCase();
    value[`${d.id}-dark`] = c.dark.toLowerCase();
  }
  return { name, value, usage: USAGE[name] };
});

const tok = (id, name) => Object.fromEntries(others[id])[name];
const rem = (n) => `${Math.round(n * 1000) / 1000}rem`;
const FAMILY = {
  "display-scorecard":
    'Fraunces, "Iowan Old Style", "Palatino Linotype", Georgia, serif',
  "body-scorecard":
    '"IBM Plex Sans", system-ui, -apple-system, "Segoe UI", sans-serif',
  "mono-plex":
    '"IBM Plex Mono", ui-monospace, "SF Mono", Menlo, Consolas, monospace',
  "display-scoreboard":
    '"Big Shoulders Display", "Arial Narrow", Impact, sans-serif',
  "body-scoreboard": 'Barlow, system-ui, -apple-system, "Segoe UI", sans-serif',
  archivo: 'Archivo, "Helvetica Neue", Helvetica, Arial, sans-serif',
  "mono-jetbrains":
    '"JetBrains Mono", ui-monospace, "SF Mono", Menlo, Consolas, monospace',
};
const TYPE = {
  scorecard: {
    display: "display-scorecard",
    body: "body-scorecard",
    label: "mono-plex",
    mono: "mono-plex",
    note: "A soft serif for headings, a humanist sans for reading, and a mono for labels and code.",
  },
  scoreboard: {
    display: "display-scoreboard",
    body: "body-scoreboard",
    label: "body-scoreboard",
    mono: "mono-plex",
    note: "Condensed capitals for page and section titles only. Everything read at length is Barlow.",
  },
  linemap: {
    display: "archivo",
    body: "archivo",
    label: "archivo",
    mono: "mono-jetbrains",
    note: "One grotesque family. Headings are heavy and tight; labels are semi-condensed capitals.",
  },
  draft: {
    display: "mono-plex",
    body: "mono-plex",
    label: "mono-plex",
    mono: "mono-plex",
    note: "One monospaced face for everything, as in a plain-text RFC. Hierarchy comes from weight and space.",
  },
};
const groups = DIRECTIONS.map((d) => {
  const t = TYPE[d.id];
  const scale = Number(tok(d.id, "--display-scale"));
  const weight = Number(tok(d.id, "--display-weight"));
  const caps =
    tok(d.id, "--display-transform") === "uppercase" ? " Set in capitals." : "";
  return {
    name: d.name,
    family: t.display,
    note: t.note,
    styles: [
      {
        name: `${d.id}-display`,
        fontSize: rem(3.9 * scale),
        lineHeight: 1.12,
        fontWeight: weight,
        letterSpacing: tok(d.id, "--display-tracking-tight"),
        sample: "Who’s on first?",
        usage: `Page titles.${caps}`,
      },
      {
        name: `${d.id}-title`,
        fontSize: rem(2.2 * scale),
        lineHeight: 1.12,
        fontWeight: weight,
        letterSpacing: tok(d.id, "--display-tracking"),
        sample: "Delegation or impersonation",
        usage: `Section headings.${caps}`,
      },
      {
        name: `${d.id}-heading`,
        fontSize: "1.3rem",
        lineHeight: 1.12,
        fontWeight: d.id === "scoreboard" ? 700 : weight,
        sample: "The agent redeems the code directly",
        usage: "Card and step headings. Sentence case in every direction.",
      },
      {
        name: `${d.id}-body`,
        family: t.body,
        fontSize: tok(d.id, "--body-size"),
        lineHeight: Number(tok(d.id, "--body-leading")),
        fontWeight: 400,
        sample:
          "A service that needs to call another gets a new token for that hop.",
        usage: "Running text, at most 44rem wide.",
      },
      {
        name: `${d.id}-label`,
        family: t.label,
        fontSize: "0.74rem",
        lineHeight: 1,
        fontWeight: d.id === "scorecard" || d.id === "draft" ? 500 : 600,
        letterSpacing: "0.08em",
        sample: "HUMAN PRESENT · 14 STEPS",
        usage: "Eyebrows, chips, buttons and column heads. Always capitals.",
      },
      {
        name: `${d.id}-code`,
        family: t.mono,
        fontSize: "0.875em",
        lineHeight: 1.55,
        fontWeight: 400,
        sample: "grant_type=client_credentials",
        usage:
          "Claims, parameters and headers inline; requests and tokens in blocks.",
      },
    ],
  };
});

write(
  "tokens.json",
  JSON.stringify(
    {
      name: "whosonfirst-ds-exploration",
      version: 1,
      meta: { source: "code", generatedBy: "scripts/build-design-system.mjs" },
      color: { themes, tokens: colourTokens },
      type: { fonts: [], families: FAMILY, groups },
      spacing: {
        note: "Layout measures shared by every direction. The site has no stepped spacing scale yet.",
        tokens: [
          {
            name: "gutter-min",
            value: "1rem",
            usage:
              "Side padding on a phone. The gutter grows with the viewport.",
          },
          {
            name: "gutter-max",
            value: "2.5rem",
            usage: "Side padding on a wide screen.",
          },
          {
            name: "prose",
            value: "44rem",
            usage: "The widest running text gets: about 70 characters a line.",
          },
          {
            name: "wide",
            value: "72rem",
            usage: "The widest a page gets. Diagrams and grids use all of it.",
          },
        ],
      },
      radius: {
        note: "Each direction has one radius for boxes and one for chips.",
        tokens: DIRECTIONS.flatMap((d) => [
          {
            name: `radius-${d.id}`,
            value: tok(d.id, "--radius"),
            usage: `Cards, buttons and code blocks in ${d.name}.`,
          },
          {
            name: `pill-${d.id}`,
            value: tok(d.id, "--radius-pill"),
            usage: `Chips and segmented choices in ${d.name}.`,
          },
        ]),
      },
    },
    null,
    1,
  ),
);

/* ---------- components/bundle.css ---------- */
const googleNames = (s) =>
  s.replace(/'([^']+) Variable'/g, "'$1', '$1 Variable'");
let bundle = `/* whosonfirst-ds-exploration — generated by scripts/build-design-system.mjs from the site's stylesheets.
   Colours come from tokens.css. Everything else a direction changes is set here, keyed on the theme id. */
[data-theme$='-light'] { color-scheme: light; }
[data-theme$='-dark'] { color-scheme: dark; }
`;
for (const d of DIRECTIONS) {
  bundle += `\n/* ${d.name}: type, shape and title band */\n:root[data-theme^='${d.id}'] {\n`;
  for (const [name, value] of others[d.id])
    bundle += `  ${name}: ${googleNames(value)};\n`;
  bundle += "}\n";
}
// the base stylesheet, without its own colour-scheme switches
bundle +=
  "\n" +
  src("src/styles/global.css")
    .replace(/:root\[data-theme='(light|dark)'\] \{[^}]*\}\n/g, "")
    .replace("color-scheme: light dark;\n", "");
// each direction's own rules, re-keyed from data-direction to the theme id
for (const d of DIRECTIONS) {
  const text = css[d.id];
  const rules = text.slice(text.indexOf("\n}") + 2);
  if (!rules.trim()) continue;
  bundle +=
    `\n/* ${d.name}: rules of its own */\n` +
    rules.replaceAll(
      `:root[data-direction='${d.id}']`,
      `:root[data-theme^='${d.id}']`,
    );
  // a title band that forces the dark palette needs the dark values spelled out here
  if (/:is\(\.page-head, \.hero\) \{[^}]*color-scheme: dark/.test(rules)) {
    bundle += `:root[data-theme^='${d.id}'] :is(.page-head, .hero) {\n`;
    for (const [name, v] of Object.entries(colours[d.id]))
      bundle += `  --${name}: ${v.dark};\n`;
    // and the band backgrounds declared again, so the colours they refer to are the band's own
    for (const [name, value] of others[d.id])
      if (/^--(page-head|hero)-bg$/.test(name))
        bundle += `  ${name}: ${value};\n`;
    bundle += "}\n";
  }
}
write("components/bundle.css", bundle);

/* ---------- README, guidelines, previews ---------- */
const FONTS = [
  "Fraunces:ital,opsz,wght@0,9..144,100..900;1,9..144,100..900",
  "IBM+Plex+Sans:ital,wght@0,400;0,500;0,600;1,400",
  "IBM+Plex+Mono:ital,wght@0,400;0,500;0,600;1,400",
  "Big+Shoulders+Display:wght@100..900",
  "Barlow:ital,wght@0,400;0,500;0,600;1,400",
  "Archivo:ital,wdth,wght@0,62..125,100..900;1,62..125,100..900",
  "JetBrains+Mono:wght@100..800",
]
  .map(
    (f) =>
      `<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=${f}&display=swap">`,
  )
  .join("\n");

// the real sequence diagram, from the built site
const flowPage = join(root, "dist/flows/client-credentials/index.html");
if (!existsSync(flowPage))
  throw new Error("Build the site first: npm run build");
const html = readFileSync(flowPage, "utf8");
const canvas = html.slice(html.indexOf('class="flow-canvas"'));
const flowSvg = canvas
  .slice(canvas.indexOf("<svg"), canvas.indexOf("</svg>") + 6)
  .replace(/ data-astro-cid-[a-z0-9]+(="")?/g, "");
const flowAstro = src("src/components/FlowDiagram.astro");
const flowCss = flowAstro
  .slice(
    flowAstro.lastIndexOf("<style>") + 7,
    flowAstro.lastIndexOf("</style>"),
  )
  .replace(/:global\(([^)]*)\)/g, "$1");

write("README.md", src("design-system/README.md"));
for (const name of readdirSync(join(root, "design-system/components"))) {
  const dir = `design-system/components/${name}`;
  for (const file of readdirSync(join(root, dir))) {
    let text = src(`${dir}/${file}`);
    if (file.endsWith(".html")) {
      text = text
        .replace("{{FONTS}}", FONTS)
        .replace("{{FLOW_SVG}}", flowSvg)
        .replace("{{FLOW_CSS}}", flowCss);
      if (!text.startsWith("<!-- @dsCard"))
        throw new Error(`${dir}/${file}: line 1 must be the @dsCard marker`);
    }
    write(`components/${name}/${file}`, text);
  }
}

/* ---------- the index ---------- */
const now = new Date().toISOString().replace(/\.\d+Z$/, "Z");
const assets = join(root, "design-system/assets.json"); // upload records, written after the first publish
const assetGroups = existsSync(assets)
  ? JSON.parse(readFileSync(assets, "utf8"))
  : {};
write(
  "design-system.json",
  JSON.stringify(
    {
      v: 3,
      layout: "files",
      createdOnFiles: { v: 1, at: process.env.DS_CREATED_AT ?? now },
      title: "whosonfirst-ds-exploration",
      namespace: "WhosOnFirst",
      libraries: [],
      sections: {},
      groups: Object.keys(assetGroups),
      assetGroups,
      blobs: {},
      docs: { sections: [] },
      lastChange: {
        by: process.env.DS_BY ?? "Kevin Swiber",
        at: now,
        via: "Claude Code",
        note: process.env.DS_NOTE ?? "Built from the site’s token files.",
      },
    },
    null,
    1,
  ),
);
if (existsSync(join(root, "design-system/assets")))
  cpSync(join(root, "design-system/assets"), join(out, "assets"), {
    recursive: true,
    filter: (p) => !/\.(svg|png|jpe?g|webp|gif|pdf|mp4|webm)$/i.test(p),
  });

const count = (dir) =>
  readdirSync(dir, { withFileTypes: true }).reduce(
    (n, e) => n + (e.isDirectory() ? count(join(dir, e.name)) : 1),
    0,
  );
console.log(
  `design system written to design-system/out/project (${count(out)} files, ${themes.length} themes, ${colourTokens.length} colour tokens)`,
);
