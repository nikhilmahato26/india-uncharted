/**
 * Repairs imported best-time text whose line breaks were lost, so an arrow list
 * ("March to June → Pleasant weather") read as one run-on sentence. Inserts the
 * breaks back and fixes one stray capital. Never rewords the client's copy.
 *
 *   npx tsx scripts/content/repair-journey-text.mts [--write]
 */
import { db, target } from "./db.mts";

const WRITE = process.argv.includes("--write");
const MONTH = "(?:January|February|March|April|May|June|July|August|September|October|November|December)";
const ARROW_ITEM = new RegExp(`\\s+(?=${MONTH}\\s+to\\s+${MONTH}\\s*→)`, "g");

function repair(text: string): string {
  // Line by line: a line holding two or more "Month to Month →" items has lost its breaks.
  const items = new RegExp(`${MONTH}\\s+to\\s+${MONTH}\\s*→`, "g");
  const out = text
    .split("\n")
    .map((line) => ((line.match(items) ?? []).length > 1 ? line.replace(ARROW_ITEM, "\n") : line))
    .join("\n");
  return out.replace(/\badventurE\./g, "adventure.");
}

async function main() {
  const rows = await db.journey.findMany({ where: { bestTime: { not: null } }, select: { id: true, name: true, bestTime: true } });
  const changes = rows.map((r) => ({ ...r, next: repair(r.bestTime!) })).filter((r) => r.next !== r.bestTime);
  console.log(`target: ${target}\n${changes.length} journeys to repair\n`);
  for (const c of changes) console.log(`${c.name}\n  before: ${JSON.stringify(c.bestTime)}\n  after:  ${JSON.stringify(c.next)}\n`);
  if (WRITE) {
    for (const c of changes) await db.journey.update({ where: { id: c.id }, data: { bestTime: c.next } });
    console.log(`✓ ${changes.length} written`);
  } else console.log("Dry run only — pass --write to apply.");
  await db.$disconnect();
}
main();
