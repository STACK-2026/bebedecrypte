#!/usr/bin/env python3
"""
score_products.py , read pending/off_raw.jsonl, run BebeDecrypte scoring,
emit pending/scored_products.jsonl with grade + breakdown + warnings + slug.

Does NOT modify scoring_engine.py : we only import and call compute_grade().

Usage:
    python3 scripts/score_products.py
    python3 scripts/score_products.py --in pending/off_raw.jsonl --out pending/scored_products.jsonl
"""
from __future__ import annotations

import argparse
import json
import re
import sys
import unicodedata
from dataclasses import asdict
from pathlib import Path

# scoring_engine lives alongside this script.
SCRIPT_DIR = Path(__file__).resolve().parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

from scoring_engine import ProductInput, compute_grade  # noqa: E402

REPO_ROOT = SCRIPT_DIR.parent
IN_PATH = REPO_ROOT / "pending" / "off_raw.jsonl"
OUT_PATH = REPO_ROOT / "pending" / "scored_products.jsonl"


# ---------------------------------------------------------------------------
# Category mapping , used to (a) infer target age and (b) group the product
# into a BebeDecrypte catalog category for the site.
# ---------------------------------------------------------------------------

# Catalog categories on the site. These slugs drive /fr/categories/<slug>/.
CATALOG_CATEGORIES = {
    "petits-pots": {
        "label_fr": "Petits pots",
        "label_en": "Baby jars",
        "default_age": 6,
    },
    "laits-infantiles": {
        "label_fr": "Laits infantiles",
        "label_en": "Infant formulas",
        "default_age": 0,
    },
    "cereales": {
        "label_fr": "Céréales bébé",
        "label_en": "Baby cereals",
        "default_age": 6,
    },
    "gourdes-fruits": {
        "label_fr": "Gourdes et compotes",
        "label_en": "Fruit pouches",
        "default_age": 6,
    },
    "biscuits-snacks": {
        "label_fr": "Biscuits et snacks",
        "label_en": "Biscuits and snacks",
        "default_age": 8,
    },
    "boissons": {
        "label_fr": "Boissons bébé",
        "label_en": "Baby drinks",
        "default_age": 6,
    },
    "autres": {
        "label_fr": "Autres",
        "label_en": "Other",
        "default_age": 12,
    },
}

# Rules: match against categories_tags (list of en:<slug>). Order matters: first
# match wins, so put the most specific tests first.
def classify(categories_tags: list[str], source_category: str | None) -> tuple[str, int, str]:
    """
    Return (catalog_slug, target_age_months, scoring_category_type).

    scoring_category_type is one of: baby_food | infant_formula | baby_cereal | baby_snack
    (matches scoring_engine.ProductInput.category_type).
    """
    tags = {t.lower() for t in categories_tags or []}
    if source_category:
        tags.add(source_category.lower())

    def has(*needles: str) -> bool:
        return any(n in tags for n in needles)

    # Infant formulas , age depends on stage.
    if has("en:first-age-milks", "en:infant-milks-1st-age"):
        return "laits-infantiles", 3, "infant_formula"
    if has("en:follow-on-milks", "en:infant-milks-2nd-age"):
        return "laits-infantiles", 9, "infant_formula"
    if has("en:growing-up-milks", "en:infant-milks-3rd-age"):
        return "laits-infantiles", 18, "infant_formula"
    if has("en:infant-milks", "en:baby-milks"):
        return "laits-infantiles", 6, "infant_formula"

    # Cereals
    if has("en:baby-cereals", "en:infant-cereals"):
        return "cereales", 6, "baby_cereal"

    # Snacks / biscuits
    if has("en:baby-biscuits", "en:biscuits-for-babies"):
        return "biscuits-snacks", 9, "baby_snack"
    if has("en:baby-snacks", "en:snacks-for-babies"):
        return "biscuits-snacks", 8, "baby_snack"

    # Drinks / juices
    if has("en:baby-juices", "en:juices-for-babies"):
        return "boissons", 6, "baby_food"
    if has("en:baby-drinks", "en:drinks-for-babies"):
        return "boissons", 6, "baby_food"

    # Pouches / compotes / fruits
    if has("en:baby-pouches", "en:fruit-purees-for-babies", "en:compotes-for-babies"):
        return "gourdes-fruits", 6, "baby_food"
    if has("en:fruits-for-babies"):
        return "gourdes-fruits", 6, "baby_food"

    # Vegetables + meals in jars
    if has(
        "en:vegetables-for-babies",
        "en:meals-for-babies",
        "en:prepared-meals-for-babies",
        "en:baby-meals",
        "en:baby-jars",
    ):
        return "petits-pots", 6, "baby_food"

    # Fallback
    if has("en:baby-foods"):
        return "petits-pots", 6, "baby_food"

    return "autres", 12, "baby_food"


# ---------------------------------------------------------------------------
# Slug + text helpers
# ---------------------------------------------------------------------------
def strip_accents(text: str) -> str:
    return "".join(
        c for c in unicodedata.normalize("NFD", text)
        if unicodedata.category(c) != "Mn"
    )


def slugify(text: str, max_len: int = 70) -> str:
    text = strip_accents(text or "").lower()
    text = re.sub(r"[^a-z0-9]+", "-", text)
    return text.strip("-")[:max_len].strip("-") or "produit"


def pick_name(raw: dict) -> str:
    for key in ("product_name_fr", "product_name", "product_name_en", "generic_name_fr", "generic_name"):
        val = (raw.get(key) or "").strip()
        if val:
            return val
    return ""


def pick_ingredients(raw: dict) -> str:
    for key in ("ingredients_text_fr", "ingredients_text", "ingredients_text_en"):
        val = (raw.get(key) or "").strip()
        if val:
            return val
    return ""


