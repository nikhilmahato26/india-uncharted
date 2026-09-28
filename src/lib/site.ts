/** Public, non-secret site configuration. Safe to import anywhere. */

/**
 * Forces the canonical host to its "www" form. robots.ts, sitemap.ts and every
 * canonical/OG URL all read SITE_URL, so a bare apex domain typed into the env
 * var — "indiauncharted.com" instead of "www.indiauncharted.com" — would make
 * the apex the canonical host everywhere at once. This is the one place that
 * decision is made, so it can't drift between the two files.
 *
 * Left alone: localhost, and anything that already has a subdomain (www,
 * staging, the vercel.app preview host) — only a bare "label.tld" is rewritten.
 *
 * Known gap: two-part country-code TLDs (indiauncharted.co.in,
 * indiauncharted.org.in) have two dots like a subdomain does and are left
 * alone rather than guessed at — getting that right needs the public suffix
 * list, not a regex. If the client's domain is one of these, set
 * NEXT_PUBLIC_SITE_URL to the www form directly; this guard won't catch it.
 */
export function canonicalSiteUrl(raw: string): string {
  const trimmed = raw.replace(/\/+$/, "");
  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    return trimmed;
  }
  const isBareApex = /^[a-z0-9-]+\.[a-z]{2,}$/i.test(url.hostname);
  if (!isBareApex) return trimmed;
  url.hostname = `www.${url.hostname}`;
  return url.toString().replace(/\/+$/, "");
}

/** The one public address. The apex redirects here, so this is the canonical host. */
export const PRODUCTION_SITE_URL = "https://www.indiauncharted.com";

/**
 * Vercel's own production deployment — the one www.indiauncharted.com serves.
 * Preview deployments report "preview" and local builds report nothing, so
 * both stay on the env vars below and remain noindex.
 */
const IS_PRODUCTION_DEPLOY = process.env.VERCEL_ENV === "production";

/**
 * Production always uses the www domain, whatever NEXT_PUBLIC_SITE_URL says: an
 * env var pointing at the vercel.app host once sent every canonical, and the
 * sitemap, there instead of to the real site.
 */
export const SITE_URL = IS_PRODUCTION_DEPLOY ? PRODUCTION_SITE_URL : canonicalSiteUrl(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000");

/**
 * Production is always indexable; elsewhere only an explicit SITE_INDEXABLE=true
 * opens it up, so previews and local builds are always noindex. Production used
 * to rely on that env var too, and with it unset robots.txt blocked all of Google.
 */
export const SITE_INDEXABLE = IS_PRODUCTION_DEPLOY || process.env.SITE_INDEXABLE === "true";

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
