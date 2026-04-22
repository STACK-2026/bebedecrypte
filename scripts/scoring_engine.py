"""
BebeDecrypte Score engine , version 1.0 (baby-specific)

Computes a deterministic A to E grade for infant food (baby pots, infant formula,
cereals, pouches, biscuits) based on eight weighted axes:

  1. NOVA (ultra-process class)    weight 25%    #1 concern for infant food
  2. Additive risk index           weight 25%    EFSA + ANSES, under-3 pondered
  3. Added sugars                  weight 20%    sucrose, glucose syrup, maltodextrin, honey
  4. Nutri-Score                   weight 10%    official FR score, under-weighted (adult-designed)
  5. Bio certification             weight 10%    AB / EU-Organic / Demeter
  6. Allergen transparency         weight 5%     declared allergens + penalise "traces" spam
  7. Made in France                weight 3%     manufacturing origin
  8. Recipe simplicity             weight 2%     number of ingredients

Grade thresholds (out of 100):
  A >= 85     B 70-84     C 55-69     D 40-54     E < 40

Same inputs return the same grade. Every time. No exceptions.
"""

from __future__ import annotations
from dataclasses import dataclass, field
from typing import Iterable


# ============================================================
# Weights and thresholds , bump the version before changing.
# ============================================================
WEIGHTS = {
    "nova": 0.25,
    "additives": 0.25,
    "added_sugars": 0.20,
    "nutri": 0.10,
    "bio": 0.10,
    "allergens": 0.05,
    "origin": 0.03,
    "simplicity": 0.02,
}

GRADE_THRESHOLDS = [
    (85, "A"),
    (70, "B"),
    (55, "C"),
    (40, "D"),
    (0, "E"),
]


# ============================================================
# Data contracts
# ============================================================
@dataclass
class ProductInput:
    nutri_score_letter: str | None       # 'a'..'e' from Open Food Facts
    nova_group: int | None               # 1..4 from Open Food Facts
    additives_tags: list[str] = field(default_factory=list)   # ['en:e102', ...]
    labels_tags: list[str] = field(default_factory=list)      # ['en:organic', 'en:made-in-france', ...]
    allergens_tags: list[str] = field(default_factory=list)
    traces_tags: list[str] = field(default_factory=list)
    ingredients_text: str = ""                                 # raw FR ingredients line
    ingredient_count: int = 0                                  # parsed from ingredients_text
    nutriments: dict = field(default_factory=dict)             # { proteins_100g, sugars_100g, ... }
    target_age_months: int | None = None                       # 4, 6, 8, 12, 24, 36 ...
    category_type: str = "baby_food"                           # 'baby_food' | 'infant_formula' | 'baby_cereal' | 'baby_snack'


@dataclass
class ScoreBreakdown:
    nova: int
    additives: int
    added_sugars: int
    nutri: int
    bio: int
    allergens: int
    origin: int
    simplicity: int
    overall: int
    grade: str
    warnings: list[str]


def compute_grade(product: ProductInput) -> ScoreBreakdown:
    nova = score_nova(product.nova_group)
    additives = score_additives(product.additives_tags, product.target_age_months)
    added_sugars = score_added_sugars(
        product.ingredients_text,
        product.nutriments,
        product.target_age_months,
    )
    nutri = score_nutri_score(product.nutri_score_letter)
    bio = score_bio(product.labels_tags)
    allergens = score_allergens(product.allergens_tags, product.traces_tags)
    origin = score_origin(product.labels_tags)
    simplicity = score_simplicity(product.ingredient_count)

    overall = round(
        nova * WEIGHTS["nova"]
        + additives * WEIGHTS["additives"]
        + added_sugars * WEIGHTS["added_sugars"]
        + nutri * WEIGHTS["nutri"]
        + bio * WEIGHTS["bio"]
        + allergens * WEIGHTS["allergens"]
        + origin * WEIGHTS["origin"]
        + simplicity * WEIGHTS["simplicity"]
    )
    overall = max(0, min(100, overall))

    grade = next(letter for threshold, letter in GRADE_THRESHOLDS if overall >= threshold)

    warnings = collect_warnings(product)

    return ScoreBreakdown(
        nova=nova,
        additives=additives,
        added_sugars=added_sugars,
        nutri=nutri,
        bio=bio,
        allergens=allergens,
        origin=origin,
        simplicity=simplicity,
        overall=overall,
        grade=grade,
        warnings=warnings,
    )


