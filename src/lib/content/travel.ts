import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/lib/db";
import type { JourneyKind } from "@/generated/prisma/enums";
import { isRichDoc, type RichDoc } from "@/lib/richtext/types";
import { TAGS, TRAVEL_TAGS } from "./tags";
import { mediaSelect, toMedia } from "./media";
import { visibleStatuses } from "./visibility";
import {
  articleCardSelect,
  destinationCardSelect,
  durationText,
  experienceCardSelect,
  FORMAT_LABELS,
  journeyCardSelect,
  priceText,
  toArticleCard,
  toDestinationCard,
  toExperienceCard,
  toJourneyCard,
} from "./cards";
import { loadFaqs, loadGallery, loadRelatedLinks, loadSections, seoSelect, toSeo } from "./shared";

const doc = (v: unknown): RichDoc | null => (isRichDoc(v) && v.content.length ? v : null);

// ─── Regions ────────────────────────────────────────────────────────────────

export async function listRegions() {
  "use cache";
  cacheTag(...TRAVEL_TAGS);
  cacheLife("days");
  const status = await visibleStatuses();
  const regions = await db.region.findMany({
    where: { status },
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      slug: true,
      name: true,
      tagline: true,
      shortDescription: true,
      mapKey: true,
      hero: { select: mediaSelect },
      destinations: {
        where: { status, parentId: null },
        orderBy: { sortOrder: "asc" },
        select: destinationCardSelect,
      },
    },
  });
  const journeyCounts = new Map<string, number>();
  for (const r of regions) {
    journeyCounts.set(r.id, await db.journey.count({ where: { status, stops: { some: { destination: { regionId: r.id } } } } }));
  }
  return regions
    .map((r) => {
      const destinations = r.destinations.map(toDestinationCard);
      const hero = toMedia(r.hero, r.name) ?? destinations.find((d) => d.hero)?.hero ?? null;
      return {
        id: r.id,
        slug: r.slug,
        name: r.name,
        tagline: r.tagline,
        shortDescription: r.shortDescription,
        mapKey: r.mapKey,
        hero,
        destinations,
        journeyCount: journeyCounts.get(r.id) ?? 0,
      };
    })
    .filter((r) => r.destinations.length > 0);
}

export type RegionListItem = Awaited<ReturnType<typeof listRegions>>[number];

export async function getRegionPage(slug: string) {
  "use cache";
  cacheTag(...TRAVEL_TAGS);
  cacheLife("days");
  const status = await visibleStatuses();
  const region = await db.region.findFirst({
    where: { slug, status },
    select: {
      id: true,
      slug: true,
      name: true,
      tagline: true,
      shortDescription: true,
      intro: true,
      updatedAt: true,
      hero: { select: mediaSelect },
      seo: { select: seoSelect },
    },
  });
  if (!region) return null;
  const destinations = (
    await db.destination.findMany({ where: { regionId: region.id, status }, orderBy: [{ parentId: "asc" }, { sortOrder: "asc" }], select: destinationCardSelect })
  ).map(toDestinationCard);
  const destinationIds = destinations.map((d) => d.id);
  const journeys = (
    await db.journey.findMany({
      where: { status, stops: { some: { destinationId: { in: destinationIds } } } },
      orderBy: [{ isFeatured: "desc" }, { sortOrder: "asc" }],
      select: journeyCardSelect,
    })
  ).map(toJourneyCard);
  const experiences = (
    await db.experience.findMany({ where: { status, destinationId: { in: destinationIds } }, orderBy: { sortOrder: "asc" }, select: experienceCardSelect })
  ).map(toExperienceCard);
  const articles = (
    await db.article.findMany({
      where: { status, destinations: { some: { destinationId: { in: destinationIds } } } },
      orderBy: { publishedAt: "desc" },
      take: 3,
      select: articleCardSelect,
    })
  ).map(toArticleCard);
  return {
    ...region,
    intro: doc(region.intro),
    hero: toMedia(region.hero, region.name) ?? destinations.find((d) => d.hero)?.hero ?? null,
    seo: toSeo(region.seo),
    updatedAt: region.updatedAt.toISOString(),
    destinations,
    journeys,
    experiences,
    articles,
    faqs: await loadFaqs("REGION", region.id),
  };
}

