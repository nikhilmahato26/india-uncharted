import "server-only";
import { Prisma } from "@/generated/prisma/client";
import { routes } from "@/lib/site";
import { mediaSelect, toMedia, type MediaSource } from "./media";

/**
 * Card-sized projections shared by every listing, related-content strip and
 * the homepage. One select per type so a card looks the same everywhere.
 */

export const destinationCardSelect = {
  id: true,
  slug: true,
  name: true,
  title: true,
  type: true,
  state: true,
  shortDescription: true,
  isOffbeat: true,
  latitude: true,
  longitude: true,
  status: true,
  hero: { select: mediaSelect },
  region: { select: { slug: true, name: true } },
  _count: {
    select: {
      journeyStops: { where: { journey: { status: "PUBLISHED" } } },
      experiences: { where: { status: "PUBLISHED" } },
    },
  },
  // An umbrella place like Kashmir is never itself a stop — the journeys stop at
  // Srinagar and Gulmarg. Counting the family, by journey id so a two-stop
  // journey is counted once, is the only count that matches what the page lists.
  journeyStops: { where: { journey: { status: "PUBLISHED" } }, select: { journeyId: true } },
  children: {
    where: { status: "PUBLISHED" },
    select: { journeyStops: { where: { journey: { status: "PUBLISHED" } }, select: { journeyId: true } } },
  },
} satisfies Prisma.DestinationSelect;

export type DestinationCard = {
  id: string;
  slug: string;
  href: string;
  name: string;
  title: string | null;
  type: string;
  state: string | null;
  shortDescription: string | null;
  isOffbeat: boolean;
  coords: { lat: number; lng: number } | null;
  hero: MediaSource | null;
  region: { slug: string; name: string } | null;
  journeyCount: number;
  experienceCount: number;
  isDraft: boolean;
};

export function toDestinationCard(d: Prisma.DestinationGetPayload<{ select: typeof destinationCardSelect }>): DestinationCard {
  return {
    id: d.id,
    slug: d.slug,
    href: routes.destination(d.slug),
    name: d.name,
    title: d.title,
    type: d.type,
    state: d.state,
    shortDescription: d.shortDescription,
    isOffbeat: d.isOffbeat,
    coords: d.latitude != null && d.longitude != null ? { lat: d.latitude, lng: d.longitude } : null,
    hero: toMedia(d.hero, d.title ? `${d.name}, ${d.title}` : d.name),
    region: d.region,
    journeyCount: new Set([...d.journeyStops, ...d.children.flatMap((c) => c.journeyStops)].map((s) => s.journeyId)).size,
    experienceCount: d._count.experiences,
    isDraft: d.status !== "PUBLISHED",
  };
}

export const journeyCardSelect = {
  id: true,
  slug: true,
  name: true,
  kind: true,
  days: true,
  nights: true,
  durationLabel: true,
  shortDescription: true,
  tourType: true,
  quoteOnly: true,
  priceFromInr: true,
  status: true,
  hero: { select: mediaSelect },
  stops: {
    orderBy: { sortOrder: "asc" },
    select: { isOptional: true, destination: { select: { slug: true, name: true, status: true } } },
  },
  styles: { select: { category: { select: { slug: true, name: true } } } },
} satisfies Prisma.JourneySelect;

export type JourneyCard = {
  id: string;
  slug: string;
  href: string;
  name: string;
  /** The client's full product name, kept for metadata and structured data. */
  nameFull: string;
  kind: "JOURNEY" | "RETREAT" | "COURSE" | "BIKE_TOUR";
  days: number | null;
  nights: number | null;
  durationText: string | null;
  shortDescription: string | null;
  route: { slug: string; name: string; optional: boolean; published: boolean }[];
  styles: { slug: string; name: string }[];
  hero: MediaSource | null;
  priceText: string;
  isDraft: boolean;
};

/**
 * "Kashmir Honeymoon Tour Package (6 Days / 5 Nights)" → "Kashmir Honeymoon Tour
 * Package", "2 Nights 3 Days Jaisalmer Tour" → "Jaisalmer Tour". The duration
 * is printed on its own line, so the title should not carry it as well.
 */
export function displayName(name: string): string {
  return name
    .replace(/\s*[–—-]?\s*\(\s*\d+\s*Days?\s*\/\s*\d+\s*Nights?\s*\)\s*$/i, "")
    .replace(/^\s*\d+\s*(?:nights?|days?)\s*(?:(?:and|&|\/|-)?\s*\d+\s*(?:nights?|days?))?\s*[–—-]?\s*/i, "")
    .trim();
}

/** Words that appear in almost every travel label and so prove nothing about overlap. */
const GENERIC_META_WORDS = new Set(["tour", "tours", "journey", "journeys", "package", "packages", "demand", "with", "from", "india"]);

/**
 * A meta line like "Private journey · 8 days · Private / On Demand" says private
 * twice. Keep the first part that claims an idea and drop the later echoes.
 */
