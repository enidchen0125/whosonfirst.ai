/**
 * Every page again as Markdown, for a program that reads: an agent, a crawler,
 * a model asked a question about the site.
 *
 * After the site is built, each page is read back and its content, without the
 * site's header, footer, controls and drawings, is written beside it at the
 * address the page's own `<link rel="alternate" type="text/markdown">` names:
 * /flows/dpop/ has /flows/dpop/index.md. Two more files are made from those:
 *
 *   /llms.txt        what the site is and a link to every page's Markdown
 *   /llms-full.txt   all of the pages in one file, in reading order
 *
 * The Markdown is made from the page as built, never from the data behind it, so
 * it cannot say anything the page does not. What a page shows only in a drawing
 * it also says in words (a diagram's steps, a figure's table), and the words are
 * what is kept.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import rehypeParse from "rehype-parse";
import rehypeRemark from "rehype-remark";
import remarkGfm from "remark-gfm";
import remarkStringify from "remark-stringify";
import { unified } from "unified";
import { SKIP, visit } from "unist-util-visit";
import { builtPages } from "./built-pages.mjs";

/* ---------- reading the page ---------- */

const classes = (node) => node.properties?.className ?? [];
const is = (node, ...names) =>
  node.type === "element" && names.includes(node.tagName);
/** Whether the node has one of these classes. "nav.path" is that class on that element only. */
const has = (node, ...names) =>
  names.some((n) => {
    const [tag, cls] = n.includes(".") ? n.split(".") : [undefined, n];
    return (!tag || node.tagName === tag) && classes(node).includes(cls);
  });
const text = (node) =>
  node.type === "text" ? node.value : (node.children ?? []).map(text).join("");
const element = (tagName, properties, children) => ({
  type: "element",
  tagName,
  properties,
  children,
});

const find = (node, test) => {
  if (test(node)) return node;
  for (const child of node.children ?? []) {
    const found = find(child, test);
    if (found) return found;
  }
  return undefined;
};

/** Nothing here is content: it draws, or it is a control that only a script answers. */
const DRAWN = [
  "script",
  "style",
  "svg",
  "button",
  "input",
  "select",
  "textarea",
  "template",
  "canvas",
];
/**
 * Parts of a page that help a reader move around it or operate it, by class.
 * The words they would add to the Markdown are already there in another form.
 */
const CHROME = [
  "article-toc", // a guide's list of its own sections
  "toc", // the same on Concepts
  "also", // "also on this page"
  "flow-stage", // the sequence diagram; its steps follow as text
  "flow-controls",
  "flow-progress",
  "gl-tools", // the glossary's filter and its row of letters
  "fl-filter", // the flows index's filter
  "sx-filters", // the standards tracker's search and filters
  "sx-empty",
  "nav.path", // the strip of lesson numbers at the head of a lesson
  "sc-choices", // a figure's buttons; every choice follows in full
  "dg-results", // where the decision guide's script writes; its rules follow in full
  "eyebrow", // the small label over a title
  "ov-n", // a number the list it sits in already counts
  "span.n",
  "path-n",
  "step-phase", // which part a step belongs to; "In short" lists the parts
  "held-note", // the same footnote under every step
];
/** Facts set side by side in a row. In a line of text they need something between them. */
const ROW = [
  "doc-fact",
  "chip",
  "ref",
  "held-chip",
  "step-route",
  "step-kind",
  "when",
];
/** Inline elements. Two of these side by side with nothing between were set apart by layout. */
const PHRASING = [
  "a",
  "abbr",
  "b",
  "em",
  "i",
  "kbd",
  "small",
  "span",
  "strong",
  "time",
];
const BLOCKS = [
  "div",
  "p",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "ul",
  "ol",
  "dl",
  "table",
  "pre",
  "header",
  "section",
];

const say = (value) => ({ type: "text", value });

/** A flow's steps are a list on the page. As text each is a section: its number and title, then who calls whom. */
function steps(list) {
  list.tagName = "div";
  for (const step of list.children.filter((c) => is(c, "li"))) {
    step.tagName = "div";
    const meta = step.children.find((c) => has(c, "step-meta"));
    const title = step.children.find((c) => is(c, "h3"));
    if (!meta || !title) continue;
    const number = meta.children.find((c) => has(c, "step-num"));
    title.children.unshift(say(`${text(number).trim()}. `));
    meta.children = meta.children.filter((c) => c !== number);
    // the arrow is drawn for the eye and "to" is said for a screen reader: text gets the arrow
    visit(meta, "element", (node) => {
      if (has(node, "step-route"))
        node.children = node.children
          .filter((c) => !has(c, "visually-hidden"))
          .flatMap((c, i) => (i ? [say(" → "), c] : [c]));
    });
    step.children = [
      title,
      meta,
      ...step.children.filter((c) => c !== title && c !== meta),
    ];
  }
}

