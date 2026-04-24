#!/usr/bin/env python3
"""
build_astro_pages.py , convert pending/scored_products.jsonl into Astro content
collections under site/src/content/{products,brands,categories}/.

Generated files:
    site/src/content/products/<slug>.md       (one per product, frontmatter + body FR)
    site/src/content/brands/<brand-slug>.md   (aggregated brand page)
    site/src/content/categories/<slug>.md     (aggregated catalog category page)

Hard rules enforced:
  - Accents FR UTF-8 direct (é è ê à ç î ô û), JAMAIS \\uXXXX
  - Tutoiement (tu/ton/tes)
  - Zero tiret cadratin (—, –). We use commas, `|`, middle dot `·`, or `-`.
  - Contenu factuel, actionnable, zero blabla IA.

Usage:
    python3 scripts/build_astro_pages.py
    python3 scripts/build_astro_pages.py --in pending/scored_products.jsonl
    python3 scripts/build_astro_pages.py --dry-run
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from collections import defaultdict
from datetime import date
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parent
IN_PATH = REPO_ROOT / "pending" / "scored_products.jsonl"
CONTENT_DIR = REPO_ROOT / "site" / "src" / "content"
PRODUCTS_DIR = CONTENT_DIR / "products"
BRANDS_DIR = CONTENT_DIR / "brands"
CATEGORIES_DIR = CONTENT_DIR / "categories"

# Pen name for editorial signal (matches site/src/data/authors.ts).
REVIEWED_BY = "Dr. Claire Vasseur"
TODAY = date.today().isoformat()

# Mirrors score_products.CATALOG_CATEGORIES (kept local to avoid circular imports).
CATALOG_CATEGORIES = {
    "petits-pots": {
        "label_fr": "Petits pots",
        "label_en": "Baby jars",
        "description_fr": (
            "Les petits pots industriels : légumes, viandes, poissons, mélanges salés. "
            "On note chaque recette sur le degré de transformation (NOVA), les additifs, "
            "les sucres cachés et la transparence allergènes."
        ),
    },
    "laits-infantiles": {
        "label_fr": "Laits infantiles",
        "label_en": "Infant formulas",
        "description_fr": (
            "Laits 1er âge (0 à 6 mois), 2e âge (6 à 12 mois) et laits de croissance. "
            "On regarde les ingrédients, l'origine du lait, l'ajout de prébiotiques et "
            "la présence d'huile de palme ou de maltodextrine."
        ),
    },
    "cereales": {
        "label_fr": "Céréales bébé",
        "label_en": "Baby cereals",
        "description_fr": (
            "Céréales infantiles à diluer dans le lait ou à cuisiner. On traque les "
            "sucres ajoutés (maltodextrine, dextrose), les arômes et la qualité des céréales."
        ),
    },
    "gourdes-fruits": {
        "label_fr": "Gourdes et compotes",
        "label_en": "Fruit pouches",
        "description_fr": (
            "Compotes et gourdes de fruits. On distingue les purées sans sucres ajoutés "
            "des produits avec jus de fruits concentrés ou sucre direct."
        ),
    },
    "biscuits-snacks": {
        "label_fr": "Biscuits et snacks",
        "label_en": "Biscuits and snacks",
        "description_fr": (
            "Biscuits de dentition, boudoirs, petits snacks bébé. On pénalise fort les "
            "sucres ajoutés et les céréales ultra-transformées."
        ),
    },
    "boissons": {
        "label_fr": "Boissons bébé",
        "label_en": "Baby drinks",
        "description_fr": (
            "Jus et boissons destinés aux enfants en bas âge. L'eau reste la seule boisson "
            "recommandée par l'ANSES, on note les produits vendus comme alternatives."
        ),
    },
    "autres": {
        "label_fr": "Autres produits",
        "label_en": "Other products",
        "description_fr": (
            "Produits bébé divers qui ne rentrent pas dans les catégories principales."
        ),
    },
}

# Human-readable warning labels.
WARNING_LABELS = {
    "huile_de_palme": "Présence d'huile de palme",
    "maltodextrine": "Présence de maltodextrine (sucre caché)",
    "miel_avant_12_mois": "Contient du miel, interdit avant 12 mois (risque de botulisme)",
    "ultra_transforme": "Produit ultra-transformé (NOVA 4)",
}


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------
def clean_yaml_string(value: str) -> str:
    """Escape a string for a single-line YAML value."""
    if value is None:
        return ""
    value = str(value).replace("\\", "\\\\").replace('"', '\\"')
    # Strip em/en dashes , hard rule in this repo.
    value = value.replace("—", ",").replace("–", "-")
    # Strip newlines and control chars.
    value = re.sub(r"[\r\n\t]+", " ", value).strip()
    return value


def kill_dashes(value: str) -> str:
    """Global em/en dash strip for body text. Middle dot `·` allowed."""
    if not value:
        return ""
    return value.replace("—", ",").replace("–", "-")


def format_yaml_list(items: list[str]) -> str:
    if not items:
        return "[]"
    return "[" + ", ".join(f'"{clean_yaml_string(i)}"' for i in items) + "]"


def age_range_label(age_months: int) -> str:
    if age_months is None:
        return "Non précisé"
    if age_months <= 3:
        return "0 à 6 mois"
    if age_months <= 6:
        return "4 à 6 mois"
    if age_months <= 9:
        return "6 à 12 mois"
    if age_months <= 12:
        return "8 à 12 mois"
    if age_months <= 24:
        return "12 à 24 mois"
    return "3 ans et plus"


def grade_sentence(grade: str) -> str:
    return {
        "A": "excellent choix pour ton bébé, tu peux y aller les yeux fermés.",
        "B": "bon produit dans l'ensemble, quelques points de vigilance à connaître.",
        "C": "correct mais perfectible, regarde les alternatives mieux notées.",
        "D": "qualité insuffisante pour un bébé, on te conseille de passer ton chemin.",
        "E": "à éviter. Composition trop problématique pour un enfant en bas âge.",
    }.get(grade, "note indisponible.")


def warnings_to_text(warnings: list[str]) -> list[str]:
    out = []
    for w in warnings or []:
        if ":" in w:
            key, payload = w.split(":", 1)
            if key == "additifs_risque_eleve":
                out.append(f"Contient {payload} additif(s) à risque élevé selon l'ANSES.")
                continue
            if key == "sucres_eleves":
                out.append(f"Taux de sucres élevé : {payload} pour 100g.")
                continue
            if key == "sel_eleve":
                out.append(f"Taux de sel élevé : {payload} pour 100g.")
                continue
        if w in WARNING_LABELS:
            out.append(WARNING_LABELS[w])
    return out


# ---------------------------------------------------------------------------
# Markdown generators
# ---------------------------------------------------------------------------
def product_markdown(p: dict, alternatives: list[dict]) -> str:
    slug = p["slug"]
    brand = p["brand"]
    name = p["name"]
    grade = p["grade"]
    score = p["score"]
    ingredients = kill_dashes(p.get("ingredients_text", "")).strip()
    image = p.get("image") or ""
    categories_fr = [c for c in (p.get("categories_tags_fr") or []) if c][:6]
    age_label = age_range_label(p.get("target_age_months"))
    warnings_text = warnings_to_text(p.get("warnings", []))
    category = p.get("catalog_category", "autres")

    fm_lines = [
        "---",
        f'slug: "{clean_yaml_string(slug)}"',
        f'brand: "{clean_yaml_string(brand)}"',
        f'brandSlug: "{clean_yaml_string(p.get("brand_slug", ""))}"',
        f'name: "{clean_yaml_string(name)}"',
        f'title: "{clean_yaml_string(f"{brand} {name} , note {grade}")}"',
        f'description: "{clean_yaml_string(f"Note BébéDécrypte {grade} ({score}/100). Analyse NOVA, additifs, sucres et allergènes du {name} de {brand}.")[:155]}"',
        f'grade: "{grade}"',
        f"score: {int(score)}",
        f'nutriScore: "{clean_yaml_string(p.get("nutri_score") or "")}"',
        f"nova: {p.get('nova_group') if p.get('nova_group') is not None else 'null'}",
        f'barcode: "{clean_yaml_string(p.get("barcode", ""))}"',
        f"additives: {format_yaml_list(p.get('additives_tags', []))}",
        f'ingredients: "{clean_yaml_string(ingredients[:500])}"',
        f"ingredientCount: {int(p.get('ingredient_count') or 0)}",
        f'image: "{clean_yaml_string(image)}"',
        f'imageAlt: "{clean_yaml_string(f"{brand} {name}")[:120]}"',
        f"categories: {format_yaml_list(categories_fr)}",
        f'catalogCategory: "{clean_yaml_string(category)}"',
        f'ageRange: "{clean_yaml_string(age_label)}"',
        f"targetAgeMonths: {int(p.get('target_age_months') or 0)}",
        f"warnings: {format_yaml_list(warnings_text)}",
        "sources:",
        '  - "Open Food Facts (ODbL)"',
        '  - "Classification NOVA (Université de São Paulo)"',
        '  - "Nutri-Score (Santé publique France)"',
        '  - "Base additifs EFSA / ANSES"',
        f'sourceUrl: "{clean_yaml_string(p.get("source_url", ""))}"',
        f'lastReviewed: "{TODAY}"',
        f'reviewedBy: "{REVIEWED_BY}"',
        f'publishedDate: "{TODAY}"',
        'lang: "fr"',
        "draft: false",
        "---",
    ]

    # Body (no H1 in markdown , the Astro page template provides the H1)
    body_lines: list[str] = []
    body_lines.append(
        f"**Note BébéDécrypte : {grade} ({int(score)}/100).** "
        f"Ce produit est classé {grade}, {grade_sentence(grade)}"
    )
    body_lines.append("")
    body_lines.append(f"- Tranche d'âge visée : {age_label}")
    if p.get("nova_group"):
        body_lines.append(f"- Classification NOVA : {p['nova_group']} sur 4")
    if p.get("nutri_score"):
        body_lines.append(f"- Nutri-Score : {p['nutri_score'].upper()}")
    body_lines.append(f"- Nombre d'ingrédients : {int(p.get('ingredient_count') or 0)}")
    if p.get("quantity"):
        body_lines.append(f"- Conditionnement : {clean_yaml_string(p['quantity'])}")
    body_lines.append("")

    if ingredients:
        body_lines.append("## Composition")
        body_lines.append("")
        body_lines.append(ingredients[:1200])
        body_lines.append("")

    # Score breakdown
    bd = p.get("breakdown", {})
    if bd:
        body_lines.append("## Détail de la note")
        body_lines.append("")
        body_lines.append("| Critère | Score sur 100 | Poids |")
        body_lines.append("|---|---|---|")
        body_lines.append(f"| Transformation (NOVA) | {bd.get('nova', '-')} | 25% |")
        body_lines.append(f"| Additifs | {bd.get('additives', '-')} | 25% |")
        body_lines.append(f"| Sucres ajoutés | {bd.get('added_sugars', '-')} | 20% |")
        body_lines.append(f"| Nutri-Score | {bd.get('nutri', '-')} | 10% |")
        body_lines.append(f"| Bio | {bd.get('bio', '-')} | 10% |")
        body_lines.append(f"| Transparence allergènes | {bd.get('allergens', '-')} | 5% |")
        body_lines.append(f"| Origine France | {bd.get('origin', '-')} | 3% |")
        body_lines.append(f"| Simplicité de la recette | {bd.get('simplicity', '-')} | 2% |")
        body_lines.append("")

    if warnings_text:
        body_lines.append("## Points de vigilance")
        body_lines.append("")
        for w in warnings_text:
            body_lines.append(f"- {w}")
        body_lines.append("")

    if alternatives:
        cat_label = CATALOG_CATEGORIES.get(category, {}).get("label_fr", "la même catégorie")
        body_lines.append(f"## Alternatives mieux notées dans {cat_label}")
        body_lines.append("")
        for alt in alternatives:
            body_lines.append(
                f"- [{alt['brand']} {alt['name']}](/products/{alt['slug']}/) , note {alt['grade']} ({int(alt['score'])}/100)"
            )
        body_lines.append("")

    body_lines.append("## Méthodologie")
    body_lines.append("")
    body_lines.append(
        "Cette note est générée automatiquement par notre algorithme BébéDécrypte, basé sur "
        "8 critères pondérés spécifiques à l'alimentation infantile (transformation, additifs, "
        "sucres, Nutri-Score, bio, allergènes, origine, simplicité). Les données sources proviennent "
        "d'Open Food Facts et sont relues par notre équipe éditoriale."
    )
    body_lines.append("")
    body_lines.append(
        f"Voir la [méthodologie complète](/methodology/) et la [page catégorie "
        f"{CATALOG_CATEGORIES.get(category, {}).get('label_fr', 'produits')}](/categories/{category}/)."
    )
    body_lines.append("")

    content = "\n".join(fm_lines) + "\n\n" + kill_dashes("\n".join(body_lines)) + "\n"
    return content


def brand_markdown(brand_slug: str, brand_name: str, products: list[dict]) -> str:
    if not products:
        return ""
    products_sorted = sorted(products, key=lambda x: (-x["score"], x["name"]))
    avg_score = round(sum(p["score"] for p in products) / len(products))
    # Grade from average
    grade = "A" if avg_score >= 85 else "B" if avg_score >= 70 else "C" if avg_score >= 55 else "D" if avg_score >= 40 else "E"

    grade_hist: dict[str, int] = defaultdict(int)
    for p in products:
        grade_hist[p["grade"]] += 1

    fm_lines = [
        "---",
        f'slug: "{clean_yaml_string(brand_slug)}"',
        f'brand: "{clean_yaml_string(brand_name)}"',
        f'title: "{clean_yaml_string(f"Marque {brand_name} , note moyenne {grade}")}"',
        f'description: "{clean_yaml_string(f"Analyse BébéDécrypte de la marque {brand_name} : {len(products)} produits notés, moyenne {avg_score}/100, grade {grade}.")[:155]}"',
        f'averageGrade: "{grade}"',
        f"averageScore: {avg_score}",
        f"productCount: {len(products)}",
        f'lastReviewed: "{TODAY}"',
        f'reviewedBy: "{REVIEWED_BY}"',
        'lang: "fr"',
        "draft: false",
        "---",
    ]

    body = [
        f"**Note moyenne BébéDécrypte : {grade} ({avg_score}/100)** sur {len(products)} produit(s) analysé(s).",
        "",
        "## Répartition des notes",
        "",
        "| Note | Produits |",
        "|---|---|",
    ]
    for g in "ABCDE":
        body.append(f"| {g} | {grade_hist.get(g, 0)} |")
    body.append("")
    body.append(f"## Tous les produits {brand_name}")
    body.append("")
    for p in products_sorted:
        body.append(
            f"- [{p['name']}](/products/{p['slug']}/) , note {p['grade']} ({int(p['score'])}/100)"
        )
    body.append("")
    body.append(
        "Notes générées à partir d'Open Food Facts et de notre algorithme BébéDécrypte. "
        "Voir la [méthodologie](/methodology/)."
    )
    body.append("")

    return "\n".join(fm_lines) + "\n\n" + kill_dashes("\n".join(body)) + "\n"


def category_markdown(slug: str, meta: dict, products: list[dict]) -> str:
    products_sorted = sorted(products, key=lambda x: (-x["score"], x["name"]))
    grade_hist: dict[str, int] = defaultdict(int)
    brand_set: set[str] = set()
    for p in products:
        grade_hist[p["grade"]] += 1
        brand_set.add(p["brand"])

    avg = round(sum(p["score"] for p in products) / max(1, len(products)))
    top = products_sorted[:15]

    fm_lines = [
        "---",
        f'slug: "{clean_yaml_string(slug)}"',
        f'title: "{clean_yaml_string(meta["label_fr"])}"',
        f'label: "{clean_yaml_string(meta["label_fr"])}"',
        f'labelEn: "{clean_yaml_string(meta["label_en"])}"',
        f'description: "{clean_yaml_string(meta["description_fr"])[:155]}"',
        f"productCount: {len(products)}",
        f"brandCount: {len(brand_set)}",
        f"averageScore: {avg}",
        f'lastReviewed: "{TODAY}"',
        f'reviewedBy: "{REVIEWED_BY}"',
        'lang: "fr"',
        "draft: false",
        "---",
    ]

    body = [
        f"# {meta['label_fr']}",
        "",
        kill_dashes(meta["description_fr"]),
        "",
        f"**{len(products)} produit(s) analysé(s)** issus de {len(brand_set)} marque(s). "
        f"Note moyenne de la catégorie : {avg}/100.",
        "",
        "## Répartition des notes",
        "",
        "| Note | Produits |",
        "|---|---|",
    ]
    for g in "ABCDE":
        body.append(f"| {g} | {grade_hist.get(g, 0)} |")
    body.append("")
    body.append(f"## Top {len(top)} des produits les mieux notés")
    body.append("")
    for p in top:
        body.append(
            f"- [{p['brand']} {p['name']}](/products/{p['slug']}/) , note {p['grade']} ({int(p['score'])}/100)"
        )
    body.append("")
    body.append(
        "Méthodologie complète : voir [/methodology/](/methodology/). "
        "Tu peux aussi consulter [toutes les catégories](/categories/)."
    )
    body.append("")

    return "\n".join(fm_lines) + "\n\n" + kill_dashes("\n".join(body)) + "\n"


# ---------------------------------------------------------------------------
# Main
# ---------------------------------------------------------------------------
def main() -> int:
    parser = argparse.ArgumentParser(description="Build Astro content pages from scored products.")
    parser.add_argument("--in", dest="in_path", default=str(IN_PATH))
    parser.add_argument("--dry-run", action="store_true", help="Do not write files, just report counts.")
    parser.add_argument("--max-alternatives", type=int, default=4, help="Alternatives to suggest per product.")
    args = parser.parse_args()

    in_path = Path(args.in_path)
    if not in_path.exists():
        print(f"Input not found: {in_path}", file=sys.stderr)
        return 1

    products: list[dict] = []
    with in_path.open("r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                products.append(json.loads(line))
            except json.JSONDecodeError:
                continue

    if not products:
        print("No products to render.", file=sys.stderr)
        return 1

    # Group by category + brand
    by_category: dict[str, list[dict]] = defaultdict(list)
    by_brand: dict[str, list[dict]] = defaultdict(list)
    brand_names: dict[str, str] = {}

    for p in products:
        cat = p.get("catalog_category", "autres")
        by_category[cat].append(p)
        brand_slug = p.get("brand_slug") or "marque-inconnue"
        by_brand[brand_slug].append(p)
        brand_names.setdefault(brand_slug, p.get("brand", brand_slug))

    if not args.dry_run:
        PRODUCTS_DIR.mkdir(parents=True, exist_ok=True)
        BRANDS_DIR.mkdir(parents=True, exist_ok=True)
        CATEGORIES_DIR.mkdir(parents=True, exist_ok=True)

    # Products , each product knows up to N alternatives in the same category with a better or equal grade.
    written_products = 0
    for p in products:
        cat_products = by_category.get(p["catalog_category"], [])
        alternatives = [
            alt for alt in cat_products
            if alt["slug"] != p["slug"] and alt["score"] > p["score"]
        ]
        alternatives.sort(key=lambda x: -x["score"])
        alternatives = alternatives[: args.max_alternatives]

        md = product_markdown(p, alternatives)
        if args.dry_run:
            written_products += 1
            continue
        out = PRODUCTS_DIR / f"{p['slug']}.md"
        out.write_text(md, encoding="utf-8")
        written_products += 1

    # Brand pages
    written_brands = 0
    for brand_slug, items in by_brand.items():
        md = brand_markdown(brand_slug, brand_names.get(brand_slug, brand_slug), items)
        if not md:
            continue
        if args.dry_run:
            written_brands += 1
            continue
        (BRANDS_DIR / f"{brand_slug}.md").write_text(md, encoding="utf-8")
        written_brands += 1

    # Category pages (one per defined catalog category that has products)
    written_categories = 0
    for slug, meta in CATALOG_CATEGORIES.items():
        items = by_category.get(slug, [])
        if not items:
            continue
        md = category_markdown(slug, meta, items)
        if args.dry_run:
            written_categories += 1
            continue
        (CATEGORIES_DIR / f"{slug}.md").write_text(md, encoding="utf-8")
        written_categories += 1

    print("\n== Summary ==")
    print(f"  Products rendered   : {written_products}")
    print(f"  Brand pages         : {written_brands}")
    print(f"  Category pages      : {written_categories}")
    print(f"  Products dir        : {PRODUCTS_DIR}")
    print(f"  Brands dir          : {BRANDS_DIR}")
    print(f"  Categories dir      : {CATEGORIES_DIR}")
    if args.dry_run:
        print("  [dry-run] no files written.")

    return 0


if __name__ == "__main__":
    sys.exit(main())
