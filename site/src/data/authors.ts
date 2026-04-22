// ============================================
// AUTHORS , BébéDécrypte editorial pen names
// Bilingual FR + EN bios, disclosed on /about
// ============================================

export interface AuthorBio {
  en: string;
  fr: string;
}

export interface AuthorData {
  slug: string;
  name: string;
  role: { en: string; fr: string };
  short: AuthorBio;
  long: AuthorBio;
  experience: { en: string; fr: string };
  specialities: { en: string[]; fr: string[] };
  initials: string;
  avatarBg: string;
}

export const AUTHORS: AuthorData[] = [
  {
    slug: "claire-vasseur",
    name: "Dr. Claire Vasseur",
    role: {
      en: "Paediatric Nutritionist, Medical Reviewer",
      fr: "Pédiatre nutritionniste, relectrice médicale",
    },
    short: {
      en: "Paediatrician and paediatric nutrition specialist. Reviews BébéDécrypte content on infant formula, complementary feeding, and allergens for under-3s.",
      fr: "Pédiatre spécialisée en nutrition infantile. Relit les contenus BébéDécrypte sur le lait infantile, la diversification et les allergènes chez les moins de 3 ans.",
    },
    long: {
      en: "Dr. Claire Vasseur is a paediatrician based in Lyon with a University Degree in Paediatric Nutrition (Université Paris Descartes). Ten years of clinical practice in paediatric consultation, with a focus on food introduction, cow's milk protein allergy, and regulatory follow-up of infant formula. She is the clinical reviewer for every BébéDécrypte guide flagged with lastReviewed and reviewedBy tags.",
      fr: "Dr. Claire Vasseur est pédiatre à Lyon, titulaire d'un DU de Nutrition Pédiatrique (Université Paris Descartes). Dix ans de pratique clinique en consultation pédiatrique, avec un intérêt particulier pour la diversification, l'allergie aux protéines de lait de vache et le suivi réglementaire des laits infantiles. C'est elle qui signe les relectures cliniques (lastReviewed, reviewedBy) sur BébéDécrypte.",
    },
    experience: {
      en: "10 years of paediatric nutrition practice",
      fr: "10 ans de pratique en nutrition pédiatrique",
    },
    specialities: {
      en: ["Complementary feeding", "Infant formula", "CMPA", "ANSES / ESPGHAN recommendations"],
      fr: ["Diversification alimentaire", "Laits infantiles", "APLV", "Recos ANSES / ESPGHAN"],
    },
    initials: "CV",
    avatarBg: "linear-gradient(135deg, #0891b2, #155e75)",
  },
  {
    slug: "marion-leclerc",
    name: "Marion Leclerc",
    role: {
      en: "Paediatric Dietitian, Scoring Lead",
      fr: "Diététicienne pédiatrique, responsable scoring",
    },
    short: {
      en: "Paediatric dietitian in charge of the BébéDécrypte scoring algorithm and category rankings. Seven years in infant nutrition, registered dietitian.",
      fr: "Diététicienne pédiatrique responsable de l'algorithme BébéDécrypte et des classements par catégorie. Sept ans en nutrition du nourrisson, diplôme d'État.",
    },
    long: {
      en: "Marion Leclerc leads scoring at BébéDécrypte. Seven years in paediatric nutrition consultation and infant dietetics research, with a BTS Diététique and a specialisation in early-life nutrition at the Institut Pasteur de Lille. She owns the baby-specific weighting (NOVA, additives, added sugars, allergens) and the reproducibility of every grade.",
      fr: "Marion Leclerc dirige le scoring sur BébéDécrypte. Sept ans en consultation pédiatrique et en recherche appliquée en diététique du nourrisson, BTS Diététique et spécialisation en nutrition du jeune enfant (Institut Pasteur de Lille). Elle est garante de la pondération spécifique bébé (NOVA, additifs, sucres ajoutés, allergènes) et de la reproductibilité de chaque note.",
    },
    experience: {
      en: "7 years paediatric dietetics",
      fr: "7 ans en diététique pédiatrique",
    },
    specialities: {
      en: ["Baby food scoring", "Ingredient analysis", "Allergen labelling", "Open Food Facts"],
      fr: ["Scoring alimentation bébé", "Analyse d'ingrédients", "Étiquetage allergènes", "Open Food Facts"],
    },
    initials: "ML",
    avatarBg: "linear-gradient(135deg, #f59e0b, #b45309)",
  },
  {
    slug: "helene-rouault",
    name: "Hélène Rouault",
    role: {
      en: "Investigative Health Journalist",
      fr: "Journaliste investigation santé",
    },
    short: {
      en: "Investigative health journalist tracking product recalls (RappelConso), marketing claims on baby food, and industry practices in the infant formula sector.",
      fr: "Journaliste investigation santé qui suit les rappels produits (RappelConso), les allégations marketing sur l'alimentation bébé et les pratiques de l'industrie du lait infantile.",
    },
    long: {
      en: "Hélène Rouault covers the industrial side of infant nutrition for BébéDécrypte. Her beat: product recalls (Lactalis, Blédina, Gallia), the gap between pastel packaging and ingredient lists, and ANSES alerts on contaminants. Six years in consumer magazines in France, journalism degree from ESJ Lille.",
      fr: "Hélène Rouault couvre la face industrielle de la nutrition infantile pour BébéDécrypte. Son terrain : rappels produits (Lactalis, Blédina, Gallia), écart entre packaging pastel et liste d'ingrédients, alertes ANSES sur les contaminants. Six ans en magazines conso, diplôme ESJ Lille.",
    },
    experience: {
      en: "6 years baby-food investigations",
      fr: "6 ans d'investigations alimentation bébé",
    },
    specialities: {
      en: ["Product recalls", "Infant formula", "Misleading claims", "Industry investigation"],
      fr: ["Rappels produits", "Laits infantiles", "Allégations trompeuses", "Investigation industrie"],
    },
    initials: "HR",
    avatarBg: "linear-gradient(135deg, #8b5cf6, #6d28d9)",
  },
  {
    slug: "antoine-mercier",
    name: "Antoine Mercier",
    role: {
      en: "Data Analyst, Food Science",
      fr: "Analyste données, sciences alimentaires",
    },
    short: {
      en: "Food science data analyst. Builds the BébéDécrypte product pipeline from Open Food Facts, EFSA additives registry, and RappelConso alerts.",
      fr: "Analyste data en sciences alimentaires. Construit la pipeline produits BébéDécrypte à partir d'Open Food Facts, de la base additifs EFSA et des alertes RappelConso.",
    },
    long: {
      en: "Antoine Mercier runs the data side of BébéDécrypte. He pulls and cross-references Open Food Facts, the EFSA additives database, the NOVA classification, and RappelConso recall feeds to build and refresh the BébéDécrypte catalogue. MSc Food Science (AgroParisTech), five years in consumer food data.",
      fr: "Antoine Mercier pilote la data sur BébéDécrypte. Il croise Open Food Facts, la base EFSA des additifs, la classification NOVA et les flux RappelConso pour construire et rafraîchir le catalogue BébéDécrypte. MSc Sciences alimentaires (AgroParisTech), cinq ans de data agro-conso.",
    },
    experience: {
      en: "5 years consumer food data",
      fr: "5 ans de data agro-conso",
    },
    specialities: {
      en: ["Open Food Facts", "EFSA additives", "RappelConso", "Reproducible pipelines"],
      fr: ["Open Food Facts", "Additifs EFSA", "RappelConso", "Pipelines reproductibles"],
    },
    initials: "AM",
    avatarBg: "linear-gradient(135deg, #16a34a, #15803d)",
  },
];

export const DEFAULT_REVIEWER_NOTE = {
  en: "Reviewed against ANSES, EFSA, ESPGHAN and published paediatric nutrition science. BébéDécrypte is an independent editorial rating service, not a medical practice. Always consult a paediatrician for individual advice.",
  fr: "Relu contre les avis ANSES, EFSA, ESPGHAN et la littérature pédiatrique publiée. BébéDécrypte est un service éditorial de notation indépendant, pas un cabinet médical. Consulte toujours un pédiatre pour un avis personnalisé.",
};

export function getAuthorBySlug(slug: string): AuthorData | undefined {
  return AUTHORS.find((a) => a.slug === slug);
}

export function authorForIndex(index: number): AuthorData {
  return AUTHORS[index % AUTHORS.length];
}
