// ============================================
// BébéDécrypte Score , deterministic A to E grading (baby-specific)
// ============================================
//
// Philosophy: same ingredient list, same grade, every time.
// 8 weighted axes combined into a single 0-100 score then mapped to a letter.
// Baby-specific weighting: NOVA + additives + added sugars get the highest weight.

export type Grade = "A" | "B" | "C" | "D" | "E";
export type NutriScoreLetter = "A" | "B" | "C" | "D" | "E";
export type NovaClass = 1 | 2 | 3 | 4;

export interface Additive {
  /** E number (e.g. "E950") or INS code. */
  code: string;
  /** ANSES / EFSA baby-specific risk bucket: 0 = neutral, 1 = watch, 2 = suspected, 3 = to avoid under 3. */
  risk: 0 | 1 | 2 | 3;
  name?: string;
}

export interface NutritionPanel {
  /** Grams per 100 g unless noted. */
  protein: number;
  fiber: number;
  sugar: number;
  saturatedFat: number;
  sodium: number; // mg
  addedSugarsMentioned?: boolean; // true if ingredient list contains added sugar tokens
}

export interface ScoringInput {
  nutriScore?: NutriScoreLetter;
  nova?: NovaClass;
  additives?: Additive[];
  nutrition?: NutritionPanel;
  /** Ingredient list tokens (lowercased). Used to detect added sugars, maltodextrin, palm oil. */
  ingredientTokens?: string[];
  /** Open Food Facts labels_tags (e.g. "en:organic", "en:made-in-france"). */
  labelsTags?: string[];
  /** Open Food Facts allergens_tags. */
  allergensTags?: string[];
  /** Open Food Facts traces_tags (may contain X). Ambiguity reduces transparency. */
  tracesTags?: string[];
  /** Ingredient count (parsed from ingredients_text). */
  ingredientCount?: number;
  /** Target age in months. Some scoring is stricter below 12m. */
  targetAgeMonths?: number;
}

export interface ScoringBreakdown {
  nova: number;
  additives: number;
  addedSugars: number;
  nutriScore: number;
  bio: number;
  allergens: number;
  origin: number;
  simplicity: number;
}

export interface ScoringResult {
  score: number; // 0-100
  grade: Grade;
  breakdown: ScoringBreakdown;
  warnings: string[];
}

// ============================================
// Weights (sum = 1.0). Baby-specific, keep in sync with /methodologie.
// ============================================
export const WEIGHTS = {
  nova: 0.25,
  additives: 0.25,
  addedSugars: 0.2,
  nutriScore: 0.1,
  bio: 0.1,
  allergens: 0.05,
  origin: 0.03,
  simplicity: 0.02,
} as const;

// ============================================
// Grade thresholds on the final 0-100 score.
// ============================================
export const GRADE_THRESHOLDS: Record<Grade, number> = {
  A: 85,
  B: 70,
  C: 55,
  D: 40,
  E: 0,
};

export const GRADE_COLOURS: Record<Grade, string> = {
  A: "#0891b2",
  B: "#84cc16",
  C: "#eab308",
  D: "#f97316",
  E: "#dc2626",
};

export const GRADE_LABELS_FR: Record<Grade, string> = {
  A: "Excellent",
  B: "Bon",
  C: "Moyen",
  D: "Médiocre",
  E: "À éviter",
};

export const GRADE_LABELS_EN: Record<Grade, string> = {
  A: "Excellent",
  B: "Good",
  C: "Average",
  D: "Poor",
  E: "Avoid",
};

export function gradeLabel(g: Grade, locale: "en" | "fr"): string {
  return locale === "fr" ? GRADE_LABELS_FR[g] : GRADE_LABELS_EN[g];
}

// ============================================
// Added-sugar detection tokens (FR + EN)
// ============================================
export const ADDED_SUGAR_TOKENS = [
  "sucre",
  "sugar",
  "sirop de glucose",
  "glucose syrup",
  "sirop de fructose",
  "fructose syrup",
  "sirop de mais",
  "corn syrup",
  "maltodextrine",
  "maltodextrin",
  "dextrose",
  "saccharose",
  "sucrose",
  "miel",
  "honey",
  "jus de fruit concentre",
  "concentrated fruit juice",
  "sirop de riz",
  "rice syrup",
  "sirop d'agave",
  "agave syrup",
];

