/**
 * Glossary terms, linked where they are used.
 *
 * `inline()` and `block()` in md.ts take a Gloss. With one, the first time a
 * glossary term appears in the text they are given, it becomes a link to its
 * entry that carries the definition with it. A script in the base layout shows
 * that definition in place when the link is activated; without the script it is
 * an ordinary link to the glossary.
 *
 * "The first time" is counted by the Gloss, so whoever renders a piece of the
 * page decides what one reading of it is: a flow page's own text shares one, and
 * each step of its diagram has its own, because steps are read one at a time.
 */
import { glossary } from "../data/glossary";
import { termSlug } from "./term";

/** Too common on this site to be worth marking: every page is about them. */
const UNMARKED = new Set(["agent", "workload", "oauth", "mcp"]);

interface Entry {
  term: string;
  slug: string;
  /** The definition as plain text, for an attribute. */
  def: string;
  /** Where the term is explained at length, if anywhere. */
  home?: string;
  /** Written in capitals, so "AS" does not match "as". */
  exact: boolean;
}

const plain = (md: string) =>
  md
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");

const entries = new Map<string, Entry>();
for (const t of glossary) {
  if (UNMARKED.has(t.term.toLowerCase())) continue;
  const base = {
    term: t.term,
    slug: termSlug(t.term),
    def: plain(t.def),
    home: t.see?.href,
  };
  for (const name of [t.term, ...(t.aka ?? [])]) {
    // claim names such as `aud` are only ever written as code, which is left alone
    if (/^[a-z]{2,4}$/.test(name)) continue;
    entries.set(name.toLowerCase(), {
      ...base,
      exact: /^[A-Z0-9-]{2,6}$/.test(name),
    });
  }
}

const literal = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
// longest first, so "authorization server" wins over "authorization code" only where it is written
const names = [...entries.keys()].sort((a, b) => b.length - a.length);
const PATTERN = new RegExp(
  `(?<![\\w-])(${names.map(literal).join("|")})(s?)(?![\\w-])`,
  "gi",
);

export interface Gloss {
  /** Terms already marked in this reading, by slug. */
  seen: Set<string>;
  /** The page being rendered: a term is not marked on the page that explains it. */
  path?: string;
}

export function gloss(path?: string): Gloss {
  return { seen: new Set(), path };
}

const attr = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;");

/**
 * Marks first uses of glossary terms in a run of text that is already HTML-escaped
 * and has had its code spans and links lifted out, so nothing here can land inside
 * a tag, a code span or another link.
 */
export function mark(text: string, g: Gloss): string {
  return text.replace(PATTERN, (whole, name: string, plural: string) => {
    const e = entries.get(name.toLowerCase());
    if (!e) return whole;
    if (e.exact && name !== name.toUpperCase()) return whole;
    if (g.seen.has(e.slug)) return whole;
    if (e.home && g.path && e.home.split("#")[0] === g.path) return whole;
    g.seen.add(e.slug);
    return `<a class="term" href="/glossary/#${e.slug}" data-term="${attr(e.term)}" data-def="${attr(e.def)}">${name}${plural}</a>`;
  });
}

/** Inside these, text is left alone: it is already a link, is literal, is a heading, or belongs to a control. */
const LEAVE = new Set([
  "a",
  "code",
  "pre",
  "button",
  "summary",
  "label",
  "svg",
  "script",
  "style",
  "h1",
  "h2",
  "h3",
  "h4",
  "th",
  "figure",
]);

/**
 * Marks first uses of glossary terms in rendered HTML: the text of paragraphs and
 * list items, outside the elements above and outside any custom element, whose
 * insides belong to its own script. For pages written in MDX, whose text never
 * passes through md.ts.
 */
export function markHtml(html: string, g: Gloss): string {
  let prose = 0; // depth inside <p> or <li>
  let leave = 0; // depth inside something to leave alone
  return html.replace(
    /<(\/?)([a-zA-Z][\w-]*)([^>]*)>|([^<]+)/g,
    (whole, close: string, tag: string, rest: string, text: string) => {
      if (text !== undefined)
        return prose > 0 && leave === 0 ? mark(text, g) : text;
      const name = tag.toLowerCase();
      if (rest.endsWith("/")) return whole;
      const step = close ? -1 : 1;
      if (name === "p" || name === "li") prose = Math.max(0, prose + step);
      if (LEAVE.has(name) || name.includes("-"))
        leave = Math.max(0, leave + step);
      return whole;
    },
  );
}
