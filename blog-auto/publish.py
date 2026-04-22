#!/usr/bin/env python3
"""
BebeDecrypte Blog Auto , Pipeline de publication automatique (STACK-2026 standard).

Mistral large (draft) -> Claude Sonnet (audit grounding + qualite) -> Mistral (fix)
Enrichi avec Gemini 2.5 Pro SERP brief (Google Search grounding, via scripts/serp_brief.py).

Charge le prochain article du articles.json, genere le Markdown, push via GitHub Contents API
(atomique, evite les race conditions avec les commits user pendant les 10 a 15 min de pipeline LLM).
Puis submit IndexNow + Bing URL Submission + ping sitemaps.

Usage:
  python publish.py                 # Publication normale (article planifie)
  python publish.py --force         # Force la publication du prochain non-publie
  python publish.py --dry-run       # Genere sans push ni indexation
  DRY_RUN=true python publish.py    # Idem via env (compat workflow)

Env vars requis:
  ANTHROPIC_API_KEY          Claude audit
  MISTRAL_API_KEY            Mistral draft + fix
  GOOGLE_API_KEY             (optionnel) Gemini SERP brief (run separe recommande)
  GITHUB_TOKEN               push via Contents API
  GITHUB_REPOSITORY          ex: STACK-2026/bebedecrypte (auto-set par GH Actions)
  BING_URL_SUBMISSION_KEY    Bing URL Submission API (shared STACK-2026 key)
  INDEXNOW_KEY               (optionnel) IndexNow key (file hosted at /{key}.txt)
  UNSPLASH_ACCESS_KEY        (optionnel) image d'illustration
"""
from __future__ import annotations

import base64
import json
import logging
import os
import re
import sys
import time
import unicodedata
from datetime import datetime
from pathlib import Path

import requests
from dotenv import load_dotenv

# ============================================
# CONFIG
# ============================================

# .env.master centralise (cle Bing, Google, Resend, etc.)
ENV_MASTER = Path.home() / "stack-2026" / ".env.master"
if ENV_MASTER.exists():
    load_dotenv(ENV_MASTER)
load_dotenv()  # local .env override

# Shared Mistral+Claude audit library
sys.path.insert(0, str(Path.home() / "stack-2026" / "scripts"))
try:
    from mistral_claude_blog_lib import generate_with_mistral_audit
except ImportError as e:
    print(f"[fatal] impossible d'importer mistral_claude_blog_lib depuis ~/stack-2026/scripts: {e}")
    sys.exit(2)

# Keys
ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
MISTRAL_API_KEY = os.getenv("MISTRAL_API_KEY", "")
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY", "")
UNSPLASH_ACCESS_KEY = os.getenv("UNSPLASH_ACCESS_KEY", "")
INDEXNOW_KEY = os.getenv("INDEXNOW_KEY", "")
BING_URL_SUBMISSION_KEY = os.getenv("BING_URL_SUBMISSION_KEY", "")

# Repo specifics
REPO_OWNER_DEFAULT = "STACK-2026"
REPO_NAME_DEFAULT = "bebedecrypte"
GITHUB_REPOSITORY = os.getenv("GITHUB_REPOSITORY", f"{REPO_OWNER_DEFAULT}/{REPO_NAME_DEFAULT}")
SITE_URL = os.getenv("SITE_URL", "https://bebedecrypte.com")
SITE_HOST = SITE_URL.replace("https://", "").replace("http://", "").rstrip("/")

# Paths
SCRIPT_DIR = Path(__file__).parent
REPO_DIR = SCRIPT_DIR.parent
ARTICLES_FILE = SCRIPT_DIR / "articles.json"
PROMPT_FILE = SCRIPT_DIR / "prompts" / "article-seo.md"
BLOG_DIR = REPO_DIR / "site" / "src" / "content" / "blog"
LOG_DIR = SCRIPT_DIR / "logs"
LOG_FILE = LOG_DIR / "publications.log"

