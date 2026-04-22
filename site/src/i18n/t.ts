// ============================================
// i18n dictionary , BébéDécrypte site
// FR + EN bilingual (FR default , marché principal)
// ============================================

export type Locale = "en" | "fr";

export const LOCALES: Locale[] = ["en", "fr"];
export const DEFAULT_LOCALE: Locale = "en";

export interface Translation {
  en: string;
  fr: string;
}

// Utility: pick the right language from a translation object
export function t(tr: Translation, locale: Locale = DEFAULT_LOCALE): string {
  return tr[locale] || tr.en;
}

// Utility: get the URL prefix for a locale (en = "", fr = "/fr")
export function localeUrl(path: string, locale: Locale = DEFAULT_LOCALE): string {
  if (locale === "en") return path;
  if (path === "/") return "/fr/";
  return "/fr" + (path.startsWith("/") ? path : "/" + path);
}

// Utility: detect current locale from Astro URL
export function getLocale(url: URL | string): Locale {
  const pathname = typeof url === "string" ? url : url.pathname;
  if (pathname.startsWith("/fr/") || pathname === "/fr") return "fr";
  return "en";
}

// ============================================
// TRANSLATIONS , bilingual dictionary
// ============================================

export const tr = {
  // Navigation
  nav: {
    home: { en: "Home", fr: "Accueil" },
    catalogue: { en: "Catalog", fr: "Catalogue" },
    byAge: { en: "By age", fr: "Par âge" },
    compare: { en: "Compare", fr: "Comparer" },
    additives: { en: "Additives", fr: "Additifs" },
    methodology: { en: "Methodology", fr: "Méthodologie" },
    blog: { en: "Blog", fr: "Blog" },
    about: { en: "About", fr: "À propos" },
    score: { en: "Decode a product", fr: "Décrypter un produit" },
    app: { en: "Launch the decoder", fr: "Lancer le décodeur" },
  },

  // Hero
  hero: {
    badge: {
      en: "Independent baby-food decoder",
      fr: "Décodeur indépendant d'alimentation bébé",
    },
    title1: { en: "We decode what", fr: "On décrypte ce que" },
    title2: { en: "your baby's label hides.", fr: "l'étiquette bébé cache." },
    lede: {
      en: "Every baby pot, infant formula, baby cereal and pouch graded A to E. Additives, hidden sugars, ultra-processing, organic, allergens. Independent, free, sources ANSES + EFSA + Open Food Facts.",
      fr: "Chaque petit pot, lait infantile, céréale et gourde noté de A à E. Additifs, sucres cachés, ultra-transformation, bio, allergènes. Indépendant, gratuit, sources ANSES + EFSA + Open Food Facts.",
    },
    searchPlaceholder: {
      en: "Search a brand (Blédina, Babybio…) or a product",
      fr: "Cherche une marque (Blédina, Babybio…) ou un produit",
    },
    ctaPrimary: { en: "Decode a product", fr: "Décrypter un produit" },
    ctaSecondary: { en: "Explore the catalog", fr: "Explorer le catalogue" },
    liveBadge: {
      en: "Sources ANSES, EFSA, RappelConso, Open Food Facts",
      fr: "Sources ANSES, EFSA, RappelConso, Open Food Facts",
    },
    bullet1: { en: "A to E grade on 8 baby-specific axes", fr: "Note A à E sur 8 axes spécifiques bébé" },
    bullet2: { en: "Hidden sugars + palm oil + additive alerts", fr: "Alertes sucres cachés, huile de palme, additifs" },
    bullet3: { en: "100% free, zero brand paid", fr: "100% gratuit, aucune marque ne paie" },
  },

  // How it works
  how: {
    eyebrow: { en: "How it works", fr: "Comment ça marche" },
    title: {
      en: "Three steps to decode any baby food product",
      fr: "Trois étapes pour décrypter n'importe quel produit bébé",
    },
    lede: {
      en: "We combine NOVA (ultra-processing), EFSA additive risks, added-sugar detection, organic labels and six more axes into one reproducible A to E verdict. No marketing spin.",
      fr: "On combine NOVA (ultra-transformation), risque additifs EFSA, détection des sucres ajoutés, labels bio et six autres axes dans un verdict unique A à E, reproductible. Aucun blabla marketing.",
    },
    step1title: { en: "Search the product", fr: "Cherche le produit" },
    step1body: {
      en: "Find a brand (Blédina, Babybio, Good Goût, Gallia…), a specific product, or scan a barcode. Our catalog covers about 2,300 baby food products sold in France.",
      fr: "Trouve une marque (Blédina, Babybio, Good Goût, Gallia…), un produit précis ou scanne un code-barres. Le catalogue couvre environ 2 300 produits bébé vendus en France.",
    },
    step2title: { en: "Read the real verdict", fr: "Lis le vrai verdict" },
    step2body: {
      en: "Each additive, each hidden sugar, each ambiguous allergen line is cross-checked with ANSES and EFSA. You see what the pastel front of pack will never show.",
      fr: "Chaque additif, chaque sucre caché, chaque allergène ambigu est croisé avec les bases ANSES et EFSA. Tu vois ce que le packaging pastel ne montrera jamais.",
    },
    step3title: { en: "Choose better", fr: "Choisis mieux" },
    step3body: {
      en: "Each product page suggests better-graded alternatives from the same category, same age range, same price bracket. No upsell to a specific brand, just the data sorted by score.",
      fr: "Chaque fiche propose les alternatives mieux notées du même rayon, du même âge, du même prix. Zéro pousse-au-crime vers une marque précise, juste la donnée triée par score.",
    },
  },

  // Methodology teaser
  methodo: {
    eyebrow: { en: "Methodology", fr: "Méthodologie" },
    title: {
      en: "Every grade is deterministic and documented",
      fr: "Chaque note est déterministe et documentée",
    },
    body: {
      en: "Same ingredient list, same grade, every time. No human gut feeling, no sponsor influence, no black-box AI. The full algorithm is open and reproducible from the methodology page.",
      fr: "Même liste d'ingrédients, même note, à chaque fois. Aucun jugement au feeling, aucune influence sponsor, aucune IA black-box. L'algorithme complet est ouvert et reproductible depuis la page méthodologie.",
    },
    cta: { en: "Read the full methodology", fr: "Lire la méthodologie complète" },
    bullet1: {
      en: "8 weighted axes (NOVA, additives, added sugars, Nutri-Score, bio, allergens, origin, simplicity)",
      fr: "8 axes pondérés (NOVA, additifs, sucres ajoutés, Nutri-Score, bio, allergènes, origine, simplicité)",
    },
    bullet2: {
      en: "EFSA + ANSES + RappelConso + Open Food Facts",
      fr: "EFSA + ANSES + RappelConso + Open Food Facts",
    },
    bullet3: {
      en: "Baby-specific weighting (stricter under 12 months)",
      fr: "Pondération spécifique bébé (plus strict avant 12 mois)",
    },
    bullet4: {
      en: "No brand ever pays to change a grade",
      fr: "Aucune marque ne paie pour changer une note",
    },
  },

  // FAQ
  faq: {
    eyebrow: { en: "FAQ", fr: "FAQ" },
    title: {
      en: "Questions parents ask every day",
      fr: "Les questions que les parents nous posent tout le temps",
    },
    q1: {
      en: "How does BébéDécrypte grade baby food products?",
      fr: "Comment BébéDécrypte note les produits pour bébé ?",
    },
    a1: {
      en: "Every product is graded A to E on 8 weighted axes: NOVA ultra-processing (25%), EFSA additive risk (25%), added + hidden sugars (20%), official Nutri-Score (10%), organic certification (10%), allergen transparency (5%), French origin (3%) and recipe simplicity (2%). Ingredients come from Open Food Facts, the grade is deterministic, no brand can pay to move up.",
      fr: "Chaque produit est noté A à E sur 8 axes pondérés : NOVA ultra-transformation (25%), risque additifs EFSA (25%), sucres ajoutés et cachés (20%), Nutri-Score officiel (10%), certification bio (10%), transparence allergènes (5%), origine France (3%) et simplicité de la recette (2%). Les ingrédients viennent d'Open Food Facts, la note est déterministe, aucune marque ne peut acheter une meilleure note.",
    },
    q2: {
      en: "Why are additives more penalised for a baby?",
      fr: "Pourquoi les additifs sont-ils plus pénalisés pour un bébé ?",
    },
    a2: {
      en: "Infants have an immature gut barrier, a developing liver and kidneys, and a far worse body-weight-to-additive ratio than adults. ANSES recommends strict limitation of additives before 3 years, even those authorised. Our scoring applies a baby-specific weight: E-numbers tolerated for adults trigger a red alert on products for under-3s.",
      fr: "Les nourrissons ont une barrière intestinale immature, un foie et des reins en développement, et un rapport poids/additif bien plus défavorable que chez l'adulte. L'ANSES recommande une limitation stricte des additifs avant 3 ans, même ceux autorisés. Notre scoring applique une pondération spécifique bébé : les E-numéros tolérés chez l'adulte déclenchent une alerte rouge sur les produits destinés aux moins de 3 ans.",
    },
    q3: { en: "Where does your data come from?", fr: "D'où viennent vos données ?" },
    a3: {
      en: "Our catalog is built from Open Food Facts (a collaborative database, ODbL licence), enriched with the EFSA additives registry, the NOVA classification, the RappelConso/DGCCRF recall feed, and ANSES opinions. Sources are cited on every product page. About 2,300 baby food products sold in France are covered.",
      fr: "Notre catalogue est construit à partir d'Open Food Facts (base collaborative, licence ODbL), enrichi avec la base EFSA des additifs, la classification NOVA, le flux RappelConso/DGCCRF et les avis ANSES. Les sources sont citées sur chaque fiche produit. Environ 2 300 produits bébé vendus en France sont couverts.",
    },
    q4: { en: "Is it really free?", fr: "C'est vraiment gratuit ?" },
    a4: {
      en: "Yes. Browsing the grades, comparing, exploring the additives encyclopedia, and reading the articles is 100% free for parents. BébéDécrypte is funded through affiliate partnerships (Amazon, Greenweez, Bébé au Naturel) and partnerships with brands selected for quality (never by buying a grade).",
      fr: "Oui, 100% gratuit pour les parents. BébéDécrypte se finance via des partenariats d'affiliation (Amazon, Greenweez, Bébé au Naturel) et des partenariats avec des marques sélectionnées pour leur qualité (jamais par achat de note).",
    },
  },

  // Final CTA
  finalCta: {
    title: {
      en: "Stop trusting the pastel packaging. Read the real grade.",
      fr: "Arrête de croire le packaging pastel. Lis la vraie note.",
    },
    body: {
      en: "Search any baby food product, compare two brands side by side, filter by age range. The true A to E verdict in under a second.",
      fr: "Cherche un produit bébé, compare deux marques côte à côte, filtre par âge. Le vrai verdict A à E en moins d'une seconde.",
    },
    cta: { en: "Decode a product", fr: "Décrypter un produit" },
    stat1: { en: "products in catalog", fr: "produits dans le catalogue" },
    stat2: { en: "official sources", fr: "sources officielles" },
    stat3: { en: "always free", fr: "toujours gratuit" },
  },

  // Footer
  footer: {
    tagline: {
      en: "Independent baby-food label decoder, A to E",
      fr: "Décodeur d'alimentation bébé indépendant, de A à E",
    },
    blurb: {
      en: "Every baby food, formula, cereal and pouch graded on 8 axes: NOVA, additives, added sugars, Nutri-Score, organic, allergens, origin, simplicity. Free, transparent, no brand ever pays.",
      fr: "Chaque aliment bébé noté sur 8 axes : NOVA, additifs, sucres ajoutés, Nutri-Score, bio, allergènes, origine, simplicité. Gratuit, transparent, aucune marque ne paie.",
    },
    colProduct: { en: "Product", fr: "Produit" },
    colCompany: { en: "Company", fr: "Société" },
    colLegal: { en: "Legal", fr: "Mentions légales" },
    catalogue: { en: "Catalog", fr: "Catalogue" },
    byAge: { en: "By age", fr: "Par âge" },
    compare: { en: "Compare", fr: "Comparer" },
    additives: { en: "Additives encyclopedia", fr: "Encyclopédie des additifs" },
    methodology: { en: "Methodology", fr: "Méthodologie" },
    app: { en: "Launch the decoder", fr: "Lancer le décodeur" },
    about: { en: "About", fr: "À propos" },
    blog: { en: "Blog", fr: "Blog" },
    contact: { en: "Contact", fr: "Contact" },
    privacy: { en: "Privacy policy", fr: "Politique de confidentialité" },
    terms: { en: "Terms of use", fr: "Conditions d'utilisation" },
    cookies: { en: "Cookie policy", fr: "Politique de cookies" },
    disclaimer: {
      en: "BébéDécrypte is an independent editorial rating service, not a medical practice. Grades are informational only. Always consult a paediatrician for individual advice on your child's nutrition.",
      fr: "BébéDécrypte est un service éditorial de notation indépendant, pas un cabinet médical. Les notes sont informatives. Consulte toujours un pédiatre pour un avis personnalisé sur la nutrition de ton enfant.",
    },
  },

  // Cookie banner
  cookie: {
    emoji: { en: "Read the label", fr: "Lis l'étiquette" },
    message: {
      en: "Transparent like a clean label: essential cookies keep the site running, analytics help us sharpen the grading algorithm. No third-party ads, no data resale. You decide.",
      fr: "Transparent comme une bonne étiquette : les cookies essentiels font tourner le site, l'analytics nous aide à affiner notre notation. Pas de pub tierce, pas de revente de tes données. C'est toi qui décides.",
    },
    accept: { en: "Accept", fr: "Accepter" },
    reject: { en: "Reject", fr: "Refuser" },
    essential: { en: "Essential only", fr: "Essentiels uniquement" },
    learnMore: { en: "Learn more", fr: "En savoir plus" },
    policy: { en: "Cookie policy", fr: "Politique de cookies" },
    manage: { en: "Manage cookies", fr: "Gérer les cookies" },
  },

  // 404
  notFound: {
    code: { en: "404", fr: "404" },
    title: {
      en: "This page is not on the label",
      fr: "Cette page n'est pas sur l'étiquette",
    },
    body: {
      en: "Like many baby-food marketing claims, it promises something that does not really exist. Let's keep the investigation going.",
      fr: "Comme beaucoup d'allégations marketing sur les produits bébé, elle promet quelque chose qui n'existe pas vraiment. On continue l'enquête.",
    },
    home: { en: "Back to home", fr: "Retour à l'accueil" },
    score: { en: "Decode a product", fr: "Décrypter un produit" },
    popular: { en: "Popular pages", fr: "Pages populaires" },
  },
};
