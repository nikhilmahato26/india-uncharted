/**
 * Puts back the photographs the old site actually used as heroes on ten pages.
 *
 * The importer keyed uploads without their extension, so 1-1.webp (a journey
 * photo) and 1-1.png (a car on the transfers page) collapsed into one, and the
 * journey got the car. Four more pages fell back to a shared AI collage because
 * their real hero was never downloaded. See uploadKey() in the importer.
 *
 *   npx tsx scripts/content/repair-heroes.mts           # dry run: fetch and report
 *   npx tsx scripts/content/repair-heroes.mts --write   # store images, reassign heroes
 *
 * A hero is only reassigned while it still holds the wrong image. If someone has
 * chosen a different picture in the CMS since, that choice stands.
 */
import sharp from "sharp";
import { db, target } from "./db.mts";
import { storeMedia } from "../../src/lib/media/store";

const WRITE = process.argv.includes("--write");
const ORIGIN = "https://indiauncharted.com/wp-content/uploads/";

type Fix = { model: "journey" | "destination" | "experience"; slug: string; original: string; wrongIf: RegExp };

const COLLAGE = /ChatGPT-Image-May-5-2026-04_22_13-PM\.png$/i;
const FIXES: Fix[] = [
  { model: "journey", slug: "jaisalmer-jodhpur-student-group-tour-package-5-days-4-nights", original: "2026/05/1-1.webp", wrongIf: /2026\/05\/1-1\.(png|jpe?g)$/i },
  { model: "journey", slug: "kashmir-honeymoon-tour-package-7-days-6-nights", original: "2026/05/1-2.webp", wrongIf: /2026\/05\/1-2\.(png|jpe?g)$/i },
  { model: "journey", slug: "kashmir-nature-relaxation-family-tour-8-days-7-nights", original: "2026/05/1-3.webp", wrongIf: /2026\/05\/1-3\.(png|jpe?g)$/i },
  { model: "journey", slug: "long-term-paragliding-certification-course-in-himachal-pradesh", original: "2026/05/1-4.webp", wrongIf: /2026\/05\/1-4\.(png|jpe?g)$/i },
  { model: "destination", slug: "agra", original: "2026/05/1.webp", wrongIf: /2026\/05\/1\.(png|jpe?g)$/i },
  { model: "experience", slug: "agra-walking-tour-heritage-markets-mughal-culture-experience", original: "2026/05/1.webp", wrongIf: /2026\/05\/1\.(png|jpe?g)$/i },
  { model: "journey", slug: "200-hour-yoga-teacher-training-course-ttc-in-rishikesh", original: "2026/02/dd.jpg", wrongIf: COLLAGE },
  { model: "journey", slug: "300-hour-yoga-teacher-training-course-ttc-in-rishikesh", original: "2026/02/dd.jpg", wrongIf: COLLAGE },
  { model: "journey", slug: "2-nights-3-days-golden-city-jaisalmer-tour-package", original: "2026/02/D-1.jpg", wrongIf: COLLAGE },
  { model: "experience", slug: "highlights-of-jaisalmer-guided-full-day-city-sightseeing-tour", original: "2026/02/D-1.jpg", wrongIf: COLLAGE },
];

type HeroRow = { id: string; name: string; hero: { id: string; sourceUrl: string | null } | null };

async function loadRow(fix: Fix): Promise<HeroRow | null> {
  const delegate = db[fix.model] as unknown as { findFirst: (a: unknown) => Promise<HeroRow | null> };
  return delegate.findFirst({ where: { slug: fix.slug }, select: { id: true, name: true, hero: { select: { id: true, sourceUrl: true } } } });
}

/** The media row for an original upload: reused if already in the library, else fetched and stored. */
const resolved = new Map<string, { id: string | null; note: string }>();
async function mediaFor(path: string): Promise<{ id: string | null; note: string }> {
  if (resolved.has(path)) return resolved.get(path)!;
  const url = ORIGIN + path;
  const known = await db.media.findFirst({ where: { sourceUrl: url }, select: { id: true, width: true, height: true } });
  if (known) {
    const r = { id: known.id, note: `already in library (${known.width}x${known.height})` };
    resolved.set(path, r);
    return r;
  }
  const res = await fetch(url, { headers: { "User-Agent": "IndiaUncharted-Migration/1.0" } });
  if (!res.ok) {
    const r = { id: null, note: `download failed: HTTP ${res.status}` };
    resolved.set(path, r);
    return r;
  }
  const buffer = Buffer.from(await res.arrayBuffer());
  const meta = await sharp(buffer).metadata();
  if (!WRITE) {
    const r = { id: null, note: `downloadable (${meta.width}x${meta.height} ${meta.format})` };
    resolved.set(path, r);
    return r;
  }
  const stored = await storeMedia(buffer, { filename: decodeURIComponent(path.split("/").pop()!), folder: "wp" });
  const dup = await db.media.findUnique({ where: { sha256: stored.sha256 }, select: { id: true } });
  const id =
    dup?.id ??
    (
      await db.media.create({
        data: { ...stored, altText: "", licence: "UNKNOWN", folder: "wp", sourceUrl: url },
        select: { id: true },
      })
    ).id;
  const r = { id, note: dup ? "identical image already in library" : `stored (${stored.width}x${stored.height})` };
  resolved.set(path, r);
  return r;
}

async function main() {
  console.log(`target: ${target}${WRITE ? "" : "  (dry run)"}\n`);
  let changed = 0;
  let kept = 0;
  const failed: string[] = [];
  for (const fix of FIXES) {
    const row = await loadRow(fix);
    if (!row) {
      failed.push(`${fix.model}/${fix.slug}: no such record`);
      continue;
    }
    const current = row.hero?.sourceUrl ?? "(none)";
    if (!fix.wrongIf.test(current)) {
      kept++;
      console.log(`· ${row.name}\n    hero is no longer the wrong image (${current.replace(ORIGIN, "")}) — left alone`);
      continue;
    }
    const media = await mediaFor(fix.original);
    console.log(`→ ${row.name}\n    ${current.replace(ORIGIN, "")}  ⇒  ${fix.original}   [${media.note}]`);
    if (!WRITE) continue;
    if (!media.id) {
      failed.push(`${row.name}: ${media.note}`);
      continue;
    }
    const delegate = db[fix.model] as unknown as { update: (a: unknown) => Promise<unknown> };
    await delegate.update({ where: { id: row.id }, data: { heroId: media.id } });
    changed++;
  }
  if (WRITE) {
    await db.auditLog.create({ data: { action: "content.pass", entityType: "Media", label: `restored ${changed} original hero photographs lost in the WordPress import` } });
    console.log(`\n✓ ${changed} heroes restored, ${kept} left alone.`);
  } else {
    console.log(`\n${FIXES.length - kept} would change, ${kept} left alone. Pass --write to apply.`);
  }
  if (failed.length) {
    console.log(`\nproblems:\n  ${failed.join("\n  ")}`);
    process.exitCode = 1;
  }
  await db.$disconnect();
}

main();
