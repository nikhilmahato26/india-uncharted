import { SignJWT, jwtVerify } from "jose";

/** Session JWT helpers. No database or Node-only imports, so proxy.ts can use them. */

export const SESSION_COOKIE = "iu_session";
export const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7; // 7 days
export const SESSION_ROTATE_AFTER_SECONDS = 60 * 60 * 24; // re-issue after 24h of use

export type SessionClaims = {
  sub: string; // user id
  role: "SUPER_ADMIN" | "ADMIN" | "EDITOR";
  iat: number;
  exp: number;
};

function secretKey(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("JWT_SECRET must be set to at least 32 characters.");
  }
  return new TextEncoder().encode(secret);
}

export async function signSession(userId: string, role: SessionClaims["role"]): Promise<string> {
  return new SignJWT({ role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .setIssuer("india-uncharted")
    .setAudience("india-uncharted-admin")
    .sign(secretKey());
}

export async function verifySessionToken(token: string | undefined | null): Promise<SessionClaims | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), {
      algorithms: ["HS256"],
      issuer: "india-uncharted",
      audience: "india-uncharted-admin",
    });
    if (typeof payload.sub !== "string" || typeof payload.iat !== "number" || typeof payload.exp !== "number") return null;
    const role = payload.role;
    if (role !== "SUPER_ADMIN" && role !== "ADMIN" && role !== "EDITOR") return null;
    return { sub: payload.sub, role, iat: payload.iat, exp: payload.exp };
  } catch {
    return null;
  }
}

export function sessionCookieOptions(maxAge = SESSION_TTL_SECONDS) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge,
  };
}
