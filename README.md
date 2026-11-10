# whosonfirst.ai

A field guide to authentication and authorization for AI agents: who is acting, on whose behalf, and who said they could.

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
npm run check:rendered
```

`npm run build` writes a fully static site to `dist/`. There is no server component and no client-side framework: interactive pieces are small custom elements that enhance HTML rendered at build time, so every page reads correctly with JavaScript off.

## Where things are

| Path | What |
| --- | --- |
| `src/data/flows/*.ts` | One file per flow: participants, steps, example messages, cautions |
| `src/data/standards.ts` | The standards tracker |
| `src/data/tokens.ts` | Annotated example tokens for the token inspector |
| `src/data/guide.ts` | Questions and rules for the decision guide |
| `src/data/glossary.ts` | Glossary terms |
| `src/data/site.ts` | The "last reviewed" date shown across the site |
| `src/components/FlowDiagram.astro` | Sequence diagram and step-through panel; a step narrative on a phone |
| `src/data/verify.ts` | “What can the API verify?”: two credentials, four checks, and the wording of each verdict |
| `src/components/VerifyBrief.astro` | The compact demonstration of that on the home page |
| `src/components/VerifyDetail.astro` | The full comparison, on the Concepts page |
| `src/components/LastHop.astro` | The same question across a longer chain, on the Concepts page |
| `src/components/DocMeta.astro` | Page facts: one line for the specification followed and the review date, the rest in a disclosure |
| `src/components/K8sIdentityMap.astro` | Kubernetes identity layers diagram |
| `src/pages/deployments/*.mdx` | Long-form deployment guides |

## Editing content

Most changes are data changes.

**Add or change a flow.** Edit or create a file in `src/data/flows/` and register it in `src/data/flows/index.ts`. Arrow labels wrap onto two lines automatically; the build warns if one is still too long. Add the flow to the comparison table in `src/pages/flows/index.astro`, or the build will tell you to.

**Add or update a standard.** Edit `src/data/standards.ts`. Flows refer to standards by `id`. The first standard a flow lists is shown at the top of its page as the primary specification, with its status and revision, so list the one the flow follows most closely first.

**Classify a flow's references.** A flow can give each standard it lists a role in `roles`: `required`, `optional`, `background` or `unresolved`. Its rating is then that of its least mature required reference; the rule is on the About page under "How flows are rated". If the flow implements more than one specification, name them in `basis`. A flow with `roles` must classify every standard it lists, and its basis must be required, or the build fails.

**Cross-references are checked at build time.** A flow that names an unknown standard or related flow, or a decision-guide rule that names an unknown flow or answer, fails the build.

**When you re-verify the standards**, update `REVIEWED` in `src/data/site.ts`.

## Design

The look is under exploration. Five directions share one set of token names and differ only in values. Internet-Draft -01 is the one being developed; the others are kept for comparison until it has been reviewed.

| Direction | File | Idea |
| --- | --- | --- |
| Internet-Draft -01 | `src/styles/directions/draft01.css` | The document format's structure with selective monospace: titles, metadata and literals in Plex Mono, reading text in Plex Sans at 17px |
| Internet-Draft -00 | `src/styles/directions/draft.css` | The first pass: monospace throughout |
| Scorecard (default) | `src/styles/directions/scorecard.css` | A paper scorecard: warm stock, serif titles |
| Scoreboard | `src/styles/directions/scoreboard.css` | A manual ballpark scoreboard: green board, condensed capitals |
| Line Map | `src/styles/directions/linemap.css` | Transit signage: black, white and five line colours |

Switch with the control at the bottom right of any page, or with `?direction=draft01` (or `draft`, `scorecard`, `scoreboard`, `linemap`) on a URL. `/styleguide/` shows the tokens, type, components and diagrams under whichever direction is active. The switcher is an exploration aid; remove it and the unused files once a direction is chosen.

Pages put the task first. A page opens with what it is for, then the thing the reader came to do; supporting facts (sources, method, classification) sit behind a labelled disclosure, and history follows the lookup it belongs to.

Three rules hold in every direction:

- **Colour in a diagram means role.** User, agent, authorization server, resource server and infrastructure each keep one colour. The kind of message (direct call, response, through the browser, out of band) is carried by the line style.
- **Nothing is dimmed with opacity.** Steps before and after the current one use the muted text colour, which the audit holds to 4.5:1.
- **Buttons are boxes, links are underlined, metadata is neither.**

Two checks cover this:

- `npm run check` includes a token audit (`scripts/contrast-check.mjs`) that fails if any declared text pairing in any direction falls below 4.5:1.
- `npm run check:rendered` (after `npm run build`) opens the built site in a browser (`scripts/rendered-check.mjs`) and measures what is drawn: contrast and size of every diagram label in each step state, size and line length of running text, sideways overflow, accessibility violations (axe-core, WCAG 2.1 A and AA), and whether the things a reader depends on are present and work: the home page explainer fits one screen and switches, both answers to "whose authority" appear before either list of flows, each page's review date and specification are on its first line of facts with the rest behind a disclosure, the standards lookup precedes its history, the phone menu opens from the keyboard and shows every destination, the phone flow page reads as a narrative with the diagram on demand and easy to leave, and the stepper keeps keyboard focus usable (Left and Right step, Down scrolls, focus moves off a disabled button). It checks Internet-Draft -01 by default; add `--direction=all` for the rest. It needs Chromium: `npx playwright install chromium`.

```bash
npm run ds:build
```

`npm run ds:build` (after `npm run build`) turns the direction files and the sources in `design-system/` into a design system package in `design-system/out/`, which is not committed.

## Accuracy

Drafts in this area change monthly. Revision numbers and dates in the tracker were taken from the IETF document mirror and specification repositories. Process states (for example "in last call") came from secondary sources and are worded as reported. Vendor products are described from vendor documentation and were not tested. See the About page for the full method.

Corrections are welcome as issues or pull requests.
