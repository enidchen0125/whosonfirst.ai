import type { APIRoute } from "astro";
import { flows } from "../data/flows";

/** Static pages are discovered from the filesystem; flow pages come from data. */
const pages = Object.keys(import.meta.glob("./**/*.{astro,mdx}"))
  .map((p) =>
    p
      .replace(/^\./, "")
      .replace(/\.(astro|mdx)$/, "")
      .replace(/\/index$/, "/"),
  )
  .filter((p) => !p.includes("[") && p !== "/404")
  .map((p) => (p.endsWith("/") ? p : `${p}/`));

export const GET: APIRoute = ({ site }) => {
  const base = site ?? new URL("https://whosonfirst.ai");
  const urls = [...pages, ...flows.map((f) => `/flows/${f.slug}/`)].sort();
  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${new URL(u, base).href}</loc></url>`).join("\n")}
</urlset>
`;
  return new Response(body, {
    headers: { "Content-Type": "application/xml; charset=utf-8" },
  });
};
