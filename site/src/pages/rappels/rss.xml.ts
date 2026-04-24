import rss from "@astrojs/rss";
import { getCollection } from "astro:content";
import { siteConfig } from "../../../site.config";

export async function GET() {
  const recallsCol = await getCollection("recalls");
  const recalls = recallsCol
    .map((r) => r.data)
    .sort((a, b) => b.publishedDate.valueOf() - a.publishedDate.valueOf())
    .slice(0, 100);

  return rss({
    title: `${siteConfig.name} , Rappels produits bébé`,
    description:
      "Flux RSS officiel des rappels d'aliments pour bébé recensés par BébéDécrypte depuis le registre RappelConso de la DGCCRF. Mise à jour quotidienne.",
    site: siteConfig.url,
    items: recalls.map((r) => ({
      title: r.title,
      description: `${r.motif} (Risque : ${r.risk}). Marque : ${r.brand}. Statut : ${r.status === "active" ? "rappel en cours" : "rappel clos"}.`,
      pubDate: r.publishedDate,
      link: `/rappels/${r.numeroFiche}/`,
      categories: [r.subCategory, r.severity, r.status],
    })),
    customData: `<language>fr</language>`,
  });
}
