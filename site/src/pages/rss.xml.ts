import rss from "@astrojs/rss";
import { getCollection } from "astro:content";
import { siteConfig } from "../../site.config";

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
      "Independent pet food ratings from A to E. Brand reviews, species guides, ingredient deep-dives.",
    site: siteConfig.url,
    items: posts.map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.date,
      link: `/blog/${post.id}/`,
      categories: post.data.tags,
      author: post.data.author,
    })),
    customData: `<language>en</language>`,
  });
}