def pick_image(raw: dict) -> str:
    for key in ("image_front_url", "image_url", "image_front_small_url"):
        val = (raw.get(key) or "").strip()
        if val:
            return val
    return ""


def primary_brand(raw: dict) -> str:
    brands = (raw.get("brands") or "").split(",")
    if not brands:
        return ""
    return brands[0].strip()


def parse_ingredient_count(raw: dict, ingredients_text: str) -> int:
    n = raw.get("ingredients_n")
    if isinstance(n, int) and n > 0:
        return n
    if isinstance(n, str) and n.isdigit():
        return int(n)
    if ingredients_text:
        # Crude count on commas , fine as a fallback signal.
        return max(1, len([p for p in re.split(r"[,;()]", ingredients_text) if p.strip()]))
    return 0


def normalise_nutri_letter(raw: dict) -> str | None:
    val = (raw.get("nutriscore_grade") or raw.get("nutrition_grade_fr") or "").strip().lower()
    return val if val in {"a", "b", "c", "d", "e"} else None


def normalise_nova(raw: dict) -> int | None:
    val = raw.get("nova_group")
    try:
        n = int(val)
        return n if 1 <= n <= 4 else None
    except (TypeError, ValueError):
        return None


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main() -> int:
    parser = argparse.ArgumentParser(description="Score OFF baby food products.")
    parser.add_argument("--in", dest="in_path", default=str(IN_PATH))
    parser.add_argument("--out", dest="out_path", default=str(OUT_PATH))
    args = parser.parse_args()

    in_path = Path(args.in_path)
    out_path = Path(args.out_path)
    if not in_path.exists():
        print(f"Input file not found: {in_path}", file=sys.stderr)
        return 1
    out_path.parent.mkdir(parents=True, exist_ok=True)

    slug_counts: dict[str, int] = {}
    kept = 0
    skipped = 0
    grade_hist: dict[str, int] = {}

    with in_path.open("r", encoding="utf-8") as src, out_path.open("w", encoding="utf-8") as dst:
        for line_no, line in enumerate(src, start=1):
            line = line.strip()
            if not line:
                continue
            try:
                raw = json.loads(line)
            except json.JSONDecodeError as err:
                print(f"[line {line_no}] invalid JSON: {err}", file=sys.stderr)
                skipped += 1
                continue

            name = pick_name(raw)
            brand = primary_brand(raw)
            if not name or not brand:
                skipped += 1
                continue

            ingredients_text = pick_ingredients(raw)
            ingredients_n = parse_ingredient_count(raw, ingredients_text)
            nutri_letter = normalise_nutri_letter(raw)
            nova = normalise_nova(raw)

            categories_tags = raw.get("categories_tags") or []
            source_category = raw.get("_source_category")
            catalog_slug, target_age, category_type = classify(categories_tags, source_category)

            product_input = ProductInput(
                nutri_score_letter=nutri_letter,
                nova_group=nova,
                additives_tags=raw.get("additives_tags") or [],
                labels_tags=raw.get("labels_tags") or [],
                allergens_tags=raw.get("allergens_tags") or [],
                traces_tags=raw.get("traces_tags") or [],
                ingredients_text=ingredients_text,
                ingredient_count=ingredients_n,
                nutriments=raw.get("nutriments") or {},
                target_age_months=target_age,
                category_type=category_type,
            )

            try:
                breakdown = compute_grade(product_input)
            except Exception as err:  # noqa: BLE001
                print(f"[line {line_no}] scoring error: {err}", file=sys.stderr)
                skipped += 1
                continue

            # Slug derived from brand + name, dedup with a numeric suffix.
            base_slug = slugify(f"{brand}-{name}")
            slug_counts[base_slug] = slug_counts.get(base_slug, 0) + 1
            slug = base_slug if slug_counts[base_slug] == 1 else f"{base_slug}-{slug_counts[base_slug]}"

            out_record = {
                "slug": slug,
                "barcode": str(raw.get("code") or "").strip(),
                "brand": brand,
                "brand_slug": slugify(brand),
                "name": name,
                "ingredients_text": ingredients_text,
                "ingredient_count": ingredients_n,
                "nutri_score": nutri_letter,
                "nova_group": nova,
                "additives_tags": raw.get("additives_tags") or [],
                "labels_tags": raw.get("labels_tags") or [],
                "allergens_tags": raw.get("allergens_tags") or [],
                "traces_tags": raw.get("traces_tags") or [],
                "nutriments": raw.get("nutriments") or {},
                "image": pick_image(raw),
                "quantity": (raw.get("quantity") or "").strip(),
                "serving_size": (raw.get("serving_size") or "").strip(),
                "categories_tags": categories_tags,
                "categories_tags_fr": raw.get("categories_tags_fr") or [],
                "catalog_category": catalog_slug,
                "target_age_months": target_age,
                "category_type": category_type,
                "grade": breakdown.grade,
                "score": breakdown.overall,
                "breakdown": asdict(breakdown),
                "warnings": breakdown.warnings,
                "source_url": f"https://world.openfoodfacts.org/product/{raw.get('code', '').strip()}",
            }

            dst.write(json.dumps(out_record, ensure_ascii=False) + "\n")
            kept += 1
            grade_hist[breakdown.grade] = grade_hist.get(breakdown.grade, 0) + 1

    print("\n== Summary ==")
    print(f"  Scored   : {kept}")
    print(f"  Skipped  : {skipped}")
    print(f"  Output   : {out_path}")
    print("  Grades   :", ", ".join(f"{g}:{grade_hist.get(g, 0)}" for g in "ABCDE"))

    return 0 if kept > 0 else 1


if __name__ == "__main__":
    sys.exit(main())
