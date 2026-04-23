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
        // /rankings/ is now a soft redirect to /products/, keep it out of the sitemap
        // to avoid Google flagging a redirect chain.
        const excluded = ["/rankings/", "/fr/rankings/"];
        const path = new URL(page).pathname;
        return !excluded.includes(path);
      },
    }),
  ],
  i18n: {
    defaultLocale: "en",
    locales: ["en", "fr"],
    routing: {
      prefixDefaultLocale: false,
      redirectToDefaultLocale: false,
    },
    fallback: {
      fr: "en",
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
