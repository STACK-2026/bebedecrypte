/**
 * Utils glossaire : slugify coherent + linkify des definitions vers d'autres entrees.
 */
import type { GlossaireEntry } from "../data/glossaire";

export function slugifyTerm(s: string): string {
  return s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Transforme les termes du glossaire trouves dans un texte en liens vers /glossaire#slug.
 * - selfKey : la cle courante (evite les liens recursifs sur le terme lui-meme).
 * - maxLinks : plafond pour ne pas surcharger visuellement la tooltip (defaut 4).
 * - linkClass : classe CSS a appliquer aux liens.
 */
export function linkifyDefinition(
  text: string,
  glossaire: Record<string, GlossaireEntry>,
  aliases: Record<string, string>,
  selfKey?: string,
  maxLinks = 4,
  linkClass = "glossaire-inline-link"
): string {
  const keys = Object.keys(aliases).sort((a, b) => b.length - a.length);
  const used = new Set<string>();
  if (selfKey) used.add(selfKey);

  type Token = { kind: "text" | "link"; value: string; key?: string; display?: string };
  let tokens: Token[] = [{ kind: "text", value: text }];

  for (const alias of keys) {
    if (used.size - (selfKey ? 1 : 0) >= maxLinks) break;
    const canonical = aliases[alias];
    if (!canonical || used.has(canonical)) continue;

    const next: Token[] = [];
    let consumed = false;

    for (const tok of tokens) {
      if (tok.kind !== "text" || consumed) {
        next.push(tok);
        continue;
      }
      const re = new RegExp(
        `(^|[^A-Za-zÀ-ÿ0-9])(${escapeRegex(alias)})(?=$|[^A-Za-zÀ-ÿ0-9])`,
        "i"
      );
      const m = tok.value.match(re);
      if (!m || m.index === undefined) {
        next.push(tok);
        continue;
      }
      const prefix = (m[1] ?? "").length;
      const start = m.index + prefix;
      const matched = m[2];
      const before = tok.value.substring(0, start);
      const after = tok.value.substring(start + matched.length);
      if (before) next.push({ kind: "text", value: before });
      next.push({ kind: "link", value: matched, key: canonical, display: matched });
      if (after) next.push({ kind: "text", value: after });
      used.add(canonical);
      consumed = true;
    }
    tokens = next;
  }

  return tokens
    .map((t) => {
      if (t.kind === "text") return escapeHtml(t.value);
      const slug = slugifyTerm(t.key!);
      return `<a href="/glossaire#${slug}" class="${linkClass}">${escapeHtml(t.display!)}</a>`;
    })
    .join("");
}