/** A list of terms with what each means: one line a term, the term in bold. */
function terms(list) {
  const items = [];
  let term;
  const walk = (nodes) => {
    for (const node of nodes) {
      if (is(node, "div")) walk(node.children);
      else if (is(node, "dt")) term = node;
      else if (is(node, "dd")) {
        const blocks = node.children.some((c) => is(c, ...BLOCKS));
        const name = element("strong", {}, term?.children ?? []);
        items.push(
          element(
            "li",
            {},
            blocks
              ? [element("p", {}, [name]), ...node.children]
              : [name, say(": "), ...node.children],
          ),
        );
        term = undefined;
      }
    }
  };
  walk(list.children);
  list.tagName = "ul";
  list.children = items;
}

/**
 * The decision guide answers with a script, from rules the page carries as data.
 * A reader with no script is given the rules themselves, in the page's own words
 * for each question and answer.
 */
function guideRules(main) {
  const data = find(main, (n) => is(n, "script") && has(n, "dg-data"));
  if (!data) return [];
  const { rules, cautions, roles, flows } = JSON.parse(text(data));
  const questions = {};
  visit(main, "element", (set) => {
    if (!is(set, "fieldset")) return;
    const legend = set.children.find((c) => is(c, "legend"));
    visit(set, "element", (label) => {
      const input = is(label, "label") && find(label, (n) => is(n, "input"));
      if (!input) return;
      const name = input.properties.name;
      questions[name] ??= {
        title: text({
          children: legend.children.filter((c) => !has(c, "dg-num")),
        }).trim(),
        answers: {},
      };
      const q = questions[name];
      q.answers[input.properties.value] = text(
        find(label, (n) => is(n, "strong")),
      ).trim();
    });
  });
  const conditions = (when) =>
    element(
      "ul",
      {},
      Object.entries(when).map(([q, values]) =>
        element("li", {}, [
          say(
            `${questions[q].title} ${values.map((v) => questions[q].answers[v]).join(", or ")}`,
          ),
        ]),
      ),
    );
  const out = [
    element("h2", {}, [say("The rules")]),
    element("p", {}, [
      say(
        "On the page, a script turns the answers into recommendations. These are the rules it applies. A rule applies when every question it names that has been answered has one of the answers listed, and at least one of them has been answered. A question left unanswered rules nothing out. A flow is shown once, under the strongest heading any of its rules gives it.",
      ),
    ]),
  ];
  for (const [role, title] of Object.entries(roles)) {
    const mine = rules
      .filter((r) => r.role === role)
      .sort((a, b) => (b.weight ?? 0) - (a.weight ?? 0));
    if (!mine.length) continue;
    out.push(
      element("h3", {}, [say(title)]),
      element(
        "ul",
        {},
        mine.map((r) =>
          element("li", {}, [
            element("p", {}, [
              element("strong", {}, [
                element("a", { href: `/flows/${r.flow}/` }, [
                  say(flows[r.flow].short),
                ]),
              ]),
              say(`: ${r.why}`),
            ]),
            conditions(r.when),
          ]),
        ),
      ),
    );
  }
  out.push(
    element("h3", {}, [say("Cautions")]),
    element(
      "ul",
      {},
      cautions.map((c) =>
        element("li", {}, [
          element("p", {}, [say(c.text)]),
          conditions(c.when),
        ]),
      ),
    ),
  );
  return out;
}