// ─── Destinations ───────────────────────────────────────────────────────────

export async function listDestinations() {
  "use cache";
  cacheTag(...TRAVEL_TAGS);
  cacheLife("days");
  const status = await visibleStatuses();
  const rows = await db.destination.findMany({
    where: { status },
    orderBy: [{ region: { sortOrder: "asc" } }, { sortOrder: "asc" }],
    select: { ...destinationCardSelect, parent: { select: { slug: true, name: true } } },
  });
  return rows.map((d) => ({ ...toDestinationCard(d), parent: d.parent }));
}

export async function getDestinationPage(slug: string) {
  "use cache";
  cacheTag(...TRAVEL_TAGS);
  cacheLife("days");
  const status = await visibleStatuses();
  const d = await db.destination.findFirst({
    where: { slug, status },
    select: {
      ...destinationCardSelect,
      intro: true,
      whyVisit: true,
      bestTime: true,
      weather: true,
      howToReach: true,
      localTransport: true,
      recommendedDuration: true,
      food: true,
      culture: true,
      festivals: true,
      travelTips: true,
      whereToStay: true,
      updatedAt: true,
      parent: { select: { id: true, slug: true, name: true, status: true } },
      children: { where: { status }, orderBy: { sortOrder: "asc" }, select: destinationCardSelect },
      highlights: { orderBy: { sortOrder: "asc" }, select: { id: true, kind: true, title: true, body: true, media: { select: mediaSelect } } },
      seo: { select: seoSelect },
    },
  });
  if (!d) return null;

  const familyIds = [d.id, ...d.children.map((c) => c.id)];
  const journeys = (
    await db.journey.findMany({
      where: { status, stops: { some: { destinationId: { in: familyIds } } } },
      orderBy: [{ isFeatured: "desc" }, { sortOrder: "asc" }],
      select: journeyCardSelect,
    })
  ).map(toJourneyCard);
  const experiences = (
    await db.experience.findMany({ where: { status, destinationId: { in: familyIds } }, orderBy: { sortOrder: "asc" }, select: experienceCardSelect })
  ).map(toExperienceCard);
  const articles = (
    await db.article.findMany({
      where: { status, destinations: { some: { destinationId: { in: familyIds } } } },
      orderBy: { publishedAt: "desc" },
      take: 4,
      select: articleCardSelect,
    })
  ).map(toArticleCard);

  // Nearby: manual related links first, then places in the same region by distance.
  const manual = await loadRelatedLinks("DESTINATION", d.id);
  const manualIds = manual.filter((l) => l.toType === "DESTINATION").map((l) => l.toId);
  const regionPeers = d.region
    ? await db.destination.findMany({
        where: { status, region: { slug: d.region.slug }, id: { notIn: [d.id, ...familyIds, ...(d.parent ? [d.parent.id] : [])] } },
        select: destinationCardSelect,
      })
    : [];
  const manualRows = manualIds.length ? await db.destination.findMany({ where: { id: { in: manualIds }, status }, select: destinationCardSelect }) : [];
  const dist = (p: { latitude: number | null; longitude: number | null }) =>
    d.latitude != null && d.longitude != null && p.latitude != null && p.longitude != null
      ? Math.hypot(d.latitude - p.latitude, (d.longitude - p.longitude) * Math.cos((d.latitude * Math.PI) / 180))
      : 999;
  const nearby = [
    ...manualIds.map((id) => manualRows.find((r) => r.id === id)).filter((r): r is NonNullable<typeof r> => Boolean(r)),
    ...regionPeers.filter((p) => !manualIds.includes(p.id)).sort((a, b) => dist(a) - dist(b)),
  ]
    .slice(0, 6)
    .map(toDestinationCard);

  const card = toDestinationCard(d);
  return {
    ...card,
    intro: doc(d.intro),
    whyVisit: doc(d.whyVisit),
    food: doc(d.food),
    culture: doc(d.culture),
    festivals: doc(d.festivals),
    travelTips: doc(d.travelTips),
    whereToStay: doc(d.whereToStay),
    facts: {
      bestTime: d.bestTime,
      weather: d.weather,
      howToReach: d.howToReach,
      localTransport: d.localTransport,
      recommendedDuration: d.recommendedDuration,
    },
    parent: d.parent && d.parent.status === "PUBLISHED" ? { slug: d.parent.slug, name: d.parent.name } : null,
    children: d.children.map(toDestinationCard),
    highlights: d.highlights.map((h) => ({ ...h, media: toMedia(h.media, h.title) })),
    journeys,
    experiences,
    articles,
    nearby,
    gallery: await loadGallery("DESTINATION", d.id),
    faqs: await loadFaqs("DESTINATION", d.id),
    sections: await loadSections("DESTINATION", d.id),
    seo: toSeo(d.seo),
    updatedAt: d.updatedAt.toISOString(),
  };
}

