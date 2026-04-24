#!/usr/bin/env python3
"""
fetch_rappelconso.py , pull RappelConso (DGCCRF) baby-food recalls.

Source: data.economie.gouv.fr , dataset `rappelconso-v2-gtin-espaces` (Opendatasoft API v2.1).
Total dataset size: ~17,420 recalls all categories.
We keep:
  - sous_categorie_produit = "aliments pour bébés" (63 records)
  - sous_categorie_produit in {"lait et produits laitiers",
    "aliments diététiques et nutrition"} AND name/brand contains a baby keyword
    (infant, infantile, bébé, nourrisson, biberon, lait 1er âge, lait 2e âge).

Output:
    pending/recalls_raw.jsonl   one raw API record per line
    pending/recalls.jsonl       normalised, with extracted EAN-13s

The normalised file is consumed by `build_recall_pages.py` to:
  - generate site/src/content/recalls/<numero_fiche>.md
  - build a recalls_index.json (EAN-13 → recall id) for fast product-page banner lookup.

Usage:
    python3 scripts/fetch_rappelconso.py
    python3 scripts/fetch_rappelconso.py --since 2024-01-01
"""
from __future__ import annotations

import argparse
import json
import re
import sys
import time
import urllib.parse
import urllib.request
from pathlib import Path

UA = "bebedecrypte/1.0 (RappelConso ingest, contact@bebedecrypte.com)"
API = "https://data.economie.gouv.fr/api/explore/v2.1/catalog/datasets/rappelconso-v2-gtin-espaces/records"

REPO_ROOT = Path(__file__).resolve().parent.parent
RAW_OUT = REPO_ROOT / "pending" / "recalls_raw.jsonl"
NORM_OUT = REPO_ROOT / "pending" / "recalls.jsonl"

# Baby keywords matched in marque_produit + modeles_ou_references + libelle.
# Lowercase, no accents (we strip both before matching).
BABY_KEYWORDS = [
    "infantile",
    "infant",
    "bebe",
    "nourrisson",
    "biberon",
    "lait 1",
    "lait 1er",
    "1er age",
    "1eme age",
    "lait 2",
    "lait 2e",
    "2eme age",
    "2e age",
    "lait 3",
    "lait 3e",
    "3eme age",
    "3e age",
    "croissance",
    "petit pot",
    "pot bebe",
    "pot pour bebe",
    "compote bebe",
    "cereale bebe",
    "cereales bebe",
    "gourde bebe",
    "puree bebe",
    "purée bebe",
]

DIRECT_SUB_CATEGORY = "aliments pour bébés"
SECONDARY_SUB_CATEGORIES = {
    "lait et produits laitiers",
    "aliments diététiques et nutrition",
}


def strip_accents(s: str) -> str:
    import unicodedata
    return "".join(c for c in unicodedata.normalize("NFKD", s or "") if not unicodedata.combining(c)).lower()


def looks_like_baby(rec: dict) -> bool:
    """Decide whether the recall touches baby food."""
    sub = (rec.get("sous_categorie_produit") or "").strip().lower()
    if sub == DIRECT_SUB_CATEGORY.lower():
        return True
    if sub in SECONDARY_SUB_CATEGORIES:
        text = " ".join(
            [
                rec.get("marque_produit") or "",
                rec.get("modeles_ou_references") or "",
                rec.get("libelle") or "",
                rec.get("informations_complementaires_publiques") or "",
            ]
        )
        text_norm = strip_accents(text)
        return any(kw in text_norm for kw in BABY_KEYWORDS)
    return False


# EAN-13 detector. Real EAN-13 is exactly 13 digits, but RappelConso also lists
# EAN-8 and short codes ; we keep 8-14 digits, then validate the EAN-13 check
# digit when length == 13 to drop garbage (random lot numbers).
EAN_PATTERN = re.compile(r"\b(\d{8,14})\b")


def is_valid_ean13(code: str) -> bool:
    if len(code) != 13 or not code.isdigit():
        return False
    digits = [int(c) for c in code]
    s = sum(digits[i] * (1 if i % 2 == 0 else 3) for i in range(12))
    return (10 - (s % 10)) % 10 == digits[12]


def extract_eans(rec: dict) -> list[str]:
    """Extract candidate EAN codes from identification_produits + free text."""
    raw_ids = rec.get("identification_produits") or []
    if isinstance(raw_ids, str):
        raw_ids = [raw_ids]
    candidates: set[str] = set()
    haystack = " ".join(
        list(map(str, raw_ids))
        + [
            str(rec.get("modeles_ou_references") or ""),
            str(rec.get("informations_complementaires") or ""),
            str(rec.get("informations_complementaires_publiques") or ""),
        ]
    )
    for m in EAN_PATTERN.findall(haystack):
        if len(m) == 13 and is_valid_ean13(m):
            candidates.add(m)
        elif len(m) in (8, 12, 14):
            candidates.add(m)
    return sorted(candidates)


