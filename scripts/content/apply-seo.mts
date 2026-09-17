/**
 * Applies docs/content/phase8-seo.json to the database.
 *
 *   npx tsx scripts/content/apply-seo.mts           # dry run: validate and report
 *   npx tsx scripts/content/apply-seo.mts --write   # apply
 *
 * Only fills fields that are empty. A description or keyword someone has
 * already written in the CMS is never replaced.
 *
 * Deliberately not one transaction: against a remote database a couple of
 * hundred round trips outlast any sensible transaction timeout. Because every
 * step only fills what is still empty, an interrupted run is finished simply
 * by running it again.
 */
import { readFile } from "node:fs/promises";
import { db, target } from "./db.mts";

const WRITE = process.argv.includes("--write");
const DESCRIPTION_MIN = 110;
const DESCRIPTION_MAX = 160;

type Entry = { d?: string; k?: string };
type Model = "destination" | "region" | "journey" | "experience" | "service" | "article" | "category" | "page";
type Row = { id: string; seo: { id: string; metaDescription: string | null; focusKeyword: string | null } | null };

const seoSelect = { id: true, seo: { select: { id: true, metaDescription: true, focusKeyword: true } } } as const;

/** WordPress stored some text HTML-encoded; React encodes again, so "&amp;" would reach Google literally. */
function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ");
}

async function find(key: string): Promise<{ model: Model; row: Row | null }> {
  const [model, rest] = key.split(":") as [Model, string];
  switch (model) {
    case "category": {
      const [type, slug] = rest.split("/");
      return { model, row: await db.category.findFirst({ where: { type: type as never, slug }, select: seoSelect }) };
    }
    case "page":
      return { model, row: await db.page.findFirst({ where: { key: rest }, select: seoSelect }) };
    default: {
      const delegate = db[model] as unknown as { findFirst: (a: unknown) => Promise<Row | null> };
      return { model, row: await delegate.findFirst({ where: { slug: rest }, select: seoSelect }) };
    }
  }
}

