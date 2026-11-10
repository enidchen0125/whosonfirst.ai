/**
 * Design directions under exploration. Each id matches a stylesheet in
 * styles/directions/ and a value of <html data-direction>.
 */
export interface Direction {
  id: string;
  name: string;
  /** Where the look comes from, in a few words. */
  source: string;
  idea: string;
  type: string;
  /** What it costs. Every direction has a weakness worth knowing before choosing. */
  tradeoff: string;
}

export const directions: Direction[] = [
  {
    id: "scorecard",
    name: "Scorecard",
    source: "A paper scorebook",
    idea: "Cream stock, ink, pencil rules and a serif headline. Warm and bookish. This is the design the site launched with.",
    type: "Fraunces, IBM Plex Sans, IBM Plex Mono",
    tradeoff:
      "It sits close to a look many generated sites share: cream paper, serif display, terracotta accent. Pleasant, and not very ownable.",
  },
  {
    id: "scoreboard",
    name: "Scoreboard",
    source: "A hand-operated ballpark scoreboard",
    idea: "Painted green steel, tin number tiles, line-score yellow. Page titles always sit on the board; the page below follows day or night.",
    type: "Big Shoulders Display, Barlow, IBM Plex Mono",
    tradeoff:
      "Loud. Condensed capitals tire the eye in long headings, and green is both the brand and the ground, so the fourth role colour has to become teal.",
  },
  {
    id: "linemap",
    name: "Line Map",
    source: "Transit wayfinding",
    idea: "A delegation chain is a line with stops. White ground, signage black, one grotesque family, and the five principals as five coloured lines.",
    type: "Archivo at two widths, JetBrains Mono",
    tradeoff:
      "The least baseball of the four. The site’s name has to carry the joke on its own, and black-and-white leaves little room for warmth.",
  },
  {
    id: "draft",
    name: "Internet-Draft -00",
    source: "The subject’s own document format",
    idea: "Plain-text RFC conventions: one monospaced face, numbered sections, controls drawn in brackets, hyperlinks in link blue.",
    type: "IBM Plex Mono throughout",
    tradeoff:
      "Monospaced prose reads more slowly and the look is austere. It flatters readers who live in specifications and may put off those who do not.",
  },
  {
    id: "draft01",
    name: "Internet-Draft -01",
    source: "Revision of -00 after review",
    idea: "The document’s structure without its typewriter: fine rules, link blue, compact metadata and numbered sections, with prose and diagram labels in a proportional face at 17px. Monospace marks titles, metadata and anything literal. Buttons are boxes; metadata never is.",
    type: "IBM Plex Mono for titles and literals, IBM Plex Sans for reading",
    tradeoff:
      "Quieter than the others: with no display face and one accent colour, the personality has to come from the diagrams and the writing.",
  },
];

/**
 * The site's design. The layout puts it on <html data-direction>; the base
 * tokens on :root are still Scorecard's, which the other directions override.
 */
export const DEFAULT_DIRECTION = "draft01";
