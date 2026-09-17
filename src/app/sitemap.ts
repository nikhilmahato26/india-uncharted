import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { FIXED_PAGE_KEYS, LEGAL_PAGES, SITE_INDEXABLE, absoluteUrl, routes } from "@/lib/site";
import { docToPlainText } from "@/lib/richtext/text";

/**
 * Only published, indexable, self-canonical content. Drafts, archived records,
 * anything an editor has set to noindex, and anything canonicalised elsewhere
 * are all excluded. Staging returns an empty sitemap.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  if (!SITE_INDEXABLE) return [];

  const indexable = { status: "PUBLISHED" as const, OR: [{ seo: null }, { seo: { robotsIndex: true, canonicalUrl: null } }] };

  const [pages, regions, destinations, journeys, experiences, articles, services, styles, themes] = await Promise.all([
    db.page.findMany({ where: { status: "PUBLISHED" }, select: { key: true, slug: true, updatedAt: true, body: true } }),
    db.region.findMany({ where: indexable, select: { slug: true, updatedAt: true } }),
    db.destination.findMany({ where: indexable, select: { slug: true, updatedAt: true } }),
    db.journey.findMany({ where: indexable, select: { slug: true, kind: true, updatedAt: true } }),
    db.experience.findMany({ where: indexable, select: { slug: true, updatedAt: true } }),
    db.article.findMany({ where: indexable, select: { slug: true, updatedAt: true, contentUpdatedAt: true } }),
    db.service.findMany({ where: indexable, select: { slug: true, updatedAt: true } }),
    db.category.findMany({ where: { type: "TRAVEL_STYLE", status: "PUBLISHED", journeyStyles: { some: { journey: { status: "PUBLISHED" } } } }, select: { slug: true, updatedAt: true } }),
    db.category.findMany({
      where: { type: "EXPERIENCE_THEME", status: "PUBLISHED", experienceThemes: { some: { experience: { status: "PUBLISHED" } } } },
      select: { slug: true, updatedAt: true },
    }),
  ]);

  const entry = (path: string, lastModified: Date, priority: number, changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] = "monthly") => ({
    url: absoluteUrl(path),
    lastModified,
    changeFrequency,
    priority,
  });

  const staticPaths = [
    entry(routes.home(), new Date(), 1, "weekly"),
    entry(routes.destinations(), new Date(), 0.9, "weekly"),
    entry(routes.regions(), new Date(), 0.7),
    entry(routes.journeys(), new Date(), 0.9, "weekly"),
    entry(routes.bikeTours(), new Date(), 0.8),
    entry(routes.experiences(), new Date(), 0.8),
    entry(routes.travelGuide(), new Date(), 0.8, "weekly"),
    entry(routes.planMyJourney(), new Date(), 0.9),
    entry(routes.about(), new Date(), 0.6),
    entry(routes.contact(), new Date(), 0.6),
    entry(routes.services(), new Date(), 0.5),
  ];

  // Only pages that have a route of their own; a legal page only once it has text.
  const legalKeys: string[] = LEGAL_PAGES.map((l) => l.key);
  const cmsPages = pages
    .filter((p) => FIXED_PAGE_KEYS.has(p.key) && !["home", "about", "contact", "plan-my-journey"].includes(p.key))
    .filter((p) => !legalKeys.includes(p.key) || docToPlainText(p.body).trim().length > 0)
    .map((p) => entry(`/${p.slug}`, p.updatedAt, 0.4, "yearly"));

  return [
    ...staticPaths,
    ...cmsPages,
    ...regions.map((r) => entry(routes.region(r.slug), r.updatedAt, 0.7)),
    ...destinations.map((d) => entry(routes.destination(d.slug), d.updatedAt, 0.8)),
    ...journeys.map((j) => entry(routes.journey(j.slug, j.kind), j.updatedAt, 0.9)),
    ...experiences.map((e) => entry(routes.experience(e.slug), e.updatedAt, 0.7)),
    ...articles.map((a) => entry(routes.article(a.slug), a.contentUpdatedAt ?? a.updatedAt, 0.6)),
    ...services.map((s) => entry(routes.service(s.slug), s.updatedAt, 0.5)),
    ...styles.map((c) => entry(routes.travelStyle(c.slug), c.updatedAt, 0.6)),
    ...themes.map((c) => entry(routes.experienceTheme(c.slug), c.updatedAt, 0.6)),
  ];
}
