# bebedecrypte.com , STACK-2026

## Contexte

Décodeur indépendant d'alimentation bébé, A to E sur 8 axes. Live depuis le
22/04/2026. Audit SEO/GEO complet + sécurité cross-project le 23/04/2026.

## Quick refs , lire AVANT toute modif

- **Domaine live** : https://bebedecrypte.com
- **Supabase project ref (SEULE ref autorisée en runtime)** : `feqdpvahksbamwutazkl`
- **CF zone** : `b204f9fc7ea4030ad3dbb6c75cec7d93`
- **CF Pages project** : `bebedecrypte`
- **Repo GitHub** : https://github.com/STACK-2026/bebedecrypte (public)
- **Blog-auto repo** : `~/stack-2026/bebedecrypte/blog-auto/` , cron self-hosted VPS lun-ven 8h30 CEST
- **Data source** : Open Food Facts (ODbL) , 784 produits FR indexés, 108 marques
- **Scoring** : 8 axes bébé pondérés, seuils A>=85 / B>=70 / C>=55 / D>=40 / E<40

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

## Architecture tech

```
Astro 6.1.5 static SSG
  + @astrojs/sitemap (filter excludes ComingSoon stubs)
  + @tailwindcss/vite 4.1.4 (version pinée exacte)
  + @fontsource-variable/plus-jakarta-sans + @fontsource-variable/inter (self-hosted)
  + satori + @resvg/resvg-js (OG PNGs server-side at build)

Cloudflare Pages (direct upload via wrangler-action@v3 en CI)
  + public/_headers (HSTS, CSP report-only, cache strategy)
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
| `/` | `src/pages/index.astro` | Homepage 10 sections |
| `/fr/` | i18n mirror | Version FR |
| `/blog/` | `src/pages/blog/index.astro` | Listing articles |
| `/blog/[slug]/` | `[...slug].astro` | Article (BlogLayout : Article + Breadcrumb + HowTo + FAQPage + MedicalWebPage conditionnels) |
| `/brands/` | `src/pages/brands/index.astro` | Hub A-Z, 108 marques |
| `/brands/[slug]/` | `[slug].astro` | Fiche marque + AggregateRating + Brand JSON-LD |
| `/categories/` | `src/pages/categories/index.astro` | Hub 4 catégories |
| `/categories/[slug]/` | `[slug].astro` | Fiche catégorie |
| `/products/` | `src/pages/products/index.astro` | Hub 784 produits groupés par grade |
| `/products/[slug]/` | `[...slug].astro` | Fiche produit + Product + Review + BreadcrumbList + gtin13 + PeopleAudience |
| `/authors/` `/authors/[slug]/` | listing + fiches | 4 pen names |
| `/methodology/` | `methodology.astro` | TechArticle 8 axes |
| `/glossaire/` | `glossaire.astro` | 30 termes nutrition bébé |
| `/rankings/` `/compare/` `/encyclopedia/` `/by-age/` | ComingSoon stubs, **noIndex + sitemap exclu** |
| `/og/[slug].png` | `og/[slug].png.ts` | OG PNG article, satori+resvg |
| `/og-default.png` | `og-default.png.ts` | OG PNG site-wide fallback |
| `/ai-sitemap.xml` | `ai-sitemap.xml.ts` | Flat sitemap pour AI crawlers |
| `/llms-full.txt` | `llms-full.txt.ts` | Dump markdown du corpus complet |
| `/sitemap-index.xml` | `@astrojs/sitemap` auto | Sitemap Google |
| `/llms.txt` `/robots.txt` | `public/` | Surface AI |
| `/_headers` | `public/_headers` | CF Pages , HSTS + CSP + cache |

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

## Scripts clés

- `scripts/check_cross_project_leaks.py` , guardrail sécurité **avant chaque push**
- `scripts/fetch_off_baby.py` , paginate OFF 13 catégories baby FR
- `scripts/score_products.py` , scoring 8 axes
- `scripts/build_astro_pages.py` , génère markdown `/products/` + `/brands/`
- `scripts/scoring_engine.py` , pondération <12m doublée sur additifs

## Déploiement

- CF Pages auto sur push `main` via `deploy-site.yml` (paths `site/**`).
- Build time : ~6s (934 pages + 2 OG PNGs dynamiques, les 784 produits
  n'ont pas d'OG dédiée pour éviter un build de 20min).
- Cache CF TTL : `max-age=0, s-maxage=3600, swr=86400` pour HTML,
  `immutable 1y` pour `/_astro/*` et `/og/`.
- CF Pages env vars à poser pour activer les analytics :
  `PUBLIC_SUPABASE_URL` + `PUBLIC_SUPABASE_ANON_KEY` (sans ça, Analytics.astro
  fail-closed = 0 tracking, c'est volontaire).

## Prochaines étapes identifiées (post-audit 23/04)

- Densifier OU retirer définitivement les 4 stubs ComingSoon
  (rankings / compare / encyclopedia / by-age)
- Resend domain `send.bebedecrypte.com` pour routage transactionnel -> Gmail
- Ajouter au portfolio `stack-2026/augustinfoucheres/site/src/data/projects.ts`
- Propager `scripts/check_cross_project_leaks.py` + workflow CI aux autres
  repos STACK-2026 qui n'ont pas encore le guardrail

## Voir aussi

- `README.md` , setup initial
- `SETUP.md` , installation locale
- `.github/workflows/cross-project-leaks.yml` , guardrail CI