// ============================================
// Component scorers (each returns a 0-100 value)
// ============================================

/**
 * NOVA ultra-processing class. Highest weight for baby food.
 * NOVA 1 = unprocessed, NOVA 4 = ultra-processed (alert).
 */
export function computeNovaComponent(nova?: NovaClass): number {
  if (!nova) return 50;
  const map: Record<NovaClass, number> = {
    1: 100,
    2: 80,
    3: 45,
    4: 10,
  };
  return map[nova];
}

/**
 * Additive risk , baby-specific penalties (stricter than adult).
 * ANSES recommends limiting additives before 3 years.
 */
export function computeAdditiveRisk(
  additives?: Additive[],
  targetAgeMonths?: number,
): number {
  if (!additives || additives.length === 0) return 100;
  const underTwelve = typeof targetAgeMonths === "number" && targetAgeMonths < 12;
  const riskPenalty: Record<Additive["risk"], number> = underTwelve
    ? { 0: 8, 1: 18, 2: 35, 3: 60 }
    : { 0: 5, 1: 15, 2: 30, 3: 50 };
  const totalPenalty = additives.reduce((acc, a) => acc + riskPenalty[a.risk], 0);
  return Math.max(0, Math.min(100, 100 - totalPenalty));
}

/**
 * Added sugars , baby-specific. Detect sucrose, glucose, maltodextrin, honey,
 * fruit concentrates used as sweeteners. Zero tolerance before 12 months.
 */
export function computeAddedSugarsComponent(
  ingredientTokens: string[] | undefined,
  nutrition: NutritionPanel | undefined,
  targetAgeMonths?: number,
): number {
  const tokens = (ingredientTokens || []).map((t) => t.toLowerCase());
  let detected = 0;
  for (const tag of ADDED_SUGAR_TOKENS) {
    if (tokens.some((t) => t.includes(tag))) detected += 1;
  }
  const underTwelve = typeof targetAgeMonths === "number" && targetAgeMonths < 12;
  let score = 100;
  if (detected >= 1) score -= underTwelve ? 45 : 30;
  if (detected >= 2) score -= 15;
  if (detected >= 3) score -= 10;
  if (nutrition && nutrition.sugar > 0) {
    const overshoot = Math.max(0, nutrition.sugar - 5); // above 5g/100g
    score -= Math.min(25, overshoot * 2);
  }
  return Math.max(0, Math.min(100, score));
}

/**
 * Nutri-Score, under-weighted for baby food (the Nutri-Score is designed for
 * the adult diet and does not account for ultra-processing).
 */
export function computeNutriScoreComponent(letter?: NutriScoreLetter): number {
  if (!letter) return 55;
  const map: Record<NutriScoreLetter, number> = {
    A: 95,
    B: 78,
    C: 60,
    D: 40,
    E: 15,
  };
  return map[letter];
}

/**
 * Bio certification. AB / EU Bio / Demeter.
 */
export function computeBioComponent(labelsTags?: string[]): number {
  if (!labelsTags || labelsTags.length === 0) return 40;
  const bioSignals = [
    "en:organic",
    "fr:ab-agriculture-biologique",
    "en:eu-organic",
    "en:demeter",
    "fr:bio",
  ];
  const hit = labelsTags.some((t) => bioSignals.includes(t));
  return hit ? 100 : 40;
}

/**
 * Allergen transparency. We reward clear declaration and penalise ambiguous
 * "may contain traces" spam.
 */
export function computeAllergensComponent(
  allergensTags?: string[],
  tracesTags?: string[],
): number {
  const allergensCount = allergensTags?.length || 0;
  const tracesCount = tracesTags?.length || 0;
  if (allergensCount === 0 && tracesCount === 0) return 90; // nothing to declare
  const declared = allergensCount > 0 ? 90 : 60;
  const tracePenalty = Math.min(30, tracesCount * 8); // too many "may contain"
  return Math.max(0, Math.min(100, declared - tracePenalty));
}

/**
 * Made in France. Manufacturing origin transparency.
 */
