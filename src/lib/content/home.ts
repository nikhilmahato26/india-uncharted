import "server-only";
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
  const discoverSlugs = ["jaisalmer", "goa", "kashmir", "leh", "udaipur", "varanasi"];
  const discoverRows = await db.destination.findMany({
    where: { status, slug: { in: discoverSlugs }, heroId: { not: null } },
    select: destinationCardSelect,
  });
  const discover = discoverSlugs
    .map((s) => discoverRows.find((r) => r.slug === s))
    .filter((r): r is NonNullable<typeof r> => Boolean(r))
    .map(toDestinationCard);

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

  return { discover, featuredJourneys, offbeat, bikeTours, experiences, articles, regions, styles, themes, testimonials, counts };
}

export type HomeData = Awaited<ReturnType<typeof getHomeData>>;
