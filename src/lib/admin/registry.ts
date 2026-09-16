import { z } from "zod";
import type { EntityType } from "@/generated/prisma/enums";
import { TAGS, type Tag } from "@/lib/content/tags";
import type { FieldGroup } from "./fields";

/**
 * One description per editable content type: what it is called, where it lives
 * on the public site, which fields the editor sees, and how it is validated.
 * The list screens, the editors and the server actions all read from here.
 */

export type EntityKey = "destinations" | "regions" | "journeys" | "experiences" | "articles" | "services" | "pages" | "faqs" | "testimonials";

export type ListColumn = { key: string; label: string; className?: string };

export type EntityDef = {
  key: EntityKey;
  /** Prisma model name (also the delegate key on the client). */
  model: "destination" | "region" | "journey" | "experience" | "article" | "service" | "page" | "faq" | "testimonial";
  entityType: EntityType;
  label: string;
  singular: string;
  description: string;
  /** Public URL for a record, when it has one. */
  publicPath?: (row: { slug: string; kind?: string | null }) => string;
  hasSlug: boolean;
  hasStatus: boolean;
  hasSeo: boolean;
  hasHero: boolean;
  hasOrder: boolean;
  titleField: "name" | "title" | "question" | "authorName";
  searchFields: string[];
  columns: ListColumn[];
  groups: FieldGroup[];
  schema: z.ZodType<Record<string, unknown>>;
  tags: Tag[];
};

const statusOptions = [
  { value: "DRAFT", label: "Draft" },
  { value: "PUBLISHED", label: "Published" },
  { value: "ARCHIVED", label: "Archived" },
];

const optionalText = z.string().trim().max(400).optional();
const optionalLong = z.string().trim().max(20000).optional();
const richField = z.unknown().optional();
const listField = z.array(z.string().trim().max(400)).max(60).optional();

