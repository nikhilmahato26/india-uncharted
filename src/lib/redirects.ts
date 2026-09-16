/**
 * Redirect path rules, pure so they can be unit-tested and shared by the proxy,
 * the importer and the admin Redirect manager.
 */

export const REDIRECT_STATUS_CODES = [301, 302, 307, 308, 410] as const;
export type RedirectStatus = (typeof REDIRECT_STATUS_CODES)[number];

/** "/Destination/Agra/?utm=x#top" → "/destination/agra" */
export function normalizePath(input: string): string {
  let path = input.trim();
  try {
    if (/^https?:\/\//i.test(path)) path = new URL(path).pathname;
  } catch {
    /* fall through with the raw string */
  }
  path = path.split(/[?#]/)[0] ?? "";
  try {
    path = decodeURIComponent(path);
  } catch {
    /* keep undecoded */
  }
  path = path.toLowerCase().replace(/\/{2,}/g, "/");
  if (!path.startsWith("/")) path = `/${path}`;
  if (path.length > 1) path = path.replace(/\/+$/, "");
  return path;
}

/** Targets may carry a query string (e.g. filter views); only the path part is normalised. */
export function normalizeTarget(input: string): string {
  const trimmed = input.trim();
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  const [pathPart, ...rest] = trimmed.split("?");
  const query = rest.join("?");
  const path = normalizePath(pathPart ?? "/");
  return query ? `${path}?${query}` : path;
}

export type RedirectRule = { fromPath: string; toPath: string | null; statusCode: number };

/**
 * Collapse chains so every rule points at its final destination (A→B, B→C ⇒ A→C, B→C).
 * Returns the rules that would form a loop separately so the admin can reject them.
 */
export function collapseChains(rules: RedirectRule[]): { rules: RedirectRule[]; loops: string[] } {
  const byFrom = new Map(rules.map((r) => [r.fromPath, r]));
  const loops: string[] = [];
  const out: RedirectRule[] = [];

  for (const rule of rules) {
    if (rule.statusCode === 410 || !rule.toPath) {
      out.push(rule);
      continue;
    }
    const seen = new Set([rule.fromPath]);
    let target = rule.toPath;
    let status = rule.statusCode;
    let looped = false;
    for (let hop = 0; hop < 20; hop++) {
      const next = byFrom.get(normalizePath(target));
      if (!next) break;
      if (seen.has(next.fromPath)) {
        looped = true;
        break;
      }
      seen.add(next.fromPath);
      if (next.statusCode === 410 || !next.toPath) {
        target = "";
        status = 410;
        break;
      }
      target = next.toPath;
    }
    if (looped) loops.push(rule.fromPath);
    else out.push({ fromPath: rule.fromPath, toPath: status === 410 ? null : target, statusCode: status });
  }
  return { rules: out, loops };
}

/** Would saving `candidate` create a loop with the existing rules? */
export function createsLoop(candidate: RedirectRule, existing: RedirectRule[]): boolean {
  const others = existing.filter((r) => r.fromPath !== candidate.fromPath);
  return collapseChains([...others, candidate]).loops.includes(candidate.fromPath);
}
