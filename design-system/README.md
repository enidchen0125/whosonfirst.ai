Who’s on First is a field guide to authentication and authorization for AI agents. This system holds four candidate looks for it. Each one is a pair of themes here, light and dark. Choose one direction and use only its pair: values are tuned within a direction and do not mix across them.

## The four directions

**Scorecard** (`scorecard-light`, `scorecard-dark`). A paper scorebook: cream stock, ink, pencil rules, a serif headline. Warm and bookish, and the look the site launched with. It sits close to a look many generated sites share, so it is the least ownable of the four.

**Scoreboard** (`scoreboard-light`, `scoreboard-dark`). A hand-operated ballpark scoreboard: painted green steel, tin number tiles, line-score yellow. Page titles always sit on the board, in the dark palette, whatever the page theme. Loud by design. Condensed capitals are for page and section titles only.

**Line Map** (`linemap-light`, `linemap-dark`). Transit wayfinding: a delegation chain is a line with stops. White ground, signage black, one grotesque family, and the five principals as five coloured lines. Page titles sit on a black sign plate. The least baseball of the four.

**Internet-Draft** (`draft-light`, `draft-dark`). The subject’s own document format: one monospaced face, numbered sections, controls drawn in brackets, hyperlinks in link blue. Austere, and slower to read at length.

## Colour

- Put the page on `bg`. Put anything that sits on the page (cards, panels, code) on `bg-raised`, and anything set into it (wells, the footer) on `bg-sunken`.
- Set text in `fg`. Use `fg-muted` for ledes and captions and `fg-subtle` for counts and fine print. Nothing lighter than `fg-subtle` carries words.
- Use `accent` for interaction only: links, focus rings, the one primary button, the current item. Put `on-accent` on an `accent` fill.
- The five hues are a code, not a palette. `red` is a human, `blue` an agent or client, `violet` an authorization server, `green` a resource, `amber` infrastructure. A diagram keeps that assignment for every participant.
- Each hue has a solid value for text and outlines and a `-soft` value for fills. Put `fg` or the hue itself on its soft fill.
- The hues also carry status, always with a word beside them: `green` for “yes” and published standards, `red` for “no” and cautions, `amber` for “partly” and individual drafts, `blue` for working group drafts.
- Never use a hue for decoration, and never let `accent` stand in for a role.
- Every text pair named in a token’s note holds 4.5 to 1 in all eight themes. `border` is a hairline and is not held to 3 to 1; `border-strong` is for anything that must be seen.

## Type

- Four roles: display, body, label and mono. A direction may fill several roles with one family.
- Use the `-display` style for the page title and `-title` for section headings. Only Scoreboard sets these in capitals.
- Use `-heading` for card and step headings, in sentence case in every direction.
- Set running text in `-body`, no wider than `prose`.
- Set eyebrows, chips, buttons and column heads in `-label`, in capitals with open tracking.
- Use `-code` for real identifiers only: a claim, a parameter, a header. Never for emphasis.

## Shape and layout

- A direction has one radius for boxes and one for chips: `radius-scorecard` and `pill-scorecard`, and so on. Do not invent a third.
- A page is at most `wide`. Running text is at most `prose`. Side padding runs from `gutter-min` to `gutter-max` with the viewport.
- A card is a link to one thing, used for a set of peers. A border does not make a paragraph more important.
- One callout a page. If a page needs three, none of them is a callout.

## Diagrams

- One column per participant, coloured by role.
- Line style is meaning: solid for a direct call, dashed for a response, dotted for out of band, and `red` for anything that passes through a person’s browser.
- Arrow labels stay short, two lines at most. The panel beside the diagram carries the explanation.

## Voice

- Say who does what. “The agent redeems the code”, never “the code is redeemed”. Auth is about who acts.
- State it, then stop. Where something is uncertain, say what is uncertain once, in the place it applies.
- Name a thing once. Define the term in the glossary and keep using it.
- Report status as a fact with a source: “Working group draft, revision 11”, not “an emerging standard”.
- A caution comes with a way out: every “watch out” says what to do instead.
- The joke is the frame, not the filling. Who, What and I Don’t Know organise the ideas; they do not appear in every heading.
- Sentence case for headings. No exclamation marks, no emoji.
