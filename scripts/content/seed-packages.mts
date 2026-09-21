/**
 * Seeds the Thar and Goa catalogues.
 *
 *   npx tsx scripts/content/seed-packages.mts            # dry run — prints what would change
 *   npx tsx scripts/content/seed-packages.mts --write    # apply
 *   npx tsx scripts/content/seed-packages.mts --write --only=goa
 *
 * Re-runnable. Records are matched by slug: copy fields are rewritten from the
 * data files, but a hero chosen in the CMS is never overwritten, because the
 * pooled images here are stand-ins for photography the client has not supplied
 * yet and the CMS is where the real ones will land.
 */
import type { Prisma } from "../../src/generated/prisma/client";
import { db, target } from "./db.mts";
import type { CategorySeed, DestinationSeed, ExperienceSeed, ImagePool, JourneySeed } from "./data/types";
import { goaCategories, goaDestinations, goaExperiences, goaJourneys } from "./data/goa";
import { tharCategories, tharDestinations, tharExperiences, tharJourneys } from "./data/thar";

const WRITE = process.argv.includes("--write");
const ONLY = process.argv.find((a) => a.startsWith("--only="))?.slice(7);

/**
 * Each pool holds only images that honestly show what the cards in it are about.
 * Where the library has nothing for a subject (Goan food, mangroves) the pool
 * falls back to general Goa scenery rather than to a photograph of somewhere
 * else — a card is better generic than wrong.
 */
const POOLS: Record<ImagePool, string[]> = {
  "thar-dunes": ["wp/jaisalmer124-68b9bcfb.jpg", "wp/117-8559b878.jpg", "wp/1-1-2-482c2dfc.jpg", "wp/ddd-scaled-92114c47.jpg"],
  "thar-camp": ["wp/1-1-2-482c2dfc.jpg", "wp/ddd-scaled-92114c47.jpg", "wp/117-8559b878.jpg", "wp/jaisalmer124-68b9bcfb.jpg"],
  jaisalmer: ["wp/d-1-dee37952.jpg", "wp/109-5739fc78.jpg", "wp/d-1-2c2f44f0.jpg", "wp/chatgpt-image-may-5-2026-04-18-48-pm-a809538a.jpg"],
  jodhpur: ["wp/638950851627807945-temp-871dcd16.jpg", "wp/1-1-e1339479.jpg", "wp/jodhpur23e3-6a73e359.jpg", "wp/2-a06285ae.jpg"],
  "rajasthan-culture": ["wp/jodq-1ed94624.jpg", "wp/106-4e36aa3d.jpg", "wp/112-78fba4ea.jpg"],
  "goa-beach": ["wp/goa3-scaled-f677074e.jpg", "wp/untitled-design-20260623-235416-0000-e38917d5.jpg", "wp/goa4-1-dd5cb67f.jpg", "wp/goa2-f14bea1e.jpg"],
  "goa-yoga": ["wp/goa1-cae9855c.jpg", "wp/goa2-f14bea1e.jpg", "wp/chatgpt-image-jun-20-2026-07-26-11-pm-1-450c5c68.jpg", "wp/dsc05808-hdr-1-scaled-df0ed990.jpg"],
  "goa-wellness": [
    "wp/dd-053fde32.jpg",
    "wp/cuwkgys1fjyy4icj-g9bjjnjcu-okgwknge-5ci7qyfazcc4yso0zzfrauzwn1u7nrb4akt4ngofxaegicogsqi3vdrnnk7vy-8qviunviuixfi0b5aknb1z-a740b9c7.jpg",
    "wp/638948389753243735-1d40a778.jpg",
    "wp/g-1-3304c7d5.jpg",
  ],
  "goa-heritage": ["wp/gia-3ff81dde.jpg", "wp/goa4-1-dd5cb67f.jpg"],
  "goa-nature": ["wp/goa4-1-dd5cb67f.jpg", "wp/goa3-scaled-f677074e.jpg"],
  "goa-luxury": ["wp/pasco-photography-2-scaled-7c9f53bf.jpg", "wp/goa4-1-dd5cb67f.jpg", "wp/untitled-design-20260623-235416-0000-e38917d5.jpg"],
  "goa-food": ["wp/goa4-1-dd5cb67f.jpg", "wp/goa3-scaled-f677074e.jpg"],
};

