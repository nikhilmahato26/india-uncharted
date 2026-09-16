"use server";

import { revalidatePath, updateTag } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { assertCapability, AuthError } from "@/lib/auth/session";
import { recordAudit } from "@/lib/audit";
import { TAGS } from "@/lib/content/tags";
import { collapseChains, createsLoop, normalizePath, normalizeTarget, REDIRECT_STATUS_CODES } from "@/lib/redirects";
import { invalidateRedirectCache } from "@/lib/redirect-store";
import type { Prisma } from "@/generated/prisma/client";

export type SettingsState = { ok: true; message: string } | { ok: false; error: string; fieldErrors?: Record<string, string> } | null;

const ENTITY_TYPES = ["PAGE", "REGION", "DESTINATION", "JOURNEY", "EXPERIENCE", "SERVICE", "ARTICLE", "CATEGORY", "EXPERIENCE_THEME"] as const;

const idPattern = /^[A-Za-z0-9_\-.:]*$/;

const seoSettingsSchema = z.object({
  siteTitle: z.string().trim().min(1).max(120),
  titleSeparator: z.string().max(10),
  defaultMetaTitle: z.string().trim().max(200).optional(),
  defaultMetaDescription: z.string().trim().max(400).optional(),
  twitterHandle: z.string().trim().max(60).optional(),
  googleVerification: z.string().trim().max(200).regex(idPattern, "Use only the verification code itself.").optional(),
  bingVerification: z.string().trim().max(200).regex(idPattern, "Use only the verification code itself.").optional(),
  ga4Id: z.string().trim().max(40).regex(/^(G-[A-Z0-9]+)?$/, "A GA4 ID looks like G-XXXXXXX.").optional(),
  gtmId: z.string().trim().max(40).regex(/^(GTM-[A-Z0-9]+)?$/, "A GTM ID looks like GTM-XXXXXX.").optional(),
  metaPixelId: z.string().trim().max(40).regex(/^\d*$/, "A Meta Pixel ID is digits only.").optional(),
  consentRequired: z.coerce.boolean().optional(),
});

/** Global SEO: defaults, per-type title patterns, verification codes and analytics IDs. */
export async function saveSeoSettings(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  try {
    const user = await assertCapability("seo.global");
    const parsed = seoSettingsSchema.safeParse(Object.fromEntries(formData.entries()));
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) fieldErrors[String(issue.path[0])] ??= issue.message;
      return { ok: false, error: "Please check the highlighted fields.", fieldErrors };
    }
    const data = parsed.data;

    // Analytics and verification codes are SUPER_ADMIN territory.
    const touchesHead = [data.googleVerification, data.bingVerification, data.ga4Id, data.gtmId, data.metaPixelId].some((v) => v && v.length);
    if (touchesHead) await assertCapability("seo.head");

    const patterns: Record<string, { title?: string; description?: string }> = {};
    for (const type of ENTITY_TYPES) {
      const title = String(formData.get(`pattern.${type}.title`) ?? "").trim();
      const description = String(formData.get(`pattern.${type}.description`) ?? "").trim();
      if (title || description) patterns[type] = { ...(title ? { title } : {}), ...(description ? { description } : {}) };
    }

    await db.seoSettings.upsert({
      where: { id: "singleton" },
      create: {
        id: "singleton",
        siteTitle: data.siteTitle,
        titleSeparator: data.titleSeparator || " | ",
        defaultMetaTitle: data.defaultMetaTitle || null,
        defaultMetaDescription: data.defaultMetaDescription || null,
        twitterHandle: data.twitterHandle || null,
        googleVerification: data.googleVerification || null,
        bingVerification: data.bingVerification || null,
        ga4Id: data.ga4Id || null,
        gtmId: data.gtmId || null,
        metaPixelId: data.metaPixelId || null,
        consentRequired: data.consentRequired ?? true,
        patterns: patterns as Prisma.InputJsonValue,
      },
      update: {
        siteTitle: data.siteTitle,
        titleSeparator: data.titleSeparator || " | ",
        defaultMetaTitle: data.defaultMetaTitle || null,
        defaultMetaDescription: data.defaultMetaDescription || null,
        twitterHandle: data.twitterHandle || null,
        googleVerification: data.googleVerification || null,
        bingVerification: data.bingVerification || null,
        ga4Id: data.ga4Id || null,
        gtmId: data.gtmId || null,
        metaPixelId: data.metaPixelId || null,
        consentRequired: data.consentRequired ?? true,
        patterns: patterns as Prisma.InputJsonValue,
      },
    });

    await recordAudit({ userId: user.id, action: "seo.settings", entityType: "SeoSettings" });
    updateTag(TAGS.seo);
    updateTag(TAGS.settings);
    revalidatePath("/", "layout");
    return { ok: true, message: "Saved. Search engines will pick this up on their next crawl." };
  } catch (err) {
    if (err instanceof AuthError) return { ok: false, error: err.message };
    console.error("seo settings failed", err);
    return { ok: false, error: "Something went wrong saving that." };
  }
}

