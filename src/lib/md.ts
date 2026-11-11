/**
 * Tiny inline formatter for strings in data files.
 * Supports `code`, **bold**, *italic* and [text](href). Output is HTML.
 * Input is authored in this repo, so this is formatting, not sanitising.
 *
 * Given a Gloss (lib/gloss.ts), it also marks the first use of each glossary
 * term, outside code and outside links.
 */
import type { Gloss } from "./gloss";
import { mark } from "./gloss";

const ESC: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
};

export function esc(text: string): string {
  return text.replace(/[&<>"]/g, (c) => ESC[c]);
}

export function inline(text: string, g?: Gloss): string {
  // Finished pieces are lifted out and put back at the end, so that no later
  // rule can reach inside them. NUL marks where each one was.
  const held: string[] = [];
  const hold = (html: string) => {
    held.push(html);
    return `\u0000${held.length - 1}\u0000`;
  };
  let out = esc(text).replace(/`([^`]+)`/g, (_, c: string) =>
    hold(`<code>${c}</code>`),
  );
  out = out.replace(
    /\[([^\]]+)\]\(([^)\s]+)\)/g,
    (_, label: string, href: string) => {
      const external = /^https?:/.test(href);
      return hold(
        `<a href="${href}"${external ? ' rel="noopener"' : ""}>${emphasis(label)}</a>`,
      );
    },
  );
  if (g)
    out = mark(out, g).replace(/<a class="term"[^>]*>[^<]*<\/a>/g, (a) =>
      hold(a),
    );
  out = emphasis(out);
  // a held piece can hold another (a code span inside a link's label), so put back twice
  for (let pass = 0; pass < 2; pass++)
    // biome-ignore lint/suspicious/noControlCharactersInRegex: NUL marks where a finished piece was lifted out, so the other rules cannot touch it
    out = out.replace(/\u0000(\d+)\u0000/g, (_, i: string) => held[Number(i)]);
  return out;
}

function emphasis(html: string): string {
  return html
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[\s(])\*([^*\s][^*]*)\*/g, "$1<em>$2</em>");
}

/** Paragraphs separated by a blank line. */
export function block(text: string, g?: Gloss): string {
  return text
    .trim()
    .split(/\n\s*\n/)
    .map((p) => `<p>${inline(p.replace(/\s*\n\s*/g, " "), g)}</p>`)
    .join("");
}