const mediaIds = new Map<string, string>();
const poolCursor = new Map<ImagePool, number>();

/** Rotates within a pool so that neighbouring cards do not show the same photograph. */
function nextHeroId(pool: ImagePool): string | null {
  const publicIds = POOLS[pool].filter((p) => mediaIds.has(p));
  if (!publicIds.length) return null;
  const i = poolCursor.get(pool) ?? 0;
  poolCursor.set(pool, i + 1);
  return mediaIds.get(publicIds[i % publicIds.length]!) ?? null;
}

function doc(paragraphs: string[]): Prisma.InputJsonValue {
  return { type: "doc", content: paragraphs.map((p) => ({ type: "paragraph", content: [{ type: "text", text: p }] })) };
}

const counts = { categories: 0, destinations: 0, experiences: 0, journeys: 0, skipped: [] as string[] };

/**
 * A dry run creates nothing, so a later lookup for a destination or category
 * this run would have made finds nothing either. These stand in for them, which
 * is what makes the dry run a real check of the data rather than a list of
 * things that are missing only because we did not write them.
 */
const planned = { destinations: new Set<string>(), categories: new Set<string>() };

/**
 * Caches, not convenience: the database is Neon, every lookup is a network
 * round trip, and resolving stops and themes per record turned a ten-second
 * run into a ten-minute one. Both caches are refreshed after each write phase.
 */
const destinationIds = new Map<string, string>();
const categoryIds = new Map<string, string>();

async function refreshLookups() {
  for (const d of await db.destination.findMany({ select: { id: true, slug: true } })) destinationIds.set(d.slug, d.id);
  for (const c of await db.category.findMany({ select: { id: true, slug: true, type: true } })) categoryIds.set(`${c.type}:${c.slug}`, c.id);
}

function resolveDestinations(slugs: string[]): { rows: { id: string; slug: string }[]; missing: string[] } {
  const rows: { id: string; slug: string }[] = [];
  const missing: string[] = [];
  for (const slug of slugs) {
    const id = destinationIds.get(slug);
    if (id) rows.push({ id, slug });
    else if (planned.destinations.has(slug)) rows.push({ id: `planned:${slug}`, slug });
    else missing.push(slug);
  }
  return { rows, missing };
}

function resolveCategories(type: "TRAVEL_STYLE" | "EXPERIENCE_THEME", slugs: string[]) {
  const rows: { id: string; slug: string }[] = [];
  const missing: string[] = [];
  for (const slug of slugs) {
    const id = categoryIds.get(`${type}:${slug}`);
    if (id) rows.push({ id, slug });
    else if (planned.categories.has(`${type}:${slug}`)) rows.push({ id: `planned:${slug}`, slug });
    else missing.push(slug);
  }
  return { rows, missing };
}

async function seedCategories(rows: CategorySeed[]) {
  for (const c of rows) {
    planned.categories.add(`${c.type}:${c.slug}`);
    if (categoryIds.has(`${c.type}:${c.slug}`)) continue;
    counts.categories++;
    if (!WRITE) continue;
    const max = await db.category.aggregate({ where: { type: c.type }, _max: { sortOrder: true } });
    const row = await db.category.create({
      data: { type: c.type, slug: c.slug, name: c.name, intro: c.intro, status: "PUBLISHED", sortOrder: (max._max.sortOrder ?? 0) + 1 },
    });
    categoryIds.set(`${c.type}:${c.slug}`, row.id);
  }
}

