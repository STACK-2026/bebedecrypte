# BébéDécrypte , pipeline data

Deux pipelines parallèles + un guardrail :

```
                ┌────────────────────────┐
                │ fetch_off_baby.py      │  pending/off_raw.jsonl
                │ (31 cat OFF, ~10 min)  │
                └───────────┬────────────┘
                            ▼
                ┌────────────────────────┐
                │ score_products.py      │  pending/scored_products.jsonl
                │ (import scoring_engine)│
                └───────────┬────────────┘
                            ▼
                ┌────────────────────────┐
                │ build_astro_pages.py   │  site/src/content/{products,brands,categories}/*.md
                │ (wipe stale auto)      │  → 970 + 117 + 4 fichiers
                └────────────────────────┘

                ┌────────────────────────┐
                │ fetch_rappelconso.py   │  pending/recalls.jsonl
                │ (DGCCRF API, ~3 min)   │
                └───────────┬────────────┘
                            ▼
                ┌────────────────────────┐
                │ build_recall_pages.py  │  site/src/content/recalls/<numero>.md
                │ (wipe stale auto)      │  + site/src/data/recalls_index.json
                └────────────────────────┘  → 60 fiches + EAN→recall map

                ┌────────────────────────┐
                │ check_cross_project_   │  exit 1 si leak STACK-2026 détecté
                │ leaks.py               │  (CI obligatoire avant push)
                └────────────────────────┘
```

Tous les scripts sont en stdlib Python, aucun secret requis pour les pipelines OFF + RappelConso.

## Pré-requis

- Python 3.10+ (stdlib uniquement)
- Réseau sortant vers `world.openfoodfacts.org` et `data.economie.gouv.fr`

## 1. `fetch_off_baby.py` , pull catalogue OFF

Télécharge les produits "baby food" d'Open Food Facts pour le marché France via l'API v2 search.

**31 catégories couvertes par défaut** (vs 13 initialement) :

- Generic : `baby-foods`, `foods-for-young-children`, `baby-meals`
- Milks : `baby-milks`, `infant-milks`, `first-age-milks`, `follow-on-milks`, `growing-up-milks`, `infant-formulas`, `hypoallergenic-formulas`
- Cereals : `baby-cereals`, `porridges-for-babies`, `infant-cereals`
- Snacks : `baby-snacks`, `baby-biscuits`, `teething-biscuits`
- Drinks : `baby-juices`, `baby-drinks`, `baby-waters`
- Purees / jars : `purees-for-babies`, `fruit-purees-for-babies`, `vegetable-purees-for-babies`, `fruits-for-babies`, `vegetables-for-babies`, `meat-for-babies`, `fish-for-babies`, `meals-for-babies`, `dishes-for-babies`, `dinners-for-babies`
- Pouches : `baby-fruit-pouches`, `fruit-pouches-for-babies`

Filtres : marque + nom obligatoires, langue primaire fr ou en.
Dedup : par code-barre (`code`).
Rate limit : `--sleep 1.2` s entre pages, User-Agent identifiant + email contact.

```bash
# Tout télécharger (defaults)
python3 scripts/fetch_off_baby.py

# Mode test rapide
python3 scripts/fetch_off_baby.py --limit 300

# Cibler une catégorie
python3 scripts/fetch_off_baby.py --categories en:baby-milks en:baby-cereals

# Multi-pays (à utiliser pour viser 2 300+ produits)
python3 scripts/fetch_off_baby.py --country france
# (le script accepte --country mais une seule valeur ; lancer en parallèle pour BE / CH / LU)
```

Output : `pending/off_raw.jsonl` (un produit JSON brut par ligne).

## 2. `score_products.py` , scoring 8 axes

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
- Mapping vers une catégorie catalogue : `petits-pots`, `laits-infantiles`, `cereales`, `gourdes-fruits`, `biscuits-snacks`, `boissons`, `autres`
- Slug `<brand>-<name>` sluggifié, dédupliqué avec suffixe numérique
- Appel `compute_grade()` sur un `ProductInput`

```bash
python3 scripts/score_products.py
python3 scripts/score_products.py --in pending/off_raw.jsonl --out pending/scored_products.jsonl
```

## 3. `build_astro_pages.py` , génération markdown

Lit `pending/scored_products.jsonl` et génère 3 collections de contenu Astro :

- `site/src/content/products/<slug>.md` , une fiche par produit (frontmatter complet + corps FR factuel, détail de la note, avertissements, alternatives mieux notées dans la même catégorie)
- `site/src/content/brands/<brand-slug>.md` , page par marque (note moyenne, répartition ABCDE, liste des produits)
- `site/src/content/categories/<slug>.md` , page par catégorie catalogue

**Wipe stale auto (depuis 25/04)** : tout slug retiré du jsonl voit son `.md` supprimé. Plus de 404 fantôme dans le sitemap.

Règles imposées :

- Accents FR UTF-8 direct (é è ê à ç î ô û), **jamais** `\uXXXX`
- Tutoiement partout (`tu`, `ton`, `tes`)
- **Zéro tiret cadratin** (`—` / `–`) : remplacés par `,` ou `-`
- Contenu factuel, actionnable, sans blabla IA
- `lastReviewed` = date du jour, `reviewedBy = "Dr. Claire Vasseur"` (pen name déclaré dans `site/src/data/authors.ts`)

```bash
python3 scripts/build_astro_pages.py
python3 scripts/build_astro_pages.py --dry-run
python3 scripts/build_astro_pages.py --max-alternatives 6
```

