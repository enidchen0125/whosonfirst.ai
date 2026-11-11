# Working on the site

How the site is built, where things are and how its content is edited. The [README](../README.md) is for readers; this is for whoever changes the site. [CONTRIBUTING.md](../CONTRIBUTING.md) says what a change has to meet.

## Develop

Requires Node 22 or later.

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

`npm run check` runs [Biome](https://biomejs.dev/) over the repository: formatting, lint rules and import order. `npm run fmt` does the same and writes the fixes. `npm test` runs the site's own checks: types (`astro check`), the rating rule and the color contrast audit. `npm run check:rendered` reads the built site, then opens it in a browser.

`npm run build` writes a fully static site to `dist/client/`. There is no server component and no client-side framework: interactive pieces are small custom elements that enhance HTML rendered at build time, so every page reads correctly with JavaScript off.

Once the pages are written, the build makes two more forms of each one from the page itself: a card for where its link is shared, and a copy in Markdown. See [Other forms of a page](#other-forms-of-a-page).

### Formatting and linting

Biome's settings are in `biome.json`. Two things about this repository shape them:

- **`.astro` files.** Biome reads only the frontmatter script. The template and `<style>` blocks are left as written, and `astro check` covers their types. Biome can format whole `.astro` files behind an experimental flag (`html.experimentalFullSupportEnabled`); it is off because the templates are whitespace-sensitive.
- **Import order in `.astro` files is not sorted.** Astro emits component styles in the order components are imported, so sorting the imports changes the cascade.

Biome does not handle `.mdx`, so the deployment guides and the About page are not formatted.

### Continuous integration

`.github/workflows/ci.yml` runs the same commands on every pull request and on every change to `main`, as two jobs side by side: Biome, then `npm test`; and the build, then `npm run check:rendered`. It needs no secret and deploys nothing, so it runs the same on a pull request from a fork.

The workflow names each action by commit, not by tag. `.github/dependabot.yml` opens one pull request a month when those have moved.

## Where things are

| Path                                  | What                                                                                               |
| ------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `src/data/learn/lessons.ts`           | The lessons, in order: the question each answers, the terms it teaches, where to go deeper         |
| `src/pages/learn/*.astro`             | One file per lesson: its text, its figure and its questions                                        |
| `src/layouts/Lesson.astro`            | The shape every lesson shares                                                                      |
| `src/components/Scenario.astro`       | A lesson's figure: a small cast, one thing that varies, the same questions asked of each variation |
| `src/components/Check.astro`          | Questions with feedback that says why                                                              |
| `src/components/Here.astro`           | The line under the site header that says which page this is, on the long pages                     |
| `src/data/learn/api-sees.ts`          | The figure lesson 1 and the home page share                                                        |
| `src/data/flows/*.ts`                 | One file per flow: participants, steps, example messages, cautions, and its overview               |
| `src/components/FlowOverview.astro`   | “In short” and “Who does what”, before a flow's diagram                                            |
| `src/lib/gloss.ts`                    | Marks the first use of each glossary term, so its definition can be shown in place                 |
| `src/data/standards.ts`               | The standards tracker                                                                              |
| `src/data/tokens.ts`                  | Annotated example tokens for the token inspector                                                   |
| `src/data/guide.ts`                   | Questions and rules for the decision guide                                                         |
| `src/data/glossary.ts`                | Glossary terms                                                                                     |
| `src/data/site.ts`                    | The "last reviewed" date shown across the site, who makes it, and where the source is              |
| `src/integrations/social-cards.mjs`   | Draws each page's card for where its link is shared, and the home-screen icon                      |
| `src/integrations/markdown-pages.mjs` | Writes each page again as Markdown, and `llms.txt` and `llms-full.txt` from those                  |
| `src/components/FlowDiagram.astro`    | Sequence diagram and step-through panel; a step narrative on a phone                               |
| `src/data/verify.ts`                  | “What can the API verify?”: two credentials, four checks, and the wording of each verdict          |
| `src/components/VerifyDetail.astro`   | The full comparison, on the Concepts page                                                          |
| `src/components/LastHop.astro`        | The same question across a longer chain, on the Concepts page                                      |
| `src/components/DocMeta.astro`        | Page facts: one line for the specification followed and the review date, the rest in a disclosure  |
| `src/components/K8sIdentityMap.astro` | Kubernetes identity layers diagram                                                                 |
| `src/pages/deployments/*.mdx`         | Long-form deployment guides                                                                        |
| `docs/source-review.md`               | What goes out of date, where to check it, and where each fact has to be changed                    |
| `README.md`                           | What a visitor to the repository reads first: what the site is and where to start in it            |
| `scripts/readme-figure.mjs`           | Draws the picture at the top of the README from the built site, in each theme                      |
| `scripts/social-assets.mjs`           | Draws what goes in a post that announces the site: a carousel, pictures, a flow stepped through    |
| `AGENTS.md`                           | What a coding agent working in this repository needs to know                                       |

## Editing content

Most changes are data changes.

**Add or change a flow.** Edit or create a file in `src/data/flows/` and register it in `src/data/flows/index.ts`. Arrow labels wrap onto two lines automatically; the build warns if one is still too long. Add the flow to the comparison table in `src/pages/flows/index.astro`, or the build will tell you to.

A flow that is a pattern more than a protocol can keep its steps general and add two optional sections: `comparison`, how the pattern appears in different settings, and `example`, one setting worked through with its own listings. A comparison is drawn as a table on wide screens and as one block of labeled fields per row on narrow ones, both from the same data, so its text must not refer to rows or columns. The parts of an example are not numbered, because "a numbered step" means a step of the diagram when references are classified.

Further sections of the same form go in `sections`, after the example: for instance what a receiving system still has to decide, or documented implementations. A part can carry `tags` (whose product it is, its release stage, what kind of example it is) and `sources` (the documents it is drawn from, linked by title). A product's release stage is a tag on the part. It is not the flow's maturity rating, which comes from the standards the diagram's flow requires.

If such a flow's diagram draws one arrangement among several, say so in `illustrated`: `steps` is shown above the diagram, and `references` beside the required references. The page then labels its basis, its required references and its rating as those of the flow the diagram draws.

**Every flow has an overview.** Four fields say what a reader needs before the diagram, and the build refuses a flow without the first three:

- `phases`: the steps in three to five plain parts, each with the number of the step it starts at. They are listed as "In short", drawn as headed bands in the diagram, and named above each step.
- `parts`: what each party has to do, by participant id, in a sentence or two. A protocol page mostly describes other people's work; this is where a reader finds their own.
- `lesson`: the lesson that teaches the flow's idea in plain words first.
- `like`: for a flow that is another flow with a difference, which flow and what differs.

They restate the flow's own page. Do not put a fact in an overview that the page does not already support.

**Add or change a lesson.** A lesson is a page in `src/pages/learn/` using `layouts/Lesson.astro`, registered in `src/data/learn/lessons.ts`. The order there is the reading order. Every lesson has the same shape, and the layout supplies most of it: the question, where the lesson sits among the others, the text and its figure, questions to answer from memory, what to keep, the names for what was taught, and where to go deeper.

- A lesson may teach only terms that are in the glossary. `teaches` lists them, and the build checks each one.
- Its figure must make its point in the state it first shows, and `glance` adds a table of every variation beneath it. Most readers never click.
- A lesson simplifies; it must not contradict. Each lesson names, in a comment, the flow or data file that holds the full account.
- A figure compares approaches, and a reader can take a comparison for a menu. Give an option that must not be built an `avoid` sentence: the figure then puts a warning sign on its button, says "do not build this" with the reason in its panel, and marks its row in the table. Keep it for what is dangerous, not for what is merely weaker: a comparison where every option is something people really build teaches more than one with a hazard sign on it.
- A lesson's one hard rule, a "never", goes in `keep` as `{ rule: "…" }`. It is shown beneath the ideas under its own label, "One rule", with a red edge. At most one a lesson: the build refuses a second.
- A question's right answer must not stand out by where it sits or how long it is. Write each wrong answer as a belief a reader could really hold, at about the length of the right one, and vary which comes first. `npm run check:rendered` counts both across all the lessons.

**A line break before an inline element loses its space.** In an `.astro` template, text that ends a line followed by `<strong>`, `<a>`, `<em>` or `<code>` on the next runs into it on the page. Write `{' '}` at the end of the first line. `npm run check:rendered` finds any that slip through.

**Add or update a standard.** Edit `src/data/standards.ts`. Flows refer to standards by `id`. The first standard a flow lists is shown at the top of its page as the primary specification, with its status and revision, so list the one the flow follows most closely first. A pattern that no specification defines sets `noBasis` to a few words saying so, and its page names no primary specification.

**Classify a flow's references.** A flow can give each standard it lists a role in `roles`: `required`, `optional`, `background` or `unresolved`. Its rating is then that of its least mature required reference; the rule is on the About page under "How flows are rated" and in `src/data/rating.ts`. If the flow implements more than one specification, name them in `basis`. The build fails if a flow with `roles` leaves a listed standard unclassified, has a basis that is not required, or declares a `maturity` other than the one its required references give it.

A reference marked `unresolved` is not counted and is not assumed to be optional. If it is less mature than the rating, or has no recorded level, the flow is shown as provisional (for example "Stable standards (provisional)") until it is classified. A project, platform or guidance entry has no level from its status alone: state one in `level` on its tracker entry, with the evidence, or the build refuses to rate a flow that requires it. `npm run check:rating` exercises these cases.

**Cross-references are checked at build time.** A flow that names an unknown standard or related flow, or a decision-guide rule that names an unknown flow or answer, fails the build.

**The README lists what the site has.** It is written for a reader of the site, not of the code: it links to every lesson, flow and deployment guide and says how many lessons and flows there are. Add a new one there too. `npm run check:rendered` fails if the README leaves one out, miscounts, or gives an address the site does not have.

The picture at its top is the DPoP flow's diagram as built. After a change to how diagrams are drawn, make it again and commit the two files in `docs/images/`:

```bash
npm run build
```

```bash
npm run readme:figure
```

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

**The mark.** A diamond with a base at each corner: three open, and first base filled in. It is drawn once, in `public/favicon.svg`, which carries its light and dark colors. The cards and icons the build makes, and the pictures for a post, read that file. Every shape has to sit inside the drawing's box: one that runs past the edge is cut off flat wherever the mark is shown, and `npm run check:rendered` fails if any does. It is mostly seen small, 16 pixels in a tab and not much more in a picture on a phone, so the bases are drawn large and the lines heavy: a base that is too small to show its opening looks like a corner that has been cut off. Before changing the drawing, look at it at 16 pixels.

**Fonts.** The four font files every first screen needs (Plex Sans 400 and 600, Plex Mono 500 and 600) are preloaded from `src/layouts/Base.astro`, so they download alongside the stylesheet and the text does not paint in a fallback font and then change. If one is still late, `IBM Plex Sans Fallback` in `src/styles/global.css` stands in: Arial scaled to Plex Sans's measurements, so the swap does not move the text. If you change which weights the first screen uses, change the preload list to match; a preloaded file that is not used is a wasted download.

**A long page says where the reader is.** Lessons, flows, deployment guides, Concepts and About carry a line under the site header: the trail to the page, the page's short name and, with the script, the section scrolled to. That section is a button: pressing it lists the page's sections, which is how a reader gets to another one on a phone, on a lesson or on a flow, where no contents list fits at the side. It stays in view with the header, and takes the place of the small label above the title. A layout passes `here` to the base layout to get one. Its height is `--here` in `global.css`, which anything that sticks below the header, and the allowance for a jump to an anchor, add on. A jump within a page glides; arriving from another page at a section far down does not.

Nothing essential waits behind a click. A figure shows a complete answer in its first state, a lesson's comparison is also a table, and a definition that opens in place is a link to the glossary first.

Pages put the task first. A page opens with what it is for, then the thing the reader came to do; supporting facts (sources, method, classification) sit behind a labeled disclosure, and history follows the lookup it belongs to.

Three rules hold throughout:

- **Color in a diagram means role.** User, agent, authorization server, resource server and infrastructure each keep one color. The kind of message (direct call, response, through the browser, out of band) is carried by the line style.
- **Nothing is dimmed with opacity.** Steps before and after the current one use the muted text color, which the audit holds to 4.5:1.
- **Buttons are boxes, links are underlined, metadata is neither.**

Two checks cover this:

- `npm test` includes a token audit (`scripts/contrast-check.mjs`) that fails if any declared text pairing falls below 4.5:1 in either theme.
- `npm run check:rendered` (after `npm run build`, `scripts/rendered-check.mjs`) first reads every built page: each internal link leads to a page and each anchor to something on it, no word runs into the inline element after it, every lesson is listed, every page has its card, its Markdown copy and structured data that parses, `llms.txt` lists every copy, the README names every lesson, flow and deployment guide and every address it gives is on the site, the right answer to a lesson's questions cannot be guessed from its place or its length, a figure choice that must not be built is marked on its button, in its panel and in its table, and the response headers are in place. Then it loads every page under those headers and fails if one breaks its own content security policy. Then it opens the site in a browser and measures what is drawn: contrast and size of every diagram label in each step state, size and line length of running text, sideways overflow (also at 320px, on every flow and every lesson), accessibility violations (axe-core, WCAG 2.1 A and AA), and whether the things a reader depends on are present and work:
  - halfway down a long page the header still says which page it is and, on a wide screen, which section; a short page has no such line
  - the home page's figure makes its point before a click, fits about one screen and switches; there are three ways in; every lesson is listed in order; both answers to "whose authority" appear before either list of flows
  - a lesson's figure shows one complete variation, the table beneath covers them all, a choice changes what is shown, no explanation appears before an answer is chosen, each question has one right answer, and the page runs in the order every lesson shares
  - a flow's overview comes before its diagram and agrees with it, a part's link brings the diagram into view at its first step, and a glossary term shows its definition inside the window and puts it away again
  - each page's review date and specification are on its first line of facts with the rest behind a disclosure, the standards lookup precedes its history, the phone menu opens from the keyboard and shows every destination, the phone flow page reads as a narrative with the diagram on demand and easy to leave, and the stepper keeps keyboard focus usable (Left and Right step, Down scrolls, focus moves off a disabled button)

  It needs Chromium: `npx playwright install chromium`.

## Other forms of a page

A page is read in three places besides a browser: where a link to it is shared, by a search engine, and by a program working for someone, such as a coding agent or an assistant answering a question. Each gets a form of the page made for it. All of them are made from the page as built, so none can say what the page does not.

**Where a link is shared.** `src/integrations/social-cards.mjs` draws a 1200 × 630 PNG for every page at `/og/<address>.png`, from the page's title and description, in the site's type and its light colors. `src/layouts/Base.astro` names it in `og:image` and `twitter:image` and asks for the large card. A page's card changes when its title or description does; nothing is edited by hand. The same step writes `/apple-touch-icon.png` and `/favicon.ico` from the site's mark. A page names the SVG icon first; the `.ico` is for a browser that does not read one, and for anything that asks for that address without reading the page.

**For a search engine.** Every page carries schema.org data in its head: the site, who makes it, the page with the month it was last reviewed, and the trail to it. Lessons, flows and deployment guides also say they are articles. A layout passes `article` to the base layout for that, and `schema` to add nodes of its own. The “not found” page passes `noindex`.

**For a program that reads.** `src/integrations/markdown-pages.mjs` writes each page again as Markdown beside it: `/flows/dpop/` has `/flows/dpop/index.md`. The page names it in a `<link rel="alternate" type="text/markdown">`. The copy leaves out the header, the footer, controls and drawings, and keeps what the page says in words: a flow's steps, a figure's every variation and its table, the decision guide's rules. It ends with the page's address and the footer's line on when the site was last reviewed, which on a lesson is the only place the month appears. Two files are made from the copies:

- `/llms.txt` says what the site is and links to every page's Markdown, in reading order.
- `/llms-full.txt` is all of the pages in one file.

A page with nothing to read as text, as the style guide is, passes `markdown={false}` to the base layout. A new section of the site has to be added to `SECTIONS` in the integration, or the build stops and says so.

The conversion knows the site's components by class name: which are controls (`CHROME`), which are facts set side by side (`ROW`), and a few that need rearranging to read well. A new interactive component should be checked in its page's `index.md` after a build. The test is the one the pages already meet: what a drawing or a control shows must also be on the page in words.

`public/robots.txt` allows every crawler and states, in the terms of [contentsignals.org](https://contentsignals.org/), that the site may be indexed, used to answer questions, and used for training.

### Markdown at the page's own address

Some agents ask for Markdown with `Accept: text/markdown`. The site has no server code to answer that, and putting a Worker in front of every page to do it would make page views count against the Workers request limit. The host can do it with a rule instead. In the Cloudflare dashboard, under Rules, a URL rewrite rule:

- **When:** `any(http.request.headers["accept"][*] contains "text/markdown") and ends_with(http.request.uri.path, "/") and not starts_with(http.request.uri.path, "/styleguide/")`
- **Rewrite the path to (dynamic):** `concat(http.request.uri.path, "index.md")`

To see whether it is in place:

```bash
curl -sI -H "Accept: text/markdown" https://whosonfirst.ai/flows/dpop/ | grep -i content-type
```

The rule is not kept in this repository. Until it exists, a request that asks for Markdown gets the page, which is still a correct answer.

## Pictures for a post

A link shared by itself shows the page's card. A post that announces the site, or one flow, wants more than a card: a picture that makes its point where it is seen, before anyone follows the link. `scripts/social-assets.mjs` draws those from the built site:

```bash
npm run build
```

```bash
npm run social:assets
```

It writes to `social/`, which is not committed:

| File                                              | What                                                                                                                                                                                                                              |
| ------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `carousel.pdf`, `carousel-01.png` …               | Nine pages of 1080 × 1350, for a document post: the question, the first lesson's figure one choice at a time, the three choices side by side, every flow, a flow in one of its steps, the tracker's counts, and the three ways in |
| `three-questions.png`, `three-questions-wide.png` | The three choices side by side, as one picture: at 4:5, and at 16:9 for where pictures are cropped wide                                                                                                                           |
| `flows.png`, `standards.png`                      | Two of the carousel's pages, each as a picture by itself                                                                                                                                                                          |
| `flow-<slug>.mp4`, `flow-<slug>-cover.png`        | One flow stepped through, about two seconds a step, and the frame it opens on                                                                                                                                                     |
| `repository.png`                                  | 1280 × 640, for the repository's social preview, which is set by hand in the repository's settings on GitHub                                                                                                                      |

`--flow <slug>` chooses the flow the video steps through and the carousel shows a step of; without it that is MCP authorization. `--no-video` leaves the video out. `--dark` draws the same pictures in the site's dark theme, into `social/dark/`: every color is already a light and dark pair, the mark carries both, and the diagram is photographed from the page in that theme. The video needs `ffmpeg` on the path, and is skipped with a note where there is none.

The pictures are read on a phone, where a page 1080 pixels wide is shown at about a third of its size. So nothing on one is set smaller than 23 pixels, and most labels are 26. Keep to that when a page is changed: type that looks comfortable at full size is too small to read in a feed.

Every word in these pictures is read from the pages as built: the home page's question and its ways in, the first lesson's figure, the groups and ratings on the flows page, the tracker's counts, a flow's steps and its diagram as drawn. The script holds the layout and none of the content, so a picture cannot say what the site does not. If a page it reads has changed shape, it stops and names what it could not find, and if a picture has outgrown its frame it says which. Make the pictures again after the content changes. Do not edit them by hand.

## Response headers

`public/_headers` is sent with every page and file the site serves: a content security policy that allows this origin and nothing else, headers that forbid framing, content sniffing and the device features the site never uses, and one that tells a browser to come back over HTTPS only. A `Link` header points a program at `llms.txt` and the sitemap. The Markdown copies and the two files that list them carry `X-Robots-Tag: noindex`, so a search engine sends people to the page. The `.md` and `.txt` files are declared as UTF-8, because the host names no encoding for a `.txt` file and a browser then reads its quotes and dashes as Windows-1252. The build adds its cache rule for `/_astro/` to the same file. Cloudflare does not add these headers to its own “not found” response.

The policy allows inline scripts and styles, because the theme switch runs before the first paint and code samples and diagrams carry style attributes. It does not allow anything from another origin. Analytics, an embed or a hosted font would be refused until it is added there, and `npm run check:rendered` fails on any page that breaks the policy.