async function seedDestinations(rows: DestinationSeed[]) {
  for (const [i, d] of rows.entries()) {
    planned.destinations.add(d.slug);
    const region = await db.region.findUnique({ where: { slug: d.region }, select: { id: true } });
    if (!region) counts.skipped.push(`destination ${d.slug}: no region "${d.region}"`);
    const parentId = d.parent ? (destinationIds.get(d.parent) ?? null) : null;
    if (d.parent && !parentId) counts.skipped.push(`destination ${d.slug}: no parent "${d.parent}"`);
    const existing = await db.destination.findUnique({ where: { slug: d.slug }, select: { id: true, heroId: true } });
    counts.destinations++;
    if (!WRITE) continue;

    const heroId = existing?.heroId ?? nextHeroId(d.image);
    const data = {
      name: d.name,
      title: d.title ?? null,
      type: d.type,
      state: d.state,
      regionId: region?.id ?? null,
      parentId,
      latitude: d.latitude ?? null,
      longitude: d.longitude ?? null,
      shortDescription: d.short,
      intro: doc(d.intro),
      whyVisit: d.whyVisit ? doc(d.whyVisit) : undefined,
      bestTime: d.bestTime,
      recommendedDuration: d.recommendedDuration,
      howToReach: d.howToReach ?? null,
      heroId,
      status: "PUBLISHED" as const,
      publishedAt: new Date(),
      sortOrder: i,
    };
    const row = await db.destination.upsert({ where: { slug: d.slug }, create: { slug: d.slug, ...data }, update: data });
    destinationIds.set(d.slug, row.id);

    await db.destinationHighlight.deleteMany({ where: { destinationId: row.id, kind: "PLACE_TO_VISIT" } });
    await db.destinationHighlight.createMany({
      data: d.places.map((p, n) => ({ destinationId: row.id, kind: "PLACE_TO_VISIT" as const, title: p.title, body: p.body, sortOrder: n })),
    });
  }
}

async function seedExperiences(rows: ExperienceSeed[]) {
  for (const [i, e] of rows.entries()) {
    const dest = resolveDestinations([e.destination]);
    if (dest.missing.length) {
      counts.skipped.push(`experience ${e.slug}: no destination "${e.destination}"`);
      continue;
    }
    const { rows: themes, missing } = resolveCategories("EXPERIENCE_THEME", e.themes);
    if (missing.length) counts.skipped.push(`experience ${e.slug}: unknown themes ${missing.join(", ")}`);

    const existing = await db.experience.findUnique({ where: { slug: e.slug }, select: { id: true, heroId: true } });
    counts.experiences++;
    if (!WRITE) continue;

    const heroId = existing?.heroId ?? nextHeroId(e.image);
    const data = {
      name: e.name,
      format: e.format,
      destinationId: dest.rows[0]!.id,
      location: e.location,
      duration: e.duration,
      bestTime: e.bestTime,
      shortDescription: e.short,
      overview: doc(e.body),
      idealFor: e.idealFor,
      tourType: "Private / On Demand",
      highlights: e.highlights,
      inclusions: e.inclusions,
      quoteOnly: true,
      heroId,
      status: "PUBLISHED" as const,
      publishedAt: new Date(),
      sortOrder: i,
    };
    const row = await db.experience.upsert({ where: { slug: e.slug }, create: { slug: e.slug, ...data }, update: data });

    await db.experienceTheme.deleteMany({ where: { experienceId: row.id } });
    await db.experienceTheme.createMany({
      data: themes
        .sort((a, b) => e.themes.indexOf(a.slug) - e.themes.indexOf(b.slug))
        .map((t, n) => ({ experienceId: row.id, categoryId: t.id, isPrimary: n === 0 })),
    });
  }
}