# ============================================================
# Axis 1: NOVA class to 0..100
# ============================================================
NOVA_MAP = {1: 100, 2: 80, 3: 45, 4: 10}


def score_nova(nova_group: int | None) -> int:
    if nova_group is None:
        return 50
    return NOVA_MAP.get(nova_group, 50)


# ============================================================
# Axis 2: additives , baby-specific penalties
# ANSES recommends limiting additives before 3 years. Under 12 months,
# risks are doubled on the "watch" and "suspected" buckets.
# ============================================================
ADDITIVE_HIGH_RISK = {
    # nitrites and nitrates
    "e249", "e250", "e251", "e252",
    # contested colourants
    "e102", "e104", "e110", "e122", "e124", "e129", "e133",
    # contested emulsifiers and thickeners flagged by ANSES
    "e407", "e466", "e433", "e471",
    # artificial sweeteners (not authorised in infant foods but we still check)
    "e951", "e952", "e955", "e954",
    # BHA, BHT
    "e320", "e321",
    # caramel colours with 4-MeI
    "e150c", "e150d",
}

ADDITIVE_MEDIUM_RISK = {
    "e100", "e120", "e160a", "e160b", "e161b",
    "e211", "e212", "e220", "e223",
    "e450", "e451", "e452",
    "e621", "e635",
    "e410", "e412", "e415",  # thickeners (guar, locust bean, xanthan) , fine adult, watch for infants
}


def _clean_tag(tag: str) -> str:
    return tag.replace("en:", "").replace("fr:", "").lower().strip()


def score_additives(tags: Iterable[str], target_age_months: int | None) -> int:
    high = 0
    medium = 0
    low = 0
    for raw in tags or []:
        t = _clean_tag(raw)
        if not t.startswith("e"):
            continue
        if t in ADDITIVE_HIGH_RISK:
            high += 1
        elif t in ADDITIVE_MEDIUM_RISK:
            medium += 1
        else:
            low += 1

    under_twelve = isinstance(target_age_months, int) and target_age_months < 12
    high_penalty = 40 if under_twelve else 30
    medium_penalty = 18 if under_twelve else 12
    low_penalty = 5 if under_twelve else 3

    score = 100 - (high * high_penalty + medium * medium_penalty + low * low_penalty)
    return max(0, min(100, score))


# ============================================================
# Axis 3: added sugars
# Detect sucrose, glucose syrup, maltodextrin, honey, concentrated fruit juice
# used as sweetener. Under 12 months: zero tolerance (honey = botulism).
# ============================================================
ADDED_SUGAR_TOKENS = [
    "sucre",
    "sirop de glucose",
    "sirop de fructose",
    "sirop de mais",
    "sirop de riz",
    "sirop d'agave",
    "maltodextrine",
    "dextrose",
    "saccharose",
    "miel",
    "jus de fruit concentre",
    # EN fallback (some products are labelled in EN)
    "sugar",
    "glucose syrup",
    "fructose syrup",
    "corn syrup",
    "rice syrup",
    "agave syrup",
    "maltodextrin",
    "sucrose",
    "honey",
    "concentrated fruit juice",
]


def score_added_sugars(ingredients_text: str, nutriments: dict, target_age_months: int | None) -> int:
    text = (ingredients_text or "").lower()
    detected = sum(1 for tok in ADDED_SUGAR_TOKENS if tok in text)
    under_twelve = isinstance(target_age_months, int) and target_age_months < 12

    score = 100
    if detected >= 1:
        score -= 45 if under_twelve else 30
    if detected >= 2:
        score -= 15
    if detected >= 3:
        score -= 10

    sugars_100g = float((nutriments or {}).get("sugars_100g") or 0)
    if sugars_100g > 0:
        overshoot = max(0, sugars_100g - 5)
        score -= min(25, overshoot * 2)

    return max(0, min(100, int(score)))


# ============================================================
# Axis 4: Nutri-Score (under-weighted , adult-designed)
# ============================================================
NUTRI_MAP = {"a": 95, "b": 78, "c": 60, "d": 40, "e": 15}


def score_nutri_score(letter: str | None) -> int:
    if letter is None:
        return 55
    return NUTRI_MAP.get(letter.lower(), 55)


