# BebeDecrypte , Blog Auto

Pipeline editoriale automatique STACK-2026 pour le blog BebeDecrypte (alimentation infantile 0 a 36 mois).

## Architecture

```
Gemini 2.5 Pro (SERP brief, Google.fr grounding)
         |
         v
   articles.json  <--- planning 20 sujets piliers FR
         |
         v
Mistral large (draft 3500+ mots)
         |
         v
Claude Sonnet 4.6 (audit qualite + grounding + E-E-A-T)
         |
         v
Mistral large (fix issues : mots manquants, TL;DR, FAQ, Sources, tirets cadratins)
         |
         v
Frontmatter Astro + markdown article
         |
         v
GitHub Contents API (atomique, push sur main)
         |
         v
deploy-site.yml (workflow_run) -> Cloudflare Pages
         |
         v
IndexNow + Bing URL Submission + sitemap ping
```

## Fichiers

- `articles.json` , planning 20 articles piliers FR, 1 publication par jour ouvre a partir du 2026-04-25. Heures random 7h a 9h Europe/Paris.
- `publish.py` , script principal. Charge le prochain article du, genere le Markdown, push atomique via GitHub Contents API, indexe Bing + IndexNow.
- `prompts/article-seo.md` , system prompt BebeDecrypte (brand voice, regles SEO/GEO, format de sortie 4 blocs).
- `requirements.txt` , dependances Python (requests + dotenv + pyyaml).
- `logs/publications.log` , log rotatif local (gitignore).

Le script utilise la **library partagee** `~/stack-2026/scripts/mistral_claude_blog_lib.py` pour la pipeline Mistral draft + Claude audit + Mistral fix (reference STACK-2026).

Le **brief SERP Gemini** est dans `~/stack-2026/bebedecrypte/scripts/serp_brief.py` (run separe recommande, avant le cron publish).

## Usage

### Local

```bash
cd ~/stack-2026/bebedecrypte
pip install -r blog-auto/requirements.txt

# 1. (optionnel mais recommande) enrichir articles.json avec brief SERP Gemini
python3 scripts/serp_brief.py --max 5

# 2. dry-run (genere le markdown, pas de push)
python3 blog-auto/publish.py --dry-run

# 3. force le prochain (ignore scheduled_datetime)
python3 blog-auto/publish.py --force
```

### Prod (GitHub Actions, runner VPS self-hosted)

Le workflow `.github/workflows/blog-auto.yml` cron a 06:23 UTC (~08:23 Paris) chaque jour ouvre. `publish.py` detecte l'article due (scheduled_datetime <= now Paris), le genere, le push et l'indexe.

## Variables d'environnement requises

Les secrets sont stockes dans `~/stack-2026/.env.master` (local) et dans GitHub Secrets (prod).

| Var | Obligatoire | Usage |
|---|---|---|
| `ANTHROPIC_API_KEY` | oui | Claude Sonnet 4.6, audit qualite |
| `MISTRAL_API_KEY` | oui | Mistral large, draft + fix |
| `GOOGLE_API_KEY` (ou `GEMINI_API_KEY`) | recommande | Gemini 2.5 Pro, brief SERP |
| `GITHUB_TOKEN` | oui (auto en GHA) | Push articles via Contents API |
| `GITHUB_REPOSITORY` | auto en GHA | ex `STACK-2026/bebedecrypte` |
| `BING_URL_SUBMISSION_KEY` | oui | Shared STACK-2026 key (`.env.master`), 10 000 URLs/jour |
| `INDEXNOW_KEY` | optionnel | cle hebergee a `/{key}.txt` sur le site |
| `UNSPLASH_ACCESS_KEY` | optionnel | image d'illustration |
| `SITE_URL` | optionnel (default `https://bebedecrypte.com`) | domaine prod |

## Regles editoriales (STACK-2026)

- 3500+ mots (minimum 2500 en cas d'audit qui laisse passer)
- TL;DR data-speakable au debut (mot cle en gras)
- FAQ 5 questions minimum
- Sources 5+ autorites reelles (ANSES, ESPGHAN, OMS, EFSA, INSERM, Sante publique France, RappelConso...)
- 10+ liens internes, 5+ liens externes
- Tutoiement systematique
- Accents francais UTF-8 direct
- Zero tiret cadratin (em-dash U+2014 et en-dash U+2013 sont interdits, post-process les supprime)
- E-E-A-T : author pen name + `lastReviewed` (date du jour) + `reviewedBy` (Dr. Claire Vasseur sur sujets sante)
- Heures de publication random 7h-9h Paris (random minutes dans les scheduled_datetime des articles.json)
- Anti-doublon par slug (si le fichier existe deja dans `site/src/content/blog/`, l'article est marque published sans re-generer)

## Authors (pen names)

Definis dans `site/src/data/authors.ts`. Le `publish.py` mappe le nom vers le slug :

| Pen name | Role | Reviewer sante ? |
|---|---|---|
| Dr. Claire Vasseur | pediatre nutritionniste | oui, signature sante / lait infantile |
| Marion Leclerc | dieteticienne pediatrique | scoring, comparatifs |
| Helene Rouault | journaliste investigation | rappels, industrie |
| Antoine Mercier | data analyst | methodologie, data pipelines |

## Pipeline de verification post-publication

1. `deploy-site.yml` (workflow_run) rebuild le site Astro , Cloudflare Pages preview puis prod
2. IndexNow push de l'URL (Bing, DuckDuckGo, Yandex, Ecosia)
3. Bing URL Submission API (shared STACK-2026 key, quota 10 000/jour)
4. Ping sitemap Google + Bing

## Troubleshooting

- **`MISTRAL_API_KEY manquant`** , populer `.env.master` ou GH Secrets
- **`API PUT conflict 409/422`** , race condition avec un autre commit user en parallele. Le script retry jusqu'a 5x avec SHA refresh.
- **Article < 2500 mots** , l'audit Claude a flag MAJOR et le fix Mistral a tente de developper. Verifier le log, si systematique ajuster le prompt `article-seo.md`.
- **Em-dash dans la prod** , bug du post-process `_strip_em_dashes`. `grep -rP '[—–]' site/src/content/blog/` avant merge.
- **Pas d'article due** , l'article suivant est dans le futur. `--force` pour l'override.
