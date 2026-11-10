/**
 * Tiny inline formatter for strings in data files.
 * Supports `code`, **bold**, *italic* and [text](href). Output is HTML.
 * Input is authored in this repo, so this is formatting, not sanitising.
 */
const ESC: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
};

export function esc(text: string): string {
  return text.replace(/[&<>"]/g, (c) => ESC[c]);
}

export function inline(text: string): string {
  const codes: string[] = [];
  let out = esc(text).replace(/`([^`]+)`/g, (_, c: string) => {
    codes.push(`<code>${c}</code>`);
    return `\u0000${codes.length - 1}\u0000`;
  });
  out = out
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[\s(])\*([^*\s][^*]*)\*/g, "$1<em>$2</em>")
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label: string, href: string) => {
      const external = /^https?:/.test(href);
      return `<a href="${href}"${external ? ' rel="noopener"' : ""}>${label}</a>`;
    });
  // biome-ignore lint/suspicious/noControlCharactersInRegex: NUL marks where a code span was lifted out, so the other rules cannot touch it
  return out.replace(/\u0000(\d+)\u0000/g, (_, i: string) => codes[Number(i)]);
}

/** Paragraphs separated by a blank line. */
export function block(text: string): string {
  return text
    .trim()
    .split(/\n\s*\n/)
    .map((p) => `<p>${inline(p.replace(/\s*\n\s*/g, " "))}</p>`)
    .join("");
}