export function dedupeMeta(parts: (string | null | undefined)[]): string[] {
  const kept: string[] = [];
  const claimed = new Set<string>();
  for (const part of parts) {
    const value = part?.trim();
    if (!value) continue;
    const words = value
      .toLowerCase()
      .split(/[^a-z]+/)
      .filter((w) => w.length >= 4 && !GENERIC_META_WORDS.has(w));
    if (words.length && words.every((w) => claimed.has(w))) continue;
    for (const w of words) claimed.add(w);
    kept.push(value);
  }
  return kept;
}

export function durationText(days: number | null, nights: number | null, label?: string | null): string | null {
  if (days && nights) return `${days} days · ${nights} nights`;
  if (days) return `${days} days`;
  return label ?? null;
}

export function priceText(quoteOnly: boolean, priceFromInr: number | null): string {
  if (quoteOnly || !priceFromInr) return "Price on request";
  return `From ₹${priceFromInr.toLocaleString("en-IN")}`;
}

export function toJourneyCard(j: Prisma.JourneyGetPayload<{ select: typeof journeyCardSelect }>): JourneyCard {
  return {
    id: j.id,
    slug: j.slug,
    href: routes.journey(j.slug, j.kind),
    name: displayName(j.name),
    nameFull: j.name,
    kind: j.kind,
    days: j.days,
    nights: j.nights,
    durationText: durationText(j.days, j.nights, j.durationLabel),
    shortDescription: j.shortDescription,
    route: j.stops.map((s) => ({
      slug: s.destination.slug,
      name: s.destination.name,
      optional: s.isOptional,
      published: s.destination.status === "PUBLISHED",
    })),
    styles: j.styles.map((s) => s.category),
    hero: toMedia(j.hero, j.name),
    priceText: priceText(j.quoteOnly, j.priceFromInr),
    isDraft: j.status !== "PUBLISHED",
  };
}

export const experienceCardSelect = {
  id: true,
  slug: true,
  name: true,
  format: true,
  duration: true,
  shortDescription: true,
  status: true,
  hero: { select: mediaSelect },
  destination: { select: { slug: true, name: true, status: true } },
  themes: { orderBy: { isPrimary: "desc" }, select: { category: { select: { slug: true, name: true } } } },
} satisfies Prisma.ExperienceSelect;

export type ExperienceCard = {
  id: string;
  slug: string;
  href: string;
  name: string;
  format: string;
  formatLabel: string;
  duration: string | null;
  shortDescription: string | null;
  destination: { slug: string; name: string; published: boolean } | null;
  themes: { slug: string; name: string }[];
  hero: MediaSource | null;
  isDraft: boolean;
};

export const FORMAT_LABELS: Record<string, string> = {
  WALKING: "Walking tour",
  FOOD_WALK: "Food walk",
  CYCLING: "Cycle tour",
  SIGHTSEEING: "Guided sightseeing",
  DESERT_EVENING: "Desert evening",
  OTHER: "Experience",
};

export function toExperienceCard(e: Prisma.ExperienceGetPayload<{ select: typeof experienceCardSelect }>): ExperienceCard {
  return {
    id: e.id,
    slug: e.slug,
    href: routes.experience(e.slug),
    name: e.name,
    format: e.format,
    formatLabel: FORMAT_LABELS[e.format] ?? "Experience",
    duration: e.duration,
    shortDescription: e.shortDescription,
    destination: e.destination ? { slug: e.destination.slug, name: e.destination.name, published: e.destination.status === "PUBLISHED" } : null,
    themes: e.themes.map((t) => t.category),
    hero: toMedia(e.hero, e.name),
    isDraft: e.status !== "PUBLISHED",
  };
}

export const articleCardSelect = {
  id: true,
  slug: true,
  title: true,
  kind: true,
  excerpt: true,
  readingMinutes: true,
  publishedAt: true,
  contentUpdatedAt: true,
  status: true,
  hero: { select: mediaSelect },
  category: { select: { slug: true, name: true } },
} satisfies Prisma.ArticleSelect;

export type ArticleCard = {
  id: string;
  slug: string;
  href: string;
  title: string;
  kind: "BLOG" | "GUIDE";
  excerpt: string | null;
  readingMinutes: number | null;
  publishedAt: string | null;
  updatedAt: string | null;
  hero: MediaSource | null;
  category: { slug: string; name: string } | null;
  isDraft: boolean;
};

export function toArticleCard(a: Prisma.ArticleGetPayload<{ select: typeof articleCardSelect }>): ArticleCard {
  return {
    id: a.id,
    slug: a.slug,
    href: routes.article(a.slug),
    title: a.title,
    kind: a.kind,
    excerpt: a.excerpt,
    readingMinutes: a.readingMinutes,
    publishedAt: a.publishedAt?.toISOString() ?? null,
    updatedAt: a.contentUpdatedAt?.toISOString() ?? null,
    hero: toMedia(a.hero, a.title),
    category: a.category,
    isDraft: a.status !== "PUBLISHED",
  };
}
