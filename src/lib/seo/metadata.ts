import "server-only";
import type { Metadata } from "next";
import { SITE_INDEXABLE, SITE_URL, absoluteUrl } from "@/lib/site";
import { getSeoSettings, getSiteSettings } from "@/lib/content/settings";
import type { SeoView } from "@/lib/content/shared";
import type { MediaSource } from "@/lib/content/media";
import { excerpt } from "@/lib/richtext/text";

export type EntityKind = "PAGE" | "REGION" | "DESTINATION" | "JOURNEY" | "EXPERIENCE" | "SERVICE" | "ARTICLE" | "CATEGORY" | "EXPERIENCE_THEME";

export type MetadataInput = {
  kind: EntityKind;
  /** The entity's own name — used by the title pattern as {name}. */
  name: string;
  path: string;
  seo?: SeoView | null;
  description?: string | null;
  image?: MediaSource | null;
  /** Extra values a per-type pattern may reference, e.g. {days}. */
  vars?: Record<string, string | number | null | undefined>;
  article?: { publishedAt?: string | null; updatedAt?: string | null; author?: string | null; section?: string | null };
  noindexReason?: string;
};

function applyPattern(pattern: string | undefined, name: string, vars: Record<string, string | number | null | undefined> = {}): string | null {
  if (!pattern) return null;
  const filled = pattern.replace(/\{(\w+)\}/g, (_, key: string) => {
    if (key === "name") return name;
    const v = vars[key];
    return v === null || v === undefined ? "" : String(v);
  });
  return filled.replace(/\s{2,}/g, " ").replace(/\s+([,·|])/g, "$1").trim() || null;
}

/**
 * The single resolution order for every public page:
 *   the entity's own SEO field → the per-type pattern → the global default.
 * Nothing else builds a <title>, canonical, robots or social tag.
 */
export async function resolveMetadata(input: MetadataInput): Promise<Metadata> {
  const [seoSettings, site] = await Promise.all([getSeoSettings(), getSiteSettings()]);
  const seo = input.seo ?? null;
  const pattern = seoSettings.patterns?.[input.kind];

  const rawTitle = seo?.metaTitle || applyPattern(pattern?.title, input.name, input.vars) || input.name;
  const title = rawTitle.includes(site.businessName) ? rawTitle : `${rawTitle}${seoSettings.titleSeparator}${seoSettings.siteTitle}`;

  // The site-wide default is only for pages that have no content of their own to
  // describe. Repeating one sentence across many entity pages would make them
  // duplicates of each other, so those simply go without until someone writes one.
  const entityPage = input.kind !== "PAGE";
  const description =
    seo?.metaDescription ||
    applyPattern(pattern?.description, input.name, input.vars) ||
    (input.description ? excerpt(input.description, 158) : null) ||
    (entityPage ? null : seoSettings.defaultMetaDescription) ||
    null;

  const canonical = seo?.canonicalUrl || absoluteUrl(input.path);
  const image = seo?.ogImage ?? input.image ?? site.defaultOgImage;
  const ogTitle = seo?.ogTitle || rawTitle;
  const ogDescription = seo?.ogDescription || description || undefined;

  const index = SITE_INDEXABLE && (seo?.robotsIndex ?? true);
  const follow = seo?.robotsFollow ?? true;

  const other: Record<string, string | string[]> = {};
  for (const tag of [...(seoSettings.globalMetaTags ?? []), ...(seo?.customMetaTags ?? [])]) {
    if (tag.attribute === "NAME" || tag.attribute === "PROPERTY") other[tag.key] = tag.content;
  }

  return {
    title,
    description: description ?? undefined,
    keywords: seo?.keywords?.length ? seo.keywords : seoSettings.defaultKeywords,
    alternates: { canonical },
    robots: { index, follow, googleBot: { index, follow, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 } },
    openGraph: {
      type: input.kind === "ARTICLE" ? "article" : "website",
      siteName: site.businessName,
      locale: "en_IN",
      url: canonical,
      title: ogTitle,
      description: ogDescription,
      images: image ? [{ url: absoluteUrl(image.src), width: image.width, height: image.height, alt: image.alt }] : undefined,
      ...(input.kind === "ARTICLE" && input.article
        ? {
            publishedTime: input.article.publishedAt ?? undefined,
            modifiedTime: input.article.updatedAt ?? undefined,
            authors: input.article.author ? [input.article.author] : undefined,
            section: input.article.section ?? undefined,
          }
        : {}),
    },
    twitter: {
      card: "summary_large_image",
      site: seoSettings.twitterHandle ?? undefined,
      title: seo?.twitterTitle || ogTitle,
      description: seo?.twitterDescription || ogDescription,
      images: (seo?.twitterImage ?? image) ? [absoluteUrl((seo?.twitterImage ?? image)!.src)] : undefined,
    },
    other: Object.keys(other).length ? other : undefined,
    metadataBase: new URL(SITE_URL),
  };
}

/** Metadata for listing pages that have no CMS entity of their own yet. */
export async function resolveStaticMetadata(args: { title: string; description: string; path: string; image?: MediaSource | null }): Promise<Metadata> {
  return resolveMetadata({ kind: "PAGE", name: args.title, path: args.path, description: args.description, image: args.image ?? null });
}
