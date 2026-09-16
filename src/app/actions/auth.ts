"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { verifyPassword, hashPassword, PASSWORD_MIN_LENGTH } from "@/lib/auth/password";
import { createSession, destroySession, getSession } from "@/lib/auth/session";
import { hashIp, rateLimit } from "@/lib/rate-limit";
import { recordAudit } from "@/lib/audit";

export type LoginState = { error?: string } | null;

/**
 * Sign-in. "No such account" and "wrong password" are indistinguishable, in
 * message and in timing, and both are rate-limited per IP and per email.
 */
export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/admin");

  if (!email || !password) return { error: "Enter your email and password." };

  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip");
  const ipHash = hashIp(ip) ?? "unknown";
  const allowed = (await rateLimit(`login:ip:${ipHash}`, 10, 900)) && (await rateLimit(`login:email:${email}`, 6, 900));
  if (!allowed) return { error: "Too many attempts. Wait fifteen minutes and try again." };

  const user = await db.user.findUnique({ where: { email }, select: { id: true, role: true, passwordHash: true, isActive: true } });
  const ok = await verifyPassword(password, user?.isActive ? user.passwordHash : null);
  if (!user || !ok) return { error: "That email and password don't match." };

  await db.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await createSession({ id: user.id, role: user.role });
  await recordAudit({ userId: user.id, action: "login", entityType: "User", entityId: user.id });

  redirect(next.startsWith("/admin") ? next : "/admin");
}

export async function logout() {
  const user = await getSession();
  if (user) await recordAudit({ userId: user.id, action: "logout", entityType: "User", entityId: user.id });
  await destroySession();
  redirect("/admin/login");
}

export type PasswordState = { error?: string; ok?: boolean } | null;

/**
 * Changing a password moves the revocation watermark, so every other session
 * — including a stolen one — stops working immediately.
 */
export async function changePassword(_prev: PasswordState, formData: FormData): Promise<PasswordState> {
  const user = await getSession();
  if (!user) return { error: "Your session has ended. Sign in again." };

  const current = String(formData.get("currentPassword") ?? "");
  const next = String(formData.get("newPassword") ?? "");
  const confirm = String(formData.get("confirmPassword") ?? "");

  if (next.length < PASSWORD_MIN_LENGTH) return { error: `Use at least ${PASSWORD_MIN_LENGTH} characters.` };
  if (next !== confirm) return { error: "The two new passwords don't match." };

  const row = await db.user.findUnique({ where: { id: user.id }, select: { passwordHash: true } });
  if (!(await verifyPassword(current, row?.passwordHash))) return { error: "Your current password is wrong." };

  // Whole seconds: a JWT's `iat` has no milliseconds, so a sub-second
  // watermark would reject the session we are about to issue.
  const watermark = new Date(Math.floor(Date.now() / 1000) * 1000);
  await db.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(next), sessionsValidFrom: watermark } });
  await createSession({ id: user.id, role: user.role });
  await recordAudit({ userId: user.id, action: "password.change", entityType: "User", entityId: user.id });

  return { ok: true };
}