# Slug config
SLUG_MAX_LEN = 60
SLUG_MAX_WORDS = 7
STOP_WORDS_FR = {
    "de", "du", "des", "le", "la", "les", "un", "une", "et", "ou",
    "a", "au", "aux", "par", "pour", "sur", "avec", "dans", "ne",
    "pas", "se", "ce", "que", "qui", "dont", "son", "sa", "ses",
    "vs", "en", "est", "il", "elle", "nous", "vous", "ils", "elles",
    "etre", "avoir", "faire", "dit", "peut", "plus", "moins", "tout",
    "bien", "mal", "tres", "trop", "quoi", "comment", "pourquoi",
    "quand", "votre", "notre", "leur", "cette", "ces", "mon", "ton",
    "son", "ma", "ta", "sa", "mes", "tes", "ses",
}

# Author slug lookup (aligned with site/src/data/authors.ts)
AUTHOR_SLUGS = {
    "Dr. Claire Vasseur": "claire-vasseur",
    "Marion Leclerc": "marion-leclerc",
    "Hélène Rouault": "helene-rouault",
    "Antoine Mercier": "antoine-mercier",
}
DEFAULT_AUTHOR = "Marion Leclerc"
DEFAULT_REVIEWER = "Dr. Claire Vasseur, pédiatre nutritionniste"

MIN_WORDS = 2500
API_TIMEOUT = 300
MAX_RETRIES = 3

# ============================================
# LOGGING
# ============================================

LOG_DIR.mkdir(parents=True, exist_ok=True)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler(LOG_FILE, encoding="utf-8"),
        logging.StreamHandler(sys.stdout),
    ],
)
log = logging.getLogger("blog-auto")


# ============================================
# TIMEZONE (Europe/Paris)
# ============================================

def now_paris() -> datetime:
    try:
        from zoneinfo import ZoneInfo
        return datetime.now(ZoneInfo("Europe/Paris"))
    except ImportError:
        import pytz
        return datetime.now(pytz.timezone("Europe/Paris"))


# ============================================
# SLUG GENERATION
# ============================================

def generate_slug(title: str, max_len: int = SLUG_MAX_LEN) -> str:
    """Generate URL-safe slug from title. Max 60 chars, 7 words, no stop words."""
    slug = unicodedata.normalize("NFKD", title).encode("ascii", "ignore").decode("ascii")
    slug = slug.lower()
    slug = re.sub(r"[^a-z0-9\s]", " ", slug)
    words = [w for w in slug.split() if w not in STOP_WORDS_FR and len(w) > 1]
    parts, length = [], 0
    for w in words[:SLUG_MAX_WORDS]:
        new_length = length + len(w) + (1 if parts else 0)
        if new_length > max_len:
            break
        parts.append(w)
        length = new_length
    return "-".join(parts) or "article"


def slug_exists_in_blog(slug: str) -> bool:
    return (BLOG_DIR / f"{slug}.md").exists()


# ============================================
# ARTICLES PLANNING
# ============================================

