# BebeDecrypte , GitHub configuration

This folder holds the CI/CD wiring for `STACK-2026/bebedecrypte`.

## Workflows

| File | Runner | Trigger | Purpose |
| --- | --- | --- | --- |
| `workflows/deploy-site.yml` | `ubuntu-latest` | push to `main` (paths: `site/**`, `src/content/**`), completion of `blog-auto` or `rebuild-guard`, manual | Astro build + Cloudflare Pages deploy via `wrangler-action@v3`. Target project: `bebedecrypte`. |
| `workflows/blog-auto.yml` | `self-hosted` (VPS Hetzner) | cron `30 6 * * 1-5` (= 08:30 Paris CEST, weekdays), manual | Runs `blog-auto/publish.py` (Mistral + Claude audit pipeline). Timeout 30 min, concurrency no-cancel. |
| `workflows/rebuild-guard.yml` | `ubuntu-latest` | cron `0 5 * * *` (= 07:00 Paris CEST daily), manual | Bumps `site/.build-trigger` so scheduled posts become visible on a fresh CF Pages build. |

Bot commits pushed with `GITHUB_TOKEN` do NOT fire `on: push` (GitHub loop protection), so `deploy-site.yml` listens to `workflow_run` on the two other workflows.

## Required repo secrets

Add these at **Settings , Secrets and variables , Actions , Repository secrets**.

### Cloudflare Pages (REQUIRED for deploy)
| Secret | Description |
| --- | --- |
| `CLOUDFLARE_API_TOKEN` | Scoped API token with `Cloudflare Pages , Edit` permission on the account that owns the `bebedecrypte` project. |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare account id (same account that hosts the Pages project). |

### Supabase (REQUIRED for build if the site reads Supabase at build-time or uses the tracker)
| Secret | Description |
| --- | --- |
| `PUBLIC_SUPABASE_URL` | URL of the dedicated BebeDecrypte Supabase project (STACK-2026 org `zksslwveegywirxkznjt`). |
| `PUBLIC_SUPABASE_ANON_KEY` | Anon key for the same project. Safe to expose, but we still inject it via secrets to avoid leaking in PR diffs. |

### Blog-auto LLM pipeline (REQUIRED for `blog-auto.yml`)
| Secret | Description |
| --- | --- |
| `ANTHROPIC_API_KEY` | Claude Sonnet audit step. Pull from `~/stack-2026/.env.master` (`ANTHROPIC_API_KEY`). |
| `MISTRAL_API_KEY` | Mistral large draft + fix. Pull from `.env.master`. |
| `GOOGLE_API_KEY` | Gemini 2.5 Pro SERP brief (Google Search grounding). Project `3729498435` in `.env.master`. |
| `BING_URL_SUBMISSION_KEY` | Shared STACK-2026 key `584654e394e846b6938ffa66c46092e8` for the Bing URL Submission API. |

### Optional
| Secret | Description |
| --- | --- |
| `UNSPLASH_ACCESS_KEY` | Only if `publish.py` fetches hero images from Unsplash (fallback when Gemini image gen is off). |
| `GEMINI_API_KEY` | Alias of `GOOGLE_API_KEY` when `publish.py` uses `google-generativeai` SDK with the `GEMINI_API_KEY` env var. |
| `INDEXNOW_KEY` | Only if `publish.py` pings IndexNow directly (otherwise it uses `BING_URL_SUBMISSION_KEY`). |

`GITHUB_TOKEN` is provided automatically by GitHub Actions , no need to set it. The workflow must declare `permissions: contents: write` (already done) for bot commits.

## Manual GitHub Settings steps (post repo creation)

1. **Create the repo** `STACK-2026/bebedecrypte` (private or public, both work).
2. **Push this codebase** to `main`.
3. **Add repo secrets** listed above under `Settings , Secrets and variables , Actions`.
4. **Branch protection on `main`** , `Settings , Branches , Add rule`:
   - Require a pull request before merging: off (solo dev)
   - Require status checks to pass: enable once deploy is green, pick `deploy-site / build-and-deploy`.
   - Allow force pushes: no. Allow deletions: no.
5. **Actions permissions** , `Settings , Actions , General`:
   - Actions permissions: `Allow all actions and reusable workflows`.
   - Workflow permissions: `Read and write permissions` + `Allow GitHub Actions to create and approve pull requests` (for Dependabot auto-merge if wanted later).
   - Fork PR workflows: `Require approval for all outside collaborators`.
6. **Runner group** , if the org is public and uses self-hosted runners, ensure the Default runner group has `allows_public_repositories: true` (STACK-2026 rule: otherwise `blog-auto.yml` queues forever). Patch via:
   ```
   gh api -X PATCH orgs/STACK-2026/actions/runner-groups/1 -f allows_public_repositories=true
   ```
7. **Cloudflare Pages project** , create `bebedecrypte` as a **Direct Upload** project (wrangler, NOT git-connected). Attach custom domain `bebedecrypte.com` + `www.bebedecrypte.com`.
8. **First manual run** , trigger `deploy-site.yml` via `workflow_dispatch` to seed the production deployment.
9. **Dependabot** , confirm alerts are on at `Settings , Code security and analysis`.

## Notes

- No `--no-verify`, no `--no-gpg-sign`. Pre-commit hooks, if any, must pass.
- Schedules are in UTC. Summer Paris = UTC+2, winter Paris = UTC+1, so the `08:30 Paris` slot will actually fire at 07:30 Paris during DST-off (acceptable, still inside the 7-9 window extended).
- See project memory `feedback_blog_auto_workflow_run_pattern.md` and `feedback_deploy_site_ubuntu_latest.md` for the rationale behind each design choice.
