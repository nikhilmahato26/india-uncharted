import { RESERVED_SLUGS } from "@/lib/site";

export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

/** "Kashmir Honeymoon Tour (6 Days / 5 Nights)" → "kashmir-honeymoon-tour-6-days-5-nights" */
export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/['’]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-")
    .slice(0, 120)
    .replace(/-+$/g, "");
}

export function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.has(slug);
}

/**
 * Returns `base`, or `base-2`, `base-3`… — the first candidate `exists` says is free.
 * `exists` is injected so this stays pure and testable.
 */
export async function uniqueSlug(base: string, exists: (candidate: string) => Promise<boolean>): Promise<string> {
  const root = slugify(base) || "untitled";
  let candidate = isReservedSlug(root) ? `${root}-1` : root;
  let n = 2;
  while (await exists(candidate)) {
    candidate = `${root}-${n++}`;
  }
  return candidate;
}
