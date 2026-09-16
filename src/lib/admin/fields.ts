import { z } from "zod";

/**
 * Field descriptors: one definition drives the admin form, the server-side
 * validation and the help text a non-technical editor reads.
 */
export type FieldType =
  | "text"
  | "textarea"
  | "rich"
  | "number"
  | "select"
  | "chips"
  | "switch"
  | "media"
  | "slug"
  | "date"
  | "list";

export type FieldDef = {
  name: string;
  label: string;
  type: FieldType;
  help?: string;
  placeholder?: string;
  options?: { value: string; label: string }[];
  /** Layout hint inside the two-column form grid. */
  span?: 1 | 2;
  rows?: number;
  required?: boolean;
  /** Shown under the input as "Recommended: …". */
  recommendation?: string;
};

export type FieldGroup = { title: string; description?: string; fields: FieldDef[] };

export const seoFieldGroups: FieldGroup[] = [
  {
    title: "Search result",
    description: "What Google shows when this page appears in results.",
    fields: [
      {
        name: "metaTitle",
        label: "Meta title",
        type: "text",
        span: 2,
        help: "The headline in search results. Leave empty to use the automatic pattern for this content type.",
        recommendation: "Around 50–60 characters",
      },
      {
        name: "metaDescription",
        label: "Meta description",
        type: "textarea",
        span: 2,
        rows: 3,
        help: "The two lines under the title. Write it for a person deciding whether to click.",
        recommendation: "70–160 characters",
      },
      {
        name: "h1Override",
        label: "Page heading (H1)",
        type: "text",
        span: 2,
        help: "The main heading on the page itself. Leave empty to use the name above.",
      },
    ],
  },
  {
    title: "Keywords",
    description: "What this page is meant to be found for. Keywords guide the writing; they are never stuffed into the text.",
    fields: [
      { name: "focusKeyword", label: "Focus keyword", type: "text", span: 2, help: "The one search phrase this page should win. Only one page should target it." },
      { name: "secondaryKeywords", label: "Secondary keywords", type: "chips", span: 2, help: "Related phrases worth covering on the same page." },
      { name: "keywordVariants", label: "Keyword variations", type: "chips", span: 2, help: "Spellings and phrasings people also type." },
    ],
  },
  {
    title: "Indexing",
    fields: [
      { name: "robotsIndex", label: "Allow search engines to index this page", type: "switch", span: 2 },
      { name: "robotsFollow", label: "Allow search engines to follow its links", type: "switch", span: 2 },
      {
        name: "canonicalUrl",
        label: "Canonical URL",
        type: "text",
        span: 2,
        help: "The preferred address for this content. Leave empty unless the same content is published somewhere else.",
      },
    ],
  },
  {
    title: "Sharing",
    description: "How the page looks when someone posts it on social media.",
    fields: [
      { name: "ogTitle", label: "Social title", type: "text", span: 2 },
      { name: "ogDescription", label: "Social description", type: "textarea", rows: 2, span: 2 },
      { name: "ogImageId", label: "Social image", type: "media", span: 2, help: "Falls back to the main image, then the site-wide sharing image." },
      { name: "twitterTitle", label: "X (Twitter) title", type: "text", span: 2 },
      { name: "twitterDescription", label: "X (Twitter) description", type: "textarea", rows: 2, span: 2 },
    ],
  },
  {
    title: "Structured data",
    description: "Advanced. Describes the page to search engines in machine-readable form.",
    fields: [
      { name: "schemaType", label: "Schema type", type: "text", span: 2, help: "Leave empty to use the automatic type for this content." },
      {
        name: "customJsonLd",
        label: "Custom JSON-LD",
        type: "textarea",
        rows: 8,
        span: 2,
        help: "Must be valid JSON and describe what is actually visible on the page.",
      },
    ],
  },
];

export const seoSchema = z.object({
  metaTitle: z.string().trim().max(200).optional(),
  metaDescription: z.string().trim().max(400).optional(),
  h1Override: z.string().trim().max(200).optional(),
  focusKeyword: z.string().trim().max(120).optional(),
  secondaryKeywords: z.array(z.string().trim().max(120)).max(20).optional(),
  keywordVariants: z.array(z.string().trim().max(120)).max(20).optional(),
  canonicalUrl: z.string().trim().max(400).optional(),
  robotsIndex: z.coerce.boolean().optional(),
  robotsFollow: z.coerce.boolean().optional(),
  ogTitle: z.string().trim().max(200).optional(),
  ogDescription: z.string().trim().max(400).optional(),
  ogImageId: z.string().trim().max(40).optional(),
  twitterTitle: z.string().trim().max(200).optional(),
  twitterDescription: z.string().trim().max(400).optional(),
  twitterImageId: z.string().trim().max(40).optional(),
  schemaType: z.string().trim().max(60).optional(),
  customJsonLd: z.string().trim().max(20000).optional(),
});

export type SeoInput = z.infer<typeof seoSchema>;

/** Custom JSON-LD is parsed, shape-checked and size-capped before it is stored. */
export function parseCustomJsonLd(raw: string | undefined): { ok: true; value: unknown | null } | { ok: false; error: string } {
  if (!raw || !raw.trim()) return { ok: true, value: null };
  if (raw.length > 20000) return { ok: false, error: "That JSON-LD is too long (20,000 characters maximum)." };
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch (err) {
    return { ok: false, error: `That isn't valid JSON: ${(err as Error).message}` };
  }
  const check = (node: unknown): boolean => {
    if (Array.isArray(node)) return node.every(check);
    if (!node || typeof node !== "object") return false;
    const obj = node as Record<string, unknown>;
    return "@type" in obj || "@graph" in obj || "@context" in obj;
  };
  if (!check(parsed)) return { ok: false, error: 'Structured data needs an "@type" (or "@graph") at the top level.' };
  return { ok: true, value: parsed };
}