def normalise(rec: dict) -> dict:
    """Compact the API record into the fields BébéDécrypte needs."""
    eans = extract_eans(rec)
    return {
        "numero_fiche": rec.get("numero_fiche"),
        "id": rec.get("id"),
        "rappel_guid": rec.get("rappel_guid"),
        "date_publication": rec.get("date_publication"),
        "date_debut_commercialisation": rec.get("date_debut_commercialisation"),
        "date_fin_commercialisation": rec.get("date_date_fin_commercialisation"),
        "date_fin_procedure": rec.get("date_de_fin_de_la_procedure_de_rappel"),
        "categorie_produit": rec.get("categorie_produit"),
        "sous_categorie_produit": rec.get("sous_categorie_produit"),
        "marque_produit": rec.get("marque_produit"),
        "libelle": rec.get("libelle"),
        "modeles_ou_references": rec.get("modeles_ou_references"),
        "conditionnements": rec.get("conditionnements"),
        "temperature_conservation": rec.get("temperature_conservation"),
        "zone_geographique_de_vente": rec.get("zone_geographique_de_vente"),
        "distributeurs": rec.get("distributeurs"),
        "motif_rappel": rec.get("motif_rappel"),
        "risques_encourus": rec.get("risques_encourus"),
        "description_complementaire_risque": rec.get("description_complementaire_risque"),
        "preconisations_sanitaires": rec.get("preconisations_sanitaires"),
        "conduites_a_tenir_par_le_consommateur": rec.get("conduites_a_tenir_par_le_consommateur"),
        "modalites_de_compensation": rec.get("modalites_de_compensation"),
        "numero_contact": rec.get("numero_contact"),
        "informations_complementaires": rec.get("informations_complementaires"),
        "informations_complementaires_publiques": rec.get("informations_complementaires_publiques"),
        "lien_vers_la_fiche_rappel": rec.get("lien_vers_la_fiche_rappel"),
        "lien_vers_affichette_pdf": rec.get("lien_vers_affichette_pdf"),
        "lien_vers_la_liste_des_distributeurs": rec.get("lien_vers_la_liste_des_distributeurs"),
        "lien_vers_la_liste_des_produits": rec.get("lien_vers_la_liste_des_produits"),
        "liens_vers_les_images": rec.get("liens_vers_les_images"),
        "nature_juridique_rappel": rec.get("nature_juridique_rappel"),
        "eans": eans,
    }


def fetch_page(where: str, offset: int, limit: int = 100) -> list[dict]:
    qs = urllib.parse.urlencode(
        {
            "where": where,
            "limit": limit,
            "offset": offset,
            "order_by": "date_publication DESC",
        }
    )
    url = f"{API}?{qs}"
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    with urllib.request.urlopen(req, timeout=30) as resp:
        return json.loads(resp.read()).get("results", [])


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--since", default=None, help="ISO date (YYYY-MM-DD), only recalls after this. Defaults to all.")
    parser.add_argument("--sleep", type=float, default=0.6, help="Sleep between API pages.")
    parser.add_argument("--max-pages", type=int, default=80, help="Safety cap (pages of 100 records).")
    args = parser.parse_args()

    RAW_OUT.parent.mkdir(parents=True, exist_ok=True)

    where_clauses = ['categorie_produit = "alimentation"']
    if args.since:
        where_clauses.append(f'date_publication > "{args.since}"')
    where = " AND ".join(where_clauses)

    raw_records: list[dict] = []
    print(f"[rappelconso] where: {where}")
    for page in range(args.max_pages):
        offset = page * 100
        try:
            batch = fetch_page(where, offset)
        except Exception as err:
            print(f"  [page {page}] ERROR: {err}", file=sys.stderr)
            time.sleep(2)
            continue
        if not batch:
            print(f"  [page {page}] empty, stopping.")
            break
        kept = sum(1 for r in batch if looks_like_baby(r))
        raw_records.extend(batch)
        print(f"  [page {page}] fetched {len(batch)}, baby-related {kept}, total raw {len(raw_records)}")
        time.sleep(args.sleep)
        if len(batch) < 100:
            break

    # Persist raw + normalised
    with RAW_OUT.open("w", encoding="utf-8") as f:
        for r in raw_records:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")

    baby_records = [normalise(r) for r in raw_records if looks_like_baby(r)]
    with NORM_OUT.open("w", encoding="utf-8") as f:
        for r in baby_records:
            f.write(json.dumps(r, ensure_ascii=False) + "\n")

    n_with_ean = sum(1 for r in baby_records if r["eans"])
    print(f"\n[rappelconso] raw recalls (alimentation): {len(raw_records)}")
    print(f"[rappelconso] baby recalls: {len(baby_records)}")
    print(f"[rappelconso] baby recalls with at least one EAN: {n_with_ean}")
    print(f"[rappelconso] wrote {RAW_OUT.relative_to(REPO_ROOT)} and {NORM_OUT.relative_to(REPO_ROOT)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