export type DestinationPage = NonNullable<Awaited<ReturnType<typeof getDestinationPage>>>;

// ─── Journeys ───────────────────────────────────────────────────────────────

export async function listJourneys(kinds?: JourneyKind[]) {
  "use cache";
  cacheTag(...TRAVEL_TAGS);
  cacheLife("days");
  const status = await visibleStatuses();
  const rows = await db.journey.findMany({
    where: { status, ...(kinds ? { kind: { in: kinds } } : {}) },
    orderBy: [{ isFeatured: "desc" }, { sortOrder: "asc" }],
    select: { ...journeyCardSelect, isFeatured: true, stops: { ...journeyCardSelect.stops, select: { ...journeyCardSelect.stops.select, destination: { select: { slug: true, name: true, status: true, region: { select: { slug: true, name: true } } } } } } },
  });
  return rows.map((j) => ({
    ...toJourneyCard(j),
    isFeatured: j.isFeatured,
    regions: [...new Map(j.stops.map((s) => s.destination.region).filter(Boolean).map((r) => [r!.slug, r!])).values()],
  }));
}

export type JourneyListItem = Awaited<ReturnType<typeof listJourneys>>[number];

export async function getJourneyPage(slug: string, kind: "BIKE_TOUR" | "OTHER") {
  "use cache";
  cacheTag(...TRAVEL_TAGS, TAGS.testimonials);
  cacheLife("days");
  const status = await visibleStatuses();
  const j = await db.journey.findFirst({
    where: { slug, status, kind: kind === "BIKE_TOUR" ? "BIKE_TOUR" : { not: "BIKE_TOUR" } },
    select: {
      ...journeyCardSelect,
      overview: true,
      idealFor: true,
      pickupDrop: true,
      highlights: true,
      inclusions: true,
      exclusions: true,
      whyChoose: true,
      accommodationNote: true,
      transportNote: true,
      practicalInfo: true,
      bestTime: true,
      updatedAt: true,
      stops: {
        orderBy: { sortOrder: "asc" },
        select: { isOptional: true, nights: true, destination: { select: destinationCardSelect } },
      },
      itinerary: {
        orderBy: { sortOrder: "asc" },
        select: { id: true, dayNumber: true, dayEnd: true, title: true, body: true, meals: true, overnightDestination: { select: { slug: true, name: true, status: true } } },
      },
      bikeDetail: true,
      experiences: { orderBy: { sortOrder: "asc" }, select: { experience: { select: experienceCardSelect } } },
      articles: { select: { article: { select: articleCardSelect } } },
      seo: { select: seoSelect },
    },
  });
  if (!j) return null;

  const stopIds = j.stops.map((s) => s.destination.id);
  const styleSlugs = j.styles.map((s) => s.category.slug);

  let experiences = j.experiences.map((e) => e.experience).filter((e) => e.status === "PUBLISHED" || status.in.includes(e.status));
  if (!experiences.length && stopIds.length) {
    experiences = await db.experience.findMany({
      where: { status, destinationId: { in: stopIds } },
      orderBy: { sortOrder: "asc" },
      take: 6,
      select: experienceCardSelect,
    });
  }

  const manual = await loadRelatedLinks("JOURNEY", j.id);
  const manualIds = manual.filter((l) => l.toType === "JOURNEY").map((l) => l.toId);
  const candidates = await db.journey.findMany({
    where: {
      status,
      id: { not: j.id },
      OR: [{ stops: { some: { destinationId: { in: stopIds } } } }, { styles: { some: { category: { slug: { in: styleSlugs } } } } }, { id: { in: manualIds } }],
    },
    select: { ...journeyCardSelect, stops: { select: { isOptional: true, destination: { select: { id: true, slug: true, name: true, status: true } } }, orderBy: { sortOrder: "asc" } } },
  });
  const score = (c: (typeof candidates)[number]) =>
    (manualIds.includes(c.id) ? 100 - manualIds.indexOf(c.id) : 0) +
    c.stops.filter((s) => stopIds.includes(s.destination.id)).length * 3 +
    c.styles.filter((s) => styleSlugs.includes(s.category.slug)).length * 2 +
    (c.kind === j.kind ? 1 : 0);
  const related = candidates
    .sort((a, b) => score(b) - score(a))
    .slice(0, 3)
    .map(toJourneyCard);

  let articles = j.articles.map((a) => a.article).filter((a) => status.in.includes(a.status));
  if (!articles.length && stopIds.length) {
    articles = await db.article.findMany({
      where: { status, destinations: { some: { destinationId: { in: stopIds } } } },
      orderBy: { publishedAt: "desc" },
      take: 3,
      select: articleCardSelect,
    });
  }

  const card = toJourneyCard({ ...j, stops: j.stops.map((s) => ({ isOptional: s.isOptional, destination: s.destination })) });
  return {
    ...card,
    overview: doc(j.overview),
    practicalInfo: doc(j.practicalInfo),
    idealFor: j.idealFor,
    pickupDrop: j.pickupDrop,
    tourType: j.tourType,
    highlights: j.highlights,
    inclusions: j.inclusions,
    exclusions: j.exclusions,
    whyChoose: j.whyChoose,
    accommodationNote: j.accommodationNote,
    transportNote: j.transportNote,
    bestTime: j.bestTime,
    stops: j.stops.map((s) => ({ ...toDestinationCard(s.destination), nights: s.nights, optional: s.isOptional })),
    itinerary: j.itinerary.map((d) => ({
      id: d.id,
      dayNumber: d.dayNumber,
      dayEnd: d.dayEnd,
      title: d.title,
      body: doc(d.body),
      meals: d.meals,
      overnight: d.overnightDestination && d.overnightDestination.status === "PUBLISHED" ? d.overnightDestination : null,
    })),
    bike: j.bikeDetail,
    experiences: experiences.map(toExperienceCard),
    related,
    articles: articles.map(toArticleCard),
    gallery: await loadGallery("JOURNEY", j.id),
    faqs: await loadFaqs("JOURNEY", j.id),
    sections: await loadSections("JOURNEY", j.id),
    testimonials: await db.testimonial.findMany({
      where: { journeyId: j.id, status: "PUBLISHED", verifiedAt: { not: null } },
      orderBy: { sortOrder: "asc" },
      select: { id: true, authorName: true, headline: true, body: true, location: true, travelledOn: true },
    }),
    seo: toSeo(j.seo),
    updatedAt: j.updatedAt.toISOString(),
  };
}

