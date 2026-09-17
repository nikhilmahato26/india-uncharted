import type { SectionTypeKey } from "./schemas";

/**
 * What the homepage editor lets someone change, per section type. Deliberately
 * narrower than the schemas: a field is here only if changing it visibly changes
 * the page. Settings the renderer ignores, and the background colours that set
 * the page's rhythm, stay out of reach — kept exactly as they are on every save.
 *
 * Shared by the editor form (client) and the save action (server), so the two
 * can never disagree about what a field is.
 */

export type EditorField = {
  name: string;
  label: string;
  kind: "text" | "textarea" | "link" | "media" | "select" | "number" | "travel-style" | "destination-slots";
  help?: string;
  max?: number;
  min?: number;
  rows?: number;
  options?: { value: string; label: string }[];
  /** Only relevant while another field has one of these values. */
  showWhen?: { field: string; values: string[] };
  span?: 1 | 2;
};

export type SectionEditorDef = {
  label: string;
  description: string;
  /** Shown with the section: how it behaves that a field can't express. */
  note?: string;
  /** What to call the section in the list when it has no heading of its own. */
  fallbackTitle: string;
  fields: EditorField[];
};

const heading = (fallback: string): EditorField => ({ name: "heading", label: "Heading", kind: "text", max: 160, span: 2, help: `Leave empty to use "${fallback}".` });
const lead: EditorField = { name: "lead", label: "Introduction", kind: "textarea", max: 400, rows: 3, span: 2, help: "One or two sentences under the heading." };
const button = (label = "Link text"): EditorField[] => [
  { name: "ctaLabel", label, kind: "text", max: 60, help: "Leave empty for no link." },
  { name: "ctaHref", label: "Link goes to", kind: "link" },
];

