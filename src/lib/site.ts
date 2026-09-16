/** Public, non-secret site configuration. Safe to import anywhere. */

export const SITE_URL = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/+$/, "");

/** Only production sets SITE_INDEXABLE=true; staging and local are always noindex. */
export const SITE_INDEXABLE = process.env.SITE_INDEXABLE === "true";

export function absoluteUrl(path: string): string {
  if (/^https?:\/\//i.test(path)) return path;
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

/** Route prefix for every public entity type. One place, so links never drift. */
export const routes = {
  home: () => "/",
  destinations: () => "/destinations",
  destination: (slug: string) => `/destinations/${slug}`,
  regions: () => "/regions",
  region: (slug: string) => `/regions/${slug}`,
  journeys: () => "/journeys",
  journey: (slug: string, kind?: string) => (kind === "BIKE_TOUR" ? `/bike-tours/${slug}` : `/journeys/${slug}`),
  bikeTours: () => "/bike-tours",
  travelStyle: (slug: string) => `/journeys/styles/${slug}`,
  experiences: () => "/experiences",
  experience: (slug: string) => `/experiences/${slug}`,
  experienceTheme: (slug: string) => `/experiences/themes/${slug}`,
  travelGuide: () => "/travel-guide",
  article: (slug: string) => `/travel-guide/${slug}`,
  services: () => "/services",
  service: (slug: string) => `/services/${slug}`,
  about: () => "/about",
  contact: () => "/contact",
  planMyJourney: () => "/plan-my-journey",
  faqs: () => "/faqs",
  search: () => "/search",
} as const;

/** Slugs a record may never take, because a route segment already owns them. */
export const RESERVED_SLUGS = new Set(["styles", "themes", "new", "edit", "preview", "search", "page", "admin", "api"]);