# ============================================================
# Axis 5: Bio certification
# ============================================================
BIO_LABELS = {
    "organic",
    "ab-agriculture-biologique",
    "eu-organic",
    "demeter",
    "bio",
    "fr-bio-01",
    "fr-bio-09",
    "fr-bio-10",
}


def score_bio(labels_tags: Iterable[str]) -> int:
    cleaned = {_clean_tag(t) for t in labels_tags or []}
    if cleaned & BIO_LABELS:
        return 100
    return 40


# ============================================================
# Axis 6: allergens transparency
# ============================================================
def score_allergens(allergens_tags: Iterable[str], traces_tags: Iterable[str]) -> int:
    allergens_count = len(list(allergens_tags or []))
    traces_count = len(list(traces_tags or []))
    if allergens_count == 0 and traces_count == 0:
        return 90
    declared = 90 if allergens_count > 0 else 60
    trace_penalty = min(30, traces_count * 8)
    return max(0, min(100, declared - trace_penalty))


# ============================================================
# Axis 7: Made in France (origin transparency)
# ============================================================
FR_ORIGIN_LABELS = {
    "made-in-france",
    "fabrique-en-france",
    "produced-in-france",
    "origine-france",
}
EU_ORIGIN_LABELS = {"made-in-europe", "european-origin"}


def score_origin(labels_tags: Iterable[str]) -> int:
    cleaned = {_clean_tag(t) for t in labels_tags or []}
    if cleaned & FR_ORIGIN_LABELS:
        return 100
    if cleaned & EU_ORIGIN_LABELS:
        return 70
    return 40


# ============================================================
# Axis 8: recipe simplicity
# ============================================================
def score_simplicity(ingredient_count: int | None) -> int:
    if not ingredient_count or ingredient_count <= 0:
        return 60
    if ingredient_count <= 3:
        return 100
    if ingredient_count <= 5:
        return 85
    if ingredient_count <= 8:
        return 65
    if ingredient_count <= 12:
        return 45
    if ingredient_count <= 18:
        return 25
    return 10


# ============================================================
# Warnings , human-readable flags shown on the product page
# ============================================================
def collect_warnings(product: ProductInput) -> list[str]:
    w: list[str] = []
    text = (product.ingredients_text or "").lower()
    under_twelve = isinstance(product.target_age_months, int) and product.target_age_months < 12

    if "huile de palme" in text or "palm oil" in text:
        w.append("huile_de_palme")
    if "maltodextrine" in text or "maltodextrin" in text:
        w.append("maltodextrine")
    if ("miel" in text or "honey" in text) and under_twelve:
        w.append("miel_avant_12_mois")
    if product.nova_group == 4:
        w.append("ultra_transforme")

    high_additives = [a for a in product.additives_tags or [] if _clean_tag(a) in ADDITIVE_HIGH_RISK]
    if high_additives:
        w.append(f"additifs_risque_eleve:{len(high_additives)}")

    sugars = float((product.nutriments or {}).get("sugars_100g") or 0)
    if sugars >= 10:
        w.append(f"sucres_eleves:{sugars:.1f}g")

    salt = float((product.nutriments or {}).get("salt_100g") or 0)
    if salt >= 0.75:
        w.append(f"sel_eleve:{salt:.2f}g")

    return w


if __name__ == "__main__":
    # Smoke test , bad petit pot example
    demo_bad = ProductInput(
        nutri_score_letter="c",
        nova_group=4,
        additives_tags=["en:e471", "en:e150d"],
        labels_tags=[],
        allergens_tags=[],
        traces_tags=["en:milk", "en:gluten", "en:soybeans"],
        ingredients_text="Legumes, sucre, maltodextrine, huile de palme, aromes",
        ingredient_count=14,
        nutriments={"sugars_100g": 12, "salt_100g": 0.5},
        target_age_months=6,
    )
    print("BAD:", compute_grade(demo_bad))

    demo_good = ProductInput(
        nutri_score_letter="a",
        nova_group=1,
        additives_tags=[],
        labels_tags=["en:organic", "en:made-in-france"],
        allergens_tags=[],
        traces_tags=[],
        ingredients_text="Carottes bio 60%, eau, jus de citron bio",
        ingredient_count=3,
        nutriments={"sugars_100g": 3.1, "salt_100g": 0.02},
        target_age_months=6,
    )
    print("GOOD:", compute_grade(demo_good))
