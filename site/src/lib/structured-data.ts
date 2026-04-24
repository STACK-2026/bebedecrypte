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
    // logo as ImageObject lets Google render it in the Knowledge Panel and
    // satisfies the publisher.logo constraint of Article-family schemas.
    logo: {
      "@type": "ImageObject",
      "@id": `${SITE}/#logo`,
      url: `${SITE}/favicon.svg`,
      contentUrl: `${SITE}/favicon.svg`,
      width: 512,
      height: 512,
      caption: siteConfig.name,
    },
    image: { "@id": `${SITE}/#logo` },
    description:
      "Décodeur indépendant d'alimentation bébé. Note chaque petit pot, lait infantile, céréale et gourde de A à E sur 8 axes (NOVA, additifs, sucres cachés, Nutri-Score, bio, allergènes, origine, simplicité), pondération renforcée avant 12 mois. Sources : Open Food Facts, EFSA, ANSES, RappelConso.",
    inLanguage: ["fr-FR", "en-US"],
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
    // Sitelinks Searchbox : the catalogue search lives on /products/#q=<query>
    // (the hub reads the hash on load and pre-fills the search input).
    potentialAction: {
      "@type": "SearchAction",
      target: { "@type": "EntryPoint", urlTemplate: `${SITE}/products/#q={search_term_string}` },
      "query-input": "required name=search_term_string",
    },
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