export type JourneyPage = NonNullable<Awaited<ReturnType<typeof getJourneyPage>>>;

// ─── Experiences ────────────────────────────────────────────────────────────

export async function listExperiences() {
  "use cache";
  cacheTag(...TRAVEL_TAGS);
  cacheLife("days");
  const status = await visibleStatuses();
  const rows = await db.experience.findMany({ where: { status }, orderBy: [{ isFeatured: "desc" }, { sortOrder: "asc" }], select: experienceCardSelect });
  return rows.map(toExperienceCard);
}

export async function getExperiencePage(slug: string) {
  "use cache";
  cacheTag(...TRAVEL_TAGS);
  cacheLife("days");
  const status = await visibleStatuses();
  const e = await db.experience.findFirst({
    where: { slug, status },
    select: {
      ...experienceCardSelect,
      location: true,
      bestTime: true,
      overview: true,
      whatToExpect: true,
      thingsToKnow: true,
      travelTips: true,
      pickupDrop: true,
      idealFor: true,
      tourType: true,
      highlights: true,
      inclusions: true,
      exclusions: true,
      quoteOnly: true,
      priceFromInr: true,
      updatedAt: true,
      destinationId: true,
      steps: { orderBy: { sortOrder: "asc" }, select: { id: true, title: true, body: true } },
      seo: { select: seoSelect },
    },
  });
  if (!e) return null;
  const card = toExperienceCard(e);
  const themeSlugs = card.themes.map((t) => t.slug);
  const others = await db.experience.findMany({
    where: {
      status,
      id: { not: e.id },
      OR: [{ destinationId: e.destinationId ?? "__none__" }, { themes: { some: { category: { slug: { in: themeSlugs } } } } }],
    },
    select: experienceCardSelect,
  });
  const relatedExperiences = others
    .sort((a, b) => Number(b.destination?.slug === card.destination?.slug) - Number(a.destination?.slug === card.destination?.slug))
    .slice(0, 3)
    .map(toExperienceCard);
  const journeys = e.destinationId
    ? (
        await db.journey.findMany({
          where: { status, stops: { some: { destinationId: e.destinationId } } },
          orderBy: [{ isFeatured: "desc" }, { sortOrder: "asc" }],
          take: 3,
          select: journeyCardSelect,
        })
      ).map(toJourneyCard)
    : [];
  const destination = e.destinationId
    ? await db.destination.findFirst({ where: { id: e.destinationId, status }, select: destinationCardSelect })
    : null;
  return {
    ...card,
    location: e.location,
    bestTime: e.bestTime,
    overview: doc(e.overview),
    whatToExpect: doc(e.whatToExpect),
    thingsToKnow: doc(e.thingsToKnow),
    travelTips: doc(e.travelTips),
    pickupDrop: e.pickupDrop,
    idealFor: e.idealFor,
    tourType: e.tourType,
    highlights: e.highlights,
    inclusions: e.inclusions,
    exclusions: e.exclusions,
    priceText: priceText(e.quoteOnly, e.priceFromInr),
    steps: e.steps,
    destinationCard: destination ? toDestinationCard(destination) : null,
    relatedExperiences,
    journeys,
    gallery: await loadGallery("EXPERIENCE", e.id),
    faqs: await loadFaqs("EXPERIENCE", e.id),
    sections: await loadSections("EXPERIENCE", e.id),
    seo: toSeo(e.seo),
    updatedAt: e.updatedAt.toISOString(),
  };
}