function prepare(main, page, site) {
  main.children.push(...guideRules(main));

  // A drawing that has a name is given as its name: that is what the name is for.
  visit(main, "element", (node) => {
    if (
      node.properties?.role === "img" &&
      node.properties.ariaLabel &&
      !is(node, "svg")
    ) {
      const name = String(node.properties.ariaLabel);
      node.tagName = "p";
      node.properties = {};
      node.children = [element("em", {}, [say(name)])];
      return SKIP;
    }
  });

  // 1. What is not content goes.
  visit(main, "element", (node, index, parent) => {
    const p = node.properties ?? {};
    if (
      DRAWN.includes(node.tagName) ||
      p.hidden !== undefined ||
      p.ariaHidden === "true" ||
      has(node, ...CHROME)
    ) {
      parent.children.splice(index, 1);
      return [SKIP, index];
    }
  });

  visit(main, "element", (node, index, parent) => {
    // A set of choices with the choices gone is a label for nothing.
    if (
      is(node, "fieldset") &&
      node.children.every((c) => c.type !== "element" || is(c, "legend"))
    ) {
      parent.children.splice(index, 1);
      return [SKIP, index];
    }
    if (is(node, "ol") && has(node, "flow-steps")) steps(node);
    // A list whose entries have headings is a run of sections, and reads as one.
    if (
      is(node, "ul", "ol") &&
      node.children.some((li) => find(li, (n) => is(n, "h2", "h3", "h4")))
    ) {
      node.tagName = "div";
      for (const li of node.children) if (is(li, "li")) li.tagName = "div";
    }
    // Choices side by side are a list of choices.
    const labels = node.children.filter((c) => is(c, "label"));
    if (labels.length > 1) {
      const list = element(
        "ul",
        {},
        labels.map((l) => element("li", {}, l.children)),
      );
      node.children = node.children.flatMap((c) =>
        c === labels[0] ? [list] : labels.includes(c) ? [] : [c],
      );
    }
    if (is(node, "dl")) terms(node);
    // A table whose rows are each headed needs a first row to be a table in
    // Markdown. Its caption says what the rows are, so the caption heads it.
    if (is(node, "table") && !find(node, (n) => is(n, "thead"))) {
      const caption = node.children.find((c) => is(c, "caption"));
      const row = find(node, (n) => is(n, "tr"));
      if (
        caption &&
        row &&
        !row.children.every((c) => c.type !== "element" || is(c, "th"))
      ) {
        const cells = row.children.filter((c) => c.type === "element");
        node.children.unshift(
          element("thead", {}, [
            element(
              "tr",
              {},
              cells.map((_, i) => element("th", {}, i ? [] : caption.children)),
            ),
          ]),
        );
      }
    }
    // A reference card names the standard under its status. As text, the name comes first.
    if (
      is(node, "article") &&
      is(
        node.children.find((c) => c.type === "element"),
        "header",
      )
    ) {
      const [head, ...rest] = node.children.filter((c) => c.type === "element");
      const at = rest.findIndex((c) => is(c, "h2", "h3", "h4")) + 1;
      node.children = [
        ...rest.slice(0, at),
        element("p", {}, head.children),
        ...rest.slice(at),
      ];
    }
    // A question in a set of choices is its heading, and its number wants a period.
    if (is(node, "legend")) {
      node.tagName = "p";
      node.children = [element("strong", {}, node.children)];
    }
    if (has(node, "dg-num", "ck-num")) node.children.push(say("."));
    // A note beside a fact, and the steps a part covers, are asides.
    if (has(node, "doc-note", "ov-r", "ov-steps", "aka"))
      node.children = [say("("), ...node.children, say(")")];
    // "new" marks a credential a step has just handed over. It reads better after the name.
    if (has(node, "held-chip")) {
      const flag = node.children.find((c) => has(c, "held-flag"));
      if (flag)
        node.children = [
          ...node.children.filter((c) => c !== flag),
          say(" (new)"),
        ];
    }
    // 2. A glossary term in running text is a link to its definition. Read
    //    straight through, a page of them is harder to follow than the words.
    if (is(node, "a") && has(node, "term")) {
      parent.children.splice(index, 1, ...node.children);
      return [SKIP, index];
    }
    // 3. Addresses are whole, so a copy of this text still leads somewhere.
    if (is(node, "a") && typeof node.properties.href === "string")
      node.properties.href = new URL(
        node.properties.href,
        new URL(page.path, site),
      ).href;
    // 4. A card is one link around a heading and a paragraph. Markdown has no
    //    such thing: the link goes on the card's first line.
    if (is(node, "a") && node.children.some((c) => is(c, ...BLOCKS))) {
      const first = node.children.find((c) => c.type === "element");
      first.children = [
        element("a", { href: node.properties.href }, first.children),
      ];
      node.tagName = "div";
      node.properties = {};
    }
    // 5. A code sample says what language it is in.
    if (is(node, "pre") && node.properties.dataLanguage) {
      const lang = String(node.properties.dataLanguage);
      node.children = [
        element(
          "code",
          { className: lang === "plaintext" ? [] : [`language-${lang}`] },
          [{ type: "text", value: text(node) }],
        ),
      ];
    }
  });

  // 6. Pieces that only layout kept apart ("1" beside "What the API sees") get
  //    the space between them that the page shows, and facts in a row a mark.
  //    A span is always such a piece here: emphasis, links and code in running
  //    text are other elements, and the site's own check keeps those spaced.
  visit(main, "element", (node) => {
    if (is(node, "pre", "code")) return SKIP;
    for (let i = node.children.length - 1; i > 0; i--) {
      const [a, b] = [node.children[i - 1], node.children[i]];
      const piece = (n) =>
        is(n, "span") || (n.type === "text" && /\S/.test(n.value));
      const apart =
        (is(a, ...PHRASING) && is(b, ...PHRASING)) ||
        ((is(a, "span") || is(b, "span")) && piece(a) && piece(b));
      if (
        !apart ||
        /\s$/.test(text(a)) ||
        /^(\s|[,.;:)])/.test(text(b)) ||
        /[(“]$/.test(text(a))
      )
        continue;
      node.children.splice(
        i,
        0,
        say(has(a, ...ROW) && has(b, ...ROW) ? " · " : " "),
      );
    }
  });
  return main;
}