async function main() {
  const file = JSON.parse(await readFile("docs/content/phase8-seo.json", "utf8")) as Record<string, unknown>;
  const entries = Object.entries(file).filter(([k]) => !k.startsWith("_")) as [string, Entry][];
  const drafts = (file._draft as string[]) ?? [];
  const problems: string[] = [];
  const warnings: string[] = [];

  // — Validate the file itself —
  const seen = new Map<string, string>();
  for (const [key, e] of entries) {
    if (e.d) {
      if (e.d.length > DESCRIPTION_MAX) problems.push(`${key}: description is ${e.d.length} characters (max ${DESCRIPTION_MAX})`);
      if (e.d.length < DESCRIPTION_MIN) warnings.push(`${key}: description is only ${e.d.length} characters`);
      if (/\b(best|award|certified|no\.? ?1|#1|cheapest|lowest price|₹|\$|rs\.?\s?\d)/i.test(e.d)) problems.push(`${key}: description makes a claim or mentions price — "${e.d}"`);
    }
    if (e.k) {
      const k = e.k.trim().toLowerCase();
      if (seen.has(k)) problems.push(`${key}: keyword "${k}" is also given to ${seen.get(k)}`);
      seen.set(k, key);
    }
  }
  const descriptions = new Map<string, string>();
  for (const [key, e] of entries) {
    if (!e.d) continue;
    if (descriptions.has(e.d)) problems.push(`${key}: same description as ${descriptions.get(e.d)}`);
    descriptions.set(e.d, key);
  }

  // — Resolve every record and plan the change —
  type Plan = { key: string; model: Model; id: string; seoId: string | null; data: Record<string, string> };
  const plans: Plan[] = [];
  const seoIdFor = new Map<string, string | null>(); // file key → that record's SeoMeta id
  let skippedDescriptions = 0;
  let skippedKeywords = 0;
  for (const [key, e] of entries) {
    const { model, row } = await find(key);
    if (!row) {
      problems.push(`${key}: no such record`);
      continue;
    }
    seoIdFor.set(key, row.seo?.id ?? null);
    const data: Record<string, string> = {};
    if (e.d) {
      if (row.seo?.metaDescription) skippedDescriptions++;
      else data.metaDescription = e.d;
    }
    if (e.k) {
      if (row.seo?.focusKeyword) skippedKeywords++;
      else data.focusKeyword = e.k.trim().toLowerCase();
    }
    if (Object.keys(data).length) plans.push({ key, model, id: row.id, seoId: row.seo?.id ?? null, data });
  }

  // A keyword already in the database is only a clash if it sits on a different
  // record from the one this file gives it to. On a re-run it sits on its own.
  const existing = await db.seoMeta.findMany({ where: { focusKeyword: { not: null } }, select: { id: true, focusKeyword: true } });
  for (const s of existing) {
    const wantedBy = seen.get(s.focusKeyword!.toLowerCase());
    if (wantedBy && seoIdFor.get(wantedBy) !== s.id) {
      problems.push(`keyword "${s.focusKeyword}" is already used by another page (SeoMeta ${s.id}), wanted for ${wantedBy}`);
    }
  }

  // — Imported text with HTML entities —
  const encoded = await db.seoMeta.findMany({
    where: { OR: ["metaTitle", "metaDescription", "ogTitle", "ogDescription", "twitterTitle", "twitterDescription"].map((f) => ({ [f]: { contains: "&" } })) },
    select: { id: true, metaTitle: true, metaDescription: true, ogTitle: true, ogDescription: true, twitterTitle: true, twitterDescription: true },
  });
  const entityFixes = encoded
    .map((s) => {
      const patch: Record<string, string> = {};
      for (const [f, v] of Object.entries(s)) {
        if (f === "id" || typeof v !== "string") continue;
        const decoded = decodeEntities(v);
        if (decoded !== v) patch[f] = decoded;
      }
      return { id: s.id, patch };
    })
    .filter((x) => Object.keys(x.patch).length);

  // — Empty hubs to draft —
  const draftPlans: { key: string; id: string }[] = [];
  for (const key of drafts) {
    const [type, slug] = key.replace("category:", "").split("/");
    const c = await db.category.findFirst({
      where: { type: type as never, slug },
      select: { id: true, status: true, _count: { select: { journeyStyles: true, experienceThemes: true, articles: true } } },
    });
    if (!c) problems.push(`${key}: no such category`);
    else if (c._count.journeyStyles + c._count.experienceThemes + c._count.articles > 0) warnings.push(`${key}: has content now — left published`);
    else if (c.status === "PUBLISHED") draftPlans.push({ key, id: c.id });
  }

  // — Report —
  const nDesc = plans.filter((p) => p.data.metaDescription).length;
  const nKw = plans.filter((p) => p.data.focusKeyword).length;
  console.log(`target: ${target}`);
  console.log(`descriptions to write: ${nDesc} (already written, left alone: ${skippedDescriptions})`);
  console.log(`focus keywords to set: ${nKw} (already set, left alone: ${skippedKeywords})`);
  console.log(`HTML entities to repair: ${entityFixes.length} SEO records`);
  console.log(`empty categories to draft: ${draftPlans.map((d) => d.key.replace("category:", "")).join(", ") || "none"}`);
  if (warnings.length) console.log(`\nwarnings:\n  ${warnings.join("\n  ")}`);
  if (problems.length) {
    console.log(`\n${problems.length} problems — nothing written:\n  ${problems.join("\n  ")}`);
    process.exitCode = 1;
    await db.$disconnect();
    return;
  }
  if (!WRITE) {
    console.log("\n✓ valid. Dry run only — pass --write to apply.");
    await db.$disconnect();
    return;
  }

  // — Apply —
  const failures: string[] = [];
  let done = 0;
  const queue = [...plans];
  const worker = async () => {
    for (let p = queue.shift(); p; p = queue.shift()) {
      try {
        const delegate = db[p.model] as unknown as { update: (a: unknown) => Promise<unknown> };
        await delegate.update({ where: { id: p.id }, data: { seo: { upsert: { create: p.data, update: p.data } } } });
        done++;
        if (done % 25 === 0) console.log(`  ${done}/${plans.length}`);
      } catch (err) {
        failures.push(`${p.key}: ${err instanceof Error ? err.message.split("\n").pop() : String(err)}`);
      }
    }
  };
  await Promise.all(Array.from({ length: 8 }, worker));
  for (const f of entityFixes) await db.seoMeta.update({ where: { id: f.id }, data: f.patch });
  for (const d of draftPlans) await db.category.update({ where: { id: d.id }, data: { status: "DRAFT" } });
  await db.auditLog.create({
    data: {
      action: "content.pass",
      entityType: "SeoMeta",
      label: `${done} records given search descriptions or keywords, ${entityFixes.length} encoding repairs, ${draftPlans.length} empty categories drafted`,
    },
  });
  if (failures.length) {
    console.log(`\n${failures.length} records failed — run again to finish them:\n  ${failures.join("\n  ")}`);
    process.exitCode = 1;
  }
  console.log("\n✓ written.");
  await db.$disconnect();
}

main();
