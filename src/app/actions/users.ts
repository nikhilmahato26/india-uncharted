"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { assertCapability, AuthError, getSession } from "@/lib/auth/session";
import { hashPassword, PASSWORD_MIN_LENGTH } from "@/lib/auth/password";
import { recordAudit } from "@/lib/audit";
import type { SettingsState } from "./seo-settings";

const schema = z.object({
  name: z.string().trim().min(2).max(120),
  email: z.string().trim().toLowerCase().email().max(180),
  role: z.enum(["SUPER_ADMIN", "ADMIN", "EDITOR"]),
  password: z.string().min(PASSWORD_MIN_LENGTH, `Use at least ${PASSWORD_MIN_LENGTH} characters.`).max(200),
});

export async function createUser(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  try {
    const actor = await assertCapability("users.manage");
    const parsed = schema.safeParse(Object.fromEntries(formData.entries()));
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] ??= issue.message;
      return { ok: false, error: "Please check the highlighted fields.", fieldErrors };
    }
    const { name, email, role, password } = parsed.data;

    if (await db.user.findUnique({ where: { email }, select: { id: true } })) {
      return { ok: false, error: "Someone already has that email.", fieldErrors: { email: "Already in use." } };
    }

    const user = await db.user.create({ data: { name, email, role, passwordHash: await hashPassword(password) }, select: { id: true } });
    await recordAudit({ userId: actor.id, action: "user.create", entityType: "User", entityId: user.id, label: `${name} (${role})` });
    revalidatePath("/admin/users");
    return { ok: true, message: `${name} can now sign in. Ask them to change this password.` };
  } catch (err) {
    if (err instanceof AuthError) return { ok: false, error: err.message };
    return { ok: false, error: "That account couldn't be created." };
  }
}

export async function setUserRole(id: string, role: "SUPER_ADMIN" | "ADMIN" | "EDITOR") {
  const actor = await assertCapability("users.manage");
  if (actor.id === id) throw new Error("You can't change your own role — ask another super admin.");
  const user = await db.user.update({ where: { id }, data: { role }, select: { name: true } });
  await recordAudit({ userId: actor.id, action: "user.role", entityType: "User", entityId: id, label: `${user.name} → ${role}` });
  revalidatePath("/admin/users");
}

/** Deactivating also revokes every session that person has open. */
export async function setUserActive(id: string, isActive: boolean) {
  const actor = await assertCapability("users.manage");
  if (actor.id === id) throw new Error("You can't deactivate your own account.");
  const user = await db.user.update({
    where: { id },
    data: { isActive, sessionsValidFrom: new Date(Math.floor(Date.now() / 1000) * 1000) },
    select: { name: true },
  });
  await recordAudit({ userId: actor.id, action: isActive ? "user.activate" : "user.deactivate", entityType: "User", entityId: id, label: user.name });
  revalidatePath("/admin/users");
}

export async function resetUserPassword(id: string, formData: FormData): Promise<SettingsState> {
  try {
    const actor = await assertCapability("users.manage");
    const password = String(formData.get("password") ?? "");
    if (password.length < PASSWORD_MIN_LENGTH) return { ok: false, error: `Use at least ${PASSWORD_MIN_LENGTH} characters.` };
    const user = await db.user.update({
      where: { id },
      data: { passwordHash: await hashPassword(password), sessionsValidFrom: new Date(Math.floor(Date.now() / 1000) * 1000) },
      select: { name: true },
    });
    await recordAudit({ userId: actor.id, action: "user.password-reset", entityType: "User", entityId: id, label: user.name });
    revalidatePath("/admin/users");
    return { ok: true, message: `${user.name}'s password is changed and they've been signed out everywhere.` };
  } catch (err) {
    if (err instanceof AuthError) return { ok: false, error: err.message };
    return { ok: false, error: "That password couldn't be changed." };
  }
}

export async function currentUser() {
  return getSession();
}
