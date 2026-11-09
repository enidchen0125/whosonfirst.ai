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
| `src/components/FlowDiagram.astro` | Sequence diagram and step-through panel |
| `src/components/K8sIdentityMap.astro` | Kubernetes identity layers diagram |
| `src/pages/deployments/*.mdx` | Long-form deployment guides |

## Editing content

Most changes are data changes.

**Add or change a flow.** Edit or create a file in `src/data/flows/` and register it in `src/data/flows/index.ts`. Arrow labels wrap onto two lines automatically; the build warns if one is still too long. Add the flow to the comparison table in `src/pages/flows/index.astro`, or the build will tell you to.

**Add or update a standard.** Edit `src/data/standards.ts`. Flows refer to standards by `id`.

**Cross-references are checked at build time.** A flow that names an unknown standard or related flow, or a decision-guide rule that names an unknown flow or answer, fails the build.

**When you re-verify the standards**, update `REVIEWED` in `src/data/site.ts`.

## Design

The look is under exploration. Four directions share one set of token names and differ only in values:

| Direction | File | Idea |
| --- | --- | --- |
| Scorecard (default) | `src/styles/directions/scorecard.css` | A paper scorecard: warm stock, serif titles |
| Scoreboard | `src/styles/directions/scoreboard.css` | A manual ballpark scoreboard: green board, condensed capitals |
| Line Map | `src/styles/directions/linemap.css` | Transit signage: black, white and five line colours |
| Internet-Draft | `src/styles/directions/draft.css` | An Internet-Draft: monospace throughout |

Switch with the control at the bottom right of any page, or with `?direction=scoreboard` (or `linemap`, `draft`, `scorecard`) on a URL. `/styleguide/` shows the tokens, type, components and diagrams under whichever direction is active. The switcher is an exploration aid; remove it and the unused files once a direction is chosen.

`npm run check` includes a contrast audit (`scripts/contrast-check.mjs`) that fails if any text pairing in any direction falls below 4.5:1.

```bash
npm run ds:build
```

`npm run ds:build` (after `npm run build`) turns the direction files and the sources in `design-system/` into a design system package in `design-system/out/`, which is not committed.

## Accuracy

Drafts in this area change monthly. Revision numbers and dates in the tracker were taken from the IETF document mirror and specification repositories. Process states (for example "in last call") came from secondary sources and are worded as reported. Vendor products are described from vendor documentation and were not tested. See the About page for the full method.

Corrections are welcome as issues or pull requests.
