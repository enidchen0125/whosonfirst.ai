# Contributing

Who’s on First is a reference, and a reference is only worth having if it is right. The most useful contribution is a correction: something on the site that is wrong, out of date, or says more than its source does.

## Report something wrong

[Open an issue](https://github.com/kevinswiber/whosonfirst.ai/issues/new/choose). Say which page, what it says, and what the source says, with a link to the source. A specification, a draft's datatracker page or a vendor's own documentation is a source. A blog post about one of those usually is not.

Drafts in this area change monthly. If a revision number or a status has moved, that is worth an issue by itself.

## Change it yourself

Most corrections are a one-line change to a data file. The README says [where things are](README.md#where-things-are) and [how content is edited](README.md#editing-content).

```bash
npm install
```

```bash
npm run dev
```

Before you open a pull request:

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

The last one opens the built site in a browser and needs Chromium: `npx playwright install chromium`. The build and these checks refuse a good many mistakes by name: a flow that names an unknown standard, a rating that does not follow from its references, a lesson that teaches a term the glossary lacks, text too faint or too small, a page that overflows a phone.

Keep a pull request to one change, and say in it what source the change follows.

## What a change has to meet

- **A fact has a source.** Add or update the link with the fact. If the source is secondary, the page says “reported.”
- **A lesson simplifies and does not contradict.** The flow page or data file it rests on is named in a comment at the top of the lesson.
- **Status is worded as the About page defines it.** See “How status is worded” and “How flows are rated” there.
- **Nothing essential waits behind a click, a hover or a script.** What a figure or a diagram shows is also on the page in words.
- **Vendors are described from their own documentation**, and mention is not recommendation.

New flows, lessons and pages are welcome, but open an issue first. What the site leaves out is as deliberate as what it covers.

## License

By contributing you agree that your contribution is licensed as the rest of the repository is: code under the [MIT license](LICENSE), and the site's text, diagrams and data under [Creative Commons Attribution 4.0](LICENSE-CONTENT).
