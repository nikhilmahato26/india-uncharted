"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { assertCapability, AuthError } from "@/lib/auth/session";
import { recordAudit, diffFields } from "@/lib/audit";
import { getEntity, type EntityKey } from "@/lib/admin/registry";
import { parseCustomJsonLd, seoSchema } from "@/lib/admin/fields";
import { isReservedSlug, slugify, SLUG_PATTERN } from "@/lib/slug";
import { FIXED_PAGE_KEYS } from "@/lib/site";
import { normalizePath } from "@/lib/redirects";
import { invalidateRedirectCache } from "@/lib/redirect-store";
import { TAGS } from "@/lib/content/tags";
import type { Prisma } from "@/generated/prisma/client";

export type SaveState = { ok: true; id: string; message: string } | { ok: false; error: string; fieldErrors?: Record<string, string> } | null;

type Delegate = {
  findUnique: (args: unknown) => Promise<Record<string, unknown> | null>;
  findFirst: (args: unknown) => Promise<Record<string, unknown> | null>;
  create: (args: unknown) => Promise<Record<string, unknown>>;
  update: (args: unknown) => Promise<Record<string, unknown>>;
  delete: (args: unknown) => Promise<Record<string, unknown>>;
  aggregate: (args: unknown) => Promise<{ _max: { sortOrder: number | null } }>;
};

function delegate(model: string): Delegate {
  return (db as unknown as Record<string, Delegate>)[model];
}

/** Content edits touch more than their own type: a journey changes destination pages too. */
function revalidateFor(key: EntityKey) {
  const def = getEntity(key)!;
  for (const tag of def.tags) updateTag(tag);
  updateTag(TAGS.nav);
  updateTag(TAGS.sections);
  revalidatePath("/", "layout");
}

function parseFormValue(type: string, raw: FormDataEntryValue | null, all: FormData, name: string): unknown {
  if (type === "switch") return raw === "on" || raw === "true";
  if (type === "chips") return all.getAll(name).map(String).filter(Boolean);
  if (type === "list")
    return String(raw ?? "")
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
  if (type === "rich") {
    const text = String(raw ?? "").trim();
    if (!text) return undefined;
    try {
      return JSON.parse(text);
    } catch {
      return undefined;
    }
  }
  if (type === "number") {
    const text = String(raw ?? "").trim();
    return text === "" ? null : Number(text);
  }
  const text = String(raw ?? "").trim();
  return text === "" ? undefined : text;
}

/**
 * Create or update any content record. One path, so slug rules, publishing
 * rules, audit and cache invalidation can never be skipped by a form.
 */
