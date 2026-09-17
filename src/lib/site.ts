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
/**
 * CMS pages that have their own route file. Their address belongs to the site's
 * structure, not to the content: renaming one would 301 the old address to a
 * page that doesn't exist.
 */
export const FIXED_PAGE_KEYS = new Set(["home", "about", "contact", "plan-my-journey", "faqs", "privacy-policy", "terms-and-conditions", "cookie-policy"]);

export const LEGAL_PAGES = [
  { key: "privacy-policy", label: "Privacy Policy", href: "/privacy-policy" },
  { key: "terms-and-conditions", label: "Terms & Conditions", href: "/terms-and-conditions" },
  { key: "cookie-policy", label: "Cookie Policy", href: "/cookie-policy" },
] as const;

export type LegalPageKey = (typeof LEGAL_PAGES)[number]["key"];

export const RESERVED_SLUGS = new Set(["styles", "themes", "new", "edit", "preview", "search", "page", "admin", "api"]);
