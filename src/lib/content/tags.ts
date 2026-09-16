/**
 * Cache tags shared by the read layer (cacheTag) and the write layer (updateTag).
 * Coarse per-type tags: at this catalogue size one edit re-rendering every page
 * of its type is cheap, and a missed fine-grained tag is the classic
 * "my edit doesn't show" bug.
 */
export const TAGS = {
  settings: "settings",
  nav: "nav",
  seo: "seo",
  regions: "regions",
  destinations: "destinations",
  journeys: "journeys",
  experiences: "experiences",
  articles: "articles",
  services: "services",
  pages: "pages",
  categories: "categories",
  testimonials: "testimonials",
  faqs: "faqs",
  media: "media",
  sections: "sections",
  notices: "notices",
} as const;

export type Tag = (typeof TAGS)[keyof typeof TAGS];

/** Everything a travel page can show, for reads that join across types. */
export const TRAVEL_TAGS: Tag[] = [
  TAGS.regions,
  TAGS.destinations,
  TAGS.journeys,
  TAGS.experiences,
  TAGS.articles,
  TAGS.categories,
  TAGS.media,
  TAGS.seo,
  TAGS.faqs,
  TAGS.sections,
];
