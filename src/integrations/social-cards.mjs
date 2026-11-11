/**
 * A card for every page: the picture shown where a link to it is shared.
 *
 * After the site is built, each page is read back and drawn as a 1200 × 630 PNG
 * at the address its own `og:image` names: /flows/dpop/ has /og/flows/dpop.png.
 * The card says what the page's title and description say, in the site's type
 * and colors. Text is drawn as outlines, so nothing depends on installed fonts.
 *
 * Also writes /apple-touch-icon.png from the site's icon.
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import satori from "satori";
import sharp from "sharp";
import { builtPages } from "./built-pages.mjs";

const require = createRequire(import.meta.url);
const font = (family, weight) =>
  readFileSync(
    require.resolve(
      `@fontsource/ibm-plex-${family}/files/ibm-plex-${family}-latin-${weight}-normal.woff`,
    ),
  );

const WIDTH = 1200;
const HEIGHT = 630;
const MARGIN_X = 64;
const MARGIN_TOP = 50;
const MARGIN_BOTTOM = 42;
// The light theme's values, from src/styles/tokens.css. A card is seen out of
// context, on someone else's page, so it does not follow a color scheme.
const BG = "#ffffff";
const FG = "#15171a";
const MUTED = "#434850";
const BORDER = "#cfd2d7";
const ACCENT = "#0b3fc4";

/** The site's mark, as in public/favicon.svg, in the light theme's colors. */
const MARK = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32">
  <path d="M16 3.5 28.5 16 16 28.5 3.5 16Z" fill="none" stroke="${FG}" stroke-width="1.8" stroke-linejoin="round"/>
  <rect x="13.6" y="1.1" width="4.8" height="4.8" transform="rotate(45 16 3.5)" fill="${BG}" stroke="${FG}" stroke-width="1.5"/>
  <rect x="1.1" y="13.6" width="4.8" height="4.8" transform="rotate(45 3.5 16)" fill="${BG}" stroke="${FG}" stroke-width="1.5"/>
  <rect x="13.6" y="26.1" width="4.8" height="4.8" transform="rotate(45 16 28.5)" fill="${BG}" stroke="${FG}" stroke-width="1.5"/>
  <rect x="25.2" y="12.7" width="6.6" height="6.6" transform="rotate(45 28.5 16)" fill="${ACCENT}" stroke="${ACCENT}" stroke-width="1.5"/>
