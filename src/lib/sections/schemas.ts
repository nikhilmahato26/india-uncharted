import { z } from "zod";

/**
 * Every section type has one Zod schema, used by the admin form, the server
 * action that saves it and the renderer. `minItems` is the content gate: a
 * grid with fewer real items than this hides itself instead of padding.
 */

const tone = z.enum(["paper", "paper-2", "forest", "ink"]);
const band = z.enum(["terracotta", "forest", "paper"]);

const common = {
  heading: z.string().max(160).optional(),
  lead: z.string().max(400).optional(),
  ctaLabel: z.string().max(60).optional(),
  ctaHref: z.string().max(300).optional(),
  tone: tone.optional(),
};

export const sectionSchemas = {
  HERO: z.object({
    mediaId: z.string().optional(),
    titleLead: z.string().max(120).default("India,"),
    titleAccent: z.string().max(120).default("beyond the obvious."),
    lead: z.string().max(400).optional(),
    inscription: z.string().max(120).optional(),
    caption: z.string().max(160).optional(),
    primaryLabel: z.string().max(60).default("Plan My Journey"),
    primaryHref: z.string().max(300).default("/plan-my-journey"),
    secondaryLabel: z.string().max(60).default("Explore India"),
    secondaryHref: z.string().max(300).default("/destinations"),
  }),
  RICH_TEXT: z.object({ ...common, body: z.unknown().optional() }),
  IMAGE_TEXT: z.object({
    ...common,
    mediaId: z.string().optional(),
    body: z.string().max(2000).optional(),
    /** editorial = two columns of type; plate = full-bleed image with an inscribed panel */
    variant: z.enum(["editorial", "plate", "split"]).default("editorial"),
    imageSide: z.enum(["left", "right"]).default("right"),
    pillars: z.array(z.object({ title: z.string().max(80), body: z.string().max(400) })).max(4).optional(),
  }),
  DESTINATION_GRID: z.object({
    ...common,
    source: z.enum(["discover", "offbeat", "featured", "manual"]).default("featured"),
    slugs: z.array(z.string()).max(12).optional(),
    variant: z.enum(["editorial", "index", "grid"]).default("editorial"),
    limit: z.number().int().min(1).max(24).default(6),
    minItems: z.number().int().min(0).max(12).default(3),
  }),
  JOURNEY_GRID: z.object({
    ...common,
    source: z.enum(["featured", "bike", "manual"]).default("featured"),
    slugs: z.array(z.string()).max(12).optional(),
    variant: z.enum(["grid", "cinematic"]).default("grid"),
    mediaId: z.string().optional(),
    limit: z.number().int().min(1).max(12).default(4),
    minItems: z.number().int().min(0).max(12).default(2),
  }),
  EXPERIENCE_GRID: z.object({
    ...common,
    source: z.enum(["themes", "experiences"]).default("themes"),
    limit: z.number().int().min(1).max(12).default(8),
    minItems: z.number().int().min(0).max(12).default(3),
  }),
  REGION_CAROUSEL: z.object({ ...common, minItems: z.number().int().min(0).max(12).default(3) }),
  CARD_GRID: z.object({
    ...common,
    source: z.enum(["travel-styles"]).default("travel-styles"),
    featuredSlug: z.string().optional(),
    minItems: z.number().int().min(0).max(12).default(3),
  }),
  ARTICLE_GRID: z.object({ ...common, limit: z.number().int().min(1).max(12).default(3), minItems: z.number().int().min(0).max(12).default(3) }),
  INDIA_MAP: z.object({ ...common }),
  TESTIMONIALS: z.object({ ...common, minItems: z.number().int().min(1).max(12).default(3) }),
  FAQ: z.object({ ...common }),
  CTA: z.object({ ...common, mediaId: z.string().optional(), secondaryLabel: z.string().max(60).optional(), secondaryHref: z.string().max(300).optional() }),
  NEWSLETTER: z.object({ ...common }),
  GALLERY: z.object({ ...common, mediaIds: z.array(z.string()).max(24).default([]) }),
  EDITORIAL_QUOTE: z.object({ quote: z.string().max(600), attribution: z.string().max(120).optional(), tone: tone.optional() }),
  CALLOUT: z.object({ ...common, body: z.string().max(1000), variant: z.enum(["note", "tip", "warning"]).default("note") }),
  STATS: z.object({
    ...common,
    /** Every stat needs a source note, or it does not render. */
    stats: z.array(z.object({ value: z.string().max(24), label: z.string().max(80), source: z.string().min(1).max(200) })).max(6).default([]),
  }),
  VIDEO: z.object({ ...common, url: z.string().url(), posterMediaId: z.string().optional() }),
  MAP_EMBED: z.object({ ...common, embedUrl: z.string().url() }),
  TABLE: z.object({ ...common, rows: z.array(z.array(z.string())).default([]), hasHeader: z.boolean().default(true) }),
  SERVICE_GRID: z.object({ ...common, minItems: z.number().int().min(0).max(12).default(1) }),
  HTML_SAFE: z.object({ html: z.string().max(20000) }),
  DESTINATION_HIGHLIGHTS: z.object({ ...common }),
} as const;

export type SectionTypeKey = keyof typeof sectionSchemas;
export type SectionProps<K extends SectionTypeKey> = z.infer<(typeof sectionSchemas)[K]>;

export const sectionBand = band;

export function parseSectionProps<K extends SectionTypeKey>(type: K, props: unknown): SectionProps<K> | null {
  const schema = sectionSchemas[type];
  if (!schema) return null;
  const result = schema.safeParse(props ?? {});
  return result.success ? (result.data as SectionProps<K>) : null;
}

export const SECTION_LABELS: Record<string, string> = {
  HERO: "Hero",
  RICH_TEXT: "Rich text",
  IMAGE_TEXT: "Image and text",
  DESTINATION_GRID: "Destinations",
  JOURNEY_GRID: "Journeys",
  EXPERIENCE_GRID: "Experiences",
  REGION_CAROUSEL: "Regions",
  CARD_GRID: "Travel styles",
  ARTICLE_GRID: "Travel guide",
  INDIA_MAP: "Map of India",
  TESTIMONIALS: "Guest stories",
  FAQ: "FAQs",
  CTA: "Call to action",
  NEWSLETTER: "Newsletter",
  GALLERY: "Gallery",
  EDITORIAL_QUOTE: "Quote",
  CALLOUT: "Callout",
  STATS: "Stats",
  VIDEO: "Video",
  MAP_EMBED: "Map embed",
  TABLE: "Table",
  SERVICE_GRID: "Services",
  HTML_SAFE: "Custom HTML",
};
