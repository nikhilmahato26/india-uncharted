"use server";

import { updateTag } from "next/cache";
import { db } from "@/lib/db";
import { assertCapability, AuthError } from "@/lib/auth/session";
import { recordAudit } from "@/lib/audit";
import { TAGS } from "@/lib/content/tags";
import { sectionSchemas, type SectionTypeKey } from "@/lib/sections/schemas";
import { SECTION_EDITOR, isEditableSectionType, isSafeLink, sectionTitle, type EditorField } from "@/lib/sections/editor";
import type { Prisma } from "@/generated/prisma/client";

/**
 * Homepage sections. Words, pictures and links need content.edit; changing what
 * appears — order, visibility, adding — needs content.publish; removing needs
 * content.delete. The same rule the journeys and destinations follow.
 */

export type SectionSaveState = { ok: true; message: string } | { ok: false; error: string; fieldErrors?: Record<string, string> } | null;

async function homePageId(): Promise<string> {
  const page = await db.page.findFirst({ where: { key: "home" }, select: { id: true } });
  if (!page) throw new Error("The homepage record is missing. Run the seed.");
  return page.id;
}

function invalidate() {
  updateTag(TAGS.sections);
  updateTag(TAGS.pages);
}

function describe(err: unknown): string {
  if (err instanceof AuthError) return err.message === "forbidden" ? "Your role can't make this change." : "Please sign in again.";
  return err instanceof Error ? err.message : "That didn't work.";
}

/** Reads one editor field from the form. `undefined` means "clear it"; absent means "leave it". */
async function readField(field: EditorField, form: FormData): Promise<{ present: boolean; value?: unknown; error?: string }> {
  if (field.kind === "destination-slots") {
    if (!form.has(`${field.name}__present`)) return { present: false };
    const slugs = [...new Set(form.getAll(field.name).map(String).map((s) => s.trim()).filter(Boolean))].slice(0, 12);
    if (!slugs.length) return { present: true, value: undefined };
    const found = await db.destination.findMany({ where: { slug: { in: slugs }, status: "PUBLISHED", heroId: { not: null } }, select: { slug: true } });
    const missing = slugs.filter((s) => !found.some((f) => f.slug === s));
    if (missing.length) return { present: true, error: `Not published or without a photograph: ${missing.join(", ")}.` };
    return { present: true, value: slugs };
  }

  if (!form.has(field.name)) return { present: false };
  const raw = String(form.get(field.name) ?? "").trim();
  if (raw === "") return { present: true, value: undefined };

  switch (field.kind) {
    case "number": {
      const n = Number(raw);
      if (!Number.isInteger(n) || (field.min !== undefined && n < field.min) || (field.max !== undefined && n > field.max)) {
        return { present: true, error: `Use a whole number from ${field.min} to ${field.max}.` };
      }
      return { present: true, value: n };
    }
    case "link":
      return isSafeLink(raw) ? { present: true, value: raw } : { present: true, error: "Use a page on this site, starting with /, or a full https:// address." };
    case "select":
      return field.options?.some((o) => o.value === raw) ? { present: true, value: raw } : { present: true, error: "Choose one of the options." };
    case "media": {
      const exists = await db.media.findUnique({ where: { id: raw }, select: { id: true } });
      return exists ? { present: true, value: raw } : { present: true, error: "That image is no longer in the library." };
    }
    case "travel-style": {
      const exists = await db.category.findFirst({ where: { type: "TRAVEL_STYLE", slug: raw }, select: { id: true } });
      return exists ? { present: true, value: raw } : { present: true, error: "That travel style no longer exists." };
    }
    default:
      if (field.max && raw.length > field.max) return { present: true, error: `Keep this under ${field.max} characters (now ${raw.length}).` };
      return { present: true, value: raw };
  }
}

