#!/usr/bin/env python3
"""
build_recall_pages.py , convert pending/recalls.jsonl into Astro content
collection under site/src/content/recalls/<numero_fiche>.md, plus a
recalls_index.json mapping EAN-13 → recall id for fast template lookup.

Inputs:
  pending/recalls.jsonl                  (normalised RappelConso records)
  pending/scored_products.jsonl          (the BébéDécrypte catalog, used to
                                          back-fill matched_product_slugs from
                                          EAN matches)

Outputs:
  site/src/content/recalls/<numero_fiche>.md   (one per recall, FR frontmatter + body)
  site/src/data/recalls_index.json             (EAN → recall metadata for product banners)

Usage:
    python3 scripts/build_recall_pages.py
    python3 scripts/build_recall_pages.py --dry-run
"""
from __future__ import annotations

import argparse
import json
import re
import sys
from collections import defaultdict
from datetime import datetime
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
RECALLS_IN = REPO_ROOT / "pending" / "recalls.jsonl"
PRODUCTS_IN = REPO_ROOT / "pending" / "scored_products.jsonl"
RECALLS_OUT_DIR = REPO_ROOT / "site" / "src" / "content" / "recalls"
INDEX_OUT = REPO_ROOT / "site" / "src" / "data" / "recalls_index.json"

# Risk signals that should escalate severity. Highest match wins.
SEVERITY_RULES = [
    ("critical", ["listeria", "salmonel", "e. coli", "escherichia", "botulism", "cereulide", "céréulide"]),
    ("high", ["bacill", "staphyloc", "moisi", "metaux lourds", "métaux lourds", "plomb", "arsenic", "mercure", "presence de", "présence de"]),
    ("medium", ["allerg", "pesticide", "ochratoxin", "alcaloïde", "alcaloide"]),
    ("low", ["étiquetage", "etiquetage", "marquage", "non conforme"]),
]

# em-dash + en-dash forbidden across the project.
DASH_RE = re.compile(r"[—–]")


def severity_for(rec: dict) -> str:
    text = " ".join(
        [
            (rec.get("motif_rappel") or ""),
            (rec.get("risques_encourus") or ""),
            (rec.get("description_complementaire_risque") or ""),
        ]
    ).lower()
    for label, kws in SEVERITY_RULES:
        if any(kw in text for kw in kws):
            return label
    return "medium"


def status_for(rec: dict) -> str:
    end = rec.get("date_fin_procedure")
    if not end:
        return "active"
    try:
        end_dt = datetime.fromisoformat(end[:10])
    except Exception:
        return "active"
    return "ended" if end_dt < datetime.utcnow() else "active"


def slugify(value: str) -> str:
    import unicodedata
    if not value:
        return ""
    value = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode("ascii")
    value = re.sub(r"[^a-zA-Z0-9]+", "-", value).strip("-").lower()
    return value or ""


def clean_dashes(text: str) -> str:
    return DASH_RE.sub(",", text or "") if text else ""


def normalise_str(text: str) -> str:
    if not text:
        return ""
    text = clean_dashes(text)
    text = re.sub(r"\s+", " ", text).strip()
    # Capitalise the first letter for readability (RappelConso ships everything lowercase)
    return text[:1].upper() + text[1:] if text else text


def first_image(rec: dict) -> str:
    raw = rec.get("liens_vers_les_images") or ""
    if not raw:
        return ""
    parts = re.split(r"\s*\|\s*|\s*,\s*", str(raw))
    for p in parts:
        p = p.strip()
        if p.startswith("http"):
            return p
    return ""


def yaml_quote(value: str) -> str:
    """Single-line YAML-safe string : escape backslashes + quotes, drop newlines."""
    if value is None:
        return ""
    s = str(value).replace("\\", "\\\\").replace('"', '\\"')
    s = s.replace("\n", " ").replace("\r", "")
    return s


def yaml_string_array(values: list[str]) -> str:
    if not values:
        return "[]"
    parts = [f'"{yaml_quote(v)}"' for v in values]
    return "[" + ", ".join(parts) + "]"


def build_title(rec: dict) -> str:
    brand = (rec.get("marque_produit") or "").strip().title()
    label = (rec.get("libelle") or rec.get("modeles_ou_references") or "").strip()
    label = re.sub(r"\s+", " ", label)
    if brand and label:
        # Some libelles already start with the brand , avoid duplication
        if label.lower().startswith(brand.lower()):
            return label[:120].title()
        return f"{brand} {label[:100]}".strip().title()
    return (label or brand or "Rappel produit bébé")[:140]


