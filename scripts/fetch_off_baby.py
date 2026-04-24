#!/usr/bin/env python3
"""
fetch_off_baby.py , download baby food products from Open Food Facts (France).

Paginates through a curated list of OFF categories covering the full infant
food spectrum (petits pots, laits infantiles, cereales bebe, gourdes, biscuits).
Deduplicates on barcode, filters out products without a name or brand,
respects OFF rate limits (sleep 1s+ between pages, UA with contact email).

Output:
    pending/off_raw.jsonl (one raw OFF product per line, UTF-8)

Usage:
    python3 scripts/fetch_off_baby.py
    python3 scripts/fetch_off_baby.py --limit 500
    python3 scripts/fetch_off_baby.py --categories en:baby-milks en:baby-cereals
    python3 scripts/fetch_off_baby.py --page-size 100 --max-pages 25

Notes:
    - Open Food Facts is ODbL licensed, attribution required.
    - We paginate via the v2 search API with categories_tags_en + countries_tags_en.
    - We accept products whose primary language is fr OR en (FR market has EN-labelled imports).
"""
from __future__ import annotations

import argparse
import json
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

USER_AGENT = "bebedecrypte/1.0 (+https://bebedecrypte.com ; contact@bebedecrypte.com)"

# OFF English category tags (ordered most-generic first so dedup catches
# children categories naturally, then specialised categories fill niches).
DEFAULT_CATEGORIES = [
    # Generic
    "en:baby-foods",
    "en:foods-for-young-children",
    "en:baby-meals",
    # Milks (1st / 2nd / 3rd age + generic + formulas)
    "en:baby-milks",
    "en:infant-milks",
    "en:first-age-milks",
    "en:follow-on-milks",
    "en:growing-up-milks",
    "en:infant-formulas",
    "en:hypoallergenic-formulas",
    # Cereals / porridges
    "en:baby-cereals",
    "en:porridges-for-babies",
    "en:infant-cereals",
    # Snacks / biscuits / teething
    "en:baby-snacks",
    "en:baby-biscuits",
    "en:teething-biscuits",
    # Drinks
    "en:baby-juices",
    "en:baby-drinks",
    "en:baby-waters",
    # Purees / jars (most populated category on FR market)
    "en:purees-for-babies",
    "en:fruit-purees-for-babies",
    "en:vegetable-purees-for-babies",
    "en:fruits-for-babies",
    "en:vegetables-for-babies",
    "en:meat-for-babies",
    "en:fish-for-babies",
    "en:meals-for-babies",
    "en:dishes-for-babies",
    "en:dinners-for-babies",
    # Pouches
    "en:baby-fruit-pouches",
    "en:fruit-pouches-for-babies",
]

# Fields we persist per product. Keep in sync with score_products.py expectations.
FIELDS = [
    "code",
    "product_name",
    "product_name_fr",
    "product_name_en",
    "generic_name",
    "generic_name_fr",
    "brands",
    "brands_tags",
    "nutriscore_grade",
    "nutrition_grade_fr",
    "nova_group",
    "additives_tags",
    "ingredients_text",
    "ingredients_text_fr",
    "ingredients_text_en",
    "ingredients_n",
    "labels_tags",
    "allergens_tags",
    "traces_tags",
    "nutriments",
    "image_front_url",
    "image_front_small_url",
    "image_url",
    "categories_tags",
    "categories_tags_fr",
    "countries_tags",
    "languages_tags",
    "lang",
    "quantity",
    "serving_size",
    "last_modified_t",
]

OUT_PATH = Path(__file__).resolve().parent.parent / "pending" / "off_raw.jsonl"


def fetch_page(category: str, country: str, page: int, page_size: int) -> list[dict]:
    params = {
        "categories_tags_en": category,
        "countries_tags_en": country,
        "page": page,
        "page_size": page_size,
        "fields": ",".join(FIELDS),
    }
    url = "https://world.openfoodfacts.org/api/v2/search?" + urllib.parse.urlencode(params)
    req = urllib.request.Request(
        url,
        headers={"User-Agent": USER_AGENT, "Accept": "application/json"},
    )
    with urllib.request.urlopen(req, timeout=60) as resp:
        payload = json.loads(resp.read())
    return payload.get("products", []) or []


