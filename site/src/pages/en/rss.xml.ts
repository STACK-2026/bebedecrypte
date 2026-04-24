import rss from "@astrojs/rss";
import { getCollection } from "astro:content";
import { siteConfig } from "../../../site.config";

export async function GET(context: any) {
  const now = new Date();
  const posts = (
    await getCollection("blog", ({ data }) => !data.draft && data.date <= now)
  )
    .filter((p) => (p.data.lang || "en") === "en")
    .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf())
    .slice(0, 50);

  return rss({
    title: `${siteConfig.name} Blog`,
    description:
      "Independent baby food ratings from A to E. Nutrition guides, ingredient deep-dives, brand investigations, product recalls.",
    site: siteConfig.url,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.date,
      link: `/en/blog/${post.id}/`,
      categories: post.data.tags,
      author: post.data.author,
    })),
    customData: `<language>en</language>`,
  });
}
