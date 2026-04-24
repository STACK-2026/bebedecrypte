// @ts-check
import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";

// Import site config for the URL
import { siteConfig } from "./site.config.ts";

export default defineConfig({
  site: siteConfig.url,
  integrations: [
    sitemap({
      lastmod: new Date(),
      filter: (page) => {
        const path = new URL(page).pathname;
        // /rankings/ is now a soft redirect to /products/, keep it out of the sitemap
        // to avoid Google flagging a redirect chain.
        if (["/rankings/", "/en/rankings/"].includes(path)) return false;
        // Status pages should never appear in the sitemap.
        if (/^\/(en\/)?(404|500)\/?$/.test(path)) return false;
        // Astro i18n fallback emits ghost /en/* hub URLs for FR-only sections
        // (products, brands, categories, authors, blog) without writing the file.
        // Exclude them so Google does not see 5+ 404s in the sitemap.
        if (/^\/en\/(products|brands|categories)\/?$/.test(path)) return false;
        return true;
      },
    }),
  ],
  i18n: {
    defaultLocale: "fr",
    locales: ["fr", "en"],
    routing: {
      prefixDefaultLocale: false,
      redirectToDefaultLocale: false,
    },
    fallback: {
      en: "fr",
    },
  },
  vite: {
    plugins: [tailwindcss()],
  },
  // Markdown config for blog articles
  markdown: {
    // smartypants off: prevent auto-conversion of straight quotes to curly
    // and '--' to em dash. Em/en dash ban is a STACK-2026 critical rule.
    smartypants: false,
    shikiConfig: {
      theme: "github-light",
    },
  },
});
