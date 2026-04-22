// ============================================
// SITE CONFIG , bebedecrypte.com
// On decrypte ce qu'il y a vraiment dans le pot de votre bebe. FR + EN.
// ============================================

export const siteConfig = {
  // Identity
  name: "BébéDécrypte",
  tagline: "On décrypte ce qu'il y a vraiment dans le pot de votre bébé",
  description:
    "BébéDécrypte note chaque petit pot, lait infantile, céréale et gourde bébé de A à E. Additifs, sucres cachés, ultra-transformation, bio. Indépendant, gratuit, sources officielles (ANSES, EFSA, Open Food Facts).",
  url: "https://bebedecrypte.com",
  appUrl: "https://bebedecrypte.com",
  locale: "fr-FR",
  language: "fr",

  // Bilingue (FR principal, EN secondaire)
  locales: [
    { code: "fr", label: "Français", path: "/" },
    { code: "en", label: "English", path: "/en/" },
  ],

  // Palette "loupe parentale" : cyan clinique + ambre decryptage + creme chaleureuse
  colors: {
    primary: "#0891b2", // cyan-600 , confiance, lait, pediatrie
    secondary: "#155e75", // cyan-800 , profondeur, autorite
    accent: "#f59e0b", // amber-500 , loupe, alerte additif (famille Decrypte)
    alert: "#dc2626", // red-600 , verdicts E, rappels produits
    background: "#fefce8", // warm cream , chaleur biberon pas clinique froid
    text: "#0c0a09", // stone-950 , encre etiquette
  },

  // Typographie
  fonts: {
    display: "Plus Jakarta Sans",
    body: "Inter",
  },

  // SEO
  author: "BébéDécrypte Editorial",
  twitterHandle: "",
  ogImage: "/og-default.svg",
  keywords: [
    "alimentation bébé",
    "petit pot bébé",
    "lait infantile",
    "céréales bébé",
    "additifs bébé",
    "sucres cachés bébé",
    "diversification alimentaire",
    "bébé bio",
    "meilleur petit pot",
    "rappel lait infantile",
    "maltodextrine bébé",
    "huile de palme bébé",
    "Blédina",
    "Babybio",
    "Good Goût",
  ],

  // GEO (Generative Engine Optimization)
  llmsDescription:
    "BébéDécrypte.com est un comparateur indépendant d'alimentation infantile qui note chaque produit (petits pots, laits infantiles 1er/2e/3e âge, céréales, gourdes, biscuits) de A à E sur 8 critères : Nutri-Score, classification NOVA (ultra-transformation), additifs, certification bio, transparence allergènes, sucres ajoutés, origine française, simplicité des ingrédients. Données issues d'Open Food Facts (licence ODbL), croisées avec la base additifs EFSA et les alertes ANSES. Couverture : environ 2300 produits vendus en France, marques industrielles (Blédina, Gallia, Guigoz, Nestlé) et bio (Babybio, Good Goût, Popote, Yooji). Gratuit, algorithme déterministe et public.",

  // Schema.org
  schema: {
    organizationType: "Organization",
  },

  // UI strings (i18n-ready overrides)
  ui: {
    ctaPrimary: "Décrypter un produit",
    ctaSecondary: "Explorer le catalogue",
    ctaHeader: "Décrypter",
    ctaFooterTitle: "Prêt à savoir vraiment ce que mange ton bébé ?",
  },

  // Navigation (route names kept EN-canonical, FR labels via i18n)
  navLinks: [
    { label: "Catalogue", href: "/rankings" },
    { label: "Par âge", href: "/by-age" },
    { label: "Comparer", href: "/compare" },
    { label: "Additifs", href: "/encyclopedia" },
    { label: "Méthodologie", href: "/methodology" },
    { label: "Blog", href: "/blog" },
  ],

  // Landing page sections
  sections: {
    hero: true,
    features: true,
    faq: true,
    cta: true,
    testimonials: false,
  },

  // FAQ
  faq: [
    {
      question: "Comment BébéDécrypte note les produits pour bébé ?",
      answer:
        "Chaque produit reçoit une note de A à E calculée sur 8 critères pondérés : classification NOVA (ultra-transformation, 25%), additifs EFSA (25%), sucres ajoutés et cachés (20%), Nutri-Score officiel (10%), certification bio (10%), transparence des allergènes (5%), origine française (3%) et simplicité de la recette (2%). L'algorithme est déterministe : mêmes ingrédients, même note, à chaque fois. Aucune marque ne peut acheter sa note.",
    },
    {
      question: "Pourquoi les additifs sont-ils plus pénalisés pour un bébé ?",
      answer:
        "Les nourrissons ont une barrière intestinale immature, un foie et des reins en développement, et un rapport poids/additif bien plus défavorable qu'un adulte. L'ANSES rappelle qu'il faut limiter au maximum les additifs avant 3 ans, même ceux autorisés. Notre scoring applique une pondération spécifique bébé : certains E-numéros tolérés chez l'adulte déclenchent une alerte rouge sur les produits destinés aux moins de 3 ans.",
    },
    {
      question: "D'où viennent vos données ?",
      answer:
        "Notre catalogue est construit à partir d'Open Food Facts (base collaborative, licence ODbL), enrichi avec la base EFSA des additifs alimentaires, la classification NOVA, les alertes RappelConso de la DGCCRF et les publications de l'ANSES. Les sources sont citées sur chaque fiche produit. Environ 2 300 produits bébé vendus en France sont couverts (petits pots, laits infantiles, céréales, gourdes, biscuits, boissons).",
    },
    {
      question: "Comment gérez-vous les rappels produits (Lactalis, etc.) ?",
      answer:
        "Tout produit concerné par un rappel officiel (DGCCRF, RappelConso) est immédiatement signalé par un bandeau rouge sur sa fiche, avec la date et le motif du rappel. L'historique des rappels par marque est consultable dans notre encyclopédie. Le scandale Lactalis de 2017 reste la référence : on ne laisse plus un parent acheter à l'aveugle.",
    },
    {
      question: "C'est gratuit ? Qui vous paye ?",
      answer:
        "Oui, 100% gratuit pour les parents. BébéDécrypte se finance via des liens d'affiliation (Amazon, Greenweez, Bébé au Naturel) et des partenariats avec des marques sélectionnées pour leur qualité (jamais achat de note). Aucune marque ne peut modifier son scoring. Notre indépendance est notre actif principal.",
    },
  ],

  // Features
  features: [
    {
      title: "Verdict en 10 secondes",
      description:
        "Cherche une marque, un petit pot, un lait infantile. Tu obtiens une note A à E, le détail additif par additif, et les alternatives mieux notées du même rayon, du même âge, du même prix.",
      icon: "zap",
    },
    {
      title: "Anti-marketing bébé",
      description:
        "Chaque allégation (naturel, sans sucre ajouté, pour bébé, recommandé par les pédiatres) est confrontée à l'étiquette réelle. On montre le fossé entre le pastel rassurant du packaging et la composition.",
      icon: "shield",
    },
    {
      title: "Méthodologie publique",
      description:
        "L'algorithme, la base additifs, les pondérations spécifiques bébé et les sources sont publics. N'importe quel parent, pédiatre ou journaliste peut reproduire nos notes depuis la page méthodologie.",
      icon: "chart",
    },
  ],

  // Blog
  blog: {
    enabled: true,
    postsPerPage: 12,
    defaultAuthor: "BébéDécrypte Editorial",
    categories: [
      "diversification",
      "petits-pots",
      "laits-infantiles",
      "cereales-bebe",
      "additifs-nourrisson",
      "rappels-produits",
      "enquetes",
      "methodologie",
    ],
    name: "BébéDécrypte Blog",
    slug: "blog",
  },

  // Ages couverts (specifique bebe , utilise par /par-age)
  ages: [
    { key: "4m", label: "4 mois", months: 4 },
    { key: "6m", label: "6 mois", months: 6 },
    { key: "8m", label: "8 mois", months: 8 },
    { key: "12m", label: "12 mois", months: 12 },
    { key: "18m", label: "18 mois", months: 18 },
    { key: "24m", label: "24 mois", months: 24 },
    { key: "36m", label: "3 ans+", months: 36 },
  ],

  // Legal
  legal: {
    companyName: "",
    siret: "",
    address: "France",
    email: "contact@bebedecrypte.com",
    phone: "",
  },
};
