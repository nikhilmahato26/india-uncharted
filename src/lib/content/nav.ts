import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/lib/db";
import { LEGAL_PAGES, routes } from "@/lib/site";
import { TAGS, TRAVEL_TAGS } from "./tags";
import { listCategories, listRegions } from "./travel";
import { journeyCardSelect, toJourneyCard } from "./cards";
import { getSiteSettings } from "./settings";
import { liveLegalPageKeys, publishedPageKeys } from "./editorial";

export type NavLink = { label: string; href: string; meta?: string | null };
export type MegaColumn = { heading: string; href?: string; links: NavLink[] };
export type NavItem =
  | { kind: "link"; label: string; href: string }
  | { kind: "mega"; label: string; href: string; columns: MegaColumn[]; feature?: { title: string; href: string; meta: string | null; image: { src: string; alt: string; blurDataUrl: string | null } | null } };

/**
 * Header and footer navigation. Built from published content so a new
 * destination or travel style appears in the menu the moment it is published.
 * (A NavigationMenu override from the CMS takes precedence once one exists.)
 */
export async function getNavigation() {
  "use cache";
  cacheTag(...TRAVEL_TAGS, TAGS.nav, TAGS.settings, TAGS.pages, TAGS.services);
  cacheLife("days");

  const [regions, styles, themes, settings, pageKeys, legalKeys] = await Promise.all([
    listRegions(),
    listCategories("TRAVEL_STYLE"),
    listCategories("EXPERIENCE_THEME"),
    getSiteSettings(),
    publishedPageKeys(),
    liveLegalPageKeys(),
  ]);
  const featured = await db.journey.findFirst({
    where: { status: "PUBLISHED", isFeatured: true, heroId: { not: null } },
    orderBy: { sortOrder: "asc" },
    select: journeyCardSelect,
  });
  const featuredCard = featured ? toJourneyCard(featured) : null;
  const bikeCount = await db.journey.count({ where: { status: "PUBLISHED", kind: "BIKE_TOUR" } });
  const articleCount = await db.article.count({ where: { status: "PUBLISHED" } });
  const services = await db.service.findMany({ where: { status: "PUBLISHED" }, orderBy: { sortOrder: "asc" }, select: { slug: true, name: true } });

  const header: NavItem[] = [
    {
      kind: "mega",
      label: "Destinations",
      href: routes.destinations(),
      columns: regions.map((r) => ({
        heading: r.name,
        href: routes.region(r.slug),
        links: r.destinations.slice(0, 8).map((d) => ({ label: d.name, href: d.href })),
      })),
    },
    {
      kind: "mega",
      label: "Experiences",
      href: routes.experiences(),
      columns: [
        { heading: "By theme", links: themes.map((t) => ({ label: t.name, href: routes.experienceTheme(t.slug), meta: null })) },
      ],
    },
    {
      kind: "mega",
      label: "Journeys",
      href: routes.journeys(),
      columns: [{ heading: "Travel your way", links: styles.map((s) => ({ label: s.name, href: routes.travelStyle(s.slug) })) }],
      feature: featuredCard
        ? {
            title: featuredCard.name,
            href: featuredCard.href,
            meta: featuredCard.durationText,
            image: featuredCard.hero ? { src: featuredCard.hero.src, alt: featuredCard.hero.alt, blurDataUrl: featuredCard.hero.blurDataUrl } : null,
          }
        : undefined,
    },
    ...(bikeCount ? [{ kind: "link" as const, label: "Bike Tours", href: routes.bikeTours() }] : []),
    ...(articleCount ? [{ kind: "link" as const, label: "Travel Guide", href: routes.travelGuide() }] : []),
    { kind: "link", label: "About", href: routes.about() },
  ];

  const legal = LEGAL_PAGES.filter((l) => legalKeys.includes(l.key));

  const footer: MegaColumn[] = [
    {
      heading: "Explore India",
      links: [
        { label: "Destinations", href: routes.destinations() },
        { label: "Regions", href: routes.regions() },
        ...regions.slice(0, 5).map((r) => ({ label: r.name, href: routes.region(r.slug) })),
      ],
    },
    {
      heading: "Journeys",
      links: [
        { label: "All journeys", href: routes.journeys() },
        ...(bikeCount ? [{ label: "Bike Tours", href: routes.bikeTours() }] : []),
        ...styles.filter((s) => s.slug !== "motorcycle").slice(0, 5).map((s) => ({ label: s.name, href: routes.travelStyle(s.slug) })),
      ],
    },
    {
      heading: "Plan",
      links: [
        { label: "Plan My Journey", href: routes.planMyJourney() },
        { label: "Experiences", href: routes.experiences() },
        ...(articleCount ? [{ label: "Travel Guide", href: routes.travelGuide() }] : []),
        ...services.map((s) => ({ label: s.name, href: routes.service(s.slug) })),
      ],
    },
    {
      heading: "India Uncharted",
      links: [
        { label: "About", href: routes.about() },
        { label: "Contact", href: routes.contact() },
        ...(pageKeys.includes("faqs") ? [{ label: "FAQs", href: routes.faqs() }] : []),
      ],
    },
  ];

  return { header, footer, legal, settings };
}

export type Navigation = Awaited<ReturnType<typeof getNavigation>>;
