import "server-only";
import { createHash } from "node:crypto";
import { db } from "@/lib/db";

/**
 * Fixed-window rate limit stored in Postgres, so it works across serverless
 * instances without extra infrastructure. One atomic upsert per call.
 * Returns true when the call is allowed.
 */
export async function rateLimit(key: string, limit: number, windowSeconds: number): Promise<boolean> {
  const windowMs = windowSeconds * 1000;
  const windowStart = new Date(Math.floor(Date.now() / windowMs) * windowMs);
  try {
    const rows = await db.$queryRaw<{ count: number }[]>`
      INSERT INTO "RateLimit" ("key", "windowStart", "count")
      VALUES (${key}, ${windowStart}, 1)
      ON CONFLICT ("key") DO UPDATE SET
        "count" = CASE WHEN "RateLimit"."windowStart" = EXCLUDED."windowStart" THEN "RateLimit"."count" + 1 ELSE 1 END,
        "windowStart" = EXCLUDED."windowStart"
      RETURNING "count"`;
    return (rows[0]?.count ?? 1) <= limit;
  } catch {
    // Fail open: a rate-limit outage must not block real travellers.
    return true;
  }
}

/** Salted IP hash — raw IPs are never stored. */
export function hashIp(ip: string | null | undefined): string | null {
  if (!ip) return null;
  const salt = process.env.JWT_SECRET ?? "";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex").slice(0, 32);
}
