import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/lib/db";
import { isRichDoc, type RichDoc } from "@/lib/richtext/types";
import { docOutline, docToPlainText } from "@/lib/richtext/text";
import { LEGAL_PAGES } from "@/lib/site";
import { TAGS, TRAVEL_TAGS } from "./tags";
import { mediaSelect, toMedia } from "./media";
import { visibleStatuses } from "./visibility";
import {
  articleCardSelect,
  destinationCardSelect,
  experienceCardSelect,
  journeyCardSelect,
  toArticleCard,
  toDestinationCard,
  toExperienceCard,
  toJourneyCard,
} from "./cards";
import { loadFaqs, loadSections, seoSelect, toSeo } from "./shared";

const doc = (v: unknown): RichDoc | null => (isRichDoc(v) && v.content.length ? v : null);

// ─── Travel Guide (articles) ────────────────────────────────────────────────

export async function listArticles() {
  "use cache";
  cacheTag(TAGS.articles, TAGS.media, TAGS.categories);
  cacheLife("days");
  const status = await visibleStatuses();
  const rows = await db.article.findMany({ where: { status }, orderBy: [{ isFeatured: "desc" }, { publishedAt: "desc" }], select: articleCardSelect });
  return rows.map(toArticleCard);
}

export async function getArticlePage(slug: string) {
  "use cache";
  cacheTag(...TRAVEL_TAGS);
  cacheLife("days");
  const status = await visibleStatuses();
  const a = await db.article.findFirst({
    where: { slug, status },
    select: {
      ...articleCardSelect,
      body: true,
      tocEnabled: true,
      updatedAt: true,
      author: { select: { name: true, slug: true, bio: true, avatar: { select: mediaSelect } } },
      destinations: { select: { destination: { select: destinationCardSelect } } },
      journeys: { select: { journey: { select: journeyCardSelect } } },
      experiences: { select: { experience: { select: experienceCardSelect } } },
      tags: { select: { tag: { select: { slug: true, name: true } } } },
      seo: { select: seoSelect },
    },
  });
  if (!a) return null;
  const body = doc(a.body);
  const destinations = a.destinations.map((d) => d.destination).filter((d) => status.in.includes(d.status));
  const destinationIds = destinations.map((d) => d.id);
  let journeys = a.journeys.map((j) => j.journey).filter((j) => status.in.includes(j.status));
  if (!journeys.length && destinationIds.length) {
    journeys = await db.journey.findMany({
      where: { status, stops: { some: { destinationId: { in: destinationIds } } } },
      orderBy: [{ isFeatured: "desc" }, { sortOrder: "asc" }],
      take: 3,
      select: journeyCardSelect,
    });
  }
  const more = await db.article.findMany({
    where: {
      status,
      id: { not: a.id },
      OR: [{ categoryId: a.category ? undefined : "__none__", category: a.category ? { slug: a.category.slug } : undefined }, { destinations: { some: { destinationId: { in: destinationIds } } } }],
    },
    orderBy: { publishedAt: "desc" },
    take: 3,
    select: articleCardSelect,
  });
  return {
    ...toArticleCard(a),
    body,
    toc: a.tocEnabled && body ? docOutline(body).filter((h) => h.level <= 3) : [],
    author: a.author ? { ...a.author, avatar: toMedia(a.author.avatar, a.author.name) } : null,
    destinations: destinations.map(toDestinationCard),
    journeys: journeys.map(toJourneyCard),
    experiences: a.experiences.map((e) => e.experience).filter((e) => status.in.includes(e.status)).map(toExperienceCard),
    tags: a.tags.map((t) => t.tag),
    more: more.map(toArticleCard),
    faqs: await loadFaqs("ARTICLE", a.id),
    seo: toSeo(a.seo),
    updatedAt: a.updatedAt.toISOString(),
  };
}

export type ArticlePage = NonNullable<Awaited<ReturnType<typeof getArticlePage>>>;

