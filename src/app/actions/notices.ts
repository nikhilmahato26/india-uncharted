"use server";

import { revalidatePath, updateTag } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { assertCapability, AuthError } from "@/lib/auth/session";
import { recordAudit } from "@/lib/audit";
import { TAGS } from "@/lib/content/tags";
import type { SettingsState } from "./seo-settings";

const schema = z.object({
  id: z.string().optional(),
  scope: z.enum(["GLOBAL", "REGION", "DESTINATION", "JOURNEY", "EXPERIENCE"]),
  targetId: z.string().trim().max(40).optional(),
  title: z.string().trim().min(3).max(160),
  body: z.string().trim().min(3).max(1000),
  startsOn: z.string().trim().max(10).optional(),
  endsOn: z.string().trim().max(10).optional(),
  blocksEnquiry: z.coerce.boolean().optional(),
  isActive: z.coerce.boolean().optional(),
});

/**
 * Seasonal notices: monsoon, a closed pass, a park's off-season. Scoped, so
 * closing one route never silences the rest of the site.
 */
export async function saveNotice(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  try {
    const user = await assertCapability("notices.edit");
    const parsed = schema.safeParse(Object.fromEntries(formData.entries()));
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] ??= issue.message;
      return { ok: false, error: "Please check the highlighted fields.", fieldErrors };
    }
    const d = parsed.data;
    if (d.scope !== "GLOBAL" && !d.targetId) return { ok: false, error: "Choose what this notice applies to.", fieldErrors: { targetId: "Required." } };

    const data = {
      scope: d.scope,
      targetId: d.scope === "GLOBAL" ? null : d.targetId ?? null,
      title: d.title,
      body: d.body,
      startsOn: d.startsOn ? new Date(d.startsOn) : null,
      endsOn: d.endsOn ? new Date(d.endsOn) : null,
      blocksEnquiry: d.blocksEnquiry ?? false,
      isActive: d.isActive ?? false,
    };

    if (d.id) await db.seasonalNotice.update({ where: { id: d.id }, data: { ...data, version: { increment: 1 } } });
    else await db.seasonalNotice.create({ data });

    await recordAudit({ userId: user.id, action: d.id ? "notice.update" : "notice.create", entityType: "SeasonalNotice", entityId: d.id, label: d.title });
    updateTag(TAGS.notices);
    revalidatePath("/", "layout");
    return { ok: true, message: data.isActive ? "Saved and showing on the site." : "Saved. It isn't showing yet — switch it on when it applies." };
  } catch (err) {
    if (err instanceof AuthError) return { ok: false, error: err.message };
    console.error("notice save failed", err);
    return { ok: false, error: "That notice couldn't be saved." };
  }
}

export async function setNoticeActive(id: string, isActive: boolean) {
  const user = await assertCapability("notices.edit");
  const notice = await db.seasonalNotice.update({ where: { id }, data: { isActive }, select: { title: true } });
  await recordAudit({ userId: user.id, action: isActive ? "notice.on" : "notice.off", entityType: "SeasonalNotice", entityId: id, label: notice.title });
  updateTag(TAGS.notices);
  revalidatePath("/", "layout");
}

export async function deleteNotice(id: string) {
  const user = await assertCapability("notices.edit");
  const notice = await db.seasonalNotice.delete({ where: { id }, select: { title: true } });
  await recordAudit({ userId: user.id, action: "notice.delete", entityType: "SeasonalNotice", entityId: id, label: notice.title });
  updateTag(TAGS.notices);
  revalidatePath("/", "layout");
}
