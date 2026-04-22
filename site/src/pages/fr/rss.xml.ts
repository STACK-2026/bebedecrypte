import rss from "@astrojs/rss";
import { getCollection } from "astro:content";
import { siteConfig } from "../../../site.config";

export async function GET(context: any) {
  const now = new Date();
  const posts = (
    await getCollection("blog", ({ data }) => !data.draft && data.date <= now)
  )
    .filter((p) => (p.data.lang || "en") === "fr")
    .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf())
    .slice(0, 50);

  return rss({
    title: `${siteConfig.name} Blog`,
    description:
      "Notation indépendante du pet food de A à E. Avis de marques, guides par espèce, analyse des ingrédients.",
    site: siteConfig.url,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.date,
      link: `/fr/blog/${post.id}/`,
      categories: post.data.tags,
      author: post.data.author,
    })),
    customData: `<language>fr</language>`,
  });
}