export type ExperiencePage = NonNullable<Awaited<ReturnType<typeof getExperiencePage>>>;

// ─── Categories (travel styles, experience themes) ──────────────────────────

export async function listCategories(type: "TRAVEL_STYLE" | "EXPERIENCE_THEME") {
  "use cache";
  cacheTag(...TRAVEL_TAGS);
  cacheLife("days");
  const status = await visibleStatuses();
  const rows = await db.category.findMany({
    where: { type, status: "PUBLISHED" },
    orderBy: { sortOrder: "asc" },
    select: {
      id: true,
      slug: true,
      name: true,
      intro: true,
      hero: { select: mediaSelect },
      journeyStyles: { where: { journey: { status } }, select: { journey: { select: { hero: { select: mediaSelect }, isFeatured: true } } } },
      experienceThemes: { where: { experience: { status } }, select: { experience: { select: { hero: { select: mediaSelect } } } } },
    },
  });
  // A category with no picture of its own borrows one from its content. Two
  // categories share a lot of that content, so a borrowed picture is claimed:
  // the same photograph never stands for two different ideas in one row.
  const claimed = new Set<string>();
  return rows
    .map((c) => {
      const journeyHeroes = [...c.journeyStyles].sort((a, b) => Number(b.journey.isFeatured) - Number(a.journey.isFeatured)).map((s) => s.journey.hero);
      const heroes = [...journeyHeroes, ...c.experienceThemes.map((t) => t.experience.hero)].filter(Boolean);
      const own = toMedia(c.hero, c.name);
      if (own) claimed.add(own.src);
      const borrowed = own ? null : heroes.find((h) => h && !claimed.has(h.url)) ?? heroes[0];
      const hero = own ?? toMedia(borrowed, c.name);
      if (hero) claimed.add(hero.src);
      return {
        id: c.id,
        slug: c.slug,
        name: c.name,
        intro: c.intro,
        hero,
        journeyCount: c.journeyStyles.length,
        experienceCount: c.experienceThemes.length,
      };
    })
    .filter((c) => c.journeyCount + c.experienceCount > 0);
}

