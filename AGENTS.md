# AGENTS.md

For a coding agent working in this repository. A person should start with [README.md](README.md) and [CONTRIBUTING.md](CONTRIBUTING.md).

## What this is

The source of [whosonfirst.ai](https://whosonfirst.ai), a field guide to agent authentication and authorization. It is a static site built with Astro. The content is the product: most changes are to data files in `src/data/` and pages in `src/pages/`, and a change that makes the site say something untrue is worse than a broken build.

[docs/development.md](docs/development.md) says where everything is, how each kind of content is edited, and what each check covers. Read the part for what you are changing before you change it.

## Commands

Node 22. Install with `npm ci`.

| Command                  | What it does                                                                |
| ------------------------ | --------------------------------------------------------------------------- |
| `npm run dev`            | The site, locally, rebuilt as files change                                  |
| `npm run fmt`            | Biome, writing its fixes: formatting, lint and import order                 |
| `npm run check`          | Biome, changing nothing                                                     |
| `npm test`               | Types (`astro check`), the rating rule and the color contrast audit         |
| `npm run build`          | The static site in `dist/client/`. Refuses a broken cross-reference by name |
| `npm run check:rendered` | Reads the built site, then opens it in a browser. Run the build first       |

`npm run check:rendered` needs Chromium (`npx playwright install chromium`) and takes about two minutes.

## Before you say a change is done

Run all four, in this order, and fix what they report. Continuous integration runs the same four on every pull request.

```bash
npm run check
```

```bash
npm test
```

```bash
npm run build
```

```bash
npm run check:rendered
```

Do not weaken, skip or delete a check to get it to pass. When a check fails, its message says what is wrong with the content; the fix is nearly always there.

## Content

- **A fact has a source.** Do not write a revision number, a date, a status or a description of a product from memory: specifications in this area change monthly. Read the source, and add or update its link with the fact. If you cannot reach the source, say so and leave the fact as it is.
- **Status is worded as the About page defines it** (`src/pages/about.mdx`, “How status is worded” and “How flows are rated”). A flow’s rating follows from its required references. Do not set one by hand.
- **A lesson simplifies and does not contradict.** The flow page or data file it rests on is named in a comment at the top of the lesson.
- **Nothing essential waits behind a click, a hover or a script.** What a figure or a diagram shows is also on the page in words.
- **Vendors are described from their own documentation.** Mention is not recommendation.
- **Write as the site does:** plain words, short sentences, no selling. Prose uses typographic quotes and apostrophes (“ ” ’), and code does not.
- New flows, lessons and pages start as an issue, not a pull request. What the site leaves out is deliberate.

## Things that are easy to get wrong

- **Register what you add.** A flow goes in `src/data/flows/index.ts`, in the comparison table in `src/pages/flows/index.astro` and in the README’s list. A lesson goes in `src/data/learn/lessons.ts` and the README. A new section of the site goes in `SECTIONS` in `src/integrations/markdown-pages.mjs`. The build or the rendered check names whichever is missing.
- **Imports in `.astro` files are not sorted,** and must not be: their order is the order of the styles. Biome leaves them alone.
- **A line break before an inline element loses its space.** In an `.astro` template, end the line before a `<strong>`, `<a>`, `<em>` or `<code>` with `{' '}`.
- **Nothing loads from another origin.** The content security policy in `public/_headers` allows this origin only. Do not add analytics, an embed, a hosted font or a CDN script.
- **No client-side framework, and no new dependency without asking.** Interactive pieces are small custom elements over HTML rendered at build time, and every page reads correctly with JavaScript off.
- **Biome does not format `.mdx`.** Keep those files tidy by hand.
- **Generated files are not edited.** `dist/` is not committed. The two pictures in `docs/images/` come from `npm run readme:figure`.

## Branches, commits and pull requests

- **Branches** follow [Conventional Branch](https://conventional-branch.github.io/): a type, a slash and a short description in lowercase with hyphens, such as `feat/aauth-flow`, `fix/dpop-step-labels` or `chore/update-actions`.
- **Commits** follow [Conventional Commits](https://www.conventionalcommits.org/), with no scope: `fix: say which key the proof is signed with`, never `fix(dpop): …`. The types in use are `feat` for something a reader gains, `fix` for something that was wrong or unclear, `docs` for the repository’s own documents, and `chore` and `ci` for the rest.
- **The subject says what the site now does,** in the imperative and in plain words, not which file changed: `feat: add a flow for AAuth, drawn with a person server`.
- **One change to a pull request,** titled as a commit would be, because it is merged as one. Say in it which source the change follows.
- Do not commit to `main`, and do not rewrite history that has been pushed.
