import "server-only";
import { db } from "@/lib/db";

/**
 * In-memory redirect map for proxy.ts. Loaded from Postgres at most once a
 * minute per server instance; the admin Redirect manager calls
 * `invalidateRedirectCache` after every save so the change applies at once
 * on that instance.
 */

type Entry = { id: string; toPath: string | null; statusCode: number };

const TTL_MS = 60_000;
let cache: { map: Map<string, Entry>; loadedAt: number } | null = null;
let loading: Promise<Map<string, Entry>> | null = null;

async function load(): Promise<Map<string, Entry>> {
  const rows = await db.redirect.findMany({
    where: { isActive: true },
    select: { id: true, fromPath: true, toPath: true, statusCode: true },
  });
  const map = new Map<string, Entry>();
  for (const r of rows) map.set(r.fromPath, { id: r.id, toPath: r.toPath, statusCode: r.statusCode });
  cache = { map, loadedAt: Date.now() };
  return map;
}

export async function getRedirectMap(): Promise<Map<string, Entry>> {
  if (cache && Date.now() - cache.loadedAt < TTL_MS) return cache.map;
  loading ??= load().finally(() => {
    loading = null;
  });
  try {
    return await loading;
  } catch {
    // Database unavailable: never block the site on redirects.
    return cache?.map ?? new Map();
  }
}

export function invalidateRedirectCache() {
  cache = null;
}

/** Fire-and-forget hit counter. */
export function recordRedirectHit(id: string) {
  db.redirect
    .update({ where: { id }, data: { hits: { increment: 1 }, lastHitAt: new Date() } })
    .catch(() => {});
}
