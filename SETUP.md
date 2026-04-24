# BébéDécrypte , SETUP manuel Phase 1

> Checklist de bascule local → production. À exécuter dans l'ordre.

## 1. DNS Cloudflare (5 min)

Zone `bebedecrypte.com` sous ton compte CF.

| Type | Name | Target | Proxy |
|---|---|---|---|
| `CNAME` | `@` | `bebedecrypte.pages.dev` | Proxied |
| `CNAME` | `www` | `bebedecrypte.com` | Proxied |
| `MX` | `@` | `route1.mx.cloudflare.net` (priority 10) | , |
| `MX` | `@` | `route2.mx.cloudflare.net` (priority 20) | , |
| `MX` | `@` | `route3.mx.cloudflare.net` (priority 30) | , |
| `TXT` | `@` | `v=spf1 include:_spf.mx.cloudflare.net include:send.bebedecrypte.com ~all` | , |
| `CNAME` | `send` | `<resend fournira un CNAME après création du domaine>` | DNS only |

**IMPORTANT** : aucun A record `185.158.133.1`, aucun record pointant vers un autre projet Lovable (règle mémoire).

## 2. Cloudflare Pages (direct upload, pas git-connected)

1. Dashboard CF → Pages → Create a project → **Direct upload**
2. Project name : `bebedecrypte`
3. Production branch : `main`
4. Custom domain : `bebedecrypte.com` + `www.bebedecrypte.com`
5. Ne PAS connecter à GitHub (le deploy passe par la GHA workflow `deploy-site.yml`)

## 3. Secrets GitHub (critique pour CI/CD)

Repo Settings → Secrets and variables → Actions → New repository secret.

| Secret | Source |
|---|---|
| `CLOUDFLARE_API_TOKEN` | CF dashboard → My Profile → API Tokens → Create (scope : Pages:Edit) |
| `CLOUDFLARE_ACCOUNT_ID` | CF dashboard → Workers & Pages sidebar |
| `ANTHROPIC_API_KEY` | déjà dans `~/stack-2026/.env.master` |
| `MISTRAL_API_KEY` | déjà dans `~/stack-2026/.env.master` |
| `GOOGLE_API_KEY` | déjà dans `~/stack-2026/.env.master` (Gemini SERP brief) |
| `BING_URL_SUBMISSION_KEY` | déjà dans `~/stack-2026/.env.master` (584654e...) |
| `PUBLIC_SUPABASE_URL` | après création Supabase (étape 4) |
| `PUBLIC_SUPABASE_ANON_KEY` | après création Supabase (étape 4) |

Optional (si pertinent) : `UNSPLASH_ACCESS_KEY`, `INDEXNOW_KEY`.

## 4. Supabase (projet dédié)

```bash
export SUPABASE_PAT=<ton PAT>  # même PAT que nutridecrypte / pulsari / karmastro

# Créer le projet sous l'org STACK-2026 (org id : zksslwveegywirxkznjt)
curl -X POST https://api.supabase.com/v1/projects \
  -H "Authorization: Bearer $SUPABASE_PAT" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "bebedecrypte",
    "organization_id": "zksslwveegywirxkznjt",
    "region": "eu-west-2",
    "db_pass": "<génère un password fort>"
  }'
```

Ensuite :

```bash
cd ~/stack-2026/bebedecrypte/supabase
supabase link --project-ref <ref du nouveau projet>
supabase db push
# Récupère anon key et URL pour les GH secrets
```

## 5. Resend (email transactionnel)

Ajoute le domaine `send.bebedecrypte.com` à ton compte Resend Pro (partagé) :

1. Resend dashboard → Domains → Add domain → `send.bebedecrypte.com`
2. Copie les records SPF / DKIM / DMARC dans la zone CF (DNS only, sans proxy)
3. Variable d'env `RESEND_API_KEY` déjà dans `~/stack-2026/.env.master`

## 6. GitHub runner group (critique pour blog-auto)

Runners VPS sont attachés à l'org STACK-2026. Pour que le repo public `bebedecrypte` puisse les consommer :

Org Settings → Actions → Runner groups → `Default` (ou le groupe STACK-2026) :
- `allows_public_repositories: true` (SINON les jobs blog-auto restent queued)
- `Require approval for outside collaborators` : on

Si le groupe n'a pas déjà les runners VPS, suivre `~/stack-2026/` doc VPS.

## 7. IndexNow + Bing

