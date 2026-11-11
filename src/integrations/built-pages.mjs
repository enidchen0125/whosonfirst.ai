/**
 * The pages of the built site, read back from disk.
 *
 * The integrations beside this file make a second form of each page: a card for
 * where a link is shared, a copy in Markdown for a program that reads. Both
 * start from the page as built, so neither can say something the page does not.
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const ENTITIES = {
  amp: "&",
  lt: "<",
  gt: ">",
  quot: '"',
  apos: "'",
  nbsp: " ",
};
/** Text from an attribute or a title, with its character references read. */
export const decode = (s) =>
  s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, ref) => {
    if (ref[0] !== "#") return ENTITIES[ref.toLowerCase()] ?? whole;
    const code =
      ref[1].toLowerCase() === "x"
        ? Number.parseInt(ref.slice(2), 16)
        : Number.parseInt(ref.slice(1), 10);
    return String.fromCodePoint(code);
  });

/** One attribute of the first element in `head` that `test` matches. */
const attribute = (head, test, name) => {
  for (const [tag] of head.matchAll(/<(?:meta|link)\b[^>]*>/g)) {
    if (!test.test(tag)) continue;
    const m = new RegExp(`\\s${name}="([^"]*)"`).exec(tag);
    if (m) return decode(m[1]);
  }
  return undefined;
};

/**
 * Every page under `root`, in address order:
 * { path, slug, html, title, name, description, card, markdown, indexed }.
 * `name` is the title without the site's name after it. `card` and `markdown`
 * are the addresses the page itself gives for its two other forms, or undefined.
 */
export function builtPages(root) {
  const pages = [];
  (function walk(dir, at) {
    for (const d of readdirSync(dir, { withFileTypes: true })) {
      if (d.isDirectory()) walk(join(dir, d.name), `${at}${d.name}/`);
      else if (d.name === "index.html") {
        const html = readFileSync(join(dir, d.name), "utf8");
        const head = html.slice(0, html.indexOf("</head>"));
        const title = decode(/<title>([^<]*)<\/title>/.exec(head)?.[1] ?? "");
        const site = attribute(head, /property="og:site_name"/, "content");
        const card = attribute(head, /property="og:image"/, "content");
        pages.push({
          path: at,
          slug: at.replace(/^\/|\/$/g, "") || "index",
          html,
          title,
          site,
          // "Token exchange — Who’s on First" is "Token exchange"; the home page's
          // title starts with the site's name and is left whole
          name:
            site && title.endsWith(` — ${site}`)
              ? title.slice(0, -site.length - 3)
              : title,
          description: attribute(head, /name="description"/, "content") ?? "",
          card: card && new URL(card).pathname,
          markdown: attribute(head, /type="text\/markdown"/, "href"),
          indexed: !/<meta name="robots" content="[^"]*noindex/.test(head),
        });
      }
    }
  })(root, "/");
  return pages.sort((a, b) => a.path.localeCompare(b.path));
}