export async function saveEntity(key: EntityKey, id: string | null, _prev: SaveState, formData: FormData): Promise<SaveState> {
  const def = getEntity(key);
  if (!def) return { ok: false, error: "Unknown content type." };

  try {
    const user = await assertCapability("content.edit");
    const model = delegate(def.model);

    // 1. Collect and validate the entity's own fields.
    const raw: Record<string, unknown> = {};
    for (const group of def.groups) {
      for (const field of group.fields) {
        const value = parseFormValue(field.type, formData.get(field.name), formData, field.name);
        if (value !== undefined) raw[field.name] = value;
      }
    }
    for (const relation of ["heroId", "regionId", "parentId", "destinationId", "categoryId"]) {
      const v = formData.get(relation);
      if (v !== null) raw[relation] = String(v).trim() || null;
    }

    const parsed = def.schema.safeParse(raw);
    if (!parsed.success) {
      const fieldErrors: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const k = String(issue.path[0] ?? "form");
        fieldErrors[k] ??= issue.message;
      }
      return { ok: false, error: "Please check the highlighted fields.", fieldErrors };
    }
    const data: Record<string, unknown> = { ...parsed.data };

    // 2. Status. Publishing is a separate permission from editing.
    const requestedStatus = String(formData.get("status") ?? "").trim();
    const existing = id ? await model.findUnique({ where: { id } }) : null;
    if (id && !existing) return { ok: false, error: "That record no longer exists." };

    if (def.hasStatus && requestedStatus) {
      const current = (existing?.status as string) ?? "DRAFT";
      if (requestedStatus !== current && requestedStatus === "PUBLISHED") {
        await assertCapability("content.publish");
      }
      data.status = requestedStatus;
      data.publishedAt = requestedStatus === "PUBLISHED" ? (existing?.publishedAt as Date | null) ?? new Date() : null;
    }

    // Guest stories can never be published unverified.
    if (def.key === "testimonials") {
      const verified = Boolean(data.verified);
      delete data.verified;
      data.verifiedAt = verified ? (existing?.verifiedAt as Date | null) ?? new Date() : null;
      data.verifiedById = verified ? (existing?.verifiedById as string | null) ?? user.id : null;
      if (!verified && data.status === "PUBLISHED") {
        return { ok: false, error: "Verify the guest story before publishing it.", fieldErrors: { verified: "Required before publishing." } };
      }
      if (typeof data.travelledOn === "string") data.travelledOn = data.travelledOn ? new Date(data.travelledOn) : null;
    }

    // 3. Slug: generated from the title, unique, never a reserved route word.
    let oldPath: string | null = null;
    if (def.hasSlug) {
      const titleValue = String(data[def.titleField] ?? existing?.[def.titleField] ?? "");
      const requested = String(data.slug ?? "").trim();
      let slug = requested ? slugify(requested) : (existing?.slug as string) || slugify(titleValue);
      if (!slug) return { ok: false, error: "This needs a name before it can be saved.", fieldErrors: { [def.titleField]: "Required." } };
      // About, Contact, the legal pages and the rest have their own route. Renaming one
      // would redirect its address to a page that doesn't exist, so the address is fixed.
      if (def.key === "pages" && existing && FIXED_PAGE_KEYS.has(String(existing.key)) && slug !== existing.slug) {
        return { ok: false, error: "This page's address is fixed.", fieldErrors: { slug: `“/${String(existing.slug)}” is built into the site and can't be changed.` } };
      }
      if (!SLUG_PATTERN.test(slug)) return { ok: false, error: "That URL isn't valid.", fieldErrors: { slug: "Use lowercase letters, numbers and hyphens." } };
      if (isReservedSlug(slug)) return { ok: false, error: "That URL is reserved.", fieldErrors: { slug: `“${slug}” is used by the site itself. Choose another.` } };

      const root = slug;
      for (let n = 2; ; n++) {
        const clash = await model.findFirst({ where: { slug, ...(id ? { NOT: { id } } : {}) }, select: { id: true } } as unknown);
        if (!clash) break;
        slug = `${root}-${n}`;
      }
      if (existing && existing.slug !== slug && def.publicPath) {
        oldPath = def.publicPath({ slug: String(existing.slug), kind: (existing.kind as string) ?? null });
      }
      data.slug = slug;
    }

    // 4. SEO panel.
    const seoRaw: Record<string, unknown> = {
      metaTitle: formData.get("seo.metaTitle"),
      metaDescription: formData.get("seo.metaDescription"),
      h1Override: formData.get("seo.h1Override"),
      focusKeyword: formData.get("seo.focusKeyword"),
      secondaryKeywords: formData.getAll("seo.secondaryKeywords").map(String).filter(Boolean),
      keywordVariants: formData.getAll("seo.keywordVariants").map(String).filter(Boolean),
      canonicalUrl: formData.get("seo.canonicalUrl"),
      robotsIndex: formData.get("seo.robotsIndex") === "on",
      robotsFollow: formData.get("seo.robotsFollow") === "on",
      ogTitle: formData.get("seo.ogTitle"),
      ogDescription: formData.get("seo.ogDescription"),
      ogImageId: formData.get("seo.ogImageId"),
      twitterTitle: formData.get("seo.twitterTitle"),
      twitterDescription: formData.get("seo.twitterDescription"),
      schemaType: formData.get("seo.schemaType"),
      customJsonLd: formData.get("seo.customJsonLd"),
    };
    let seoId = (existing?.seoId as string | null) ?? null;
    if (def.hasSeo && formData.has("seo.present")) {
      const seoParsed = seoSchema.safeParse(
        Object.fromEntries(Object.entries(seoRaw).map(([k, v]) => [k, typeof v === "object" && v !== null && !Array.isArray(v) ? String(v) : v])),
      );
      if (!seoParsed.success) return { ok: false, error: "Please check the SEO fields." };
      const seoData = seoParsed.data;

      const jsonLd = parseCustomJsonLd(seoData.customJsonLd);
      if (!jsonLd.ok) return { ok: false, error: jsonLd.error, fieldErrors: { "seo.customJsonLd": jsonLd.error } };
      if (jsonLd.value !== null) await assertCapability("seo.jsonld");

      const seoValues = {
        metaTitle: seoData.metaTitle || null,
        metaDescription: seoData.metaDescription || null,
        h1Override: seoData.h1Override || null,
        focusKeyword: seoData.focusKeyword || null,
        secondaryKeywords: seoData.secondaryKeywords ?? [],
        keywordVariants: seoData.keywordVariants ?? [],
        canonicalUrl: seoData.canonicalUrl || null,
        robotsIndex: seoData.robotsIndex ?? true,
        robotsFollow: seoData.robotsFollow ?? true,
        ogTitle: seoData.ogTitle || null,
        ogDescription: seoData.ogDescription || null,
        ogImageId: seoData.ogImageId || null,
        twitterTitle: seoData.twitterTitle || null,
        twitterDescription: seoData.twitterDescription || null,
        schemaType: seoData.schemaType || null,
        customJsonLd: (jsonLd.value as Prisma.InputJsonValue) ?? undefined,
      };
      if (seoId) await db.seoMeta.update({ where: { id: seoId }, data: seoValues });
      else seoId = (await db.seoMeta.create({ data: seoValues, select: { id: true } })).id;
      data.seoId = seoId;
    }

    // 5. Write.
    let recordId = id;
    if (existing) {
      const updated = await model.update({ where: { id }, data });
      const diff = diffFields(existing, updated);
      await recordAudit({ userId: user.id, action: "update", entityType: def.singular, entityId: String(id), label: String(updated[def.titleField] ?? ""), diff });
    } else {
      if (def.hasOrder) {
        const max = await model.aggregate({ _max: { sortOrder: true } } as unknown);
        data.sortOrder = (max._max.sortOrder ?? 0) + 1;
      }
      const created = await model.create({ data });
      recordId = String(created.id);
      await recordAudit({ userId: user.id, action: "create", entityType: def.singular, entityId: recordId, label: String(created[def.titleField] ?? "") });
    }

    // 6. A renamed URL always leaves a redirect behind.
    if (oldPath && def.publicPath && data.slug) {
      const newPath = def.publicPath({ slug: String(data.slug), kind: (data.kind as string) ?? (existing?.kind as string) ?? null });
      await db.redirect.upsert({
        where: { fromPath: normalizePath(oldPath) },
        create: { fromPath: normalizePath(oldPath), toPath: newPath, statusCode: 301, origin: "SLUG_CHANGE", note: `Renamed from ${oldPath}` },
        update: { toPath: newPath, isActive: true },
      });
      invalidateRedirectCache();
    }

    revalidateFor(key);
    return { ok: true, id: String(recordId), message: existing ? "Saved." : "Created." };
  } catch (err) {
    if (err instanceof AuthError) return { ok: false, error: err.message };
    console.error(`save ${key} failed`, err);
    return { ok: false, error: "Something went wrong saving this. Nothing was changed." };
  }
}

