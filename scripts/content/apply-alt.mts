/**
 * Applies docs/content/phase8-alt.json: alt text for images in the library.
 *
 *   npx tsx scripts/content/apply-alt.mts           # dry run
 *   npx tsx scripts/content/apply-alt.mts --write   # apply
 *
 * Only fills empty alt text; anything written in the CMS stays. Safe to re-run.
 */
import { readFile } from "node:fs/promises";
import { db, target } from "./db.mts";

const WRITE = process.argv.includes("--write");

async function main() {
  const file = JSON.parse(await readFile("docs/content/phase8-alt.json", "utf8")) as Record<string, string>;
  const entries = Object.entries(file).filter(([k]) => !k.startsWith("_"));
  const rows = await db.media.findMany({ where: { publicId: { in: entries.map(([k]) => k) } }, select: { id: true, publicId: true, altText: true } });
  const byId = new Map(rows.map((r) => [r.publicId, r]));

  const missing = entries.filter(([k]) => !byId.has(k)).map(([k]) => k);
  const todo = entries.filter(([k]) => byId.get(k) && !byId.get(k)!.altText);
  const kept = entries.length - missing.length - todo.length;

  console.log(`target: ${target}`);
  console.log(`alt text to write: ${todo.length} (already written, left alone: ${kept})`);
  if (missing.length) {
    console.log(`\nnot in the library — nothing written:\n  ${missing.join("\n  ")}`);
    process.exitCode = 1;
    return db.$disconnect();
  }
  if (!WRITE) {
    console.log("\n✓ valid. Dry run only — pass --write to apply.");
    return db.$disconnect();
  }
  const queue = [...todo];
  let done = 0;
  await Promise.all(
    Array.from({ length: 8 }, async () => {
      for (let e = queue.shift(); e; e = queue.shift()) {
        await db.media.update({ where: { id: byId.get(e[0])!.id }, data: { altText: e[1] } });
        done++;
      }
    }),
  );
  if (done) await db.auditLog.create({ data: { action: "media.alt", entityType: "Media", label: `${done} images` } });
  const left = await db.media.count({ where: { altText: "" } });
  console.log(`\n✓ ${done} written. Images still without alt text: ${left}`);
  await db.$disconnect();
}

main();