// ─── CMS pages ──────────────────────────────────────────────────────────────

export async function getPage(key: string) {
  "use cache";
  cacheTag(TAGS.pages, TAGS.sections, TAGS.media, TAGS.seo, TAGS.faqs);
  cacheLife("days");
  const status = await visibleStatuses();
  const p = await db.page.findFirst({
    where: { key, status },
    select: { id: true, key: true, slug: true, title: true, intro: true, body: true, updatedAt: true, hero: { select: mediaSelect }, seo: { select: seoSelect } },
  });
  if (!p) return null;
  return {
    ...p,
    body: doc(p.body),
    hero: toMedia(p.hero, p.title),
    sections: await loadSections("PAGE", p.id),
    faqs: await loadFaqs("PAGE", p.id),
    seo: toSeo(p.seo),
    updatedAt: p.updatedAt.toISOString(),
  };
}

/**
 * Legal pages that are published and actually contain text. A published but
 * empty policy is treated as not live: no footer link, no sitemap entry, a 404.
 */
export async function liveLegalPageKeys(): Promise<string[]> {
  "use cache";
  cacheTag(TAGS.pages);
  cacheLife("days");
  const rows = await db.page.findMany({ where: { status: "PUBLISHED", key: { in: LEGAL_PAGES.map((l) => l.key) } }, select: { key: true, body: true } });
  return rows.filter((r) => docToPlainText(r.body).trim().length > 0).map((r) => r.key);
}

/** Which legal / optional pages are live, so the footer never links to a draft. */
/**
 * The one photograph on the admin sign-in page: Jodhpur, where the client is
 * based. Reuses the destination's own hero rather than a picture chosen only
 * for this screen, so it stays true if the destination's photo ever changes.
 * A missing or unpublished Jodhpur destination is not an error here — the
 * page's own empty state (the sun mark) covers it.
 */
export async function getLoginMedia() {
  "use cache";
  cacheTag(TAGS.destinations, TAGS.media);
  cacheLife("days");
  const d = await db.destination.findFirst({
    where: { slug: "jodhpur", status: "PUBLISHED" },
    select: { name: true, latitude: true, longitude: true, hero: { select: mediaSelect } },
  });
  if (!d) return null;
  return {
    media: toMedia(d.hero, d.name),
    caption: d.latitude != null && d.longitude != null ? `${d.name}, Rajasthan · ${d.latitude.toFixed(2)}°N ${d.longitude.toFixed(2)}°E` : `${d.name}, Rajasthan`,
  };
}

export async function publishedPageKeys(): Promise<string[]> {
  "use cache";
  cacheTag(TAGS.pages);
  cacheLife("days");
  const rows = await db.page.findMany({ where: { status: "PUBLISHED" }, select: { key: true } });
  return rows.map((r) => r.key);
}

// ─── Testimonials & FAQs ────────────────────────────────────────────────────

/** Only verified, published testimonials ever reach a page. */
export async function listVerifiedTestimonials() {
  "use cache";
  cacheTag(TAGS.testimonials);
  cacheLife("days");
  return db.testimonial.findMany({
    where: { status: "PUBLISHED", verifiedAt: { not: null } },
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      authorName: true,
      headline: true,
      body: true,
      location: true,
      source: true,
      sourceUrl: true,
      travelledOn: true,
      journey: { select: { slug: true, name: true, kind: true } },
    },
  });
}

export async function listFaqs() {
  "use cache";
  cacheTag(TAGS.faqs, TAGS.categories);
  cacheLife("days");
  const rows = await db.faq.findMany({
    where: { status: "PUBLISHED" },
    orderBy: [{ category: { sortOrder: "asc" } }, { sortOrder: "asc" }],
    select: { id: true, question: true, answer: true, category: { select: { slug: true, name: true } } },
  });
  return rows;
}

export { loadSections };