export async function setEntityStatus(key: EntityKey, id: string, status: "DRAFT" | "PUBLISHED" | "ARCHIVED") {
  const def = getEntity(key);
  if (!def) return;
  const user = status === "PUBLISHED" ? await assertCapability("content.publish") : await assertCapability("content.edit");
  const model = delegate(def.model);
  const row = await model.findUnique({ where: { id } });
  if (!row) return;

  if (def.key === "testimonials" && status === "PUBLISHED" && !row.verifiedAt) {
    throw new Error("Verify this guest story before publishing it.");
  }

  await model.update({ where: { id }, data: { status, publishedAt: status === "PUBLISHED" ? (row.publishedAt as Date | null) ?? new Date() : null } });
  await recordAudit({
    userId: user.id,
    action: status === "PUBLISHED" ? "publish" : status === "ARCHIVED" ? "archive" : "unpublish",
    entityType: def.singular,
    entityId: id,
    label: String(row[def.titleField] ?? ""),
  });
  revalidateFor(key);
}

export async function deleteEntity(key: EntityKey, id: string) {
  const def = getEntity(key);
  if (!def) return;
  const user = await assertCapability("content.delete");
  const model = delegate(def.model);
  const row = await model.findUnique({ where: { id } });
  if (!row) return;

  // The public URL keeps working: deleting leaves a redirect to the index behind.
  if (def.publicPath && row.slug) {
    const path = def.publicPath({ slug: String(row.slug), kind: (row.kind as string) ?? null });
    const parent = `/${path.split("/")[1] ?? ""}`;
    await db.redirect.upsert({
      where: { fromPath: normalizePath(path) },
      create: { fromPath: normalizePath(path), toPath: parent, statusCode: 301, origin: "MANUAL", note: "Record deleted in admin" },
      update: { toPath: parent, isActive: true },
    });
    invalidateRedirectCache();
  }

  await model.delete({ where: { id } });
  await recordAudit({ userId: user.id, action: "delete", entityType: def.singular, entityId: id, label: String(row[def.titleField] ?? "") });
  revalidateFor(key);
  redirect(`/admin/${key}`);
}

