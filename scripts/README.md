# BébéDécrypte , pipeline data

Pipeline Phase 1 : Open Food Facts → scoring BébéDécrypte → pages Astro.

## Vue d'ensemble

```
                 ┌────────────────────────┐
                 │ fetch_off_baby.py      │  pending/off_raw.jsonl
                 └───────────┬────────────┘
                             ▼
                 ┌────────────────────────┐
                 │ score_products.py      │  pending/scored_products.jsonl
                 │ (import scoring_engine)│
                 └───────────┬────────────┘
                             ▼
                 ┌────────────────────────┐
                 │ build_astro_pages.py   │  site/src/content/{products,brands,categories}/*.md
                 └────────────────────────┘
```

Trois scripts, aucun secret, aucune dépendance externe hors stdlib Python.

## Pré-requis

- Python 3.10+ (stdlib uniquement, pas de `requests`, `pandas`, etc.)
- Réseau sortant vers `world.openfoodfacts.org`

Aucune variable d'environnement requise pour la Phase 1 (pas de Supabase, pas d'API LLM, pas de token).

## 1. `fetch_off_baby.py`

Télécharge les produits "baby food" d'Open Food Facts pour le marché France, via l'API v2 search.

Catégories couvertes par défaut (éditable via `--categories`) :

- `en:baby-foods` (parent, ~2300 produits FR)
- `en:baby-milks`, `en:infant-milks`, `en:first-age-milks`, `en:follow-on-milks`, `en:growing-up-milks`
- `en:baby-cereals`
- `en:baby-snacks`, `en:baby-biscuits`
- `en:baby-juices`, `en:baby-drinks`
- `en:fruits-for-babies`, `en:vegetables-for-babies`

Filtres : marque + nom obligatoires, langue primaire fr ou en.
Dedup : par code barre (`code`).
Rate limit : `--sleep 1.2` s entre pages (configurable), User-Agent identifiant + email de contact.

```bash
# Tout télécharger avec les valeurs par défaut
python3 scripts/fetch_off_baby.py

# Mode test rapide : 300 produits max
python3 scripts/fetch_off_baby.py --limit 300

# Cibler une catégorie précise
python3 scripts/fetch_off_baby.py --categories en:baby-milks en:baby-cereals

# Pagination custom
python3 scripts/fetch_off_baby.py --page-size 100 --max-pages 25 --sleep 1.5
```

Output : `pending/off_raw.jsonl` (un produit JSON brut par ligne).

## 2. `score_products.py`

Lit `pending/off_raw.jsonl`, importe `scoring_engine.compute_grade` et produit `pending/scored_products.jsonl`.

Responsabilités :

- Sélection du nom : `product_name_fr` > `product_name` > `product_name_en` > `generic_name_fr` > `generic_name`
- Sélection des ingrédients : `ingredients_text_fr` > `ingredients_text` > `ingredients_text_en`
- Inférence de la tranche d'âge (`target_age_months`) à partir de `categories_tags` :
  - laits 1er âge → 3 mois
  - laits 2e âge → 9 mois
  - laits de croissance → 18 mois
  - céréales / petits pots / gourdes → 6 mois
  - biscuits / snacks → 8-9 mois
  - boissons → 6 mois
- Mapping vers une catégorie catalogue BébéDécrypte :
  - `petits-pots`, `laits-infantiles`, `cereales`, `gourdes-fruits`, `biscuits-snacks`, `boissons`, `autres`
- Génération d'un slug `<brand>-<name>` sluggifié, dédupliqué avec suffixe numérique si collision
- Appel de `compute_grade()` sur un `ProductInput` construit proprement

```bash
python3 scripts/score_products.py

# Ou avec chemins explicites
python3 scripts/score_products.py --in pending/off_raw.jsonl --out pending/scored_products.jsonl
```

Output par ligne :

```json
{
  "slug": "blédina-légumes-du-soleil",
  "barcode": "3041091036209",
  "brand": "Blédina",
  "brand_slug": "bledina",
  "name": "Légumes du soleil",
  "catalog_category": "petits-pots",
  "target_age_months": 6,
  "category_type": "baby_food",
  "grade": "C",
  "score": 62,
  "breakdown": { "nova": 45, "additives": 100, "added_sugars": 85, "...": "..." },
  "warnings": ["ultra_transforme", "sucres_eleves:6.2g"],
  "source_url": "https://world.openfoodfacts.org/product/3041091036209",
  "...": "..."
}
```

## 3. `build_astro_pages.py`

Lit `pending/scored_products.jsonl` et génère les 3 collections de contenu Astro :

- `site/src/content/products/<slug>.md` , une fiche par produit (frontmatter complet + corps FR factuel, détail de la note, avertissements, alternatives mieux notées dans la même catégorie)
- `site/src/content/brands/<brand-slug>.md` , une page par marque (note moyenne, répartition ABCDE, liste des produits)
- `site/src/content/categories/<slug>.md` , une page par catégorie catalogue (top 15 produits mieux notés, stats)

Règles imposées :

- Accents FR UTF-8 direct (é è ê à ç î ô û), **jamais** `\uXXXX`
- Tutoiement partout (`tu`, `ton`, `tes`)
- **Zéro tiret cadratin** (`—` / `–`) : remplacés automatiquement par `,` ou `-` dans les titres, YAML et body
- Contenu factuel, actionnable, sans blabla IA
- `lastReviewed` = date du jour, `reviewedBy = "Dr. Claire Vasseur"` (pen name déclaré dans `site/src/data/authors.ts`)

```bash
python3 scripts/build_astro_pages.py

# Dry run : compter sans écrire
python3 scripts/build_astro_pages.py --dry-run

# Plus d'alternatives par fiche produit
python3 scripts/build_astro_pages.py --max-alternatives 6
```

## Pipeline complet en une commande

```bash
cd ~/stack-2026/bebedecrypte && \
  python3 scripts/fetch_off_baby.py && \
  python3 scripts/score_products.py && \
  python3 scripts/build_astro_pages.py
```

Comptabiliser les fichiers générés :

```bash
ls site/src/content/products/ | wc -l
ls site/src/content/brands/ | wc -l
ls site/src/content/categories/ | wc -l
```

## Schéma de contenu (Astro)

Les 3 collections `products`, `brands`, `categories` sont déclarées dans `site/src/content.config.ts` avec des schémas Zod stricts. Toute dérive du frontmatter généré fera échouer `astro build`.

## Hygiène

- `pending/*.jsonl` doit rester hors de Git (ajouter `pending/` au `.gitignore` si ce n'est pas déjà fait).
- En revanche, `site/src/content/products/**` est versionné (c'est le contenu du site).
- Le script de build est idempotent : relancer réécrase proprement les fichiers.

## Ce qui NE doit PAS être fait

- Ne **jamais** modifier `scripts/scoring_engine.py` dans ce pipeline. C'est la source de vérité de la note BébéDécrypte, versionnée séparément.
- Ne pas utiliser de tiret cadratin (`—` / `–`) dans les contenus générés. La fonction `kill_dashes()` les nettoie mais autant ne pas en introduire.
- Ne pas publier de contenu sans `lastReviewed` + `reviewedBy` (signal E-E-A-T requis par STACK-2026).
