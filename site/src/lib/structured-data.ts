// JSON-LD schema builders for SEO rich results.
// All schemas follow schema.org and Google's structured data guidelines.
import { siteConfig } from "../../site.config";

const SITE = siteConfig.url;

export function organizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${SITE}/#organization`,
    name: siteConfig.name,
    url: SITE,
    logo: `${SITE}/favicon.svg`,
    description:
      "Independent baby-food rating service. Grades every baby pot, infant formula, cereal and pouch from A to E on 8 axes (NOVA, additives, added sugars, Nutri-Score, organic, allergens, origin, simplicity), baby-specific weighting stricter before 12 months. Sources: Open Food Facts, EFSA, ANSES, RappelConso.",
    sameAs: [],
    foundingDate: "2026",
    email: siteConfig.legal.email,
    areaServed: ["FR", "BE", "CH", "LU"],
    audience: { "@type": "PeopleAudience", audienceType: "parents of infants and young children" },
  };
}

export function websiteSchema(locale: "en" | "fr") {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${SITE}/#website`,
    url: SITE,
    name: siteConfig.name,
    description:
      locale === "fr"
        ? "Le décodeur d'étiquettes indépendant. Notation A à E basée sur Open Food Facts, Nutri-Score, NOVA et la base EFSA des additifs."
        : "The independent food label decoder. A to E grading based on Open Food Facts, Nutri-Score, NOVA, and the EFSA additives registry.",
    inLanguage: locale === "fr" ? "fr-FR" : "en-US",
    publisher: { "@id": `${SITE}/#organization` },
  };
}

export function breadcrumbSchema(items: { name: string; url?: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      name: item.name,
      ...(item.url ? { item: item.url } : {}),
    })),
  };
}

export function itemListSchema(name: string, urls: string[]) {
  return {
    "@context": "https://schema.org",
    "@type": "ItemList",
    name,
    numberOfItems: urls.length,
    itemListElement: urls.map((url, idx) => ({
      "@type": "ListItem",
      position: idx + 1,
      url,
    })),
  };
}