def build_description(rec: dict) -> str:
    motif = normalise_str(rec.get("motif_rappel") or "")
    if motif:
        # Trim to ~210 chars to stay under meta description limit
        return motif[:210]
    return f"Rappel produit publié le {rec.get('date_publication','')[:10]}."[:210]


def render_body(rec: dict, matched_slugs: list[str]) -> str:
    """Render the recall body markdown , factual, sourcable, sans tiret cadratin."""
    lines = []
    lines.append(f"## Pourquoi ce rappel ?\n")
    motif = normalise_str(rec.get("motif_rappel") or "Motif non précisé.")
    lines.append(motif + "\n")

    risk = normalise_str(rec.get("risques_encourus") or "")
    risk_detail = normalise_str(rec.get("description_complementaire_risque") or "")
    if risk or risk_detail:
        lines.append("## Risques encourus\n")
        if risk:
            lines.append(f"**Catégorie de risque :** {risk}.\n")
        if risk_detail:
            lines.append(f"{risk_detail}\n")

    advice = normalise_str(rec.get("conduites_a_tenir_par_le_consommateur") or "")
    if advice:
        lines.append("## Conduite à tenir\n")
        steps = [s.strip() for s in re.split(r"\s*\|\s*", advice) if s.strip()]
        if len(steps) > 1:
            for s in steps:
                lines.append(f"- {s.capitalize()}")
            lines.append("")
        else:
            lines.append(advice + "\n")

    compensation = normalise_str(rec.get("modalites_de_compensation") or "")
    if compensation:
        lines.append("## Modalités de compensation\n")
        steps = [s.strip().capitalize() for s in re.split(r"\s*\|\s*", compensation) if s.strip()]
        lines.append(", ".join(steps) + ".\n")

    distrib = normalise_str(rec.get("distributeurs") or "")
    if distrib:
        lines.append("## Où le produit a été vendu\n")
        lines.append(distrib + "\n")

    eans = rec.get("eans") or []
    if eans:
        lines.append("## Codes-barres concernés\n")
        for ean in eans:
            lines.append(f"- `{ean}`")
        lines.append("")

    if matched_slugs:
        lines.append("## Fiches BébéDécrypte concernées\n")
        for s in matched_slugs:
            lines.append(f"- [/products/{s}/](/products/{s}/)")
        lines.append("")

    lines.append("## Sources officielles\n")
    src = rec.get("lien_vers_la_fiche_rappel") or ""
    if src:
        lines.append(f"- [Fiche officielle RappelConso (DGCCRF)]({src})")
    pdf = rec.get("lien_vers_affichette_pdf") or ""
    if pdf:
        lines.append(f"- [Affichette PDF officielle]({pdf})")
    contact = rec.get("numero_contact") or ""
    if contact:
        lines.append(f"- Numéro contact entreprise : `{contact}`")

    lines.append("")
    lines.append("---")
    lines.append("")
    lines.append(
        "*Données issues du registre public RappelConso de la DGCCRF, "
        "republiées avec attribution. BébéDécrypte n'est pas l'autorité émettrice du rappel : "
        "consulter la fiche officielle pour la version juridiquement opposable.*"
    )
    return "\n".join(lines)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--in", dest="in_path", default=str(RECALLS_IN), help="Input JSONL.")
    parser.add_argument("--products", default=str(PRODUCTS_IN), help="Scored products JSONL for EAN matching.")
    parser.add_argument("--out-dir", default=str(RECALLS_OUT_DIR), help="Output content dir.")
    parser.add_argument("--index-out", default=str(INDEX_OUT), help="EAN→recall index JSON output.")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    in_path = Path(args.in_path)
    out_dir = Path(args.out_dir)
    index_out = Path(args.index_out)
    products_path = Path(args.products)

    if not in_path.exists():
        print(f"ERROR: missing {in_path}", file=sys.stderr)
        return 1

    # Build EAN → product slug map from the catalog.
    ean_to_slug: dict[str, str] = {}
    if products_path.exists():
        with products_path.open("r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    rec = json.loads(line)
                except json.JSONDecodeError:
                    continue
                code = (rec.get("code") or rec.get("barcode") or "").strip()
                slug = (rec.get("slug") or "").strip()
                if code and slug:
                    ean_to_slug[code] = slug

    out_dir.mkdir(parents=True, exist_ok=True)

    # Wipe stale recall files so a recall removed from the source set disappears.
    if not args.dry_run:
        for f in out_dir.glob("*.md"):
            f.unlink()

    written = 0
    index: dict[str, dict] = {}
    with in_path.open("r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                rec = json.loads(line)
            except json.JSONDecodeError:
                continue

            numero = (rec.get("numero_fiche") or "").strip()
            if not numero:
                continue

            eans = rec.get("eans") or []
            matched_slugs = sorted({ean_to_slug[ean] for ean in eans if ean in ean_to_slug})
            severity = severity_for(rec)
            status = status_for(rec)
            published = rec.get("date_publication") or ""
            published_date = published[:10] if published else "2020-01-01"

            title = build_title(rec)
            description = build_description(rec)
            image = first_image(rec)

            frontmatter = [
                "---",
                f'numeroFiche: "{yaml_quote(numero)}"',
                f'title: "{yaml_quote(title)}"',
                f'description: "{yaml_quote(description)}"',
                f"publishedDate: {published_date}",
                f'brand: "{yaml_quote(rec.get("marque_produit") or "")}"',
                f'productLabel: "{yaml_quote(rec.get("libelle") or rec.get("modeles_ou_references") or "")}"',
                f'subCategory: "{yaml_quote(rec.get("sous_categorie_produit") or "")}"',
                f"eans: {yaml_string_array(eans)}",
                f'motif: "{yaml_quote(normalise_str(rec.get("motif_rappel") or ""))}"',
                f'risk: "{yaml_quote(normalise_str(rec.get("risques_encourus") or ""))}"',
                f'riskDetail: "{yaml_quote(normalise_str(rec.get("description_complementaire_risque") or ""))}"',
                f'advice: "{yaml_quote(normalise_str(rec.get("conduites_a_tenir_par_le_consommateur") or ""))}"',
                f'compensation: "{yaml_quote(normalise_str(rec.get("modalites_de_compensation") or ""))}"',
                f'distributors: "{yaml_quote(normalise_str(rec.get("distributeurs") or ""))}"',
                f'contact: "{yaml_quote(rec.get("numero_contact") or "")}"',
                f'sourceUrl: "{yaml_quote(rec.get("lien_vers_la_fiche_rappel") or "https://rappel.conso.gouv.fr/")}"',
            ]
            if rec.get("lien_vers_affichette_pdf"):
                frontmatter.append(f'posterPdf: "{yaml_quote(rec["lien_vers_affichette_pdf"])}"')
            if image:
                frontmatter.append(f'image: "{yaml_quote(image)}"')
            frontmatter.append(f'severity: {severity}')
            frontmatter.append(f'status: {status}')
            if rec.get("date_fin_procedure"):
                frontmatter.append(f"procedureEndDate: {rec['date_fin_procedure'][:10]}")
            frontmatter.append(f"matchedProductSlugs: {yaml_string_array(matched_slugs)}")
            frontmatter.append("lang: fr")
            frontmatter.append("---")
            frontmatter.append("")

            body = render_body(rec, matched_slugs)
            md = "\n".join(frontmatter) + body + "\n"

            if not args.dry_run:
                out_path = out_dir / f"{numero}.md"
                out_path.write_text(md, encoding="utf-8")
            written += 1

            for ean in eans:
                index[ean] = {
                    "numeroFiche": numero,
                    "title": title,
                    "publishedDate": published_date,
                    "severity": severity,
                    "status": status,
                    "motif": normalise_str(rec.get("motif_rappel") or "")[:160],
                }

    # Write the EAN → recall index
    index_out.parent.mkdir(parents=True, exist_ok=True)
    if not args.dry_run:
        index_out.write_text(json.dumps(index, ensure_ascii=False, indent=2, sort_keys=True), encoding="utf-8")

    print(f"[recalls] wrote {written} recall pages to {out_dir.relative_to(REPO_ROOT)}")
    print(f"[recalls] EAN index: {len(index)} entries → {index_out.relative_to(REPO_ROOT)}")
    matched = sum(1 for k in index if k in ean_to_slug)
    print(f"[recalls] EANs matching catalogued products: {matched}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
