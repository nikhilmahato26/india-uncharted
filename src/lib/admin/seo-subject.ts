import "server-only";
import { db } from "@/lib/db";
import { docToPlainText, wordCount } from "@/lib/richtext/text";
import { analyzeSeo, type Check, type SeoSubject } from "@/lib/seo/analyze";
import { getSeoSettings } from "@/lib/content/settings";
import type { EntityDef } from "./registry";

type AnyRow = Record<string, unknown>;

const NAV_PATHS = new Set(["/", "/destinations", "/regions", "/journeys", "/bike-tours", "/experiences", "/travel-guide", "/about", "/contact", "/plan-my-journey"]);

/**
 * Turns a stored record into the input the SEO checker understands, including
 * the site-wide facts a single record can't know: duplicate titles, keyword
 * cannibalisation and how many pages link here.
 */
export async function buildSeoSubject(def: EntityDef, row: AnyRow): Promise<SeoSubject> {
  const seo = (row.seo as AnyRow | null) ?? null;
  const seoSettings = await getSeoSettings();
  const name = String(row[def.titleField] ?? "");
  const path = def.publicPath && row.slug ? def.publicPath({ slug: String(row.slug), kind: (row.kind as string) ?? null }) : `/${String(row.slug ?? "")}`;
  const pattern = seoSettings.patterns?.[def.entityType]?.title;
  const resolvedTitle = String(seo?.metaTitle ?? "") || (pattern ? pattern.replace("{name}", name) : name);
  const focusKeyword = (seo?.focusKeyword as string | null) ?? null;

  // Body text from every rich and long field on the record.
  const textParts: string[] = [];
  for (const [key, value] of Object.entries(row)) {
    if (value && typeof value === "object" && (value as AnyRow).type === "doc") textParts.push(docToPlainText(value));
    else if (typeof value === "string" && !["id", "slug", "status"].includes(key) && value.length > 40) textParts.push(value);
    else if (Array.isArray(value) && value.every((v) => typeof v === "string")) textParts.push((value as string[]).join(" "));
  }
  const bodyText = textParts.join("\n");

  const heroId = (row.heroId as string | null) ?? null;
  const hero = heroId ? await db.media.findUnique({ where: { id: heroId }, select: { altText: true, licence: true } }) : null;

  const [duplicateTitles, duplicateDescriptions, sameKeyword, inboundLinks] = await Promise.all([
    seo?.metaTitle
      ? db.seoMeta.findMany({ where: { metaTitle: String(seo.metaTitle), id: { not: String(seo.id) } }, select: { id: true }, take: 4 })
      : Promise.resolve([]),
    seo?.metaDescription
      ? db.seoMeta.findMany({ where: { metaDescription: String(seo.metaDescription), id: { not: String(seo.id) } }, select: { id: true }, take: 4 })
      : Promise.resolve([]),
    focusKeyword
      ? db.seoMeta.findMany({ where: { focusKeyword: { equals: focusKeyword, mode: "insensitive" }, id: { not: String(seo?.id ?? "") } }, select: { id: true }, take: 4 })
      : Promise.resolve([]),
    countInboundLinks(def, row),
  ]);

  const outbound = countOutboundLinks(def, row);

  return {
    type: def.entityType,
    name,
    path,
    resolvedTitle,
    metaTitle: (seo?.metaTitle as string | null) ?? null,
    metaDescription: (seo?.metaDescription as string | null) ?? null,
    h1: (seo?.h1Override as string | null) || name,
    focusKeyword,
    secondaryKeywords: (seo?.secondaryKeywords as string[] | undefined) ?? [],
    canonicalUrl: (seo?.canonicalUrl as string | null) ?? null,
    robotsIndex: (seo?.robotsIndex as boolean | undefined) ?? true,
    hasOgImage: Boolean(seo?.ogImageId),
    hasHeroImage: Boolean(heroId),
    heroAltMissing: Boolean(heroId) && !hero?.altText,
    imagesMissingAlt: 0,
    imagesLicenceUnknown: hero?.licence === "UNKNOWN" ? 1 : 0,
    wordCount: wordCount(bodyText),
    internalLinksOut: outbound,
    internalLinksIn: inboundLinks,
    hasRelatedContent: outbound > 0,
    bodyText,
    duplicateTitleWith: duplicateTitles.map(() => "another page"),
    duplicateDescriptionWith: duplicateDescriptions.map(() => "another page"),
    sameFocusKeywordAs: sameKeyword.map(() => "another page"),
    isLinkedFromNav: NAV_PATHS.has(path),
  };
}

async function countInboundLinks(def: EntityDef, row: AnyRow): Promise<number> {
  const id = String(row.id);
  switch (def.key) {
    case "destinations":
      return (
        (await db.journeyStop.count({ where: { destinationId: id, journey: { status: "PUBLISHED" } } })) +
        (await db.experience.count({ where: { destinationId: id, status: "PUBLISHED" } })) +
        (await db.articleDestination.count({ where: { destinationId: id, article: { status: "PUBLISHED" } } }))
      );
    case "journeys":
      return (
        (await db.journeyStop.count({ where: { journeyId: id, destination: { status: "PUBLISHED" } } })) +
        (await db.articleJourney.count({ where: { journeyId: id } })) +
        (await db.journeyStyle.count({ where: { journeyId: id } }))
      );
    case "experiences":
      return (
        (await db.experienceTheme.count({ where: { experienceId: id } })) +
        (row.destinationId ? 1 : 0) +
        (await db.journeyExperience.count({ where: { experienceId: id } }))
      );
    case "articles":
      return await db.articleDestination.count({ where: { articleId: id } });
    case "regions":
      return await db.destination.count({ where: { regionId: id, status: "PUBLISHED" } });
    default:
      return 0;
  }
}

function countOutboundLinks(def: EntityDef, row: AnyRow): number {
  switch (def.key) {
    case "destinations":
      return (row.regionId ? 1 : 0) + (row.parentId ? 1 : 0);
    case "experiences":
      return row.destinationId ? 1 : 0;
    case "articles":
      return row.categoryId ? 1 : 0;
    default:
      return 1;
  }
}

export async function checksFor(def: EntityDef, row: AnyRow): Promise<Check[]> {
  return analyzeSeo(await buildSeoSubject(def, row));
}