export function computeOriginComponent(labelsTags?: string[]): number {
  if (!labelsTags || labelsTags.length === 0) return 50;
  const frSignals = [
    "en:made-in-france",
    "fr:fabrique-en-france",
    "en:produced-in-france",
    "fr:origine-france",
  ];
  if (labelsTags.some((t) => frSignals.includes(t))) return 100;
  const euSignals = ["en:made-in-europe", "en:european-origin"];
  if (labelsTags.some((t) => euSignals.includes(t))) return 70;
  return 40;
}

/**
 * Recipe simplicity , fewer ingredients is better for a baby product.
 */
export function computeSimplicityComponent(ingredientCount?: number): number {
  if (typeof ingredientCount !== "number" || ingredientCount <= 0) return 60;
  if (ingredientCount <= 3) return 100;
  if (ingredientCount <= 5) return 85;
  if (ingredientCount <= 8) return 65;
  if (ingredientCount <= 12) return 45;
  if (ingredientCount <= 18) return 25;
  return 10;
}

// ============================================
// Warnings , surface the worst ingredient choices even on middle grades.
// ============================================
export function collectWarnings(input: ScoringInput): string[] {
  const warnings: string[] = [];
  const underTwelve =
    typeof input.targetAgeMonths === "number" && input.targetAgeMonths < 12;
  const tokens = (input.ingredientTokens || []).map((t) => t.toLowerCase());

  if (tokens.some((t) => t.includes("huile de palme") || t.includes("palm oil"))) {
    warnings.push("Huile de palme détectée");
  }
  if (tokens.some((t) => t.includes("maltodextrine") || t.includes("maltodextrin"))) {
    warnings.push("Maltodextrine (sucre caché) détectée");
  }
  if (tokens.some((t) => t.includes("miel") || t.includes("honey")) && underTwelve) {
    warnings.push("Miel déconseillé avant 12 mois (risque botulisme)");
  }
  if (input.nova === 4) warnings.push("Ultra-transformé (NOVA 4)");
  const riskyAdditives = (input.additives || []).filter((a) => a.risk >= 2);
  if (riskyAdditives.length > 0) {
    warnings.push(
      `${riskyAdditives.length} additif(s) à risque : ${riskyAdditives
        .map((a) => a.code)
        .join(", ")}`,
    );
  }
  return warnings;
}

// ============================================
// Final score + grade
// ============================================
export function numericToGrade(n: number): Grade {
  if (n >= GRADE_THRESHOLDS.A) return "A";
  if (n >= GRADE_THRESHOLDS.B) return "B";
  if (n >= GRADE_THRESHOLDS.C) return "C";
  if (n >= GRADE_THRESHOLDS.D) return "D";
  return "E";
}

export function computeOverallGrade(input: ScoringInput): ScoringResult {
  const breakdown: ScoringBreakdown = {
    nova: computeNovaComponent(input.nova),
    additives: computeAdditiveRisk(input.additives, input.targetAgeMonths),
    addedSugars: computeAddedSugarsComponent(
      input.ingredientTokens,
      input.nutrition,
      input.targetAgeMonths,
    ),
    nutriScore: computeNutriScoreComponent(input.nutriScore),
    bio: computeBioComponent(input.labelsTags),
    allergens: computeAllergensComponent(input.allergensTags, input.tracesTags),
    origin: computeOriginComponent(input.labelsTags),
    simplicity: computeSimplicityComponent(input.ingredientCount),
  };

  const score =
    breakdown.nova * WEIGHTS.nova +
    breakdown.additives * WEIGHTS.additives +
    breakdown.addedSugars * WEIGHTS.addedSugars +
    breakdown.nutriScore * WEIGHTS.nutriScore +
    breakdown.bio * WEIGHTS.bio +
    breakdown.allergens * WEIGHTS.allergens +
    breakdown.origin * WEIGHTS.origin +
    breakdown.simplicity * WEIGHTS.simplicity;

  const rounded = Math.round(score * 10) / 10;
  return {
    score: rounded,
    grade: numericToGrade(rounded),
    breakdown,
    warnings: collectWarnings(input),
  };
}

export function sortByGrade<T extends { score: number }>(items: T[]): T[] {
  return [...items].sort((a, b) => b.score - a.score);
}