export type CategoryListItem = Awaited<ReturnType<typeof listCategories>>[number];

export async function getCategoryPage(type: "TRAVEL_STYLE" | "EXPERIENCE_THEME", slug: string) {
  "use cache";
  cacheTag(...TRAVEL_TAGS);
  cacheLife("days");
  const status = await visibleStatuses();
  const c = await db.category.findFirst({
    where: { type, slug, status: "PUBLISHED" },
    select: { id: true, slug: true, name: true, intro: true, body: true, updatedAt: true, hero: { select: mediaSelect }, seo: { select: seoSelect } },
  });
  if (!c) return null;
  const journeys = (
    await db.journey.findMany({
      where: {
        status,
        OR: [
          { styles: { some: { categoryId: c.id } } },
          ...(type === "EXPERIENCE_THEME" ? [{ experiences: { some: { experience: { themes: { some: { categoryId: c.id } } } } } }] : []),
        ],
      },
      orderBy: [{ isFeatured: "desc" }, { sortOrder: "asc" }],
      select: journeyCardSelect,
    })
  ).map(toJourneyCard);
  const experiences =
    type === "EXPERIENCE_THEME"
      ? (await db.experience.findMany({ where: { status, themes: { some: { categoryId: c.id } } }, orderBy: { sortOrder: "asc" }, select: experienceCardSelect })).map(
          toExperienceCard,
        )
      : [];
  if (!journeys.length && !experiences.length) return null;
  return {
    ...c,
    type,
    body: doc(c.body),
    hero: toMedia(c.hero, c.name) ?? journeys.find((j) => j.hero)?.hero ?? experiences.find((e) => e.hero)?.hero ?? null,
    journeys,
    experiences,
    faqs: await loadFaqs("CATEGORY", c.id),
    seo: toSeo(c.seo),
    updatedAt: c.updatedAt.toISOString(),
  };
}

// ─── Services ───────────────────────────────────────────────────────────────

export async function listServices() {
  "use cache";
  cacheTag(TAGS.services, TAGS.media);
  cacheLife("days");
  const status = await visibleStatuses();
  const rows = await db.service.findMany({
    where: { status },
    orderBy: { sortOrder: "asc" },
    select: { id: true, slug: true, name: true, shortDescription: true, features: true, hero: { select: mediaSelect }, vehicles: { take: 1, orderBy: { sortOrder: "asc" }, select: { media: { select: mediaSelect } } } },
  });
  return rows.map((s) => ({ ...s, hero: toMedia(s.hero, s.name) ?? toMedia(s.vehicles[0]?.media, s.name), href: `/services/${s.slug}` }));
}

export async function getServicePage(slug: string) {
  "use cache";
  cacheTag(TAGS.services, TAGS.media, TAGS.faqs, TAGS.seo, TAGS.testimonials);
  cacheLife("days");
  const status = await visibleStatuses();
  const s = await db.service.findFirst({
    where: { slug, status },
    select: {
      id: true,
      slug: true,
      name: true,
      shortDescription: true,
      description: true,
      benefits: true,
      features: true,
      process: true,
      updatedAt: true,
      hero: { select: mediaSelect },
      vehicles: { orderBy: { sortOrder: "asc" }, select: { id: true, name: true, class: true, seats: true, features: true, media: { select: mediaSelect } } },
      seo: { select: seoSelect },
    },
  });
  if (!s) return null;
  return {
    ...s,
    description: doc(s.description),
    hero: toMedia(s.hero, s.name),
    vehicles: s.vehicles.map((v) => ({ ...v, media: toMedia(v.media, v.name) })),
    faqs: await loadFaqs("SERVICE", s.id),
    seo: toSeo(s.seo),
    updatedAt: s.updatedAt.toISOString(),
  };
}

export { FORMAT_LABELS, durationText };
