import { createHash } from "node:crypto";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { slugify } from "@/lib/slug";

/**
 * Media storage adapter. `local` writes to public/media/uploads (development and
 * single-server hosting). A Cloudinary adapter implements the same two functions;
 * callers never know which one is active (MEDIA_PROVIDER).
 */

export type StoredMedia = {
  provider: string;
  publicId: string;
  url: string;
  width: number;
  height: number;
  format: string;
  bytes: number;
  blurDataUrl: string;
  sha256: string;
};

const MAX_EDGE = 2400;

export function sha256(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}

/** Normalise any upload: rotate by EXIF, cap the long edge, strip metadata, re-encode. */
async function prepare(buffer: Buffer) {
  const image = sharp(buffer, { failOn: "none" }).rotate();
  const meta = await image.metadata();
  const hasAlpha = Boolean(meta.hasAlpha);
  const pipeline = image.resize({ width: MAX_EDGE, height: MAX_EDGE, fit: "inside", withoutEnlargement: true });
  const out = hasAlpha
    ? await pipeline.webp({ quality: 86 }).toBuffer({ resolveWithObject: true })
    : await pipeline.jpeg({ quality: 84, mozjpeg: true }).toBuffer({ resolveWithObject: true });
  const blur = await sharp(out.data).resize(16, 16, { fit: "inside" }).webp({ quality: 40 }).toBuffer();
  return {
    data: out.data,
    width: out.info.width,
    height: out.info.height,
    format: hasAlpha ? "webp" : "jpg",
    blurDataUrl: `data:image/webp;base64,${blur.toString("base64")}`,
  };
}

export async function storeMedia(buffer: Buffer, opts: { filename: string; folder?: string }): Promise<StoredMedia> {
  const provider = process.env.MEDIA_PROVIDER ?? "local";
  if (provider !== "local") {
    throw new Error(`MEDIA_PROVIDER "${provider}" is not configured yet. Use "local" until Cloudinary keys are available.`);
  }
  const hash = sha256(buffer);
  const prepared = await prepare(buffer);
  const folder = slugify(opts.folder ?? "uploads") || "uploads";
  const base = slugify(opts.filename.replace(/\.[a-z0-9]+$/i, "")) || "image";
  const publicId = `${folder}/${base}-${hash.slice(0, 8)}.${prepared.format}`;
  const diskPath = path.join(process.cwd(), "public/media", publicId);
  await mkdir(path.dirname(diskPath), { recursive: true });
  await writeFile(diskPath, prepared.data);
  return {
    provider,
    publicId,
    url: `/media/${publicId}`,
    width: prepared.width,
    height: prepared.height,
    format: prepared.format,
    bytes: prepared.data.length,
    blurDataUrl: prepared.blurDataUrl,
    sha256: hash,
  };
}

export async function deleteStoredMedia(media: { provider: string; publicId: string }) {
  if (media.provider === "local") {
    await unlink(path.join(process.cwd(), "public/media", media.publicId)).catch(() => {});
  }
}
