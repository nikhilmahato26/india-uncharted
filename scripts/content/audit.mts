/**
 * Phase 8 scope, measured: what each public record is missing.
 *   npx tsx scripts/content/audit.mts
 */
import { db, target } from "./db.mts";
import { docToPlainText } from "../../src/lib/richtext/text";

const words = (s: string | null | undefined) => (s ?? "").split(/\s+/).filter(Boolean).length;
const seoSel = { select: { metaDescription: true, focusKeyword: true } } as const;

async function main() {
  console.log(`target: ${target}\n`);
  const types = {
    destination: await db.destination.findMany({ select: { slug: true, status: true, shortDescription: true, intro: true, seo: seoSel } }),
    region: await db.region.findMany({ select: { slug: true, status: true, intro: true, seo: seoSel } }),
    journey: await db.journey.findMany({ select: { slug: true, status: true, shortDescription: true, overview: true, seo: seoSel } }),
    experience: await db.experience.findMany({ select: { slug: true, status: true, shortDescription: true, seo: seoSel } }),
    article: await db.article.findMany({ select: { slug: true, status: true, excerpt: true, seo: seoSel } }),
    service: await db.service.findMany({ select: { slug: true, status: true, shortDescription: true, seo: seoSel } }),
    category: await db.category.findMany({ select: { slug: true, status: true, type: true, intro: true, seo: seoSel } }),
    page: await db.page.findMany({ select: { slug: true, status: true, seo: seoSel } }),
  };
  console.log("type         live  noMetaDesc  noFocusKw  noOwnText");
  for (const [type, rows] of Object.entries(types)) {
    const live = rows.filter((r) => r.status === "PUBLISHED");
    const noDesc = live.filter((r) => !r.seo?.metaDescription);
    const noKw = live.filter((r) => !r.seo?.focusKeyword);
    const noText = live.filter((r) => {
      const x = r as Record<string, unknown>;
      const text = String(x.shortDescription ?? x.excerpt ?? "") + docToPlainText(x.intro ?? x.overview ?? null);
      return words(text) < 12;
    });
    console.log(`${type.padEnd(12)} ${String(live.length).padStart(4)} ${String(noDesc.length).padStart(11)} ${String(noKw.length).padStart(10)} ${String(noText.length).padStart(10)}${noText.length ? "   ← " + noText.map((r) => r.slug).join(", ") : ""}`);
  }

  const facts = ["bestTime", "weather", "howToReach", "localTransport", "recommendedDuration"] as const;
  const dests = await db.destination.findMany({ where: { status: "PUBLISHED" }, select: { slug: true, bestTime: true, weather: true, howToReach: true, localTransport: true, recommendedDuration: true, whyVisit: true, food: true, culture: true, travelTips: true } });
  console.log(`\ndestination facts filled (of ${dests.length} live):`);
  for (const f of [...facts, "whyVisit", "food", "culture", "travelTips"] as const) {
    console.log(`  ${f.padEnd(20)} ${dests.filter((d) => (d as Record<string, unknown>)[f]).length}`);
  }

  const media = await db.media.findMany({ select: { id: true, altText: true, licence: true, _count: { select: { usages: true } } } });
  console.log(`\nimages: ${media.length} · no alt text: ${media.filter((m) => !m.altText).length} · licence unknown: ${media.filter((m) => m.licence === "UNKNOWN").length}`);

  const tests = await db.testimonial.findMany({ select: { verifiedAt: true, status: true } });
  console.log(`testimonials: ${tests.length} · verified: ${tests.filter((t) => t.verifiedAt).length}`);
  await db.$disconnect();
}
main();