## 4. `fetch_rappelconso.py` , pull RappelConso DGCCRF (NEW 25/04)

Télécharge les rappels alimentation depuis le registre public DGCCRF
(`data.economie.gouv.fr` , dataset `rappelconso-v2-gtin-espaces`, Opendatasoft API v2.1).

Filtre :
- `categorie_produit = "alimentation"` (8 000 rappels environ depuis 2020)
- Sous-catégorie `"aliments pour bébés"` (63 rappels) **OU** sous-catégorie laits/nutrition + un des 27 baby-keywords sur libelle/marque (`infant`, `bebe`, `nourrisson`, `lait 1er age`, `croissance`, `petit pot`, etc.)
- Résultat actuel : 60 rappels bébé, 91 EAN-13 extraits + validés (somme de contrôle ISO/IEC 7064)

```bash
python3 scripts/fetch_rappelconso.py
python3 scripts/fetch_rappelconso.py --since 2024-01-01
python3 scripts/fetch_rappelconso.py --max-pages 80 --sleep 0.6
```

Output :
- `pending/recalls_raw.jsonl` , un record API brut par ligne
- `pending/recalls.jsonl` , normalisé (champs frontend + EAN extraits)

## 5. `build_recall_pages.py` , génération fiches rappels (NEW 25/04)

Lit `pending/recalls.jsonl` + `pending/scored_products.jsonl` (pour le matching EAN).

Output :
- `site/src/content/recalls/<numero_fiche>.md` , 60 fiches rappels (frontmatter Zod-validé + corps markdown structuré)
- `site/src/data/recalls_index.json` , index `{ EAN-13: { numeroFiche, title, severity, status, motif } }` lu par le template `pages/products/[...slug].astro` pour afficher le bandeau rouge automatique

Severity auto-classifiée :
- `critical` : listeria, salmonelle, e. coli, escherichia, botulisme, céréulide
- `high` : bacille, staphylocoque, moisissure, métaux lourds, plomb, arsenic, mercure
- `medium` : allergène, pesticide, ochratoxine, alcaloïde
- `low` : étiquetage, marquage, non-conformité

Status :
- `active` si `date_fin_procedure` > today
- `ended` sinon

**Wipe stale auto** : un rappel retiré du jsonl voit sa fiche `.md` supprimée.

```bash
python3 scripts/build_recall_pages.py
python3 scripts/build_recall_pages.py --dry-run
```

## 6. `scoring_engine.py` , source de vérité (NE PAS MODIFIER)

Pondération 8 axes avec doublement automatique des pénalités additifs sur produits visant les < 12 mois (recommandation ANSES). Importé par `score_products.py`.

## 7. `check_cross_project_leaks.py` , guardrail sécurité

Scan du runtime (`src/`, `public/`, `functions/`) pour détecter toute ref à un autre projet STACK-2026 (Supabase ref, domaine, brand token).

```bash
python3 scripts/check_cross_project_leaks.py
# exit 1 si leak, exit 0 sinon
```

Tourne en CI via `.github/workflows/cross-project-leaks.yml` sur chaque push + PR. Le merge est bloqué si un leak est détecté.

## 8. `serp_brief.py` , brief concurrentiel Gemini

Pour chaque article du blog-auto, génère un brief SERP via Gemini 2.5 Pro + grounding Google Search natif. Utilisé par le pipeline `blog-auto/publish.py`.

## 9. `discover_off.py` , exploration catégories OFF

One-shot research script pour découvrir de nouvelles catégories OFF baby-food. Utile quand on veut élargir le catalogue.

## Pipeline complet en une commande

```bash
cd ~/stack-2026/bebedecrypte && \
  python3 scripts/fetch_off_baby.py && \
  python3 scripts/score_products.py && \
  python3 scripts/build_astro_pages.py && \
  python3 scripts/fetch_rappelconso.py --since 2020-01-01 && \
  python3 scripts/build_recall_pages.py && \
  python3 scripts/check_cross_project_leaks.py
```

Comptabiliser les fichiers générés :

```bash
ls site/src/content/products/ | wc -l    # 970
ls site/src/content/brands/ | wc -l      # 117
ls site/src/content/categories/ | wc -l  # 4
ls site/src/content/recalls/ | wc -l     # 60
```

## Schéma de contenu (Astro)

Les 4 collections `products`, `brands`, `categories`, `recalls` sont déclarées dans `site/src/content.config.ts` avec des schémas Zod stricts. Toute dérive du frontmatter généré fera échouer `astro build`.

## Hygiène

- `pending/*.jsonl` doit rester hors de Git (ajouter `pending/` au `.gitignore` si ce n'est pas déjà fait).
- `site/src/content/{products,brands,categories,recalls}/**` est versionné (c'est le contenu du site).
- `site/src/data/recalls_index.json` est versionné (lu au build par les templates).
- Les scripts de build sont idempotents : relancer écrase proprement et nettoie les stale.

## Ce qui NE doit PAS être fait

- Ne **jamais** modifier `scripts/scoring_engine.py` dans ce pipeline. C'est la source de vérité de la note BébéDécrypte, versionnée séparément.
- Ne pas utiliser de tiret cadratin (`—` / `–`) dans les contenus générés.
- Ne pas publier de contenu sans `lastReviewed` + `reviewedBy` (signal E-E-A-T requis par STACK-2026).
- Ne pas hardcoder une URL Supabase ou un brand token d'un autre projet (le scanner bloquera).
- Ne pas commit `pending/*.jsonl` (volumineux et regénéré).
