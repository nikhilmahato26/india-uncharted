import "server-only";
import { db } from "@/lib/db";
import { normalizePath } from "@/lib/redirects";

const IGNORE = /^\/(_next|api|media|favicon|robots|sitemap|apple-touch|\.well-known)/;

/**
 * Records addresses visitors asked for that don't exist, so the redirect
 * manager can show which ones are worth pointing somewhere. Never blocks the
 * 404 page from rendering.
 */
export async function logNotFound(path: string, referrer: string | null) {
  const clean = normalizePath(path);
  if (!clean || clean === "/" || IGNORE.test(clean) || clean.length > 300) return;
  try {
    await db.notFoundLog.upsert({
      where: { path: clean },
      create: { path: clean, hits: 1, lastReferrer: referrer?.slice(0, 300) ?? null },
      update: { hits: { increment: 1 }, lastSeenAt: new Date(), lastReferrer: referrer?.slice(0, 300) ?? undefined, resolved: false },
    });
  } catch {
    // A logging failure must never turn a 404 into a 500.
  }
}