def load_articles() -> list[dict]:
    with open(ARTICLES_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def save_articles(articles: list[dict]) -> None:
    with open(ARTICLES_FILE, "w", encoding="utf-8") as f:
        json.dump(articles, f, indent=2, ensure_ascii=False)
        f.write("\n")


def get_due_article(articles: list[dict], force: bool = False) -> dict | None:
    """Find the next unpublished article due for publication (scheduled_datetime <= now)."""
    now = now_paris()
    for article in articles:
        if article.get("published"):
            continue
        if force:
            return article
        scheduled_str = article.get("scheduled_datetime") or article.get("scheduled_date")
        if not scheduled_str:
            return article
        try:
            scheduled = datetime.fromisoformat(scheduled_str)
        except ValueError:
            return article
        if now.replace(tzinfo=None) >= scheduled.replace(tzinfo=None):
            return article
    return None


# ============================================
# PROMPT BUILDING (with SERP brief enrichment)
# ============================================

def load_system_prompt() -> str:
    with open(PROMPT_FILE, "r", encoding="utf-8") as f:
        return f.read()


def build_user_prompt(article: dict) -> str:
    target_age = article.get("target_age_range") or "0-36 mois"
    base = f"""Ecris un article SEO+GEO complet en francais pour BebeDecrypte sur :

Titre : {article['title']}
Mots-cles : {article.get('keywords', '')}
Categorie : {article.get('category', '')}
Tranche d'age bebe cible : {target_age}
Date de publication : {article.get('scheduled_date', '')}
Author pen name : {article.get('author', DEFAULT_AUTHOR)}
Reviewer medical : {article.get('reviewer', DEFAULT_REVIEWER)}

IMPORTANT : respecte strictement le format de sortie en 4 blocs separes par ---DELIM---.
Le contenu doit etre en Markdown pur (pas de HTML, pas de triple-backticks), PAS de H1 (gere auto), commence par le premier H2 apres le TL;DR qu'on injectera.
Tutoiement systematique (tu/ton/tes). Accents francais UTF-8 direct. Zero tiret cadratin.
"""

    serp_brief = (article.get("serp_brief") or {}).get("brief")
    if not serp_brief:
        return base

    top10 = serp_brief.get("top10", [])
    weak_angles = serp_brief.get("weak_angles", [])
    winning_moves = serp_brief.get("winning_moves", [])
    must_sections = serp_brief.get("must_include_sections", [])
    citable_facts = serp_brief.get("citable_facts_to_verify", [])
    entities = serp_brief.get("entities_to_mention", [])
    target_words = serp_brief.get("target_word_count", 3500)
    intent = serp_brief.get("intent_type", article.get("intent", "informational"))
    snippet_opp = serp_brief.get("featured_snippet_opportunity", "")
    serp_features = serp_brief.get("serp_features_detected", [])

    competitors_block = "\n".join(
        f"  #{c.get('rank','?')} {c.get('domain','?')} : angle = \"{c.get('main_angle','')[:120]}\" | weakness : \"{c.get('weakness','')[:100]}\""
        for c in top10[:10]
    )

    serp_section = f"""

BRIEF SERP (analyse Gemini 2.5 Pro + Google Search grounding, top 10 Google.fr)
=======================================================================

INTENT TYPE : {intent}
TARGET WORD COUNT : {target_words} mots (cible 3500+, JAMAIS sous 2500)
SERP FEATURES DETECTED : {", ".join(serp_features) if serp_features else "aucune"}
FEATURED SNIPPET OPPORTUNITY : {snippet_opp}

TOP 10 CONCURRENTS (analyse) :
{competitors_block}

ANGLES FAIBLES A EXPLOITER (peu ou mal couverts par le top 10) :
{chr(10).join(f"  - {a}" for a in weak_angles)}

WINNING MOVES (fais ceci pour battre le top 3) :
{chr(10).join(f"  - {m}" for m in winning_moves)}

SECTIONS H2 OBLIGATOIRES (inspire toi, reformule pour ta voix BebeDecrypte) :
{chr(10).join(f"  - {s}" for s in must_sections)}

FAITS/CHIFFRES CITABLES (verifie contre ANSES/EFSA/ESPGHAN avant de reutiliser) :
{chr(10).join(f"  - {f}" for f in citable_facts)}

ENTITES A MENTIONNER (marques, organismes, etudes cles de la niche) :
{", ".join(entities)}

REGLE : ton article doit etre SUPERIEUR au top 3 en (1) profondeur sur weak_angles,
(2) execution des winning_moves, (3) clarte/citabilite LLM, (4) E-E-A-T (auteur + reviewer + sources).
Ne copie pas : analyse leurs forces, ecrase leurs faiblesses."""

    return base + serp_section


# ============================================
# GENERATION (via shared Mistral+Claude-audit lib)
# ============================================

def _strip_em_dashes(text: str) -> str:
    """Remove any em-dash (U+2014) or en-dash (U+2013) that slipped through."""
    # em-dash -> ", " (comma space works in most contexts)
    text = text.replace("—", ", ")
    text = text.replace("–", "-")
    return text


def _fix_self_links(draft: str) -> tuple[str, int]:
    """Replace absolute self-links https://bebedecrypte.com/... with relative paths /..."""
    pattern = re.compile(r"https?://(?:www\.)?" + re.escape(SITE_HOST) + r"(/[^\s\)\]\"'>]*)")
    count = len(pattern.findall(draft))
    fixed = pattern.sub(r"\1", draft)
    return fixed, count


def _count_body_words(draft: str) -> int:
    blocks = draft.split("---DELIM---")
    body = blocks[3] if len(blocks) >= 4 else draft
    return len(re.findall(r"\w+", body))


def generate_article(article: dict, system_prompt: str) -> dict:
    """Mistral draft + Claude audit + Mistral fix via shared lib."""
    user_prompt = build_user_prompt(article)
    log.info("Engine: Mistral draft + Claude audit + Mistral fix (STACK-2026)")

    draft = generate_with_mistral_audit(
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        max_tokens=14000,
        temperature=0.4,
        do_audit=True,
    )

    # Post-process
    draft = _strip_em_dashes(draft)
    draft, fixed_links = _fix_self_links(draft)
    if fixed_links:
        log.info(f"  Self-links corriges: {fixed_links}")

    words = _count_body_words(draft)
    log.info(f"  Corps article: {words} mots (cible 3500+, minimum 2500)")
    if words < MIN_WORDS:
        log.warning(f"  Article court ({words} mots < {MIN_WORDS}) , on pousse quand meme, audit deja passe")

    return parse_response(draft, article)


def parse_response(text: str, article: dict) -> dict:
    """Extract meta, tldr, faq, content from 4-block Mistral response."""
    blocks = [b.strip() for b in text.strip().split("---DELIM---")]
    title_tag = article["title"]
    meta_description = ""
    tldr = ""
    faq: list[dict] = []
    content = ""

    if len(blocks) >= 4:
        # Block 1 : meta
        for line in blocks[0].splitlines():
            if line.startswith("TITLE_TAG:"):
                title_tag = line.replace("TITLE_TAG:", "").strip()
            elif line.startswith("META_DESCRIPTION:"):
                meta_description = line.replace("META_DESCRIPTION:", "").strip()
        # Block 2 : tldr
        tldr = blocks[1].replace("TLDR:", "", 1).strip()
        # Block 3 : faq
        current_q = None
        for line in blocks[2].splitlines():
            line = line.strip()
            if re.match(r"^Q\d+\s*:", line):
                current_q = line.split(":", 1)[1].strip()
            elif re.match(r"^A\d+\s*:", line) and current_q:
                faq.append({"q": current_q, "a": line.split(":", 1)[1].strip()})
                current_q = None
        # Block 4 : content
        content = blocks[3].strip()
    else:
        log.warning("Format non conforme (< 4 blocs), fallback")
        lines = text.strip().split("\n")
        content_start = 0
        for i, line in enumerate(lines):
            if line.startswith("TITLE_TAG:"):
                title_tag = line.replace("TITLE_TAG:", "").strip()
            elif line.startswith("META_DESCRIPTION:"):
                meta_description = line.replace("META_DESCRIPTION:", "").strip()
            else:
                content_start = i
                break
        content = "\n".join(lines[content_start:]).strip()

    def smart_truncate(s: str, limit: int) -> str:
        s = (s or "").strip()
        if len(s) <= limit:
            return s
        cut = s[:limit]
        last_space = cut.rfind(" ")
        if last_space > limit * 0.6:
            cut = cut[:last_space]
        return cut.rstrip(" ,.:;-")

    return {
        "title_tag": smart_truncate(title_tag, 60),
        "meta_description": smart_truncate(meta_description, 160),
        "tldr": tldr,
        "faq": faq,
        "content": content,
    }


# ============================================
# IMAGE HANDLING (Unsplash optional)
# ============================================

def fetch_unsplash_image(query: str, article_index: int = 0) -> dict | None:
    if not UNSPLASH_ACCESS_KEY:
        return None
    try:
        response = requests.get(
            "https://api.unsplash.com/search/photos",
            params={
                "query": query,
                "per_page": 5,
                "page": (article_index // 5) + 1,
                "orientation": "landscape",
            },
            headers={"Authorization": f"Client-ID {UNSPLASH_ACCESS_KEY}"},
            timeout=15,
        )
        response.raise_for_status()
        results = response.json().get("results", [])
        if results:
            photo = results[article_index % len(results)]
            return {
                "url": f"{photo['urls']['raw']}&w=1200&h=630&fit=crop&crop=center&q=80",
                "alt": photo.get("alt_description", query) or query,
                "photographer": photo["user"]["name"],
                "photographer_url": photo["user"]["links"]["html"],
            }
    except Exception as e:
        log.warning(f"Unsplash failed: {e}")
    return None


# ============================================
# FRONTMATTER + FILE WRITE
# ============================================

def author_slug(pen_name: str) -> str:
    return AUTHOR_SLUGS.get(pen_name, "marion-leclerc")


def generate_frontmatter(article: dict, generated: dict, image: dict | None) -> str:
    """YAML frontmatter conforme au schema site/src/content.config.ts (blog collection)."""
    tags = [t.strip() for t in (article.get("keywords") or "").split(",") if t.strip()]
    today = now_paris().strftime("%Y-%m-%d")
    author_pen = article.get("author", DEFAULT_AUTHOR)
    reviewer = article.get("reviewer", DEFAULT_REVIEWER)
    lang = article.get("lang", "fr")

    def yaml_escape(s: str) -> str:
        return (s or "").replace("\\", "\\\\").replace('"', '\\"').strip()

    fm = [
        "---",
        f'title: "{yaml_escape(generated["title_tag"])}"',
        f'description: "{yaml_escape(generated["meta_description"])}"',
        f"date: {article.get('scheduled_date', today)}",
        f"lastReviewed: {today}",
        f'author: "{yaml_escape(author_pen)}"',
        f'reviewedBy: "{yaml_escape(reviewer)}"',
        f'category: "{yaml_escape(article.get("category", ""))}"',
        f"tags: {json.dumps(tags, ensure_ascii=False)}",
        f'keywords: "{yaml_escape(article.get("keywords", ""))}"',
        f"lang: {lang}",
        "draft: false",
    ]

    # Image (Unsplash or per-category SVG fallback)
    if image:
        fm.append(f'image: "{yaml_escape(image["url"])}"')
        fm.append(f'imageAlt: "{yaml_escape(image["alt"])}"')
    else:
        category_slug = (article.get("category") or "").strip().lower()
        og_dir = REPO_DIR / "site" / "public" / "og-images"
        if category_slug and (og_dir / f"{category_slug}.svg").exists():
            fm.append(f'image: "/og-images/{category_slug}.svg"')
        else:
            fm.append('image: "/og-default.svg"')
        fm.append(f'imageAlt: "{yaml_escape(article["title"])}"')

    fm.append("---")
    return "\n".join(fm)


def build_markdown_body(generated: dict, article: dict) -> str:
    """Inject TL;DR blockquote + body + FAQ (as markdown H3) at the end.

    The article.md then carries:
      - frontmatter (title, description, etc.)
      - TL;DR block (data-speakable aside convention : blockquote)
      - body H2..., ending with Sources
      - FAQ section (already in body if LLM respected prompt; otherwise we append)
    """
    tldr = generated.get("tldr") or ""
    content = generated.get("content") or ""
    faq = generated.get("faq") or []

    parts = []
    if tldr:
        parts.append(f"> **TL;DR** , {tldr}\n")

    parts.append(content.strip())

    # If content does not already have a FAQ section, append it
    if faq and not re.search(r"^##\s+FAQ", content, re.MULTILINE | re.IGNORECASE):
        faq_md = ["", "## FAQ", ""]
        for item in faq:
            faq_md.append(f"### {item['q']}")
            faq_md.append("")
            faq_md.append(item["a"])
            faq_md.append("")
        parts.append("\n".join(faq_md))

    return "\n\n".join(parts).strip() + "\n"


def write_article_file(slug: str, frontmatter: str, body: str) -> Path:
    BLOG_DIR.mkdir(parents=True, exist_ok=True)
    filepath = BLOG_DIR / f"{slug}.md"
    filepath.write_text(f"{frontmatter}\n\n{body}\n", encoding="utf-8")
    return filepath


# ============================================
# GITHUB CONTENTS API PUSH (atomic, race-safe)
# ============================================

def _gh_api(method: str, url: str, token: str, **kwargs):
    headers = {
        "Authorization": f"Bearer {token}",
        "Accept": "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
    }
    if "headers" in kwargs:
        headers.update(kwargs.pop("headers"))
    return requests.request(method, url, headers=headers, timeout=30, **kwargs)


def _gh_put_file(rel_path: str, content_bytes: bytes, message: str) -> bool:
    """Create or update a single file on main via GitHub Contents API.

    Atomic per-file. Retries up to 5x with SHA refresh on 409/422 (concurrent update).
    """
    token = os.getenv("GITHUB_TOKEN") or os.getenv("GH_TOKEN")
    repo = os.getenv("GITHUB_REPOSITORY") or GITHUB_REPOSITORY
    if not token or not repo:
        log.error("GITHUB_TOKEN/GITHUB_REPOSITORY manquant, push impossible")
        return False

    api_url = f"https://api.github.com/repos/{repo}/contents/{rel_path}"
    content_b64 = base64.b64encode(content_bytes).decode()

    for attempt in range(1, 6):
        sha = None
        r = _gh_api("GET", api_url, token, params={"ref": "main"})
        if r.status_code == 200:
            sha = r.json().get("sha")
        elif r.status_code != 404:
            log.error(f"API GET {rel_path} status={r.status_code} body={r.text[:200]}")
            return False

        payload = {"message": message, "content": content_b64, "branch": "main"}
        if sha:
            payload["sha"] = sha

        r = _gh_api("PUT", api_url, token, json=payload)
        if r.status_code in (200, 201):
            log.info(f"API PUT OK {rel_path} (attempt {attempt})")
            return True
        if r.status_code in (409, 422):
            log.warning(f"API PUT conflict {rel_path} attempt {attempt}, refetching SHA")
            time.sleep(2)
            continue
        log.error(f"API PUT {rel_path} status={r.status_code} body={r.text[:200]}")
        return False

    log.error(f"API PUT failed after 5 retries {rel_path}")
    return False


def push_article(slug: str) -> bool:
    rel_path = f"site/src/content/blog/{slug}.md"
    full_path = REPO_DIR / rel_path
    if not full_path.exists():
        log.error(f"File missing: {full_path}")
        return False
    message = f"blog: {slug} [{now_paris().strftime('%Y-%m-%d %H:%M')}]"
    return _gh_put_file(rel_path, full_path.read_bytes(), message)


def push_articles_json() -> None:
    rel_path = "blog-auto/articles.json"
    full_path = REPO_DIR / rel_path
    if not full_path.exists():
        return
    message = f"blog-auto: update articles.json [{now_paris().strftime('%Y-%m-%d %H:%M')}]"
    _gh_put_file(rel_path, full_path.read_bytes(), message)


# ============================================
# INDEXNOW + BING URL SUBMISSION + SITEMAP PING
# ============================================

def submit_indexnow(url: str) -> None:
    if not INDEXNOW_KEY:
        return
    try:
        response = requests.post(
            "https://api.indexnow.org/indexnow",
            json={
                "host": SITE_HOST,
                "key": INDEXNOW_KEY,
                "keyLocation": f"{SITE_URL}/{INDEXNOW_KEY}.txt",
                "urlList": [url],
            },
            headers={"Content-Type": "application/json"},
            timeout=15,
        )
        log.info(f"IndexNow: {response.status_code}")
    except Exception as e:
        log.warning(f"IndexNow failed: {e}")


def submit_url_to_bing(url: str) -> None:
    """Submit single URL via Bing URL Submission API (shared STACK-2026 key, 10000/day)."""
    if not BING_URL_SUBMISSION_KEY:
        log.info("  Bing URL Submission: skipped (pas de cle)")
        return
    try:
        body = {"siteUrl": SITE_URL, "url": url}
        r = requests.post(
            f"https://ssl.bing.com/webmaster/api.svc/json/SubmitUrl?apikey={BING_URL_SUBMISSION_KEY}",
            json=body,
            headers={"Content-Type": "application/json; charset=utf-8", "User-Agent": "Mozilla/5.0 BebeDecrypte-BlogAuto/1.0"},
            timeout=15,
        )
        log.info(f"Bing URL Submission: {url} -> {r.status_code} {r.text[:150]}")
    except Exception as e:
        log.warning(f"Bing URL Submission failed: {e}")


def ping_sitemaps() -> None:
    sitemap = f"{SITE_URL}/sitemap-index.xml"
    for name, url in [
        ("Google", f"https://www.google.com/ping?sitemap={sitemap}"),
        ("Bing", f"https://www.bing.com/ping?sitemap={sitemap}"),
    ]:
        try:
            r = requests.get(url, timeout=10)
            log.info(f"Sitemap ping {name}: {r.status_code}")
        except Exception as e:
            log.warning(f"Sitemap ping {name} failed: {e}")


# ============================================
# MAIN
# ============================================

def main():
    force = "--force" in sys.argv
    dry_run = ("--dry-run" in sys.argv) or (os.environ.get("DRY_RUN", "false").lower() == "true")

    log.info("=" * 60)
    log.info(f"BebeDecrypte Blog Auto , {now_paris().strftime('%Y-%m-%d %H:%M:%S %Z')}")
    log.info(f"Mode: {'FORCE' if force else 'DRY-RUN' if dry_run else 'normal'}")
    log.info(f"Repo: {GITHUB_REPOSITORY} | Site: {SITE_URL}")

    # Validate config
    if not MISTRAL_API_KEY:
        log.error("MISTRAL_API_KEY manquant")
        sys.exit(1)
    if not ANTHROPIC_API_KEY:
        log.error("ANTHROPIC_API_KEY manquant (audit stage)")
        sys.exit(1)
    if not PROMPT_FILE.exists():
        log.error(f"Prompt file manquant: {PROMPT_FILE}")
        sys.exit(1)

    articles = load_articles()
    total = len(articles)
    published = sum(1 for a in articles if a.get("published"))
    log.info(f"Articles: {published}/{total} publies")

    article = get_due_article(articles, force=force)
    if not article:
        log.info("Pas d'article a publier maintenant")
        return

    log.info(f"Article a publier: {article['title']}")

    # Slug
    slug = article.get("slug") or generate_slug(article["title"])
    article["slug"] = slug
    log.info(f"Slug: {slug}")

    # Anti-doublon
    if slug_exists_in_blog(slug):
        log.warning(f"DOUBLON EVITE , l'article '{slug}' existe deja dans le repo")
        article["published"] = True
        article["published_at"] = now_paris().isoformat()
        save_articles(articles)
        if not dry_run:
            push_articles_json()
        return

    # Generate
    system_prompt = load_system_prompt()
    log.info("Generation (Mistral draft -> Claude audit -> Mistral fix)...")
    generated = generate_article(article, system_prompt)
    log.info(f"Title tag: {generated['title_tag']}")
    log.info(f"Meta desc: {generated['meta_description'][:80]}...")

    # Image (optional)
    image = None
    if UNSPLASH_ACCESS_KEY:
        query = (article.get("keywords") or article["title"]).split(",")[0].strip()
        image = fetch_unsplash_image(query, article.get("index", 0))
        if image:
            log.info(f"Image: {image['photographer']} (Unsplash)")

    # Assemble markdown
    frontmatter = generate_frontmatter(article, generated, image)
    body = build_markdown_body(generated, article)
    filepath = write_article_file(slug, frontmatter, body)
    log.info(f"Fichier cree: {filepath}")

    if dry_run:
        log.info("DRY-RUN , pas de push ni indexation")
        return

    # Push via GitHub Contents API
    pushed = push_article(slug)
    if not pushed:
        log.error("Push echoue apres retries , article non deploye, on n'update PAS articles.json")
        sys.exit(1)
    log.info("Deploiement Cloudflare Pages en cours (~30 a 60s via workflow_run)")

    # Update articles.json
    article["published"] = True
    article["published_at"] = now_paris().isoformat()
    article["title_tag"] = generated["title_tag"]
    article["meta_description"] = generated["meta_description"]
    if image:
        article["featured_image_url"] = image["url"]
    save_articles(articles)
    push_articles_json()

    # Indexation
    article_url = f"{SITE_URL}/blog/{slug}/"
    submit_indexnow(article_url)
    submit_url_to_bing(article_url)
    ping_sitemaps()

    log.info(f"Publication terminee: {article_url}")
    log.info(f"Progression: {published + 1}/{total}")


if __name__ == "__main__":
    main()
