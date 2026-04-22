# BébéDécrypte

> On décrypte ce qu'il y a vraiment dans le pot de votre bébé.

Comparateur indépendant d'alimentation infantile. Note chaque petit pot, lait infantile, céréale, gourde et biscuit bébé de A à E à partir d'Open Food Facts, de la classification NOVA, du Nutri-Score, de la base additifs EFSA et des alertes ANSES + RappelConso. Pondération spécifique bébé (ultra-transformation, additifs, sucres cachés).

## Stack

- Astro 6 (SSG), FR par défaut, EN sous `/en/`
- Cloudflare Pages (deploy via GitHub Actions + wrangler-action@v3)
- Supabase dédié sous org `zksslwveegywirxkznjt` (analytics, newsletter, rappels)
- Resend compte partagé (domaine dédié `send.bebedecrypte.com`)
- GitHub Actions pour CI/CD + blog-auto (runner VPS self-hosted)

## Monorepo layout

- `site/` , site Astro statique (FR default + EN sous `/en/`)
- `scripts/` , pipeline data : Open Food Facts baby-food, scoring, génération pages produits
- `blog-auto/` , pipeline éditoriale Mistral + Claude-audit avec brief SERP Gemini
- `supabase/` , migrations + edge functions

## Live

- Production : https://bebedecrypte.com
- Preview : https://bebedecrypte.pages.dev

## Développement

```bash
cd site
npm install
npm run dev
```

## Deploy

Push sur `main` déclenche le workflow GitHub Actions `deploy-site.yml` (wrangler-action@v3, Cloudflare Pages direct upload).

## Sources de données

- Open Food Facts (licence ODbL, catégorie baby-foods)
- Classification NOVA (Université de São Paulo)
- Nutri-Score (Santé publique France)
- Base additifs EFSA (réévaluation continue)
- RappelConso / DGCCRF (rappels produits)
- Avis ANSES sur l'alimentation du nourrisson
- Recommandations ESPGHAN (diversification, laits infantiles)

## Scoring BébéDécrypte

Algorithme déterministe sur 8 critères pondérés :

| Critère | Poids | Détail |
|---|---|---|
| NOVA (ultra-transformation) | 25% | NOVA 1 = 95 pts, NOVA 4 = 20 pts |
| Additifs | 25% | Pénalisation spécifique bébé (ANSES) |
| Sucres ajoutés + cachés | 20% | Maltodextrine, sirop de glucose, dextrose |
| Nutri-Score | 10% | Moins pondéré car pensé pour adultes |
| Bio (AB, EU Bio) | 10% | Bonus pesticides |
| Transparence allergènes | 5% | Déclaration complète requise |
| Made in France | 3% | Traçabilité, circuits courts |
| Simplicité ingrédients | 2% | Moins = mieux pour bébé |

Score 0-100 → grade A (>= 85), B (70-84), C (55-69), D (40-54), E (< 40).
