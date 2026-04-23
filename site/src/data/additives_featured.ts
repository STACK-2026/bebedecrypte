// Top E-numbers flagged in baby food , curated for the /encyclopedia/ hub.
// Complete registry of 50 additives lives in Supabase (additives table).

export type AdditiveSeverity = "forbidden" | "critical" | "caution" | "tolerated";

export interface FeaturedAdditive {
  eNumber: string;
  name: string;
  role: string;
  severity: AdditiveSeverity;
  babyWarning: string;
  source: string;
}

export const FEATURED_ADDITIVES: FeaturedAdditive[] = [
  {
    eNumber: "E171",
    name: "Dioxyde de titane",
    role: "Colorant blanc brillant (bonbons, enrobages, chewing-gum)",
    severity: "forbidden",
    babyWarning: "Interdit dans l'UE depuis août 2022 dans tous les aliments. Génotoxicité possible selon l'EFSA (2021).",
    source: "EFSA Scientific Opinion, 2021",
  },
  {
    eNumber: "E250",
    name: "Nitrite de sodium",
    role: "Conservateur et fixateur de couleur (charcuterie)",
    severity: "critical",
    babyWarning: "Formation possible de nitrosamines cancérigènes. ANSES recommande de limiter fortement chez les jeunes enfants.",
    source: "ANSES, avis 2022",
  },
  {
    eNumber: "E320",
    name: "BHA (butylhydroxyanisole)",
    role: "Antioxydant synthétique (matières grasses, céréales, chewing-gum)",
    severity: "critical",
    babyWarning: "Classé cancérogène possible (CIRC groupe 2B). À éviter absolument dans un produit destiné à un bébé.",
    source: "CIRC Monograph 40",
  },
  {
    eNumber: "E321",
    name: "BHT (butylhydroxytoluène)",
    role: "Antioxydant synthétique (huiles, céréales, chewing-gum)",
    severity: "critical",
    babyWarning: "Même famille que E320, suspecté de perturbation endocrinienne.",
    source: "ANSES, lignes directrices 2021",
  },
  {
    eNumber: "E951",
    name: "Aspartame",
    role: "Édulcorant intense",
    severity: "critical",
    babyWarning: "Classé cancérogène possible par le CIRC en juillet 2023. Aucun besoin dans un produit bébé, la teneur en sucre naturel des fruits suffit.",
    source: "CIRC / OMS, 2023",
  },
  {
    eNumber: "E621",
    name: "Glutamate monosodique",
    role: "Exhausteur de goût",
    severity: "critical",
    babyWarning: "Masque les saveurs naturelles, éduque le goût à l'excès de sel. Banni des produits spécifiquement ciblés 0-3 ans par la réglementation EU.",
    source: "Règlement UE 609/2013",
  },
  {
    eNumber: "E414",
    name: "Gomme arabique",
    role: "Épaississant, émulsifiant",
    severity: "tolerated",
    babyWarning: "Considérée comme sûre. Présente dans certains laits infantiles en très faible quantité.",
    source: "EFSA ANS Panel, 2017",
  },
  {
    eNumber: "E415",
    name: "Gomme xanthane",
    role: "Épaississant",
    severity: "caution",
    babyWarning: "EFSA recommande de ne pas dépasser 1,5 g/kg chez les nourrissons. Risque d'entérocolite nécrosante chez les très grands prématurés.",
    source: "EFSA, 2017",
  },
  {
    eNumber: "E331",
    name: "Citrates de sodium",
    role: "Régulateur d'acidité, émulsifiant",
    severity: "tolerated",
    babyWarning: "Sûr aux doses alimentaires. Souvent utilisé dans les laits infantiles pour stabiliser le pH.",
    source: "EFSA Scientific Opinion, 2018",
  },
  {
    eNumber: "E1442",
    name: "Phosphate de diamidon hydroxypropylé",
    role: "Amidon modifié, épaississant (petits pots, compotes)",
    severity: "caution",
    babyWarning: "Classé amidon modifié (NOVA 4). Valeur calorique vide, signal d'ultra-transformation. Privilégier compote cuisinée ou amidon natif.",
    source: "NOVA classification, University of São Paulo",
  },
  {
    eNumber: "E433",
    name: "Polysorbate 80",
    role: "Émulsifiant (glaces, desserts, sauces)",
    severity: "caution",
    babyWarning: "Études animales suggèrent un impact sur le microbiote intestinal. À éviter chez le nourrisson dont le microbiote est en cours de formation.",
    source: "Nature, Chassaing et al., 2015",
  },
  {
    eNumber: "E407",
    name: "Carraghénanes",
    role: "Gélifiant (laits, desserts)",
    severity: "caution",
    babyWarning: "Autorisé dans les préparations pour nourrissons mais la FDA a demandé des études supplémentaires sur l'inflammation intestinale.",
    source: "Joint FAO/WHO JECFA, 2014",
  },
];

export const SEVERITY_LABELS: Record<AdditiveSeverity, { label: string; color: string }> = {
  forbidden: { label: "Interdit bébé", color: "var(--grade-e)" },
  critical: { label: "À éviter", color: "var(--grade-d)" },
  caution: { label: "À surveiller", color: "var(--grade-c)" },
  tolerated: { label: "Toléré", color: "var(--grade-b)" },
};
