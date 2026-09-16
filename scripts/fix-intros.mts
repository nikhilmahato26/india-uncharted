/**
 * One-off repair: card intros imported from WordPress were cut on a character
 * count, so several end mid-word. Re-cut them from the same source paragraph at
 * a sentence boundary. Only shortens; never invents.
 *
 *   npx tsx scripts/fix-intros.mts [--write]
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { summarize } from "../src/lib/richtext/text";

const db = new PrismaClient({ adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }) });
const write = process.argv.includes("--write");

async function main() {
  let changed = 0;
  for (const model of ["destination", "journey", "experience", "service"] as const) {
    const rows = await (db[model] as { findMany: (a: unknown) => Promise<{ id: string; slug: string; shortDescription: string | null }[]> }).findMany({
      select: { id: true, slug: true, shortDescription: true },
    });
    for (const row of rows) {
      const current = row.shortDescription?.trim();
      // Only the clipped ones: an intro that ends on punctuation is whole.
      if (!current || current.length < 200 || /[.!?\u2026"'\u201d\u2019)]$/.test(current)) continue;
      const next = summarize(current, current.length - 1);
      if (next === current) continue;
      changed++;
      console.log(`${model}/${row.slug}\n  – ${current.slice(-70)}\n  + ${next.slice(-70)}`);
      if (write) {
        await (db[model] as { update: (a: unknown) => Promise<unknown> }).update({ where: { id: row.id }, data: { shortDescription: next } });
      }
    }
  }
  console.log(`${changed} intros ${write ? "repaired" : "would be repaired (pass --write)"}`);
  await db.$disconnect();
}
main();
