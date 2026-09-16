import "server-only";
import { Prisma } from "@/generated/prisma/client";
import type { EntityType } from "@/generated/prisma/enums";
import { db } from "@/lib/db";
import { mediaSelect, toMedia, type MediaSource } from "./media";

export const seoSelect = {
  metaTitle: true,
  metaDescription: true,
  h1Override: true,
  focusKeyword: true,
  secondaryKeywords: true,
  keywordVariants: true,
  canonicalUrl: true,
  robotsIndex: true,
  robotsFollow: true,
  ogTitle: true,
  ogDescription: true,
  ogImage: { select: mediaSelect },
  twitterTitle: true,
  twitterDescription: true,
  twitterImage: { select: mediaSelect },
  schemaType: true,
  customJsonLd: true,
  customMetaTags: { orderBy: { sortOrder: "asc" }, select: { attribute: true, key: true, content: true } },
} satisfies Prisma.SeoMetaSelect;

export type SeoView = {
  metaTitle: string | null;
  metaDescription: string | null;
  h1Override: string | null;
  focusKeyword: string | null;
  keywords: string[];
  canonicalUrl: string | null;
  robotsIndex: boolean;
  robotsFollow: boolean;
  ogTitle: string | null;
  ogDescription: string | null;
  ogImage: MediaSource | null;
  twitterTitle: string | null;
  twitterDescription: string | null;
  twitterImage: MediaSource | null;
  schemaType: string | null;
  customJsonLd: unknown;
  customMetaTags: { attribute: "NAME" | "PROPERTY" | "HTTP_EQUIV"; key: string; content: string }[];
};

export function toSeo(s: Prisma.SeoMetaGetPayload<{ select: typeof seoSelect }> | null | undefined): SeoView {
  return {
    metaTitle: s?.metaTitle ?? null,
    metaDescription: s?.metaDescription ?? null,
    h1Override: s?.h1Override ?? null,
    focusKeyword: s?.focusKeyword ?? null,
    keywords: [...(s?.focusKeyword ? [s.focusKeyword] : []), ...(s?.secondaryKeywords ?? []), ...(s?.keywordVariants ?? [])],
    canonicalUrl: s?.canonicalUrl ?? null,
    robotsIndex: s?.robotsIndex ?? true,
    robotsFollow: s?.robotsFollow ?? true,
    ogTitle: s?.ogTitle ?? null,
    ogDescription: s?.ogDescription ?? null,
    ogImage: toMedia(s?.ogImage),
    twitterTitle: s?.twitterTitle ?? null,
    twitterDescription: s?.twitterDescription ?? null,
    twitterImage: toMedia(s?.twitterImage),
    schemaType: s?.schemaType ?? null,
    customJsonLd: s?.customJsonLd ?? null,
    customMetaTags: s?.customMetaTags ?? [],
  };
}

export type FaqView = { id: string; question: string; answer: string };

export async function loadFaqs(entityType: EntityType, entityId: string): Promise<FaqView[]> {
  const rows = await db.faqAssignment.findMany({
    where: { entityType, entityId, faq: { status: "PUBLISHED" } },
    orderBy: { sortOrder: "asc" },
    select: { faq: { select: { id: true, question: true, answer: true } } },
  });
  return rows.map((r) => r.faq);
}

export type SectionView = { id: string; type: string; props: Record<string, unknown> };

export async function loadSections(ownerType: EntityType, ownerId: string): Promise<SectionView[]> {
  const rows = await db.section.findMany({
    where: { ownerType, ownerId, isVisible: true },
    orderBy: { sortOrder: "asc" },
    select: { id: true, type: true, props: true },
  });
  return rows.map((r) => ({ id: r.id, type: r.type, props: (r.props ?? {}) as Record<string, unknown> }));
}

export async function loadRelatedLinks(fromType: EntityType, fromId: string) {
  return db.relatedLink.findMany({
    where: { fromType, fromId },
    orderBy: { sortOrder: "asc" },
    select: { toType: true, toId: true },
  });
}

export async function loadGallery(entityType: EntityType, entityId: string): Promise<MediaSource[]> {
  const rows = await db.mediaUsage.findMany({
    where: { entityType, entityId, role: "GALLERY" },
    orderBy: { sortOrder: "asc" },
    select: { media: { select: mediaSelect } },
  });
  return rows.map((r) => toMedia(r.media)!).filter(Boolean);
}