async function seedJourneys(rows: JourneySeed[]) {
  for (const [i, j] of rows.entries()) {
    // A journey that stops at both a place and its child lists the child only:
    // the parent page counts the family anyway, and the route line should read
    // "South Goa", not "Goa · South Goa".
    const stopSlugs = j.stops.filter((s, n) => {
      const others = j.stops.filter((_, m) => m !== n);
      return !others.some((o) => goaDestinations.concat(tharDestinations).some((d) => d.slug === o && d.parent === s));
    });
    const { rows: stops, missing: missingStops } = resolveDestinations(stopSlugs);
    if (missingStops.length) {
      counts.skipped.push(`journey ${j.slug}: no destination ${missingStops.join(", ")}`);
      continue;
    }
    // A night can be spent somewhere the route line does not list — the Ghats
    // night on a coastal journey, for instance — so overnights resolve separately.
    const overnightSlugs = [...new Set(j.itinerary.map((d) => d.overnight).filter((s): s is string => Boolean(s)))];
    const overnights = resolveDestinations(overnightSlugs.filter((s) => !stopSlugs.includes(s)));
    if (overnights.missing.length) counts.skipped.push(`journey ${j.slug}: no overnight destination ${overnights.missing.join(", ")}`);

    const { rows: styles, missing: missingStyles } = resolveCategories("TRAVEL_STYLE", j.styles);
    if (missingStyles.length) counts.skipped.push(`journey ${j.slug}: unknown styles ${missingStyles.join(", ")}`);

    const existing = await db.journey.findUnique({ where: { slug: j.slug }, select: { id: true, heroId: true } });
    counts.journeys++;
    if (!WRITE) continue;

    const heroId = existing?.heroId ?? nextHeroId(j.image);
    const data = {
      name: j.name,
      kind: j.kind,
      days: j.days,
      nights: j.nights,
      shortDescription: j.short,
      overview: doc(j.body),
      idealFor: j.idealFor,
      tourType: "Private / On Demand",
      bestTime: j.bestTime,
      highlights: j.highlights,
      inclusions: j.inclusions,
      quoteOnly: true,
      isFeatured: j.featured ?? false,
      heroId,
      status: "PUBLISHED" as const,
      publishedAt: new Date(),
      sortOrder: i,
    };
    const row = await db.journey.upsert({ where: { slug: j.slug }, create: { slug: j.slug, ...data }, update: data });

    const byslug = new Map([...stops, ...overnights.rows].map((s) => [s.slug, s.id]));
    await db.journeyStop.deleteMany({ where: { journeyId: row.id } });
    await db.journeyStop.createMany({
      data: stopSlugs.map((s, n) => ({ journeyId: row.id, destinationId: byslug.get(s)!, sortOrder: n })),
    });

    await db.journeyStyle.deleteMany({ where: { journeyId: row.id } });
    await db.journeyStyle.createMany({ data: styles.map((s) => ({ journeyId: row.id, categoryId: s.id })) });

    await db.itineraryDay.deleteMany({ where: { journeyId: row.id } });
    await db.itineraryDay.createMany({
      data: j.itinerary.map((day, n) => ({
        journeyId: row.id,
        dayNumber: day.day,
        dayEnd: day.to ?? null,
        title: day.title,
        body: doc([day.body]),
        overnightDestinationId: day.overnight ? (byslug.get(day.overnight) ?? null) : null,
        sortOrder: n,
      })),
    });
  }
}

async function main() {
  console.log(`target: ${target}`);
  console.log(WRITE ? "mode:   WRITE — this changes the live database\n" : "mode:   dry run (pass --write to apply)\n");

  for (const m of await db.media.findMany({ select: { id: true, publicId: true } })) mediaIds.set(m.publicId, m.id);
  await refreshLookups();
  const poolGaps = Object.entries(POOLS).filter(([, ids]) => !ids.some((p) => mediaIds.has(p)));
  for (const [pool] of poolGaps) counts.skipped.push(`image pool "${pool}" has no matching media — those cards will render the placeholder`);

  const doThar = !ONLY || ONLY === "thar";
  const doGoa = !ONLY || ONLY === "goa";

  if (doThar) {
    await seedCategories(tharCategories);
    await seedDestinations(tharDestinations);
  }
  if (doGoa) {
    await seedCategories(goaCategories);
    await seedDestinations(goaDestinations);
  }
  // Destinations for both regions exist before anything references them.
  if (doThar) {
    await seedExperiences(tharExperiences);
    await seedJourneys(tharJourneys);
  }
  if (doGoa) {
    await seedExperiences(goaExperiences);
    await seedJourneys(goaJourneys);
  }

  console.log(`categories:   ${counts.categories}`);
  console.log(`destinations: ${counts.destinations}`);
  console.log(`experiences:  ${counts.experiences}`);
  console.log(`journeys:     ${counts.journeys}`);
  if (counts.skipped.length) console.log(`\nnotes:\n  ${counts.skipped.join("\n  ")}`);

  if (WRITE) {
    await db.auditLog.create({
      data: {
        action: "content.seed",
        entityType: "Catalogue",
        label: `${counts.experiences} experiences, ${counts.journeys} journeys, ${counts.destinations} destinations`,
      },
    });
    console.log("\n✓ written.");
  } else {
    console.log("\n✓ valid. Nothing written.");
  }
  await db.$disconnect();
}

main().catch(async (err) => {
  console.error(err);
  process.exitCode = 1;
  await db.$disconnect();
});
