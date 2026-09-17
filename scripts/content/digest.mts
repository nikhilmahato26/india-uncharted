/**
 * One line of source material per public record: its own words and its real
 * links. Meta descriptions and keywords are written from this and nothing else.
 *   npx tsx scripts/content/digest.mts > digest.txt
 */
import { db } from "./db.mts";
import { docToPlainText } from "../../src/lib/richtext/text";

const clip = (s: string, n = 60) => s.replace(/\s+/g, " ").trim().split(" ").slice(0, n).join(" ");
const live = { status: "PUBLISHED" } as const;

async function main() {
  const out: string[] = [];
  for (const d of await db.destination.findMany({
    where: live, orderBy: { name: "asc" },
    select: { slug: true, name: true, title: true, type: true, state: true, isOffbeat: true, shortDescription: true, intro: true, whyVisit: true, region: { select: { name: true } }, parent: { select: { name: true } },
      journeyStops: { where: { journey: live }, select: { journey: { select: { name: true } } } }, experiences: { where: live, select: { name: true } }, seo: { select: { metaDescription: true } } },
  })) {
    if (d.seo?.metaDescription) continue;
    const text = clip(`${d.shortDescription ?? ""} ${docToPlainText(d.intro)} ${docToPlainText(d.whyVisit)}`);
    out.push(`DEST ${d.slug} | ${d.name}${d.title ? ` — ${d.title}` : ""} | ${d.type} | ${d.state ?? ""} | region:${d.region?.name ?? "-"}${d.parent ? ` parent:${d.parent.name}` : ""}${d.isOffbeat ? " | offbeat" : ""}
  journeys(${d.journeyStops.length}): ${[...new Set(d.journeyStops.map((s) => s.journey.name))].slice(0, 4).join(" ; ")}
  experiences: ${d.experiences.map((e) => e.name).join(" ; ") || "-"}
  text: ${text || "(none)"}`);
  }
  for (const r of await db.region.findMany({ where: live, select: { slug: true, name: true, tagline: true, destinations: { where: live, select: { name: true } }, seo: { select: { metaDescription: true } } } })) {
    if (r.seo?.metaDescription) continue;
    out.push(`REGION ${r.slug} | ${r.name} | tagline: ${r.tagline ?? "-"}\n  destinations: ${r.destinations.map((d) => d.name).join(", ")}`);
  }
  for (const j of await db.journey.findMany({
    where: live, orderBy: { name: "asc" },
    select: { slug: true, name: true, kind: true, days: true, nights: true, durationLabel: true, tourType: true, idealFor: true, shortDescription: true, overview: true, highlights: true,
      stops: { orderBy: { sortOrder: "asc" }, select: { destination: { select: { name: true } } } }, seo: { select: { metaDescription: true } } },
  })) {
    if (j.seo?.metaDescription) continue;
    out.push(`JOURNEY ${j.slug} | ${j.name} | ${j.kind} | ${j.days ?? "?"}d/${j.nights ?? "?"}n ${j.durationLabel ?? ""} | type:${j.tourType ?? "-"} | idealFor:${j.idealFor ?? "-"}
  route: ${j.stops.map((s) => s.destination.name).join(" > ")}
  highlights: ${j.highlights.slice(0, 5).join(" ; ") || "-"}
  text: ${clip(`${j.shortDescription ?? ""} ${docToPlainText(j.overview)}`) || "(none)"}`);
  }
  for (const e of await db.experience.findMany({
    where: live,
    select: { slug: true, name: true, format: true, duration: true, shortDescription: true, overview: true, destination: { select: { name: true } }, steps: { orderBy: { sortOrder: "asc" }, select: { title: true } }, seo: { select: { metaDescription: true } } },
  })) {
    if (e.seo?.metaDescription) continue;
    out.push(`EXPERIENCE ${e.slug} | ${e.name} | ${e.format} | ${e.duration ?? "-"} | in:${e.destination?.name ?? "-"}
  steps: ${e.steps.map((s) => s.title).slice(0, 6).join(" ; ") || "-"}
  text: ${clip(`${e.shortDescription ?? ""} ${docToPlainText(e.overview)}`) || "(none)"}`);
  }
  for (const s of await db.service.findMany({ where: live, select: { slug: true, name: true, shortDescription: true, seo: { select: { metaDescription: true } } } })) {
    if (s.seo?.metaDescription) continue;
    out.push(`SERVICE ${s.slug} | ${s.name}\n  text: ${clip(s.shortDescription ?? "") || "(none)"}`);
  }
  for (const c of await db.category.findMany({
    where: live, orderBy: [{ type: "asc" }, { name: "asc" }],
    select: { slug: true, name: true, type: true, journeyStyles: { where: { journey: live }, select: { journey: { select: { name: true } } } }, experienceThemes: { where: { experience: live }, select: { experience: { select: { name: true } } } }, seo: { select: { metaDescription: true } } },
  })) {
    if (c.seo?.metaDescription) continue;
    const items = [...c.journeyStyles.map((x) => x.journey.name), ...c.experienceThemes.map((x) => x.experience.name)];
    out.push(`CATEGORY ${c.type}/${c.slug} | ${c.name} | ${items.length} items: ${items.slice(0, 4).join(" ; ") || "-"}`);
  }
  for (const p of await db.page.findMany({ where: live, select: { key: true, slug: true, title: true, seo: { select: { metaDescription: true } } } })) {
    if (p.seo?.metaDescription) continue;
    out.push(`PAGE ${p.key} | /${p.slug} | ${p.title}`);
  }
  console.log(out.join("\n"));
  console.error(`${out.length} records need a description`);
  await db.$disconnect();
}
main();
