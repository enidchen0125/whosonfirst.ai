import cloudflare from "@astrojs/cloudflare";
import mdx from "@astrojs/mdx";
import { defineConfig } from "astro/config";
import markdownPages from "./src/integrations/markdown-pages.mjs";
import socialCards from "./src/integrations/social-cards.mjs";
import { codeThemes } from "./src/lib/code-themes.mjs";

export default defineConfig({
  site: "https://whosonfirst.ai",
  // The last two run once the pages are built. Each makes another form of every
  // page from the page itself: a card for where its link is shared, and Markdown.
  integrations: [mdx(), socialCards(), markdownPages()],

  markdown: {
    shikiConfig: {
      themes: codeThemes,
      defaultColor: false,
    },
  },

  // The site is fully prerendered and never uses sessions. Without this the
  // adapter injects a SESSION KV binding with no id, which `wrangler preview`
  // rejects (it does not auto-provision the way `wrangler deploy` does).
  session: false,

  adapter: cloudflare(),
});
