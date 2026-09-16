import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db } from "@/lib/db";
import { can, type Capability } from "@/lib/auth/rbac";
import {
  SESSION_COOKIE,
  SESSION_ROTATE_AFTER_SECONDS,
  sessionCookieOptions,
  signSession,
  verifySessionToken,
} from "@/lib/auth/jwt";
import type { Role } from "@/generated/prisma/enums";

export type SessionUser = {
  id: string;
  email: string;
  name: string;
  role: Role;
};

/**
 * Verified session for this request: token signature, expiry, the user still
 * active, and the token issued after the user's revocation watermark.
 * Memoised per request with React.cache.
 */
export const getSession = cache(async (): Promise<SessionUser | null> => {
  const jar = await cookies();
  const claims = await verifySessionToken(jar.get(SESSION_COOKIE)?.value);
  if (!claims) return null;

  const user = await db.user.findUnique({
    where: { id: claims.sub },
    select: { id: true, email: true, name: true, role: true, isActive: true, sessionsValidFrom: true },
  });
  if (!user || !user.isActive) return null;

  const watermark = Math.floor(user.sessionsValidFrom.getTime() / 1000);
  if (claims.iat < watermark) return null;

  return { id: user.id, email: user.email, name: user.name, role: user.role };
});

/** For pages: redirects to login when signed out. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSession();
  if (!user) redirect("/admin/login");
  return user;
}

/** For pages: signed in AND allowed, otherwise the access-denied screen. */
export async function requireCapability(capability: Capability): Promise<SessionUser> {
  const user = await requireUser();
  if (!can(user.role, capability)) redirect(`/admin/forbidden?need=${encodeURIComponent(capability)}`);
  return user;
}

export class AuthError extends Error {
  constructor(public readonly reason: "signed-out" | "forbidden") {
    super(reason === "signed-out" ? "Your session has ended. Sign in again." : "Your role doesn't allow this action.");
  }
}

/** For server actions: throws AuthError, which the action wrapper turns into a form error. */
export async function assertCapability(capability: Capability): Promise<SessionUser> {
  const user = await getSession();
  if (!user) throw new AuthError("signed-out");
  if (!can(user.role, capability)) throw new AuthError("forbidden");
  return user;
}

export async function createSession(user: { id: string; role: Role }) {
  const token = await signSession(user.id, user.role);
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, sessionCookieOptions());
}

export async function destroySession() {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, "", sessionCookieOptions(0));
}

/** Re-issue a token once it is older than a day, keeping active editors signed in. */
export async function rotateSessionIfStale(user: SessionUser) {
  const jar = await cookies();
  const claims = await verifySessionToken(jar.get(SESSION_COOKIE)?.value);
  if (claims && Date.now() / 1000 - claims.iat > SESSION_ROTATE_AFTER_SECONDS) {
    await createSession(user);
  }
}
