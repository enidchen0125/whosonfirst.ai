import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import { codeThemes } from './src/lib/code-themes.mjs';

export default defineConfig({
  site: 'https://whosonfirst.ai',
  integrations: [mdx()],
  markdown: {
    shikiConfig: {
      themes: codeThemes,
      defaultColor: false,
    },
  },
});