export async function moveEntity(key: EntityKey, id: string, direction: "up" | "down") {
  const def = getEntity(key);
  if (!def?.hasOrder) return;
  const user = await assertCapability("content.edit");
  const model = delegate(def.model);
  const row = await model.findUnique({ where: { id } });
  if (!row) return;
  const current = Number(row.sortOrder ?? 0);
  const neighbour = await model.findFirst({
    where: direction === "up" ? { sortOrder: { lt: current } } : { sortOrder: { gt: current } },
    orderBy: { sortOrder: direction === "up" ? "desc" : "asc" },
  } as unknown);
  if (!neighbour) return;

  await db.$transaction([
    model.update({ where: { id }, data: { sortOrder: Number(neighbour.sortOrder ?? 0) } }) as unknown as Prisma.PrismaPromise<unknown>,
    model.update({ where: { id: neighbour.id }, data: { sortOrder: current } }) as unknown as Prisma.PrismaPromise<unknown>,
  ]);
  await recordAudit({ userId: user.id, action: "reorder", entityType: def.singular, entityId: id, label: String(row[def.titleField] ?? "") });
  revalidateFor(key);
}

export async function duplicateEntity(key: EntityKey, id: string) {
  const def = getEntity(key);
  if (!def) return;
  const user = await assertCapability("content.edit");
  const model = delegate(def.model);
  const row = await model.findUnique({ where: { id } });
  if (!row) return;

  const copy: Record<string, unknown> = { ...row };
  delete copy.id;
  delete copy.createdAt;
  delete copy.updatedAt;
  delete copy.seoId;
  copy.status = "DRAFT";
  copy.publishedAt = null;
  copy[def.titleField] = `${String(row[def.titleField] ?? "Untitled")} (copy)`;
  if (def.hasSlug) copy.slug = `${String(row.slug)}-copy-${Date.now().toString(36).slice(-4)}`;
  if (def.hasOrder) {
    const max = await model.aggregate({ _max: { sortOrder: true } } as unknown);
    copy.sortOrder = (max._max.sortOrder ?? 0) + 1;
  }

  const created = await model.create({ data: copy });
  await recordAudit({ userId: user.id, action: "duplicate", entityType: def.singular, entityId: String(created.id), label: String(copy[def.titleField] ?? "") });
  revalidateFor(key);
  redirect(`/admin/${key}/${created.id}`);
}
