# BébéDécrypte

> On décrypte ce qu'il y a vraiment dans le pot de votre bébé.

Comparateur indépendant d'alimentation infantile. Note chaque petit pot, lait infantile, céréale, gourde et biscuit bébé de A à E à partir d'Open Food Facts, de la classification NOVA, du Nutri-Score, de la base additifs EFSA et des alertes ANSES + RappelConso. Pondération spécifique bébé (ultra-transformation, additifs, sucres cachés).

## État actuel (25/04/2026)

- **970 produits** notés A à E sur 8 axes (138 A, 323 B, 204 C, 289 D, 16 E)
- **117 marques** couvertes
- **60 rappels DGCCRF** intégrés depuis 2020 (16 produits du catalogue matchés via EAN-13)
- **1 196 pages** au sitemap, 100 % SSG, déployé sur Cloudflare Pages
- **Scanner code-barres web** (`/scan/`) : `BarcodeDetector` natif + fallback ZXing, zéro upload
- **PWA installable** avec shortcuts vers le scanner et le catalogue

## Stack

- **Astro 6 SSG**, FR par défaut, EN sous `/en/`
- **Cloudflare Pages** (deploy via GitHub Actions + `wrangler-action@v3`)
- **Supabase** dédié sous org `zksslwveegywirxkznjt` (analytics, newsletter)
- **Resend** compte partagé (domaine `send.bebedecrypte.com` à brancher)
- **GitHub Actions** pour CI/CD + blog-auto (runner VPS self-hosted)

## Monorepo layout

- `site/` , site Astro statique (FR default + EN sous `/en/`)
- `scripts/` , pipeline data : Open Food Facts baby-food + RappelConso DGCCRF + scoring + génération pages
- `blog-auto/` , pipeline éditoriale Mistral + Claude-audit avec brief SERP Gemini
- `supabase/` , migrations + edge functions

## Live

- Production : https://bebedecrypte.com
- Catalogue filtrable : https://bebedecrypte.com/products/
- Scanner code-barres : https://bebedecrypte.com/scan/
- Rappels DGCCRF : https://bebedecrypte.com/rappels/
- Méthodologie : https://bebedecrypte.com/methodology/
- Preview : https://bebedecrypte.pages.dev

## Développement

```bash
cd site
npm install
npm run dev
```

## Deploy

Push sur `main` déclenche le workflow GitHub Actions `deploy-site.yml` (`wrangler-action@v3`, Cloudflare Pages direct upload).

## Sources de données

- **Open Food Facts** , licence ODbL, ~970 produits indexés (cible 2 300+)
- **Classification NOVA** , Université de São Paulo
- **Nutri-Score** , Santé publique France
- **Base additifs EFSA** , réévaluation continue
- **RappelConso / DGCCRF** , data.economie.gouv.fr (dataset `rappelconso-v2-gtin-espaces`), 60 rappels bébé indexés
- **Avis ANSES** , alimentation du nourrisson, additifs avant 3 ans
- **Recommandations ESPGHAN** , diversification, laits infantiles
- **OMS** , recommandations sucres ajoutés avant 12 mois

## Scoring BébéDécrypte

Algorithme déterministe sur 8 critères pondérés :

| Critère | Poids | Détail |
|---|---|---|
| NOVA (ultra-transformation) | 25 % | NOVA 1 = 95 pts, NOVA 4 = 20 pts |
| Additifs | 25 % | Pénalisation spécifique bébé (ANSES), doublée < 12 mois |
| Sucres ajoutés + cachés | 20 % | Maltodextrine, sirop de glucose, dextrose, miel < 12 m |
| Nutri-Score | 10 % | Moins pondéré car pensé pour adultes |
| Bio (AB, EU Bio, Demeter) | 10 % | Bonus pesticides |
| Transparence allergènes | 5 % | Déclaration complète requise |
| Made in France | 3 % | Traçabilité, circuits courts |
| Simplicité ingrédients | 2 % | Moins = mieux pour bébé |

Score 0-100 → grade A (>= 85), B (70-84), C (55-69), D (40-54), E (< 40).

## Différenciateurs produit

- **Scanner code-barres web** sans téléchargement d'app : pointe la caméra arrière sur le code-barres en magasin, la note A à E s'affiche en moins d'une seconde, depuis un index local de 970 EAN-13.
- **Bandeau rappel DGCCRF live** sur fiche produit : si l'EAN-13 d'un produit fait l'objet d'un rappel officiel RappelConso, un bandeau rouge (active) ou orange (clos) s'affiche en haut de la fiche, avec lien direct vers la fiche officielle.
- **Sources citables EFSA / ANSES / OMS** par additif détecté : chaque fiche surface une section "Selon nos sources" avec quote autoportante, ancrable par les LLM (AI Overviews, ChatGPT, Perplexity).
- **PWA installable** avec shortcuts directs vers le scanner et le catalogue.

## Voir aussi

- [`CLAUDE.md`](CLAUDE.md) , architecture détaillée + endpoints + règles
- [`SETUP.md`](SETUP.md) , checklist installation locale → production
- [`scripts/README.md`](scripts/README.md) , détail des 9 scripts pipeline