export const SECTION_EDITOR = {
  HERO: {
    label: "Hero",
    description: "The photograph and headline at the very top of the homepage.",
    fallbackTitle: "India, beyond the obvious.",
    fields: [
      { name: "mediaId", label: "Photograph", kind: "media", span: 2, help: "A wide landscape photograph works best. It is cropped to fill the screen." },
      { name: "titleLead", label: "Headline, first part", kind: "text", max: 120, help: "In regular type." },
      { name: "titleAccent", label: "Headline, second part", kind: "text", max: 120, help: "In italic, in the brand colour." },
      { name: "lead", label: "Introduction", kind: "textarea", max: 400, rows: 3, span: 2 },
      { name: "inscription", label: "Text in the coloured band", kind: "text", max: 120, help: "Short, in small capitals, e.g. Private journeys · India." },
      { name: "caption", label: "Photo caption", kind: "text", max: 160, help: "Where the photograph was taken. Shown on larger screens." },
      { name: "primaryLabel", label: "Main button", kind: "text", max: 60 },
      { name: "primaryHref", label: "Main button goes to", kind: "link" },
      { name: "secondaryLabel", label: "Second button", kind: "text", max: 60 },
      { name: "secondaryHref", label: "Second button goes to", kind: "link" },
    ],
  },
  IMAGE_TEXT: {
    label: "Image and text",
    description: "A statement, a photograph with words over it, or words beside a photograph.",
    fallbackTitle: "Image and text",
    fields: [
      {
        name: "variant",
        label: "Layout",
        kind: "select",
        span: 2,
        options: [
          { value: "editorial", label: "Statement — large words, no photograph" },
          { value: "plate", label: "Photograph with words over it" },
          { value: "split", label: "Words beside a photograph" },
        ],
      },
      heading("no heading"),
      { name: "body", label: "Text", kind: "textarea", max: 2000, rows: 5, span: 2 },
      { name: "mediaId", label: "Photograph", kind: "media", span: 2, showWhen: { field: "variant", values: ["plate", "split"] } },
      {
        name: "imageSide",
        label: "Photograph on the",
        kind: "select",
        options: [
          { value: "right", label: "Right" },
          { value: "left", label: "Left" },
        ],
        showWhen: { field: "variant", values: ["split"] },
      },
      ...button(),
    ],
  },
  DESTINATION_GRID: {
    label: "Destinations",
    description: "Places you pick, in your order — or your offbeat destinations.",
    note: "Hides itself when there are fewer than three places to show.",
    fallbackTitle: "Discover India",
    fields: [
      {
        name: "source",
        label: "Which places",
        kind: "select",
        options: [
          { value: "manual", label: "Places I choose" },
          { value: "offbeat", label: "Offbeat destinations (marked “Beyond the obvious”)" },
        ],
        help: "Offbeat destinations are chosen with the “Beyond the obvious” switch on each destination.",
      },
      {
        name: "slugs",
        label: "Places, in order",
        kind: "destination-slots",
        span: 2,
        help: "The first is the large photograph. Only published places with a photograph can be chosen.",
        showWhen: { field: "source", values: ["manual"] },
      },
      {
        name: "variant",
        label: "Look",
        kind: "select",
        options: [
          { value: "editorial", label: "Photographs — one large, four small" },
          { value: "index", label: "Names and coordinates on green" },
        ],
      },
      heading("Discover India"),
      lead,
      { name: "limit", label: "How many to show", kind: "number", min: 1, max: 12, help: "The photograph layout shows at most five." },
      ...button(),
    ],
  },
  REGION_CAROUSEL: {
    label: "Regions",
    description: "A sideways-scrolling row of your regions.",
    note: "Hides itself when there are fewer than three published regions.",
    fallbackTitle: "Explore India by region",
    fields: [heading("Explore India by region"), lead],
  },
  JOURNEY_GRID: {
    label: "Journeys",
    description: "Journeys chosen automatically — your featured journeys or your motorcycle tours.",
    note: "Hides itself when there are fewer than two journeys to show.",
    fallbackTitle: "Featured journeys",
    fields: [
      {
        name: "source",
        label: "Which journeys",
        kind: "select",
        options: [
          { value: "featured", label: "Featured journeys" },
          { value: "bike", label: "Motorcycle tours" },
        ],
        help: "Mark a journey as featured on its own page. At most four featured journeys are shown.",
      },
      {
        name: "variant",
        label: "Look",
        kind: "select",
        options: [
          { value: "grid", label: "Cards with photographs" },
          { value: "cinematic", label: "One wide photograph and a list" },
        ],
      },
      { name: "mediaId", label: "Wide photograph", kind: "media", span: 2, help: "Leave empty to use the first journey's photograph.", showWhen: { field: "variant", values: ["cinematic"] } },
      heading("Featured journeys"),
      lead,
      { name: "limit", label: "How many to show", kind: "number", min: 1, max: 12 },
      ...button(),
    ],
  },
  CARD_GRID: {
    label: "Travel styles",
    description: "Tiles for each travel style — honeymoon, wildlife, motorcycle and so on.",
    note: "Only styles with at least one journey appear.",
    fallbackTitle: "Travel your way",
    fields: [heading("Travel your way"), lead, { name: "featuredSlug", label: "Large tile", kind: "travel-style", help: "The style shown as the big photograph tile." }],
  },
  INDIA_MAP: {
    label: "Map of India",
    description: "Your destinations plotted by their coordinates on a green field.",
    fallbackTitle: "Where we travel",
    fields: [heading("Where we travel"), lead, ...button("Button text")],
  },
  EXPERIENCE_GRID: {
    label: "Experiences",
    description: "Experience themes, or individual experiences such as walks and food tours.",
    note: "Hides itself when there are fewer than three to show, and never leaves a single card alone on a row.",
    fallbackTitle: "Experiences",
    fields: [
      {
        name: "source",
        label: "Show",
        kind: "select",
        options: [
          { value: "themes", label: "Experience themes" },
          { value: "experiences", label: "Individual experiences" },
        ],
      },
      heading("Experiences"),
      lead,
      { name: "limit", label: "How many to show", kind: "number", min: 1, max: 12, help: "Shown in rows of four." },
    ],
  },
  ARTICLE_GRID: {
    label: "Travel guide",
    description: "Your newest travel guide articles.",
    note: "Hides itself when there are fewer than three published articles.",
    fallbackTitle: "Travel journal",
    fields: [heading("Travel journal"), lead, { name: "limit", label: "How many to show", kind: "number", min: 1, max: 12, help: "Shown in rows of three." }],
  },
  TESTIMONIALS: {
    label: "Guest stories",
    description: "Reviews from past guests.",
    note: "Only guest stories marked as verified appear, and the section stays hidden until there are three.",
    fallbackTitle: "Guest stories",
    fields: [heading("Guest stories"), lead],
  },
  CTA: {
    label: "Call to action",
    description: "The invitation to start planning, over a photograph.",
    note: "The phone number from Settings is shown as the second button.",
    fallbackTitle: "Where will your India story begin?",
    fields: [
      { name: "mediaId", label: "Photograph", kind: "media", span: 2 },
      heading("Where will your India story begin?"),
      lead,
      ...button("Button text"),
    ],
  },
  NEWSLETTER: {
    label: "Newsletter",
    description: "A sign-up for occasional emails.",
    note: "Not shown on the site until a newsletter service is connected.",
    fallbackTitle: "Stories from India, occasionally",
    fields: [heading("Stories from India, occasionally"), lead],
  },
} satisfies Partial<Record<SectionTypeKey, SectionEditorDef>>;

export type EditableSectionType = keyof typeof SECTION_EDITOR;

export const EDITABLE_SECTION_TYPES = Object.keys(SECTION_EDITOR) as EditableSectionType[];

export function isEditableSectionType(type: string): type is EditableSectionType {
  return type in SECTION_EDITOR;
}

/** A section's name in the list: its own heading when it has one. */
export function sectionTitle(type: string, props: Record<string, unknown>): string {
  if (type === "HERO") {
    const hero = [props.titleLead, props.titleAccent].filter((p) => typeof p === "string" && p.trim()).join(" ");
    if (hero) return hero;
  }
  if (typeof props.heading === "string" && props.heading.trim()) return props.heading;
  return isEditableSectionType(type) ? SECTION_EDITOR[type].fallbackTitle : type;
}

/**
 * Links may go to a page on this site or to a full https address. Anything else
 * — javascript:, data:, a protocol-relative //host — is refused.
 */
export function isSafeLink(value: string): boolean {
  if (/^\/(?!\/)/.test(value)) return true;
  if (/^#[\w-]*$/.test(value)) return true;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" || url.protocol === "mailto:" || url.protocol === "tel:";
  } catch {
    return false;
  }
}