/** Site-wide custom meta tags (name/property pairs). */
export async function addGlobalMetaTag(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  try {
    const user = await assertCapability("seo.global");
    const attribute = String(formData.get("attribute") ?? "NAME") as "NAME" | "PROPERTY" | "HTTP_EQUIV";
    const key = String(formData.get("key") ?? "").trim();
    const content = String(formData.get("content") ?? "").trim();
    if (!key || !content) return { ok: false, error: "A meta tag needs both a name and content." };
    if (!/^[a-zA-Z0-9:_\-.]{1,60}$/.test(key)) return { ok: false, error: "That tag name isn't valid." };
    const reserved = ["description", "robots", "og:title", "og:description", "og:image", "twitter:card", "twitter:title", "twitter:description", "canonical"];
    if (reserved.includes(key.toLowerCase())) return { ok: false, error: `“${key}” is managed by its own field — set it there instead.` };

    const max = await db.customMetaTag.aggregate({ where: { seoId: null }, _max: { sortOrder: true } });
    await db.customMetaTag.create({ data: { seoId: null, attribute, key, content: content.slice(0, 500), sortOrder: (max._max.sortOrder ?? 0) + 1 } });
    await recordAudit({ userId: user.id, action: "seo.metatag.add", entityType: "CustomMetaTag", label: key });
    updateTag(TAGS.seo);
    revalidatePath("/", "layout");
    return { ok: true, message: `Added ${key}.` };
  } catch (err) {
    if (err instanceof AuthError) return { ok: false, error: err.message };
    return { ok: false, error: "That tag couldn't be added." };
  }
}

export async function deleteGlobalMetaTag(id: string) {
  const user = await assertCapability("seo.global");
  const tag = await db.customMetaTag.delete({ where: { id }, select: { key: true } });
  await recordAudit({ userId: user.id, action: "seo.metatag.delete", entityType: "CustomMetaTag", label: tag.key });
  updateTag(TAGS.seo);
  revalidatePath("/", "layout");
}

// ─── Redirects ──────────────────────────────────────────────────────────────

export async function saveRedirect(_prev: SettingsState, formData: FormData): Promise<SettingsState> {
  try {
    const user = await assertCapability("seo.redirects");
    const fromPath = normalizePath(String(formData.get("fromPath") ?? ""));
    const rawTo = String(formData.get("toPath") ?? "").trim();
    const statusCode = Number(formData.get("statusCode") ?? 301);
    const id = String(formData.get("id") ?? "") || null;

    if (!fromPath || fromPath === "/") return { ok: false, error: "Enter the old address, starting with /." };
    if (!REDIRECT_STATUS_CODES.includes(statusCode as (typeof REDIRECT_STATUS_CODES)[number])) return { ok: false, error: "Choose a valid redirect type." };
    const toPath = statusCode === 410 ? null : normalizeTarget(rawTo);
    if (statusCode !== 410 && !toPath) return { ok: false, error: "Enter where this address should go." };
    if (toPath && normalizePath(toPath) === fromPath) return { ok: false, error: "That address points at itself." };

    const existing = await db.redirect.findMany({ select: { fromPath: true, toPath: true, statusCode: true } });
    if (createsLoop({ fromPath, toPath, statusCode }, existing)) {
      return { ok: false, error: "That would create a redirect loop: the pages would point at each other." };
    }

    if (id) await db.redirect.update({ where: { id }, data: { fromPath, toPath, statusCode, origin: "MANUAL", isActive: true } });
    else
      await db.redirect.upsert({
        where: { fromPath },
        create: { fromPath, toPath, statusCode, origin: "MANUAL" },
        update: { toPath, statusCode, isActive: true, origin: "MANUAL" },
      });

    // Any rule that pointed at this old address now points at the new target.
    const all = await db.redirect.findMany({ select: { id: true, fromPath: true, toPath: true, statusCode: true } });
    const { rules } = collapseChains(all.map(({ fromPath, toPath, statusCode }) => ({ fromPath, toPath, statusCode })));
    for (const rule of rules) {
      const row = all.find((r) => r.fromPath === rule.fromPath);
      if (row && row.toPath !== rule.toPath) await db.redirect.update({ where: { id: row.id }, data: { toPath: rule.toPath } });
    }

    await db.notFoundLog.updateMany({ where: { path: fromPath }, data: { resolved: true } });
    await recordAudit({ userId: user.id, action: "redirect.save", entityType: "Redirect", label: `${fromPath} → ${toPath ?? "410"}` });
    invalidateRedirectCache();
    revalidatePath("/admin/seo/redirects");
    return { ok: true, message: `${fromPath} now points at ${toPath ?? "a “gone” page"}.` };
  } catch (err) {
    if (err instanceof AuthError) return { ok: false, error: err.message };
    console.error("redirect save failed", err);
    return { ok: false, error: "That redirect couldn't be saved." };
  }
}

export async function deleteRedirect(id: string) {
  const user = await assertCapability("seo.redirects");
  const row = await db.redirect.delete({ where: { id }, select: { fromPath: true } });
  await recordAudit({ userId: user.id, action: "redirect.delete", entityType: "Redirect", label: row.fromPath });
  invalidateRedirectCache();
  revalidatePath("/admin/seo/redirects");
}