</svg>`;
const MARK_URI = `data:image/svg+xml;base64,${Buffer.from(MARK).toString("base64")}`;

/** What kind of page this is, where its address says: the small label at the top right. */
const KINDS = [
  [/^\/learn\/[^/]+\/$/, "Lesson"],
  [/^\/flows\/[^/]+\/$/, "Flow"],
  [/^\/deployments\/[^/]+\/$/, "Deployment guide"],
];

const el = (type, style, children, props = {}) => ({
  type,
  props: { style: { display: "flex", ...style }, children, ...props },
});

/** Cut at a word, so a long description ends cleanly inside its three lines. */
const clip = (text, max) => {
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  return `${cut.slice(0, cut.lastIndexOf(" ")).replace(/[,;:.]$/, "")}…`;
};

function card({ site, descriptor, title, description, kind, address }) {
  const size =
    title.length <= 24
      ? 78
      : title.length <= 44
        ? 66
        : title.length <= 70
          ? 56
          : 48;
  // The drawing library counts padding outside a stated width, so the margins
  // are positions and the column inside them has the exact size that is left.
  const column = el(
    "div",
    {
      position: "absolute",
      left: MARGIN_X,
      top: MARGIN_TOP,
      width: WIDTH - 2 * MARGIN_X,
      height: HEIGHT - MARGIN_TOP - MARGIN_BOTTOM,
      flexDirection: "column",
    },
    [
      el(
        "div",
        {
          alignItems: "center",
          justifyContent: "space-between",
          paddingBottom: 26,
          borderBottom: `2px solid ${FG}`,
        },
        [
          el("div", { alignItems: "center" }, [
            { type: "img", props: { src: MARK_URI, width: 46, height: 46 } },
            el(
              "div",
              {
                marginLeft: 18,
                fontFamily: "IBM Plex Mono",
                fontWeight: 600,
                fontSize: 32,
                letterSpacing: "-0.015em",
              },
              site,
            ),
          ]),
          kind
            ? el(
                "div",
                {
                  fontFamily: "IBM Plex Mono",
                  fontWeight: 500,
                  fontSize: 21,
                  letterSpacing: "0.1em",
                  color: MUTED,
                },
                kind.toUpperCase(),
              )
            : null,
        ],
      ),
      el(
        "div",
        { flexDirection: "column", flexGrow: 1, justifyContent: "center" },
        [
          el(
            "div",
            {
              fontFamily: "IBM Plex Mono",
              fontWeight: 600,
              fontSize: size,
              lineHeight: 1.12,
              letterSpacing: "-0.03em",
            },
            title,
          ),
          el(
            "div",
            { marginTop: 26, fontSize: 31, lineHeight: 1.38, color: MUTED },
            clip(description, title.length > 70 ? 120 : 190),
          ),
        ],
      ),
      el(
        "div",
        {
          alignItems: "baseline",
          justifyContent: "space-between",
          paddingTop: 22,
          borderTop: `1px solid ${BORDER}`,
          fontSize: 22,
        },
        [
          el(
            "div",
            {
              fontFamily: "IBM Plex Mono",
              fontWeight: 500,
              color: ACCENT,
              flexShrink: 0,
            },
            address,
          ),
          // a long address takes the line to itself
          address.length > 38 ? null : el("div", { color: MUTED }, descriptor),
        ],
      ),
    ],
  );
  return el(
    "div",
    {
      width: WIDTH,
      height: HEIGHT,
      backgroundColor: BG,
      color: FG,
      fontFamily: "IBM Plex Sans",
    },
    [column],
  );
}

export default function socialCards() {
  return {
    name: "social-cards",
    hooks: {
      "astro:build:done": async ({ dir, logger }) => {
        const root = fileURLToPath(dir);
        const fonts = [
          {
            name: "IBM Plex Sans",
            weight: 400,
            style: "normal",
            data: font("sans", 400),
          },
          {
            name: "IBM Plex Mono",
            weight: 500,
            style: "normal",
            data: font("mono", 500),
          },
          {
            name: "IBM Plex Mono",
            weight: 600,
            style: "normal",
            data: font("mono", 600),
          },
        ];
        const pages = builtPages(root).filter((p) => p.indexed && p.card);
        const home = pages.find((p) => p.path === "/");
        // "Who’s on First — A field guide to …": the name, then what it is
        const [, descriptor = ""] = home.title.split(" — ");
        let bytes = 0;
        for (const p of pages) {
          const svg = await satori(
            card({
              site: p.site,
              descriptor: p.path === "/" ? "" : descriptor,
              // the home page's card asks the question the site is named for
              title:
                p.path === "/"
                  ? "Who is acting, for whom, and who said they could?"
                  : p.name,
              description: p.description,
              kind: KINDS.find(([re]) => re.test(p.path))?.[1],
              address: `whosonfirst.ai${p.path === "/" ? "" : p.path.replace(/\/$/, "")}`,
            }),
            { width: WIDTH, height: HEIGHT, fonts },
          );
          // few colors and flat areas: a palette keeps each file to a few tens of kilobytes
          const png = await sharp(Buffer.from(svg))
            .png({ palette: true, colors: 64, compressionLevel: 9 })
            .toBuffer();
          const file = join(root, p.card);
          mkdirSync(dirname(file), { recursive: true });
          writeFileSync(file, png);
          bytes += png.length;
        }
        // iOS puts no background behind a home-screen icon, so this one brings its own
        const icon = await sharp(Buffer.from(MARK), {
          density: 72 * (132 / 32),
        })
          .resize(132, 132)
          .extend({ top: 24, bottom: 24, left: 24, right: 24, background: BG })
          .flatten({ background: BG })
          .png({ compressionLevel: 9 })
          .toBuffer();
        writeFileSync(join(root, "apple-touch-icon.png"), icon);
        logger.info(
          `${pages.length} cards in /og/, ${Math.round(bytes / pages.length / 1024)} kB each on average`,
        );
      },
    },
  };
}