def accept_product(p: dict) -> bool:
    """Keep products with usable name + brand + primary lang fr or en."""
    name = (p.get("product_name") or p.get("product_name_fr") or p.get("product_name_en") or "").strip()
    brand = (p.get("brands") or "").strip()
    if not name or not brand:
        return False

    # Primary language: accept fr, en, or unspecified (OFF often omits it)
    lang = (p.get("lang") or "").lower().strip()
    langs = [l.lower() for l in (p.get("languages_tags") or [])]
    if lang and lang not in ("fr", "en"):
        # Allow if fr or en present in declared languages_tags
        if not any(l in ("en:french", "en:english") for l in langs):
            return False

    return True


def main() -> int:
    parser = argparse.ArgumentParser(description="Fetch OFF baby food products for France.")
    parser.add_argument(
        "--categories",
        nargs="*",
        default=DEFAULT_CATEGORIES,
        help="OFF category tags (en:...). Default covers baby-foods + subcategories.",
    )
    parser.add_argument("--country", default="france", help="OFF country tag (default: france).")
    parser.add_argument("--page-size", type=int, default=100, help="Page size (max 100).")
    parser.add_argument("--max-pages", type=int, default=50, help="Safety cap per category.")
    parser.add_argument("--limit", type=int, default=0, help="Global product cap (0 = no cap).")
    parser.add_argument("--sleep", type=float, default=1.2, help="Sleep seconds between pages.")
    parser.add_argument("--out", default=str(OUT_PATH), help="Output JSONL path.")
    args = parser.parse_args()

    out_path = Path(args.out)
    out_path.parent.mkdir(parents=True, exist_ok=True)

    seen_barcodes: set[str] = set()
    kept = 0
    rejected_no_name = 0
    rejected_lang = 0

    with out_path.open("w", encoding="utf-8") as out_file:
        for category in args.categories:
            print(f"\n== Category: {category} ==")
            for page in range(1, args.max_pages + 1):
                if args.limit and kept >= args.limit:
                    break

                try:
                    products = fetch_page(category, args.country, page, args.page_size)
                except Exception as err:  # noqa: BLE001
                    print(f"  [page {page}] ERROR: {err}", file=sys.stderr)
                    time.sleep(5)
                    continue

                if not products:
                    print(f"  [page {page}] empty, moving on.")
                    break

                page_kept = 0
                page_dupe = 0
                for raw in products:
                    code = str(raw.get("code") or "").strip()
                    if not code:
                        continue
                    if code in seen_barcodes:
                        page_dupe += 1
                        continue
                    if not accept_product(raw):
                        name = (raw.get("product_name") or "").strip()
                        if not name or not (raw.get("brands") or "").strip():
                            rejected_no_name += 1
                        else:
                            rejected_lang += 1
                        continue

                    seen_barcodes.add(code)
                    # Stamp source category so the scorer can infer age brackets.
                    raw["_source_category"] = category
                    out_file.write(json.dumps(raw, ensure_ascii=False) + "\n")
                    kept += 1
                    page_kept += 1
                    if args.limit and kept >= args.limit:
                        break

                print(
                    f"  [page {page}] kept {page_kept}, dupes {page_dupe}, "
                    f"total kept {kept}"
                )
                time.sleep(args.sleep)
                if args.limit and kept >= args.limit:
                    break

    print("\n== Summary ==")
    print(f"  Kept              : {kept}")
    print(f"  Unique barcodes   : {len(seen_barcodes)}")
    print(f"  Rejected (name)   : {rejected_no_name}")
    print(f"  Rejected (lang)   : {rejected_lang}")
    print(f"  Output            : {out_path}")

    return 0 if kept > 0 else 1


if __name__ == "__main__":
    sys.exit(main())
