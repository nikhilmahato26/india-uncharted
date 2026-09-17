import "server-only";
import { DISCOVER_DEFAULT_SLUGS } from "@/lib/sections/defaults";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/lib/db";
import { TAGS, TRAVEL_TAGS } from "./tags";
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
import { listCategories, listRegions } from "./travel";
import { listVerifiedTestimonials } from "./editorial";

/**
 * Everything the homepage shows, gathered once. Each section on the page
 * checks its own minimum and hides when the data behind it is too thin —
 * it never pads with placeholders (IMPLEMENTATION_PLAN §6.3).
 */
export async function getHomeData() {
  "use cache";
  cacheTag(...TRAVEL_TAGS, TAGS.testimonials, TAGS.settings);
  cacheLife("days");
  const status = await visibleStatuses();

  // Discover India: the brief names Rajasthan, Kerala, Ladakh and Goa. We show
  // the region-level places that exist and have content, in that spirit.
  // Every published place with a photograph, so a section can show whichever
  // places the owner chose in the homepage editor, in the order they chose them.
  const destinationsBySlug = Object.fromEntries(
    (await db.destination.findMany({ where: { status, heroId: { not: null } }, select: destinationCardSelect })).map((r) => [r.slug, toDestinationCard(r)]),
  );
  const discover = pickDestinations(destinationsBySlug, DISCOVER_DEFAULT_SLUGS);

  const featuredJourneys = (
    await db.journey.findMany({
      where: { status, isFeatured: true, kind: { not: "BIKE_TOUR" } },
      orderBy: { sortOrder: "asc" },
      take: 4,
      select: journeyCardSelect,
    })
  ).map(toJourneyCard);

  const offbeat = (
    await db.destination.findMany({
      where: { status, isOffbeat: true },
      orderBy: { sortOrder: "asc" },
      select: destinationCardSelect,
    })
  )
    .map(toDestinationCard)
    .filter((d) => d.journeyCount > 0);

  const bikeTours = (
    await db.journey.findMany({ where: { status, kind: "BIKE_TOUR" }, orderBy: { sortOrder: "asc" }, select: journeyCardSelect })
  ).map(toJourneyCard);

  const experiences = (
    await db.experience.findMany({ where: { status }, orderBy: [{ isFeatured: "desc" }, { sortOrder: "asc" }], take: 8, select: experienceCardSelect })
  ).map(toExperienceCard);

  const articles = (await db.article.findMany({ where: { status }, orderBy: { publishedAt: "desc" }, take: 3, select: articleCardSelect })).map(toArticleCard);

  const [regions, styles, themes, testimonials] = await Promise.all([
    listRegions(),
    listCategories("TRAVEL_STYLE"),
    listCategories("EXPERIENCE_THEME"),
    listVerifiedTestimonials(),
  ]);

  const counts = {
    destinations: await db.destination.count({ where: { status } }),
    journeys: await db.journey.count({ where: { status } }),
    experiences: await db.experience.count({ where: { status } }),
  };

  return { discover, destinationsBySlug, featuredJourneys, offbeat, bikeTours, experiences, articles, regions, styles, themes, testimonials, counts };
}

export type HomeData = Awaited<ReturnType<typeof getHomeData>>;

/** Places in the given order, skipping any that are unpublished or have no photograph. */
export function pickDestinations<T>(bySlug: Record<string, T>, slugs: string[]): T[] {
  return slugs.map((slug) => bySlug[slug]).filter((d): d is T => Boolean(d));
}
