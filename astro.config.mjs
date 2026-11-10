import cloudflare from "@astrojs/cloudflare";
import mdx from "@astrojs/mdx";
import { defineConfig } from "astro/config";
import { codeThemes } from "./src/lib/code-themes.mjs";

export default defineConfig({
  site: "https://whosonfirst.ai",
  integrations: [mdx()],

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
