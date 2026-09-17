"use server";

import { revalidatePath, updateTag } from "next/cache";
import { db } from "@/lib/db";
import { assertCapability, AuthError } from "@/lib/auth/session";
import { recordAudit } from "@/lib/audit";
import { deleteStoredMedia, storeMedia } from "@/lib/media/store";
import { TAGS } from "@/lib/content/tags";

export type MediaState = { ok: true; count: number } | { ok: false; error: string } | null;

const MAX_BYTES = 12 * 1024 * 1024;
const ACCEPTED = ["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"];

/** Vercel and other serverless hosts mount the project read-only; only /tmp is writable. */
function isReadOnlyDisk(err: unknown): boolean {
  const code = (err as { code?: string } | null)?.code;
  return code === "EROFS" || code === "EACCES" || (err instanceof Error && /read-only file system/i.test(err.message));
}

/** Uploads are processed server-side: rotated, capped at 2400px and re-encoded. */
export async function uploadMedia(_prev: MediaState, formData: FormData): Promise<MediaState> {
  try {
    const user = await assertCapability("media.upload");
    const files = formData.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
    if (!files.length) return { ok: false, error: "Choose at least one image." };

    let count = 0;
    for (const file of files) {
      if (!ACCEPTED.includes(file.type)) return { ok: false, error: `${file.name} is a ${file.type || "unknown"} file. Use JPEG, PNG, WebP or AVIF.` };
      if (file.size > MAX_BYTES) return { ok: false, error: `${file.name} is larger than 12MB. Export it smaller and try again.` };

      const buffer = Buffer.from(await file.arrayBuffer());
      const stored = await storeMedia(buffer, { filename: file.name, folder: "uploads" });
      const existing = await db.media.findUnique({ where: { sha256: stored.sha256 }, select: { id: true } });
      if (existing) continue; // same image already in the library

      await db.media.create({
        data: { ...stored, altText: "", title: file.name.replace(/\.[a-z0-9]+$/i, ""), folder: "uploads", licence: "OWNED" },
      });
      count++;
    }

    await recordAudit({ userId: user.id, action: "media.upload", entityType: "Media", label: `${count} images` });
    updateTag(TAGS.media);
    revalidatePath("/admin/media");
    return { ok: true, count };
  } catch (err) {
    if (err instanceof AuthError) return { ok: false, error: err.message };
    console.error("upload failed", err);
    // A preview host has no writable disk. Say so, rather than let the CMS look
    // broken to someone who was only trying to add a photograph.
    if (isReadOnlyDisk(err)) {
      return { ok: false, error: "This preview can't store new images yet. Everything else saves normally, and uploads will work once the site is on its own hosting." };
    }
    return { ok: false, error: "That upload didn't work. Try one image at a time." };
  }
}

export async function updateMedia(id: string, formData: FormData) {
  const user = await assertCapability("media.upload");
  const data = {
    altText: String(formData.get("altText") ?? "").trim().slice(0, 300),
    title: String(formData.get("title") ?? "").trim().slice(0, 200) || null,
    caption: String(formData.get("caption") ?? "").trim().slice(0, 500) || null,
    credit: String(formData.get("credit") ?? "").trim().slice(0, 200) || null,
    licence: (String(formData.get("licence") ?? "UNKNOWN") as "OWNED" | "LICENSED" | "UNKNOWN") ?? "UNKNOWN",
  };
  await db.media.update({ where: { id }, data });
  await recordAudit({ userId: user.id, action: "media.update", entityType: "Media", entityId: id, label: data.title ?? undefined });
  updateTag(TAGS.media);
  revalidatePath("/admin/media");
}

/** Deletes from the store and the database together, never one without the other. */
export async function deleteMedia(id: string) {
  const user = await assertCapability("media.delete");
  const media = await db.media.findUnique({ where: { id }, select: { id: true, provider: true, publicId: true, title: true } });
  if (!media) return;

  const uses = await countUsage(id);
  if (uses > 0) throw new Error(`That image is used on ${uses} ${uses === 1 ? "page" : "pages"}. Replace it there first.`);

  await deleteStoredMedia(media);
  await db.media.delete({ where: { id } });
  await recordAudit({ userId: user.id, action: "media.delete", entityType: "Media", entityId: id, label: media.title ?? undefined });
  updateTag(TAGS.media);
  revalidatePath("/admin/media");
}

export async function countUsage(id: string): Promise<number> {
  const [d, j, e, s, a, c, p, u, v, t] = await Promise.all([
    db.destination.count({ where: { heroId: id } }),
    db.journey.count({ where: { heroId: id } }),
    db.experience.count({ where: { heroId: id } }),
    db.service.count({ where: { heroId: id } }),
    db.article.count({ where: { heroId: id } }),
    db.category.count({ where: { heroId: id } }),
    db.page.count({ where: { heroId: id } }),
    db.mediaUsage.count({ where: { mediaId: id } }),
    db.vehicle.count({ where: { mediaId: id } }),
    db.seoMeta.count({ where: { OR: [{ ogImageId: id }, { twitterImageId: id }] } }),
  ]);
  return d + j + e + s + a + c + p + u + v + t;
}