Le fichier `<clé>.txt` placé automatiquement dans `site/public/` doit matcher la `BING_URL_SUBMISSION_KEY`. Vérifier après premier build :

```bash
curl -I https://bebedecrypte.com/<la-cle>.txt
# doit retourner 200
```

Pour enregistrer le site dans Bing Webmaster :
1. bing.com/webmasters → Add site → `https://bebedecrypte.com`
2. Méthode : DNS TXT record `_bing` avec la valeur fournie (5 min de propagation)

## 8. Premier ingest data OFF + RappelConso + premier blog article

Quand Supabase + GH secrets sont en place :

```bash
cd ~/stack-2026/bebedecrypte
# A. Ingest catalogue OFF (~10 min, 31 catégories baby-food)
python3 scripts/fetch_off_baby.py
python3 scripts/score_products.py
python3 scripts/build_astro_pages.py

# B. Ingest rappels DGCCRF (~3 min, 60 rappels bébé depuis 2020)
python3 scripts/fetch_rappelconso.py --since 2020-01-01
python3 scripts/build_recall_pages.py

# C. Vérification sécurité avant push
python3 scripts/check_cross_project_leaks.py

# D. Commit + push (déclenche le deploy CF Pages)
git add site/src/content site/src/data
git commit -m "feat: catalog ingest + RappelConso refresh"
git push

# E. Premier article blog (manuel pour valider le pipeline)
cd blog-auto
python3 publish.py --dry-run   # teste sans publier
python3 publish.py             # publie le premier article planifié
```

## 9. Vérification post-lancement (après deploy CF Pages, ~2 min)

URLs canoniques :

- [ ] `https://bebedecrypte.com/` répond 200 et `<html lang="fr-FR">`
- [ ] `https://bebedecrypte.com/products/` , hub catalogue avec filtres (search + 124 checkboxes)
- [ ] `https://bebedecrypte.com/scan/` , scanner code-barres (`BarcodeDetector` API)
- [ ] `https://bebedecrypte.com/rappels/` , timeline DGCCRF (60 rappels filtrables)
- [ ] `https://bebedecrypte.com/rappels/rss.xml` , flux RSS valide
- [ ] `https://bebedecrypte.com/methodology/` , TechArticle 8 axes
- [ ] `https://bebedecrypte.com/sitemap-index.xml` + `sitemap-0.xml` , 1 100+ URLs
- [ ] `https://bebedecrypte.com/manifest.webmanifest` , PWA install metadata
- [ ] `https://bebedecrypte.com/llms.txt` + `/llms-full.txt` , surface AI
- [ ] `https://bebedecrypte.com/en/` , version EN
- [ ] `https://bebedecrypte.com/fr/methodology` , 301 vers `/methodology/`
- [ ] `https://bebedecrypte.com/rankings` , 301 vers `/products/`

Schemas (Google Rich Results test sur quelques URLs) :

- [ ] Homepage , Organization (logo en `ImageObject`) + WebSite (`SearchAction`) + FAQPage
- [ ] Fiche produit , Product (avec `aggregateRating`) + Review + reviewedBy Person + FAQPage + BreadcrumbList
- [ ] Fiche rappel , `SpecialAnnouncement` + GovernmentService DGCCRF + BreadcrumbList
- [ ] Fiche marque , Brand (`AggregateRating`) + ItemList + FAQPage
- [ ] Fiche author , Person (jobTitle + knowsAbout + alumniOf)

UI / UX :

- [ ] Cookie banner apparaît au premier chargement
- [ ] Favicon biberon visible dans l'onglet
- [ ] Easter egg : taper `bebe` au clavier → pluie de biberons
- [ ] Hub `/products/` , taper "babybio" dans la search → filtre instant
- [ ] Fiche produit Bledina , bandeau orange "Ce produit a fait l'objet d'un rappel"

Backend :

- [ ] GHA workflow `deploy-site` a passé au vert
- [ ] GHA workflow `cross-project-leaks` au vert sur le dernier push
- [ ] Runner VPS a pris un job blog-auto (pas queued)
- [ ] IndexNow key file `https://bebedecrypte.com/<la-cle>.txt` , HTTP 200

## Liens utiles

- Repo : https://github.com/STACK-2026/bebedecrypte
- CF Pages : https://dash.cloudflare.com/?to=/:account/pages
- Supabase : https://supabase.com/dashboard/org/zksslwveegywirxkznjt
- Resend : https://resend.com/domains
- Bing Webmaster : https://www.bing.com/webmasters
