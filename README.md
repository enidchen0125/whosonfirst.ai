# whosonfirst.ai

Who’s on First is a field guide to agent authentication and authorization: who is acting, for whom, and who said they could. It is published at [whosonfirst.ai](https://whosonfirst.ai).

The site covers every common way an agent obtains and presents credentials, with a person present, with a person on call, and with no human at all. It has three parts:

- **Flows**: 19 interactive sequence diagrams, from OAuth authorization code with PKCE to workload identity tokens and agent payment mandates.
- **Deployments**: how the starting credential changes on Kubernetes, managed agent platforms, local machines, CI and sandboxes.
- **Standards**: a filterable tracker of the RFCs, drafts, specifications and projects involved, with status.

Plus a concepts primer, a decision guide and a glossary.

## Develop

Requires Node 22.

```bash
npm install
```

```bash
npm run dev
```

```bash
npm run build
```

```bash
npm run check
```

```bash
npm run fmt
```

```bash
npm test
```

```bash
npm run check:rendered
```

`npm run check` runs [Biome](https://biomejs.dev/) over the repository: formatting, lint rules and import order. `npm run fmt` does the same and writes the fixes. `npm test` runs the site's own checks: types (`astro check`), the rating rule and the color contrast audit. `npm run check:rendered` opens the built site in a browser.

`npm run build` writes a fully static site to `dist/client/`. There is no server component and no client-side framework: interactive pieces are small custom elements that enhance HTML rendered at build time, so every page reads correctly with JavaScript off.

### Formatting and linting

Biome's settings are in `biome.json`. Two things about this repository shape them:

- **`.astro` files.** Biome reads only the frontmatter script. The template and `<style>` blocks are left as written, and `astro check` covers their types. Biome can format whole `.astro` files behind an experimental flag (`html.experimentalFullSupportEnabled`); it is off because the templates are whitespace-sensitive.
- **Import order in `.astro` files is not sorted.** Astro emits component styles in the order components are imported, so sorting the imports changes the cascade.

Biome does not handle `.mdx`, so the deployment guides and the About page are not formatted.

## Where things are

| Path                                  | What                                                                                              |
| ------------------------------------- | ------------------------------------------------------------------------------------------------- |
| `src/data/flows/*.ts`                 | One file per flow: participants, steps, example messages, cautions                                |
| `src/data/standards.ts`               | The standards tracker                                                                             |
| `src/data/tokens.ts`                  | Annotated example tokens for the token inspector                                                  |
| `src/data/guide.ts`                   | Questions and rules for the decision guide                                                        |
| `src/data/glossary.ts`                | Glossary terms                                                                                    |
| `src/data/site.ts`                    | The "last reviewed" date shown across the site                                                    |
| `src/components/FlowDiagram.astro`    | Sequence diagram and step-through panel; a step narrative on a phone                              |
| `src/data/verify.ts`                  | “What can the API verify?”: two credentials, four checks, and the wording of each verdict         |
| `src/components/VerifyBrief.astro`    | The compact demonstration of that on the home page                                                |
| `src/components/VerifyDetail.astro`   | The full comparison, on the Concepts page                                                         |
| `src/components/LastHop.astro`        | The same question across a longer chain, on the Concepts page                                     |
| `src/components/DocMeta.astro`        | Page facts: one line for the specification followed and the review date, the rest in a disclosure |
| `src/components/K8sIdentityMap.astro` | Kubernetes identity layers diagram                                                                |
| `src/pages/deployments/*.mdx`         | Long-form deployment guides                                                                       |
| `docs/source-review.md`               | What goes out of date, where to check it, and where each fact has to be changed                   |

## Editing content

Most changes are data changes.

**Add or change a flow.** Edit or create a file in `src/data/flows/` and register it in `src/data/flows/index.ts`. Arrow labels wrap onto two lines automatically; the build warns if one is still too long. Add the flow to the comparison table in `src/pages/flows/index.astro`, or the build will tell you to.

A flow that is a pattern more than a protocol can keep its steps general and add two optional sections: `comparison`, how the pattern appears in different settings, and `example`, one setting worked through with its own listings. A comparison is drawn as a table on wide screens and as one block of labeled fields per row on narrow ones, both from the same data, so its text must not refer to rows or columns. The parts of an example are not numbered, because "a numbered step" means a step of the diagram when references are classified.

Further sections of the same form go in `sections`, after the example: for instance what a receiving system still has to decide, or documented implementations. A part can carry `tags` (whose product it is, its release stage, what kind of example it is) and `sources` (the documents it is drawn from, linked by title). A product's release stage is a tag on the part. It is not the flow's maturity rating, which comes from the standards the diagram's flow requires.

If such a flow's diagram draws one arrangement among several, say so in `illustrated`: `steps` is shown above the diagram, and `references` beside the required references. The page then labels its basis, its required references and its rating as those of the flow the diagram draws.

**Add or update a standard.** Edit `src/data/standards.ts`. Flows refer to standards by `id`. The first standard a flow lists is shown at the top of its page as the primary specification, with its status and revision, so list the one the flow follows most closely first.

**Classify a flow's references.** A flow can give each standard it lists a role in `roles`: `required`, `optional`, `background` or `unresolved`. Its rating is then that of its least mature required reference; the rule is on the About page under "How flows are rated" and in `src/data/rating.ts`. If the flow implements more than one specification, name them in `basis`. The build fails if a flow with `roles` leaves a listed standard unclassified, has a basis that is not required, or declares a `maturity` other than the one its required references give it.

A reference marked `unresolved` is not counted and is not assumed to be optional. If it is less mature than the rating, or has no recorded level, the flow is shown as provisional (for example "Stable standards (provisional)") until it is classified. A project, platform or guidance entry has no level from its status alone: state one in `level` on its tracker entry, with the evidence, or the build refuses to rate a flow that requires it. `npm run check:rating` exercises these cases.

**Cross-references are checked at build time.** A flow that names an unknown standard or related flow, or a decision-guide rule that names an unknown flow or answer, fails the build.

**When you re-verify the standards**, follow `docs/source-review.md`. It lists what to check and how often, and every place the review date and a changed fact have to be updated, starting with `REVIEWED` in `src/data/site.ts`.

## Design

The site takes the structure of an Internet-Draft, not its typewriter: fine rules, link blue, compact metadata and numbered sections. Titles, metadata and anything literal are in IBM Plex Mono; reading text is in IBM Plex Sans at 17px.

| File                            | What                                                                               |
| ------------------------------- | ---------------------------------------------------------------------------------- |
| `src/styles/tokens.css`         | The values: every color as a light and dark pair, the type stacks, sizes and radii |
| `src/styles/global.css`         | The rules that are not specific to one component                                   |
| `<style>` in each `.astro` file | That component's own rules                                                         |

`/styleguide/` shows the tokens, type, components and diagrams as rendered, with live contrast ratios.

**Light and dark.** The page follows the system setting, and changes with it while open; that is CSS alone (`color-scheme` and `light-dark()`). The button in the header picks the other theme. That choice is remembered only until the system setting next changes, so the site never stays stuck opposite to the system.

**Fonts.** The four font files every first screen needs (Plex Sans 400 and 600, Plex Mono 500 and 600) are preloaded from `src/layouts/Base.astro`, so they download alongside the stylesheet and the text does not paint in a fallback font and then change. If one is still late, `IBM Plex Sans Fallback` in `src/styles/global.css` stands in: Arial scaled to Plex Sans's measurements, so the swap does not move the text. If you change which weights the first screen uses, change the preload list to match; a preloaded file that is not used is a wasted download.

Pages put the task first. A page opens with what it is for, then the thing the reader came to do; supporting facts (sources, method, classification) sit behind a labeled disclosure, and history follows the lookup it belongs to.

Three rules hold throughout:

- **Color in a diagram means role.** User, agent, authorization server, resource server and infrastructure each keep one color. The kind of message (direct call, response, through the browser, out of band) is carried by the line style.
- **Nothing is dimmed with opacity.** Steps before and after the current one use the muted text color, which the audit holds to 4.5:1.
- **Buttons are boxes, links are underlined, metadata is neither.**

Two checks cover this:

- `npm test` includes a token audit (`scripts/contrast-check.mjs`) that fails if any declared text pairing falls below 4.5:1 in either theme.
- `npm run check:rendered` (after `npm run build`) opens the built site in a browser (`scripts/rendered-check.mjs`) and measures what is drawn: contrast and size of every diagram label in each step state, size and line length of running text, sideways overflow (also at 320px, on every flow page), accessibility violations (axe-core, WCAG 2.1 A and AA), and whether the things a reader depends on are present and work: the home page explainer fits one screen and switches, both answers to "whose authority" appear before either list of flows, each page's review date and specification are on its first line of facts with the rest behind a disclosure, the standards lookup precedes its history, the phone menu opens from the keyboard and shows every destination, the phone flow page reads as a narrative with the diagram on demand and easy to leave, and the stepper keeps keyboard focus usable (Left and Right step, Down scrolls, focus moves off a disabled button). It needs Chromium: `npx playwright install chromium`.

## Accuracy

Drafts in this area change monthly. Revision numbers and dates in the tracker were taken from the IETF document mirror and specification repositories. Process states (for example "in last call") came from secondary sources and are worded as reported. Vendor products are described from vendor documentation and were not tested. See the About page for the full method.

`docs/source-review.md` is the checklist for keeping it that way: what to re-check, against which source, and what a periodic review reports.

Corrections are welcome as issues or pull requests.
