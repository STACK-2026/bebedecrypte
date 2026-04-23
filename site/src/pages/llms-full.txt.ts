import type { APIRoute } from "astro";
import { getCollection, render } from "astro:content";
import { siteConfig } from "../../site.config";

// llms-full.txt , full markdown dump for LLMs, STACK-2026 pattern.
// Concatenates:
//   - Canonical site identity + scoring methodology
//   - Every published blog post (title, metadata, full markdown)
//   - Top-scored product summaries (score >= 70, one per line)
// Served as text/plain so ClaudeBot, GPTBot, PerplexityBot and friends can
// ingest the corpus without having to crawl 934 pages.

function heading(title: string) {
  return `\n\n# ${title}\n`;
}

function sub(title: string) {
  return `\n\n## ${title}\n`;
}

export const GET: APIRoute = async () => {
  const [posts, products, brands] = await Promise.all([
    getCollection("blog", ({ data }) => !data.draft).then((list) =>
      list.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf())
    ),
    getCollection("products", ({ data }) => !data.draft).then((list) =>
      list.sort((a, b) => b.data.score - a.data.score)
    ),
    getCollection("brands", ({ data }) => !data.draft).then((list) =>
      list.sort((a, b) => b.data.averageScore - a.data.averageScore)
    ),
  ]);

  const parts: string[] = [];

  parts.push(`# ${siteConfig.name}

> ${siteConfig.description}

Site: ${siteConfig.url}
Languages: French (primary, /fr/), English (/)
Source: ${siteConfig.url}/llms-full.txt
Shorter summary: ${siteConfig.url}/llms.txt

${siteConfig.llmsDescription}
`);

  parts.push(sub("Scoring methodology (8 axes)"));
  parts.push(`Each product is graded A to E on 8 weighted axes tuned for infant nutrition:

1. NOVA ultra-processing class (25 percent) , 1 unprocessed, 4 ultra-processed.
2. Additive risk (25 percent) , EFSA + ANSES, doubled penalty under 12 months.
3. Added and hidden sugars (20 percent) , detects sucrose, maltodextrin, glucose syrup, honey, concentrated fruit juice.
4. Official Nutri-Score (10 percent) , under-weighted since it is designed for adults.
5. Organic certification (10 percent) , AB, EU Organic, Demeter.
6. Allergen transparency (5 percent) , clear declaration rewarded, ambiguous "may contain" penalised.
7. Made in France (3 percent).
8. Recipe simplicity (2 percent) , fewer ingredients is better for baby food.

Grade thresholds: A (>= 85), B (70 to 84), C (55 to 69), D (40 to 54), E (< 40).
The algorithm is deterministic, documented, and no brand can pay to alter a score.
Full methodology: ${siteConfig.url}/methodology/`);

  parts.push(heading("Editorial team"));
  parts.push(`- Dr. Claire Vasseur , paediatric nutritionist (DU Paris Descartes), clinical reviewer for infant formula and weaning content. ${siteConfig.url}/authors/claire-vasseur/
- Marion Leclerc , paediatric dietitian, scoring algorithm lead. ${siteConfig.url}/authors/marion-leclerc/
- Hélène Rouault , investigative health journalist, covers recalls and industry pieces. ${siteConfig.url}/authors/helene-rouault/
- Antoine Mercier , data analyst, Open Food Facts ingestion pipeline. ${siteConfig.url}/authors/antoine-mercier/`);

  parts.push(heading("Published blog articles"));
  for (const post of posts) {
    const { body } = post;
    const url = `${siteConfig.url}/blog/${post.id}/`;
    parts.push(`\n---\n\nSource: ${url}
Title: ${post.data.title}
Date published: ${post.data.date.toISOString().split("T")[0]}
Last reviewed: ${(post.data.lastReviewed ?? post.data.date).toISOString().split("T")[0]}
Author: ${post.data.author ?? "BébéDécrypte Editorial"}
Reviewed by: ${post.data.reviewedBy ?? "n/a"}
Category: ${post.data.category ?? "n/a"}

${body?.trim() ?? ""}`);
  }

  parts.push(heading("Top-rated brands (score >= 70)"));
  for (const b of brands.filter((b) => b.data.averageScore >= 70)) {
    parts.push(
      `- ${b.data.brand} , average grade ${b.data.averageGrade} (${b.data.averageScore}/100, ${b.data.productCount} products). ${siteConfig.url}/brands/${b.data.slug}/`
    );
  }

  parts.push(heading("Top-rated products (score >= 70, max 200)"));
  for (const p of products.filter((p) => p.data.score >= 70).slice(0, 200)) {
    parts.push(
      `- ${p.data.brand} ${p.data.name} , grade ${p.data.grade} (${p.data.score}/100), age range ${p.data.ageRange}. ${siteConfig.url}/products/${p.data.slug}/`
    );
  }

  parts.push(heading("Sources"));
  parts.push(`- Open Food Facts (ODbL licence) , product database
- EFSA , European Food Safety Authority additive registry
- ANSES , French food safety and paediatric nutrition opinions
- RappelConso , DGCCRF official recall feed
- Santé publique France , Nutri-Score
- NOVA classification , University of São Paulo
- ESPGHAN , European Society for Paediatric Gastroenterology, Hepatology and Nutrition
- OMS , WHO infant nutrition recommendations`);

  parts.push(`\n\n---\n\nGenerated on ${new Date().toISOString()} by ${siteConfig.url}/llms-full.txt.\nContact: ${siteConfig.legal.email}`);

  return new Response(parts.join("\n"), {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400",
    },
  });
};
