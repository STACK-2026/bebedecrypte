# bebedecrypte.com , STACK-2026

## Contexte

Décodeur indépendant d'alimentation bébé, A à E sur 8 axes. Live depuis le
22/04/2026. Refacto SEO/GEO majeur + intégration RappelConso le 25/04/2026.

## État au 25/04/2026 (clôture session)

- **1196 pages built** (sitemap : 1193 URLs, 0 fichier manquant)
- **970 produits OFF** scorés (138 A, 323 B, 204 C, 289 D, 16 E)
- **117 marques** couvertes
- **60 rappels DGCCRF** intégrés (RappelConso, mise à jour manuelle pour l'instant)
- **16 produits matchés** avec un rappel actif/clos , bandeau rouge auto
- **i18n FR-default** : `/` = FR, `/en/` = EN, anciennes URLs `/fr/*` 301 vers racine
- **Audit complet 25/04** : 41/41 URLs critiques HTTP 200, 0 ghost sitemap, 0 cross-project leak, lang `fr-FR` cohérent partout, schemas validés (Org+ImageObject logo, WebSite+SearchAction, Product+aggregateRating, FAQPage, SpecialAnnouncement DGCCRF, Person+alumniOf)

## Quick refs , lire AVANT toute modif

- **Domaine live** : https://bebedecrypte.com
- **Supabase project ref (SEULE ref autorisée en runtime)** : `feqdpvahksbamwutazkl`
- **CF zone** : `b204f9fc7ea4030ad3dbb6c75cec7d93`
- **CF Pages project** : `bebedecrypte`
- **Repo GitHub** : https://github.com/STACK-2026/bebedecrypte (public)
- **Blog-auto repo** : `~/stack-2026/bebedecrypte/blog-auto/` , cron self-hosted VPS lun-ven 8h30 CEST
- **Data sources** : Open Food Facts (ODbL) + RappelConso DGCCRF + EFSA + ANSES
- **Scoring** : 8 axes bébé pondérés, seuils A>=85 / B>=70 / C>=55 / D>=40 / E<40
- **IndexNow key** : `584654e394e846b6938ffa66c46092e8` (file dans `site/public/`)

## Règle critique n°1 , zéro ref cross-project

Ce repo a eu un **data leak** de ~24h le 22/04 au 23/04 : `public/tracker.js`,
`Analytics.astro`, `functions/go/[product].js` et `og/[slug].svg.ts` étaient
des copie-colle depuis PetFoodRate et envoyaient les page_views BébéDécrypte
au Supabase PetFoodRate (`bhmmidfnovtkcxljjfpd`).

Corrigé dans le commit `43059ec` + garde-fou permanent :

```bash
python3 scripts/check_cross_project_leaks.py
```

Ce script tourne en CI via `.github/workflows/cross-project-leaks.yml` sur
chaque push + PR. Le merge est bloqué si un Supabase ref, un domaine ou un
brand token d'un autre projet STACK-2026 est détecté dans le runtime
(`src/`, `public/`, `functions/`).

**Conséquence pratique pour Claude** :
- Jamais de hardcode d'URL ou de clé Supabase. Utiliser
  `import.meta.env.PUBLIC_SUPABASE_URL` + `import.meta.env.PUBLIC_SUPABASE_ANON_KEY`
  et fail-closed si l'hôte ne matche pas `feqdpvahksbamwutazkl.supabase.co`
  (voir `src/components/Analytics.astro`).
- Avant de copier un fichier depuis un autre repo STACK-2026, grep pour les
  tokens : `PetFoodRate`, `Zooplus`, `Score-Immo`, `DecrypteBot`, `Karmastro`,
  `petfoodrate.com`, etc. Et relancer le scanner après.
- Les noms de marque dans les copy sont tout aussi critiques que les
  identifiants techniques : les pages légales reprises de PetFoodRate ont
  shippé `contact@petfoodrate.com` pendant 24h.

## Règle critique n°2 , i18n FR-default (refacto 25/04)

`astro.config.mjs` : `defaultLocale: "fr"`, `locales: ["fr", "en"]`.

- URLs FR canoniques : à la **racine** (ex `/products/yooji-.../`)
- URLs EN : sous **`/en/`** (ex `/en/about/`)
- Anciennes `/fr/*` : **toutes 301** vers la racine via `public/_redirects` (18 entries)
- `BaseLayout` : prop `localized={false}` pour suppress hreflang `en` sur fiches FR-only (products / brands / categories) qui n'ont pas d'équivalent EN. Évite les ghost 404 dans le sitemap.
- `getLocale()` dans `src/i18n/t.ts` : retourne `"en"` si pathname commence par `/en/`, sinon `"fr"`.
- Le locale switcher dans `Header.astro` détecte les pages FR-only et pointe vers `/en/` root au lieu de la traduction inexistante.

## Architecture tech

```
Astro 6 static SSG
  + @astrojs/sitemap (filter excludes /rankings/, /en/(404|500|products|brands|categories|scan))
  + @tailwindcss/vite 4.1.4 (version pinée exacte)
  + @fontsource-variable/plus-jakarta-sans + @fontsource-variable/inter (self-hosted)
  + satori + @resvg/resvg-js (OG PNGs server-side at build)

Cloudflare Pages (direct upload via wrangler-action@v3 en CI)
  + public/_headers (HSTS, CSP report-only, cache strategy, og-default.png)
  + public/_redirects (legacy /fr/* → racine, /rankings → /products/, sitemap.xml)
  + public/manifest.webmanifest (PWA standalone, shortcuts /scan/ + /products/)
  + functions/_middleware.js (FR auto-redirect sur Accept-Language)

Supabase feqdpvahksbamwutazkl (eu-west-2)
  + tables : additives, brands, categories, page_views, products, scores_history, subscribers
  + schema via supabase/migrations/

GitHub Actions :
  - deploy-site.yml (push main -> wrangler pages deploy)
  - blog-auto.yml (self-hosted VPS, cron 30 6 * * 1-5)
  - rebuild-guard.yml (daily marker pour publier articles programmés)
  - ci.yml (blog-auto smoke test)
  - cross-project-leaks.yml (guardrail sécurité inter-projets, obligatoire)
```

## Endpoints live

| Path | Handler | Rôle |
|---|---|---|
| `/` | `src/pages/index.astro` | Homepage 10 sections (FR par défaut) |
| `/en/` | `src/pages/en/index.astro` | Homepage version EN |
| `/blog/` | `src/pages/blog/index.astro` | Listing articles FR |
| `/blog/[slug]/` | `[...slug].astro` | Article (BlogLayout : Article + Breadcrumb + HowTo + FAQPage + MedicalWebPage conditionnels, dateModified clamp >= datePublished) |
| `/brands/` | `src/pages/brands/index.astro` | Hub A-Z, 117 marques |
| `/brands/[slug]/` | `[slug].astro` | Fiche marque + AggregateRating + Brand JSON-LD + FAQPage 3Q + title CTR-optimisé "X : N produits notés (moyenne G)" |
| `/categories/` | `src/pages/categories/index.astro` | Hub 4 catégories catalogue |
| `/categories/[slug]/` | `[slug].astro` | Fiche catégorie + ItemList + FAQPage 3Q + title CTR-optimisé "X bébé : N produits notés A à E (M marques)" |
| `/products/` | `src/pages/products/index.astro` | **Hub catalogue 970 cartes filtrables** : search instant, 124 checkboxes (grade/cat/âge/marque), brand search interne, deeplink hash `#grade=A,B&category=petits-pots`, content-visibility:auto |
| `/products/[slug]/` | `[...slug].astro` | Fiche produit + Product (avec aggregateRating + reviewedBy Person) + Review + BreadcrumbList + gtin13 + PeopleAudience + FAQPage 4Q dynamiques (âge/bio/additifs/alternatives) + section "Selon nos sources" citables EFSA/ANSES/OMS pour 11 codes additifs (E150d, E306, E322, E330, E331, E336, E343, E471, E500, E503, E585) + maltodextrine/sirop glucose/miel/jus concentré. **Bandeau rouge auto si EAN matche un rappel DGCCRF** + SpecialAnnouncement injecté |
| `/scan/` | `scan.astro` | **Scanner code-barres web** (BarcodeDetector API natif Android Chrome/Edge/Samsung + fallback @zxing/browser CDN sur iOS Safari), index 970 EAN-13 embedded JSON, résolution locale zéro upload, saisie manuelle fallback, HowTo + FAQPage |
| `/rappels/` | `rappels/index.astro` | **Timeline 60 rappels DGCCRF** : search instant, 4 filtres (en cours, critical, high, avec fiche BébéDécrypte), sticky filter bar, content-visibility cards |
| `/rappels/[id]/` | `rappels/[id].astro` | Fiche rappel détail : affichette officielle, motif, risques, conduite, EAN-13 listés, lien fiche officielle DGCCRF + PDF affichette, **schema SpecialAnnouncement + GovernmentService DGCCRF** |
| `/rappels/rss.xml` | `rappels/rss.xml.ts` | Flux RSS 100 derniers rappels bébé |
| `/authors/` `/authors/[slug]/` | listing + fiches | 4 pen names. JSON-LD Person enrichi (jobTitle + knowsAbout + worksFor + affiliation + alumniOf : Paris Descartes / Pasteur Lille / ESJ Lille / AgroParisTech) |
| `/methodology/` | `methodology.astro` | TechArticle 8 axes (datePublished + dateModified + author Marion Leclerc + reviewedBy Dr. Claire Vasseur + image og-default) |
| `/glossaire/` | `glossaire.astro` | 30 termes nutrition bébé (DefinedTermSet) |
| `/encyclopedia/` | `encyclopedia.astro` | 12 E-numbers EFSA/ANSES (DefinedTermSet) |
| `/by-age/` | `by-age.astro` | 7 brackets 4m → 36m+ avec top A et B par âge |
| `/compare/` | `compare.astro` | 6 duels éditoriaux + top 12 marques |
| `/about/` `/affiliate-disclosure/` `/cookie-policy/` `/privacy-policy/` `/terms/` | pages légales | FR par défaut, version EN sous `/en/` |
| `/rankings` `/fr/*` | redirects | 301 vers `/products/` ou racine via `_redirects` |
| `/og/[slug].png` | `og/[slug].png.ts` | OG PNG article, satori+resvg |
| `/og-default.png` | `og-default.png.ts` | OG PNG site-wide fallback |
| `/ai-sitemap.xml` | `ai-sitemap.xml.ts` | Flat sitemap pour AI crawlers |
| `/llms-full.txt` | `llms-full.txt.ts` | Dump markdown du corpus complet (87KB) |
| `/llms.txt` | `public/llms.txt` | Synthèse + section "Key facts" citable |
| `/manifest.webmanifest` | `public/manifest.webmanifest` | PWA install (theme cyan, shortcuts scan + catalogue) |
| `/sitemap-index.xml` `/sitemap-0.xml` | `@astrojs/sitemap` | Sitemap Google (1193 URLs) |
| `/rss.xml` | `rss.xml.ts` | RSS blog FR |
| `/en/rss.xml` | `en/rss.xml.ts` | RSS blog EN |
| `/robots.txt` | `public/` | 22 user-agents whitelistés (Google + AI bots) |
| `/_headers` | `public/_headers` | CF Pages , HSTS preload 2y + CSP report-only + cache |

## Schemas JSON-LD en place

| Type | Page(s) | Notes |
|---|---|---|
| `Organization` | toutes | logo en `ImageObject` (width/height/contentUrl), inLanguage bilingue, areaServed FR/BE/CH/LU |
| `WebSite` | toutes | `potentialAction: SearchAction` vers `/products/#q={search_term_string}` (Sitelinks Searchbox) |
| `BreadcrumbList` | toutes les fiches | path canonique (jamais `/rankings/`, c'est `/products/`) |
| `Product` | `/products/[slug]/` | + `aggregateRating` (unlock star snippet) + `reviewedBy: Person` + `gtin13` + `PeopleAudience` (suggestedMinAge) + `Brand` lié |
| `Review` | inclus dans Product | author Person enrichi (jobTitle + knowsAbout) |
| `FAQPage` | homepage, fiches produits, fiches marques, fiches catégories, scan, blog conditionnel | 3 à 5 Q dynamiques par page |
| `Brand` | `/brands/[slug]/` | + `AggregateRating` calculé sur le score moyen de la marque |
| `ItemList` | hubs + fiches catégories + fiches marques + sitemap rappels | top 100 items max |
| `TechArticle` | `/methodology/` | datePublished + dateModified + author + reviewedBy + image + speakable |
| `Person` | `/authors/[slug]/` | jobTitle + knowsAbout + worksFor + affiliation + alumniOf |
| `SpecialAnnouncement` | `/rappels/[id]/` + fiches produits matchées | + `GovernmentService` DGCCRF + `spatialCoverage: Country FR` |
| `HowTo` | `/scan/` + articles blog conditionnels | steps |
| `MedicalWebPage` | articles blog `medical: true` | + audience PeopleAudience |
| `DefinedTermSet` | `/glossaire/` + `/encyclopedia/` | terms list |
| `SpeakableSpecification` | pages piliers + fiches | cssSelector h1, h2, [data-speakable] |

## Règles de contenu

- **Tiret cadratin interdit** : jamais `—` ni `–`. Remplacer par virgule,
  deux-points, point, middle dot `·`, ou tiret normal `-`.
  Scan : `grep -rP '[—–]' site/`
- **Tutoiement partout** : "tu/ton/tes" (sauf pages légales formelles si besoin)
- **Accents FR obligatoires** : é è ê à ç î ô û. Jamais de `\u00XX`.
- **Pas d'image Unsplash sur nouveaux articles** : le frontmatter `image:`
  reste vide, le fallback `/og/[slug].png` brand couvre le share social.
- **Blog-auto respecte la pipeline Mistral+Claude audit** : SERP brief Gemini
  optionnel, 3500+ mots, TL;DR + Sources + FAQ 5Q, 10+ liens internes, 5+
  liens externes autorité, 0 tiret cadratin.
- **E-E-A-T** : chaque article santé sensible a `author`, `reviewedBy`,
  `lastReviewed`. Frontmatter `medical: true` pour générer le schema
  MedicalWebPage + MedicalCondition.
- **Internal links** : toujours `/products/`, jamais `/rankings/` (qui 301).
  Les liens vers `/fr/*` legacy sont 301 mais autant les éviter dans le code.

## Scripts clés

| Script | Rôle | Output |
|---|---|---|
| `scripts/check_cross_project_leaks.py` | Guardrail sécurité **avant chaque push** | exit 1 si leak |
| `scripts/fetch_off_baby.py` | Pull OFF 31 catégories baby FR (sleep 1.2s, UA identifié) | `pending/off_raw.jsonl` |
| `scripts/score_products.py` | Scoring 8 axes via `scoring_engine.py`, classification catalog catégorie + targetAgeMonths | `pending/scored_products.jsonl` |
| `scripts/build_astro_pages.py` | Génère `site/src/content/{products,brands,categories}/*.md`. **Wipe stale auto** : un slug retiré du jsonl disparaît du content/ | 970 + 117 + 4 fichiers |
| `scripts/scoring_engine.py` | Pondération <12m doublée sur additifs (source de vérité, ne pas modifier) | , |
| `scripts/fetch_rappelconso.py` | **Pull DGCCRF API Opendatasoft** : `categorie_produit=alimentation`, filtre baby (sous_categorie + 27 keywords), EAN-13 extraits + validés | `pending/recalls.jsonl` |
| `scripts/build_recall_pages.py` | Génère `site/src/content/recalls/<numero_fiche>.md` + `site/src/data/recalls_index.json` (EAN → metadata pour banner). **Wipe stale auto**. Severity classifiée auto sur kw EFSA/ANSES | 60 + 1 fichiers |
| `scripts/serp_brief.py` | Brief concurrentiel Gemini 2.5 Pro pour blog-auto | enrichit articles.json |
| `scripts/discover_off.py` | Exploration catégories OFF (one-shot research) | , |
| `scripts/bing_submit.py` | Soumission URLs à Bing (utilise IndexNow shared key) | , |

## Pipelines reproductibles

```bash
# 1) Catalogue OFF (manuel, ~10 min, 31 catégories)
python3 scripts/fetch_off_baby.py
python3 scripts/score_products.py
python3 scripts/build_astro_pages.py

# 2) Rappels DGCCRF (manuel, ~3 min, à automatiser via cron quotidien)
python3 scripts/fetch_rappelconso.py --since 2020-01-01
python3 scripts/build_recall_pages.py

# 3) Vérification sécurité (CI auto via cross-project-leaks.yml)
python3 scripts/check_cross_project_leaks.py
```

## Déploiement

- CF Pages auto sur push `main` via `deploy-site.yml` (paths `site/**`).
- Build time : ~9s pour 1196 pages (970 produits + 117 marques + 60 rappels +
  pages piliers, sans OG dédiée par produit pour éviter un build de 20min).
- Cache CF TTL : `max-age=0, s-maxage=3600, swr=86400` pour HTML,
  `immutable 1y` pour `/_astro/*` et `/og/`.
- CF Pages env vars à poser pour activer les analytics :
  `PUBLIC_SUPABASE_URL` + `PUBLIC_SUPABASE_ANON_KEY` (sans ça, Analytics.astro
  fail-closed = 0 tracking, c'est volontaire).

## Reste à faire (clôture session 25/04)

Classé par impact / effort :

1. **Cron quotidien refresh recalls** , `.github/workflows/refresh-recalls.yml` qui re-pull RappelConso + commit si diff. ~30 min. Différenciateur produit fort (concurrence n'a pas de live).
2. **Multi-pays OFF** , étendre `--country france belgium switzerland luxembourg` pour viser 2300+ produits. ~5 min config + 15 min run.
3. **Affiliate links** Amazon / Greenweez / Bébé au Naturel sur fiches produits. Prérequis monétisation.
4. **Wikidata item** "BébéDécrypte" (Q-number, founder, areaServed FR). 2h. Signal AI/Knowledge Graph fort.
5. **PNG icons 192/512** pour PWA Android (le SVG suffit pour iOS et l'install web).
6. **Resend domain `send.bebedecrypte.com`** pour notifications nouveaux rappels + newsletter.
7. **CSP enforcement** : externaliser scripts inline (cookie banner, easter eggs) pour sortir `'unsafe-inline'`.
8. **Self-host ZXing** (au lieu du CDN jsdelivr) si `/scan/` devient un canal majeur , la CSP enforced l'exigera.
9. **Ajouter au portfolio** `stack-2026/augustinfoucheres/site/src/data/projects.ts`.

## Voir aussi

- `README.md` , vue d'ensemble + scoring
- `SETUP.md` , installation locale + DNS + Supabase + secrets
- `scripts/README.md` , détail des 9 scripts pipeline
- `.github/workflows/cross-project-leaks.yml` , guardrail CI

## Memory pointers (claude-mem)

- `project_bebedecrypte_seo_geo_refacto_25avril.md` , i18n + hub + PWA + 12 fixes audit
- `project_bebedecrypte_catalogue_rappelconso_25avril.md` , +186 produits + 60 rappels live
- `reference_bebedecrypte_quick.md` , quick refs (IDs, chemins, lessons)