/* ---------- writing it ---------- */

const toMarkdown = unified()
  .use(rehypeRemark)
  // cells are not padded to line up: the padding is most of a wide table's size
  .use(remarkGfm, { tablePipeAlign: false })
  .use(remarkStringify, {
    bullet: "-",
    emphasis: "_",
    rule: "-",
    fences: true,
    incrementListMarker: true,
  });

/** The Markdown for one built page. */
export async function markdownFor(page, site) {
  const tree = unified().use(rehypeParse).parse(page.html);
  const main = find(tree, (n) => is(n, "main"));
  const mdast = await toMarkdown.run({
    type: "root",
    children: prepare(main, page, site).children,
  });
  const body = toMarkdown
    .stringify(mdast)
    .replace(/\n{3,}/g, "\n\n")
    .trim();
  return `${body}\n\n---\n\nFrom ${page.site}, a field guide to agent authentication and authorization. This page: ${new URL(page.path, site).href}\n`;
}

/**
 * The site's sections, in reading order, for the index. A page belongs to the
 * first section whose pattern matches its address; `order` names the page whose
 * links say what order the others come in.
 */
const SECTIONS = [
  { title: "Start here", match: /^\/(learn\/|guide\/|concepts\/)?$/ },
  { title: "Lessons", match: /^\/learn\/[^/]+\/$/, order: "/learn/" },
  { title: "Flows", match: /^\/flows\//, order: "/flows/" },
  { title: "Deployments", match: /^\/deployments\//, order: "/deployments/" },
  { title: "Reference", match: /^\/(standards|glossary)\/$/ },
  { title: "Optional", match: /^\/about\/$/ },
];

export default function markdownPages() {
  let site;
  return {
    name: "markdown-pages",
    hooks: {
      "astro:config:done": ({ config }) => {
        site = config.site;
      },
      "astro:build:done": async ({ dir, logger }) => {
        const root = fileURLToPath(dir);
        const pages = builtPages(root).filter((p) => p.markdown);
        const home = pages.find((p) => p.path === "/");
        for (const p of pages) {
          p.text = await markdownFor(p, site);
          const file = join(root, p.markdown);
          mkdirSync(dirname(file), { recursive: true });
          writeFileSync(file, p.text);
        }

        // Each section's pages in the order its index page links to them.
        const placed = new Set();
        const sections = SECTIONS.map((s) => {
          const index = s.order && pages.find((p) => p.path === s.order);
          const at = (p) => {
            const i = index ? index.html.indexOf(`href="${p.path}"`) : -1;
            return p.path === s.order
              ? -1
              : i < 0
                ? Number.MAX_SAFE_INTEGER
                : i;
          };
          const members = pages
            .filter((p) => !placed.has(p) && s.match.test(p.path))
            .sort((a, b) => at(a) - at(b));
          for (const p of members) placed.add(p);
          return { ...s, pages: members };
        });
        const left = pages.filter((p) => !placed.has(p));
        if (left.length)
          throw new Error(
            `markdown-pages: no section in SECTIONS for ${left.map((p) => p.path).join(", ")}. Add one, or give the page markdown={false}.`,
          );

        const [name, descriptor] = home.title.split(" — ");
        const link = (p) =>
          `- [${p.name === home.name ? name : p.name}](${new URL(p.markdown, site).href}): ${p.description}`;
        const llms = [
          `# ${name}`,
          `> ${home.description}`,
          `${name} (${new URL("/", site).host}) is an independent reference, not a specification. It explains how software agents authenticate and how they are authorized: who is acting, for whom, and who said they could. Standards in this area change monthly; every page carries the month it was last checked against its sources, and links to them.`,
          `Each link below is the Markdown form of a page on the site. The same address without \`index.md\` is the page itself, and is the one to cite. All of the pages in one file: ${new URL("/llms-full.txt", site).href}`,
          ...sections
            .filter((s) => s.pages.length)
            .map((s) => `## ${s.title}\n\n${s.pages.map(link).join("\n")}`),
        ].join("\n\n");
        writeFileSync(join(root, "llms.txt"), `${llms}\n`);

        const full = [
          `# ${name}: ${descriptor}`,
          `> ${home.description}`,
          `Every page of ${new URL("/", site).host} in one file, in reading order. Each page ends with its address.`,
          ...sections.flatMap((s) => s.pages.map((p) => p.text.trim())),
        ].join("\n\n");
        writeFileSync(join(root, "llms-full.txt"), `${full}\n`);

        logger.info(
          `${pages.length} pages as Markdown, llms.txt, and llms-full.txt (${Math.round(full.length / 1024)} kB)`,
        );
      },
    },
  };
}
