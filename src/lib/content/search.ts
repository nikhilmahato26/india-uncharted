import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/lib/db";
import { routes } from "@/lib/site";
import { TRAVEL_TAGS } from "./tags";

export type SearchHit = {
  type: "Destination" | "Journey" | "Experience" | "Guide" | "Region" | "Service";
  title: string;
  href: string;
  meta: string | null;
  snippet: string | null;
};

/**
 * Site search across published content. Postgres `ILIKE` over the fields a
 * traveller actually types; at this catalogue size it is exact and instant,
 * and it never returns drafts.
 */
export async function search(query: string): Promise<SearchHit[]> {
  "use cache";
  cacheTag(...TRAVEL_TAGS);
  cacheLife("hours");

  const q = query.trim().slice(0, 80);
  if (q.length < 2) return [];
  const contains = { contains: q, mode: "insensitive" as const };

  const [destinations, journeys, experiences, articles, regions, services] = await Promise.all([
    db.destination.findMany({
      where: { status: "PUBLISHED", OR: [{ name: contains }, { title: contains }, { state: contains }, { shortDescription: contains }] },
      select: { name: true, slug: true, title: true, state: true, shortDescription: true },
      take: 8,
    }),
    db.journey.findMany({
      where: { status: "PUBLISHED", OR: [{ name: contains }, { shortDescription: contains }, { stops: { some: { destination: { name: contains } } } }] },
      select: { name: true, slug: true, kind: true, days: true, nights: true, shortDescription: true },
      take: 10,
    }),
    db.experience.findMany({
      where: { status: "PUBLISHED", OR: [{ name: contains }, { shortDescription: contains }, { destination: { name: contains } }] },
      select: { name: true, slug: true, duration: true, shortDescription: true, destination: { select: { name: true } } },
      take: 8,
    }),
    db.article.findMany({
      where: { status: "PUBLISHED", OR: [{ title: contains }, { excerpt: contains }] },
      select: { title: true, slug: true, excerpt: true, readingMinutes: true },
      take: 6,
    }),
    db.region.findMany({ where: { status: "PUBLISHED", OR: [{ name: contains }, { tagline: contains }] }, select: { name: true, slug: true, tagline: true }, take: 4 }),
    db.service.findMany({ where: { status: "PUBLISHED", OR: [{ name: contains }, { shortDescription: contains }] }, select: { name: true, slug: true, shortDescription: true }, take: 3 }),
  ]);

  const hits: SearchHit[] = [
    ...destinations.map((d) => ({
      type: "Destination" as const,
      title: d.name,
      href: routes.destination(d.slug),
      meta: [d.title, d.state].filter(Boolean).join(" · ") || null,
      snippet: d.shortDescription,
    })),
    ...journeys.map((j) => ({
      type: "Journey" as const,
      title: j.name,
      href: routes.journey(j.slug, j.kind),
      meta: j.days ? `${j.days} days${j.nights ? ` · ${j.nights} nights` : ""}` : null,
      snippet: j.shortDescription,
    })),
    ...experiences.map((e) => ({
      type: "Experience" as const,
      title: e.name,
      href: routes.experience(e.slug),
      meta: [e.destination?.name, e.duration].filter(Boolean).join(" · ") || null,
      snippet: e.shortDescription,
    })),
    ...articles.map((a) => ({
      type: "Guide" as const,
      title: a.title,
      href: routes.article(a.slug),
      meta: a.readingMinutes ? `${a.readingMinutes} min read` : null,
      snippet: a.excerpt,
    })),
    ...regions.map((r) => ({ type: "Region" as const, title: r.name, href: routes.region(r.slug), meta: r.tagline, snippet: null })),
    ...services.map((s) => ({ type: "Service" as const, title: s.name, href: routes.service(s.slug), meta: null, snippet: s.shortDescription })),
  ];

  // Exact-ish title matches first, then everything else in entity order.
  const lower = q.toLowerCase();
  return hits.sort((a, b) => {
    const score = (h: SearchHit) => (h.title.toLowerCase() === lower ? 3 : h.title.toLowerCase().startsWith(lower) ? 2 : h.title.toLowerCase().includes(lower) ? 1 : 0);
    return score(b) - score(a);
  });
}