export const ENTITIES: Record<EntityKey, EntityDef> = {
  destinations: {
    key: "destinations",
    model: "destination",
    entityType: "DESTINATION",
    label: "Destinations",
    singular: "Destination",
    description: "Places you plan journeys through. Each one becomes a travel-guide page.",
    publicPath: (r) => `/destinations/${r.slug}`,
    hasSlug: true,
    hasStatus: true,
    hasSeo: true,
    hasHero: true,
    hasOrder: true,
    titleField: "name",
    searchFields: ["name", "title", "state", "shortDescription"],
    columns: [
      { key: "name", label: "Name" },
      { key: "region", label: "Region" },
      { key: "journeyCount", label: "Journeys", className: "tabular" },
      { key: "status", label: "Status" },
    ],
    tags: [TAGS.destinations],
    groups: [
      {
        title: "The place",
        fields: [
          { name: "name", label: "Name", type: "text", required: true, help: "How travellers refer to it: Jaisalmer, Nubra Valley." },
          { name: "slug", label: "URL", type: "slug", help: "The web address. Changing it creates a redirect from the old one automatically." },
          { name: "title", label: "Byline", type: "text", help: 'The short epithet, e.g. "The Blue City". Shown in italics after the name.' },
          {
            name: "type",
            label: "Kind of place",
            type: "select",
            options: [
              { value: "CITY", label: "City" },
              { value: "TOWN", label: "Town" },
              { value: "VILLAGE", label: "Village" },
              { value: "STATE", label: "State" },
              { value: "VALLEY", label: "Valley" },
              { value: "LAKE", label: "Lake" },
              { value: "NATIONAL_PARK", label: "National park" },
              { value: "WILDLIFE_SANCTUARY", label: "Wildlife sanctuary" },
              { value: "REGION_AREA", label: "Area" },
            ],
          },
          { name: "state", label: "State", type: "text" },
          { name: "latitude", label: "Latitude", type: "number", help: "Used on the coordinate map. Two decimals is enough." },
          { name: "longitude", label: "Longitude", type: "number" },
          { name: "isOffbeat", label: "Beyond the obvious", type: "switch", help: "Shows this place in the offbeat section of the homepage." },
          { name: "isFeatured", label: "Featured", type: "switch" },
        ],
      },
      {
        title: "Copy",
        description: "Write for someone deciding whether to go. Specific beats general.",
        fields: [
          { name: "shortDescription", label: "Card description", type: "textarea", rows: 2, span: 2, help: "One or two sentences, shown on cards and in search results.", recommendation: "Up to 280 characters" },
          { name: "intro", label: "Introduction", type: "rich", span: 2 },
          { name: "whyVisit", label: "Why visit", type: "rich", span: 2 },
          { name: "travelTips", label: "Travel tips", type: "rich", span: 2 },
          { name: "food", label: "Food", type: "rich", span: 2 },
          { name: "whereToStay", label: "Where to stay", type: "rich", span: 2, help: "Describe areas and the kind of stay. Don't name a hotel unless the client has a relationship with it." },
        ],
      },
      {
        title: "Practical",
        fields: [
          { name: "bestTime", label: "Best time to visit", type: "textarea", rows: 2, span: 2 },
          { name: "weather", label: "Weather", type: "textarea", rows: 2, span: 2 },
          { name: "howToReach", label: "How to reach", type: "textarea", rows: 3, span: 2 },
          { name: "localTransport", label: "Getting around", type: "textarea", rows: 2, span: 2 },
          { name: "recommendedDuration", label: "Recommended time here", type: "text", placeholder: "2–3 days" },
        ],
      },
    ],
    schema: z.object({
      name: z.string().trim().min(2).max(160),
      slug: z.string().trim().max(160).optional(),
      title: optionalText,
      type: z.string().optional(),
      state: optionalText,
      latitude: z.coerce.number().min(-90).max(90).optional().nullable(),
      longitude: z.coerce.number().min(-180).max(180).optional().nullable(),
      isOffbeat: z.coerce.boolean().optional(),
      isFeatured: z.coerce.boolean().optional(),
      shortDescription: z.string().trim().max(400).optional(),
      intro: richField,
      whyVisit: richField,
      travelTips: richField,
      food: richField,
      whereToStay: richField,
      bestTime: optionalLong,
      weather: optionalLong,
      howToReach: optionalLong,
      localTransport: optionalLong,
      recommendedDuration: optionalText,
      heroId: z.string().trim().max(40).optional().nullable(),
      regionId: z.string().trim().max(40).optional().nullable(),
      parentId: z.string().trim().max(40).optional().nullable(),
      status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
    }),
  },

  regions: {
    key: "regions",
    model: "region",
    entityType: "REGION",
    label: "Regions",
    singular: "Region",
    description: "The groups destinations belong to. A region appears on the site once it has published destinations.",
    publicPath: (r) => `/regions/${r.slug}`,
    hasSlug: true,
    hasStatus: true,
    hasSeo: true,
    hasHero: true,
    hasOrder: true,
    titleField: "name",
    searchFields: ["name", "tagline"],
    columns: [
      { key: "name", label: "Name" },
      { key: "destinationCount", label: "Destinations", className: "tabular" },
      { key: "status", label: "Status" },
    ],
    tags: [TAGS.regions],
    groups: [
      {
        title: "Region",
        fields: [
          { name: "name", label: "Name", type: "text", required: true },
          { name: "slug", label: "URL", type: "slug" },
          { name: "tagline", label: "Tagline", type: "text", span: 2, help: "One line under the name on cards." },
          { name: "shortDescription", label: "Card description", type: "textarea", rows: 2, span: 2 },
          { name: "intro", label: "Introduction", type: "rich", span: 2 },
        ],
      },
    ],
    schema: z.object({
      name: z.string().trim().min(2).max(120),
      slug: z.string().trim().max(120).optional(),
      tagline: optionalText,
      shortDescription: z.string().trim().max(400).optional(),
      intro: richField,
      heroId: z.string().trim().max(40).optional().nullable(),
      status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
    }),
  },

  journeys: {
    key: "journeys",
    model: "journey",
    entityType: "JOURNEY",
    label: "Journeys",
    singular: "Journey",
    description: "Multi-day routes, retreats, courses and motorcycle expeditions.",
    publicPath: (r) => (r.kind === "BIKE_TOUR" ? `/bike-tours/${r.slug}` : `/journeys/${r.slug}`),
    hasSlug: true,
    hasStatus: true,
    hasSeo: true,
    hasHero: true,
    hasOrder: true,
    titleField: "name",
    searchFields: ["name", "shortDescription"],
    columns: [
      { key: "name", label: "Name" },
      { key: "kind", label: "Kind" },
      { key: "duration", label: "Duration" },
      { key: "status", label: "Status" },
    ],
    tags: [TAGS.journeys, TAGS.destinations],
    groups: [
      {
        title: "The journey",
        fields: [
          { name: "name", label: "Name", type: "text", required: true, span: 2 },
          { name: "slug", label: "URL", type: "slug", span: 2 },
          {
            name: "kind",
            label: "Kind",
            type: "select",
            options: [
              { value: "JOURNEY", label: "Journey" },
              { value: "RETREAT", label: "Retreat" },
              { value: "COURSE", label: "Course" },
              { value: "BIKE_TOUR", label: "Motorcycle journey" },
            ],
            help: "Motorcycle journeys live under /bike-tours.",
          },
          { name: "isFeatured", label: "Featured on the homepage", type: "switch" },
          { name: "days", label: "Days", type: "number" },
          { name: "nights", label: "Nights", type: "number" },
          { name: "durationLabel", label: "Duration (if not fixed)", type: "text", placeholder: "Long-term" },
          { name: "tourType", label: "Tour type", type: "text", placeholder: "Private / On Demand" },
          { name: "idealFor", label: "Ideal for", type: "text", span: 2 },
          { name: "pickupDrop", label: "Pickup and drop", type: "text", span: 2 },
        ],
      },
      {
        title: "Copy",
        fields: [
          { name: "shortDescription", label: "Card description", type: "textarea", rows: 2, span: 2 },
          { name: "overview", label: "Overview", type: "rich", span: 2 },
          { name: "highlights", label: "Highlights", type: "list", span: 2, help: "One per line." },
          { name: "inclusions", label: "What's included", type: "list", span: 2, help: "One per line." },
          { name: "exclusions", label: "Not included", type: "list", span: 2, help: "One per line." },
          { name: "whyChoose", label: "Why travellers choose this", type: "list", span: 2 },
          { name: "bestTime", label: "Best time to travel", type: "textarea", rows: 3, span: 2 },
          { name: "accommodationNote", label: "Accommodation note", type: "textarea", rows: 2, span: 2, help: "Describe the standard of stay. Only name hotels that are actually confirmed." },
          { name: "transportNote", label: "Transport note", type: "textarea", rows: 2, span: 2 },
          { name: "practicalInfo", label: "Practical information", type: "rich", span: 2 },
        ],
      },
      {
        title: "Price",
        description: "Journeys are quoted per traveller. Leave quote-only on unless the client has published a real starting price.",
        fields: [
          { name: "quoteOnly", label: "Quote only (shows “Price on request”)", type: "switch", span: 2 },
          { name: "priceFromInr", label: "Price from (₹)", type: "number", help: "Only used when quote-only is off." },
        ],
      },
    ],
    schema: z.object({
      name: z.string().trim().min(2).max(240),
      slug: z.string().trim().max(240).optional(),
      kind: z.enum(["JOURNEY", "RETREAT", "COURSE", "BIKE_TOUR"]).optional(),
      isFeatured: z.coerce.boolean().optional(),
      days: z.coerce.number().int().min(1).max(365).optional().nullable(),
      nights: z.coerce.number().int().min(0).max(365).optional().nullable(),
      durationLabel: optionalText,
      tourType: optionalText,
      idealFor: optionalText,
      pickupDrop: optionalText,
      shortDescription: z.string().trim().max(400).optional(),
      overview: richField,
      practicalInfo: richField,
      highlights: listField,
      inclusions: listField,
      exclusions: listField,
      whyChoose: listField,
      bestTime: optionalLong,
      accommodationNote: optionalLong,
      transportNote: optionalLong,
      quoteOnly: z.coerce.boolean().optional(),
      priceFromInr: z.coerce.number().int().min(0).max(100_000_000).optional().nullable(),
      heroId: z.string().trim().max(40).optional().nullable(),
      status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
    }),
  },

  experiences: {
    key: "experiences",
    model: "experience",
    entityType: "EXPERIENCE",
    label: "Experiences",
    singular: "Experience",
    description: "Half-day and full-day experiences: walks, food trails, safaris, rides.",
    publicPath: (r) => `/experiences/${r.slug}`,
    hasSlug: true,
    hasStatus: true,
    hasSeo: true,
    hasHero: true,
    hasOrder: true,
    titleField: "name",
    searchFields: ["name", "shortDescription", "location"],
    columns: [
      { key: "name", label: "Name" },
      { key: "destination", label: "Destination" },
      { key: "duration", label: "Duration" },
      { key: "status", label: "Status" },
    ],
    tags: [TAGS.experiences, TAGS.destinations],
    groups: [
      {
        title: "The experience",
        fields: [
          { name: "name", label: "Name", type: "text", required: true, span: 2 },
          { name: "slug", label: "URL", type: "slug", span: 2 },
          {
            name: "format",
            label: "Format",
            type: "select",
            options: [
              { value: "WALKING", label: "Walking tour" },
              { value: "FOOD_WALK", label: "Food walk" },
              { value: "CYCLING", label: "Cycle tour" },
              { value: "SIGHTSEEING", label: "Guided sightseeing" },
              { value: "DESERT_EVENING", label: "Desert evening" },
              { value: "OTHER", label: "Other" },
            ],
          },
          { name: "duration", label: "Duration", type: "text", placeholder: "2.5 – 3 hours" },
          { name: "location", label: "Where it happens", type: "text", span: 2 },
          { name: "pickupDrop", label: "Pickup and drop", type: "text", span: 2 },
          { name: "idealFor", label: "Ideal for", type: "text", span: 2 },
          { name: "isFeatured", label: "Featured", type: "switch" },
        ],
      },
      {
        title: "Copy",
        fields: [
          { name: "shortDescription", label: "Card description", type: "textarea", rows: 2, span: 2 },
          { name: "overview", label: "Overview", type: "rich", span: 2 },
          { name: "highlights", label: "Highlights", type: "list", span: 2 },
          { name: "inclusions", label: "What's included", type: "list", span: 2 },
          { name: "exclusions", label: "Not included", type: "list", span: 2 },
          { name: "bestTime", label: "Best time", type: "textarea", rows: 2, span: 2 },
          { name: "thingsToKnow", label: "Things to know", type: "rich", span: 2 },
        ],
      },
    ],
    schema: z.object({
      name: z.string().trim().min(2).max(240),
      slug: z.string().trim().max(240).optional(),
      format: z.enum(["WALKING", "FOOD_WALK", "CYCLING", "SIGHTSEEING", "DESERT_EVENING", "OTHER"]).optional(),
      duration: optionalText,
      location: optionalText,
      pickupDrop: optionalText,
      idealFor: optionalText,
      isFeatured: z.coerce.boolean().optional(),
      shortDescription: z.string().trim().max(400).optional(),
      overview: richField,
      thingsToKnow: richField,
      highlights: listField,
      inclusions: listField,
      exclusions: listField,
      bestTime: optionalLong,
      destinationId: z.string().trim().max(40).optional().nullable(),
      heroId: z.string().trim().max(40).optional().nullable(),
      status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
    }),
  },

  articles: {
    key: "articles",
    model: "article",
    entityType: "ARTICLE",
    label: "Travel guide",
    singular: "Article",
    description: "Guides and journal entries. Both live under /travel-guide.",
    publicPath: (r) => `/travel-guide/${r.slug}`,
    hasSlug: true,
    hasStatus: true,
    hasSeo: true,
    hasHero: true,
    hasOrder: false,
    titleField: "title",
    searchFields: ["title", "excerpt"],
    columns: [
      { key: "title", label: "Title" },
      { key: "kind", label: "Kind" },
      { key: "publishedAt", label: "Published" },
      { key: "status", label: "Status" },
    ],
    tags: [TAGS.articles],
    groups: [
      {
        title: "Article",
        fields: [
          { name: "title", label: "Title", type: "text", required: true, span: 2 },
          { name: "slug", label: "URL", type: "slug", span: 2 },
          {
            name: "kind",
            label: "Kind",
            type: "select",
            options: [
              { value: "BLOG", label: "Journal entry" },
              { value: "GUIDE", label: "Guide" },
            ],
          },
          { name: "isFeatured", label: "Featured", type: "switch" },
          { name: "excerpt", label: "Excerpt", type: "textarea", rows: 3, span: 2, help: "Shown on cards and used as the search snippet if no meta description is set." },
          { name: "tocEnabled", label: "Show a table of contents", type: "switch", span: 2 },
          { name: "body", label: "Body", type: "rich", span: 2 },
        ],
      },
    ],
    schema: z.object({
      title: z.string().trim().min(2).max(300),
      slug: z.string().trim().max(300).optional(),
      kind: z.enum(["BLOG", "GUIDE"]).optional(),
      isFeatured: z.coerce.boolean().optional(),
      excerpt: z.string().trim().max(600).optional(),
      tocEnabled: z.coerce.boolean().optional(),
      body: richField,
      categoryId: z.string().trim().max(40).optional().nullable(),
      heroId: z.string().trim().max(40).optional().nullable(),
      status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
    }),
  },

  services: {
    key: "services",
    model: "service",
    entityType: "SERVICE",
    label: "Services",
    singular: "Service",
    description: "Transfers and other services you offer alongside journeys.",
    publicPath: (r) => `/services/${r.slug}`,
    hasSlug: true,
    hasStatus: true,
    hasSeo: true,
    hasHero: true,
    hasOrder: true,
    titleField: "name",
    searchFields: ["name", "shortDescription"],
    columns: [
      { key: "name", label: "Name" },
      { key: "status", label: "Status" },
    ],
    tags: [TAGS.services],
    groups: [
      {
        title: "Service",
        fields: [
          { name: "name", label: "Name", type: "text", required: true, span: 2 },
          { name: "slug", label: "URL", type: "slug", span: 2 },
          { name: "shortDescription", label: "Card description", type: "textarea", rows: 2, span: 2 },
          { name: "description", label: "Description", type: "rich", span: 2 },
          { name: "features", label: "What you offer", type: "list", span: 2 },
          { name: "benefits", label: "What a traveller can expect", type: "list", span: 2 },
        ],
      },
    ],
    schema: z.object({
      name: z.string().trim().min(2).max(160),
      slug: z.string().trim().max(160).optional(),
      shortDescription: z.string().trim().max(400).optional(),
      description: richField,
      features: listField,
      benefits: listField,
      heroId: z.string().trim().max(40).optional().nullable(),
      status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
    }),
  },

  pages: {
    key: "pages",
    model: "page",
    entityType: "PAGE",
    label: "Pages",
    singular: "Page",
    description: "Standalone pages: About, Contact, Plan My Journey, legal pages.",
    publicPath: (r) => (r.slug === "home" ? "/" : `/${r.slug}`),
    hasSlug: true,
    hasStatus: true,
    hasSeo: true,
    hasHero: true,
    hasOrder: false,
    titleField: "title",
    searchFields: ["title", "intro"],
    columns: [
      { key: "title", label: "Title" },
      { key: "slug", label: "URL" },
      { key: "status", label: "Status" },
    ],
    tags: [TAGS.pages, TAGS.sections],
    groups: [
      {
        title: "Page",
        fields: [
          { name: "title", label: "Title", type: "text", required: true, span: 2 },
          { name: "slug", label: "URL", type: "slug", span: 2 },
          { name: "intro", label: "Introduction", type: "textarea", rows: 3, span: 2 },
          { name: "body", label: "Body", type: "rich", span: 2 },
        ],
      },
    ],
    schema: z.object({
      title: z.string().trim().min(2).max(200),
      slug: z.string().trim().max(200).optional(),
      intro: z.string().trim().max(1000).optional(),
      body: richField,
      heroId: z.string().trim().max(40).optional().nullable(),
      status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
    }),
  },

  faqs: {
    key: "faqs",
    model: "faq",
    entityType: "PAGE",
    label: "FAQs",
    singular: "FAQ",
    description: "Reusable questions and answers. Attach them to any destination, journey or page.",
    hasSlug: false,
    hasStatus: true,
    hasSeo: false,
    hasHero: false,
    hasOrder: true,
    titleField: "question",
    searchFields: ["question", "answer"],
    columns: [
      { key: "question", label: "Question" },
      { key: "status", label: "Status" },
    ],
    tags: [TAGS.faqs],
    groups: [
      {
        title: "Question",
        fields: [
          { name: "question", label: "Question", type: "text", required: true, span: 2, help: "Write it the way a traveller would ask it." },
          { name: "answer", label: "Answer", type: "textarea", rows: 6, span: 2, help: "Answer it properly — this text is what search engines read." },
        ],
      },
    ],
    schema: z.object({
      question: z.string().trim().min(5).max(300),
      answer: z.string().trim().min(5).max(4000),
      categoryId: z.string().trim().max(40).optional().nullable(),
      status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
    }),
  },

  testimonials: {
    key: "testimonials",
    model: "testimonial",
    entityType: "PAGE",
    label: "Guest stories",
    singular: "Guest story",
    description: "Real reviews only. A story can't be published until someone has verified it.",
    hasSlug: false,
    hasStatus: true,
    hasSeo: false,
    hasHero: false,
    hasOrder: true,
    titleField: "authorName",
    searchFields: ["authorName", "body", "headline"],
    columns: [
      { key: "authorName", label: "Guest" },
      { key: "verified", label: "Verified" },
      { key: "status", label: "Status" },
    ],
    tags: [TAGS.testimonials],
    groups: [
      {
        title: "The story",
        fields: [
          { name: "authorName", label: "Guest name", type: "text", required: true },
          { name: "location", label: "Where they're from", type: "text" },
          { name: "headline", label: "Headline", type: "text", span: 2 },
          { name: "body", label: "What they said", type: "textarea", rows: 5, span: 2 },
          {
            name: "source",
            label: "Where it came from",
            type: "select",
            options: [
              { value: "DIRECT", label: "Sent to us directly" },
              { value: "GOOGLE", label: "Google" },
              { value: "TRIPADVISOR", label: "Tripadvisor" },
              { value: "OTHER", label: "Somewhere else" },
            ],
          },
          { name: "sourceUrl", label: "Link to the original", type: "text", help: "Where the review can be seen, if it is public." },
          { name: "travelledOn", label: "When they travelled", type: "date" },
          {
            name: "verified",
            label: "I have verified this is a real guest and they agreed to it being published",
            type: "switch",
            span: 2,
            help: "Required before this story can go live.",
          },
        ],
      },
    ],
    schema: z.object({
      authorName: z.string().trim().min(2).max(120),
      location: optionalText,
      headline: optionalText,
      body: z.string().trim().min(10).max(2000),
      source: z.enum(["DIRECT", "GOOGLE", "TRIPADVISOR", "OTHER"]).optional(),
      sourceUrl: optionalText,
      travelledOn: z.string().trim().max(10).optional(),
      verified: z.coerce.boolean().optional(),
      status: z.enum(["DRAFT", "PUBLISHED", "ARCHIVED"]).optional(),
    }),
  },
};

export const ENTITY_KEYS = Object.keys(ENTITIES) as EntityKey[];

export function getEntity(key: string): EntityDef | null {
  return (ENTITIES as Record<string, EntityDef>)[key] ?? null;
}

export { statusOptions };