export async function saveSection(sectionId: string, _prev: SectionSaveState, form: FormData): Promise<SectionSaveState> {
  try {
    const user = await assertCapability("content.edit");
    const section = await db.section.findUnique({ where: { id: sectionId }, select: { id: true, type: true, props: true, isVisible: true } });
    if (!section) return { ok: false, error: "This section no longer exists. Reload the page." };
    if (!isEditableSectionType(section.type)) return { ok: false, error: "This kind of section can't be edited here." };

    const existing = (section.props ?? {}) as Record<string, unknown>;
    const next: Record<string, unknown> = { ...existing };
    const fieldErrors: Record<string, string> = {};
    for (const field of SECTION_EDITOR[section.type].fields) {
      const read = await readField(field, form);
      if (!read.present) continue;
      if (read.error) fieldErrors[field.name] = read.error;
      else if (read.value === undefined) delete next[field.name];
      else next[field.name] = read.value;
    }
    // A chosen list of places only makes sense with the "places I choose" source.
    if (section.type === "DESTINATION_GRID" && next.source !== "manual") delete next.slugs;
    if (Object.keys(fieldErrors).length) return { ok: false, error: "Some fields need attention.", fieldErrors };

    // The renderer validates with the same schema, so a section that saves always renders.
    const parsed = sectionSchemas[section.type as SectionTypeKey].safeParse(next);
    if (!parsed.success) {
      const errors: Record<string, string> = {};
      for (const issue of parsed.error.issues) errors[String(issue.path[0] ?? "form")] = issue.message;
      return { ok: false, error: "Some fields need attention.", fieldErrors: errors };
    }

    const props = parsed.data as Prisma.InputJsonValue;
    const changed = Object.keys({ ...existing, ...(parsed.data as object) }).filter((k) => JSON.stringify(existing[k]) !== JSON.stringify((parsed.data as Record<string, unknown>)[k]));
    await db.section.update({ where: { id: section.id }, data: { props } });
    await recordAudit({ userId: user.id, action: "section.update", entityType: "Section", entityId: section.id, label: sectionTitle(section.type, parsed.data as Record<string, unknown>), diff: Object.fromEntries(changed.map((k) => [k, { from: existing[k] ?? null, to: (parsed.data as Record<string, unknown>)[k] ?? null }])) });
    invalidate();
    return { ok: true, message: section.isVisible ? "Saved. It's live on the homepage." : "Saved. This section is hidden — switch it on to show it." };
  } catch (err) {
    return { ok: false, error: describe(err) };
  }
}

/** Renumbers every section 0…n on each move, so two rows can never share a position and stick. */
export async function moveSection(sectionId: string, direction: "up" | "down") {
  const user = await assertCapability("content.publish");
  const ownerId = await homePageId();
  const rows = await db.section.findMany({ where: { ownerType: "PAGE", ownerId }, orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }], select: { id: true, type: true, props: true } });
  const from = rows.findIndex((r) => r.id === sectionId);
  const to = direction === "up" ? from - 1 : from + 1;
  if (from < 0 || to < 0 || to >= rows.length) return;
  const [moved] = rows.splice(from, 1);
  rows.splice(to, 0, moved!);
  await db.$transaction(rows.map((r, i) => db.section.update({ where: { id: r.id }, data: { sortOrder: i } })));
  await recordAudit({ userId: user.id, action: "section.move", entityType: "Section", entityId: sectionId, label: sectionTitle(moved!.type, (moved!.props ?? {}) as Record<string, unknown>) });
  invalidate();
}

export async function setSectionVisible(sectionId: string, visible: boolean) {
  const user = await assertCapability("content.publish");
  const s = await db.section.update({ where: { id: sectionId }, data: { isVisible: visible }, select: { type: true, props: true } });
  await recordAudit({ userId: user.id, action: visible ? "section.show" : "section.hide", entityType: "Section", entityId: sectionId, label: sectionTitle(s.type, (s.props ?? {}) as Record<string, unknown>) });
  invalidate();
}

/** New sections start hidden, so a half-written one never appears on the live site. */
export async function addSection(type: string): Promise<{ id: string }> {
  const user = await assertCapability("content.publish");
  if (!isEditableSectionType(type)) throw new Error("That kind of section can't be added here.");
  const ownerId = await homePageId();
  const last = await db.section.findFirst({ where: { ownerType: "PAGE", ownerId }, orderBy: { sortOrder: "desc" }, select: { sortOrder: true } });
  const defaults = sectionSchemas[type].parse(type === "DESTINATION_GRID" ? { source: "offbeat" } : {}) as Prisma.InputJsonValue;
  const created = await db.section.create({
    data: { ownerType: "PAGE", ownerId, type, props: defaults, isVisible: false, sortOrder: (last?.sortOrder ?? -1) + 1 },
    select: { id: true },
  });
  await recordAudit({ userId: user.id, action: "section.create", entityType: "Section", entityId: created.id, label: SECTION_EDITOR[type].label });
  invalidate();
  return created;
}

export async function deleteSection(sectionId: string) {
  const user = await assertCapability("content.delete");
  const s = await db.section.delete({ where: { id: sectionId }, select: { type: true, props: true } });
  await recordAudit({ userId: user.id, action: "section.delete", entityType: "Section", entityId: sectionId, label: sectionTitle(s.type, (s.props ?? {}) as Record<string, unknown>) });
  invalidate();
}
