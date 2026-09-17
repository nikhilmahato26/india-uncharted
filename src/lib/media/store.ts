import { createHash } from "node:crypto";
import { mkdir, writeFile, unlink } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import { slugify } from "@/lib/slug";

/**
 * Media storage adapter, chosen by MEDIA_PROVIDER. Callers never know which is active.
 *
 * - `local` writes to public/media (development, or a host with a persistent disk).
 * - `cloudinary` uploads to the account in CLOUDINARY_CLOUD_NAME. Needed on Vercel,
 *   whose filesystem is read-only and discarded between requests.
 *
 * Both store the same processed image — rotated, capped, re-encoded, with a blur
 * placeholder — so a picture looks and behaves the same wherever it lives.
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

type Provider = "local" | "cloudinary";

function activeProvider(): Provider {
  const value = (process.env.MEDIA_PROVIDER ?? "local").trim();
  if (value === "local" || value === "cloudinary") return value;
  throw new Error(`MEDIA_PROVIDER "${value}" is not supported. Use "local" or "cloudinary".`);
}

/** The file name a stored image gets: readable, and unique by content. */
function baseName(opts: { filename: string; folder?: string }, hash: string) {
  const folder = slugify(opts.folder ?? "uploads") || "uploads";
  const base = slugify(opts.filename.replace(/\.[a-z0-9]+$/i, "")) || "image";
  return { folder, name: `${base}-${hash.slice(0, 8)}` };
}

export async function storeMedia(buffer: Buffer, opts: { filename: string; folder?: string }): Promise<StoredMedia> {
  const provider = activeProvider();
  const hash = sha256(buffer);
  const prepared = await prepare(buffer);
  const { folder, name } = baseName(opts, hash);
  const common = { width: prepared.width, height: prepared.height, format: prepared.format, bytes: prepared.data.length, blurDataUrl: prepared.blurDataUrl, sha256: hash };

  if (provider === "cloudinary") {
    const uploaded = await cloudinaryUpload(prepared.data, prepared.format, `${folder}/${name}`);
    return { provider, publicId: uploaded.public_id, url: uploaded.secure_url, ...common, width: uploaded.width, height: uploaded.height, bytes: uploaded.bytes };
  }

  const publicId = `${folder}/${name}.${prepared.format}`;
  const diskPath = path.join(process.cwd(), "public/media", publicId);
  await mkdir(path.dirname(diskPath), { recursive: true });
  await writeFile(diskPath, prepared.data);
  return { provider, publicId, url: `/media/${publicId}`, ...common };
}

/**
 * Removes the stored file. Each record is deleted from where it actually lives,
 * whatever MEDIA_PROVIDER says today, so switching providers never strands files.
 */
export async function deleteStoredMedia(media: { provider: string; publicId: string }) {
  if (media.provider === "cloudinary") {
    await cloudinaryDestroy(media.publicId);
    return;
  }
  if (media.provider === "local") {
    await unlink(path.join(process.cwd(), "public/media", media.publicId)).catch(() => {});
  }
}

// ─── Cloudinary ─────────────────────────────────────────────────────────────

type CloudinaryConfig = { cloudName: string; apiKey: string; apiSecret: string; root: string };

function cloudinaryConfig(): CloudinaryConfig {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME?.trim();
  const apiKey = process.env.CLOUDINARY_API_KEY?.trim();
  const apiSecret = process.env.CLOUDINARY_API_SECRET?.trim();
  if (!cloudName || !apiKey || !apiSecret) {
    throw new Error("MEDIA_PROVIDER is cloudinary but CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY or CLOUDINARY_API_SECRET is missing.");
  }
  // Everything this site uploads sits under one folder, so the account stays tidy
  // if it is ever shared with anything else.
  const root = slugify(process.env.CLOUDINARY_FOLDER ?? "india-uncharted") || "india-uncharted";
  return { cloudName, apiKey, apiSecret, root };
}

/**
 * Cloudinary's request signature: the signed parameters sorted by name, joined
 * as key=value pairs with "&", the API secret appended, then SHA-1. The file,
 * api_key, cloud name and resource type are never part of it.
 */
export function cloudinarySignature(params: Record<string, string | number | boolean>, apiSecret: string): string {
  const payload = Object.keys(params)
    .filter((key) => params[key] !== "" && params[key] !== undefined)
    .sort()
    .map((key) => `${key}=${params[key]}`)
    .join("&");
  return createHash("sha1").update(payload + apiSecret).digest("hex");
}

async function cloudinaryCall<T>(endpoint: "upload" | "destroy", params: Record<string, string | number | boolean>, file?: { data: Buffer; mime: string }): Promise<T> {
  const config = cloudinaryConfig();
  const signed = { ...params, timestamp: Math.floor(Date.now() / 1000) };
  const form = new FormData();
  for (const [key, value] of Object.entries(signed)) form.append(key, String(value));
  form.append("api_key", config.apiKey);
  form.append("signature", cloudinarySignature(signed, config.apiSecret));
  if (file) form.append("file", new Blob([new Uint8Array(file.data)], { type: file.mime }));

  const res = await fetch(`https://api.cloudinary.com/v1_1/${config.cloudName}/image/${endpoint}`, { method: "POST", body: form });
  const body = (await res.json().catch(() => ({}))) as T & { error?: { message?: string } };
  if (!res.ok || body.error) {
    throw new Error(`Cloudinary ${endpoint} failed (${res.status}): ${body.error?.message ?? "no details"}`);
  }
  return body;
}

type UploadResult = { public_id: string; secure_url: string; width: number; height: number; bytes: number };

async function cloudinaryUpload(data: Buffer, format: string, name: string): Promise<UploadResult> {
  const { root } = cloudinaryConfig();
  return cloudinaryCall<UploadResult>(
    "upload",
    // An explicit public_id and overwrite=false: the name already carries the
    // content hash, so the same picture uploaded twice can never replace another.
    { public_id: `${root}/${name}`, overwrite: false },
    { data, mime: format === "webp" ? "image/webp" : "image/jpeg" },
  );
}

async function cloudinaryDestroy(publicId: string) {
  // invalidate=true clears the CDN copy too, so a deleted picture stops being served.
  const result = await cloudinaryCall<{ result: string }>("destroy", { public_id: publicId, invalidate: true });
  if (result.result !== "ok" && result.result !== "not found") {
    throw new Error(`Cloudinary could not delete ${publicId}: ${result.result}`);
  }
}
