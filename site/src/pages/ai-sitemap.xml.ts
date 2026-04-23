import type { APIRoute } from "astro";
import { getCollection } from "astro:content";
import { siteConfig } from "../../site.config";

// ai-sitemap.xml , simplified flat sitemap for AI crawlers (STACK-2026 pattern).
// Exposes the high-value pages : static hubs, authors, categories, brands,
// top-graded products, and blog articles. Excludes ComingSoon stubs.

const STATIC_PAGES = [
  "/",
  "/about/",
  "/methodology/",
  "/brands/",
  "/categories/",
  "/products/",
  "/blog/",
  "/glossaire/",
  "/authors/",
  "/privacy-policy/",
  "/cookie-policy/",
  "/terms/",
  "/affiliate-disclosure/",
];

const today = () => new Date().toISOString().split("T")[0];

export const GET: APIRoute = async () => {
  const [posts, brands, categories, products, authors] = await Promise.all([
    getCollection("blog", ({ data }) => !data.draft).then((list) =>
      list.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf())
    ),
    getCollection("brands", ({ data }) => !data.draft),
    getCollection("categories", ({ data }) => !data.draft),
    getCollection("products", ({ data }) => !data.draft).then((list) =>
      list.sort((a, b) => b.data.score - a.data.score)
    ),
    // AUTHORS are not a collection , hardcoded slugs
    Promise.resolve(["claire-vasseur", "marion-leclerc", "helene-rouault", "antoine-mercier"]),
  ]);

  const entries: string[] = [];

  for (const page of STATIC_PAGES) {
    entries.push(
      `  <url><loc>${siteConfig.url}${page}</loc><lastmod>${today()}</lastmod></url>`
    );
  }

  for (const slug of authors) {
    entries.push(
      `  <url><loc>${siteConfig.url}/authors/${slug}/</loc><lastmod>${today()}</lastmod></url>`
    );
  }

  for (const post of posts) {
    const lastmod = (post.data.lastReviewed ?? post.data.date)
      .toISOString()
      .split("T")[0];
    entries.push(
      `  <url><loc>${siteConfig.url}/blog/${post.id}/</loc><lastmod>${lastmod}</lastmod></url>`
    );
  }

  for (const cat of categories) {
    entries.push(
      `  <url><loc>${siteConfig.url}/categories/${cat.data.slug}/</loc><lastmod>${today()}</lastmod></url>`
    );
  }

  for (const brand of brands) {
    entries.push(
      `  <url><loc>${siteConfig.url}/brands/${brand.data.slug}/</loc><lastmod>${today()}</lastmod></url>`
    );
  }

  // Top-graded products only (score >= 70) to keep the AI crawl focused on citeable content
  for (const product of products.filter((p) => p.data.score >= 70)) {
    entries.push(
      `  <url><loc>${siteConfig.url}/products/${product.data.slug}/</loc><lastmod>${today()}</lastmod></url>`
    );
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries.join("\n")}
</urlset>
`;

  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
};
