import "server-only";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "@/lib/db";
import { TAGS } from "./tags";
import { mediaSelect, toMedia, type MediaSource } from "./media";

export type Social = { network: string; url: string };

export type SiteSettingsView = {
  businessName: string;
  brandLine: string | null;
  tagline: string | null;
  logo: MediaSource | null;
  logoLight: MediaSource | null;
  phoneE164: string | null;
  whatsappE164: string | null;
  email: string | null;
  address: { line1: string | null; line2: string | null; city: string | null; region: string | null; postalCode: string | null; country: string | null };
  mapUrl: string | null;
  socials: Social[];
  footerDescription: string | null;
  copyright: string;
  defaultCta: { label: string; href: string };
  defaultOgImage: MediaSource | null;
  newsletterEnabled: boolean;
};

export async function getSiteSettings(): Promise<SiteSettingsView> {
  "use cache";
  cacheTag(TAGS.settings, TAGS.media);
  cacheLife("days");

  const s = await db.siteSettings.findUnique({
    where: { id: "singleton" },
    include: { logo: { select: mediaSelect }, logoLight: { select: mediaSelect }, defaultOgImage: { select: mediaSelect } },
  });
  const year = new Date().getFullYear();
  return {
    businessName: s?.businessName ?? "India Uncharted",
    brandLine: s?.brandLine ?? null,
    tagline: s?.tagline ?? null,
    logo: toMedia(s?.logo, "India Uncharted"),
    logoLight: toMedia(s?.logoLight, "India Uncharted"),
    phoneE164: s?.phoneE164 ?? null,
    whatsappE164: s?.whatsappE164 ?? null,
    email: s?.email ?? null,
    address: {
      line1: s?.addressLine1 ?? null,
      line2: s?.addressLine2 ?? null,
      city: s?.city ?? null,
      region: s?.region ?? null,
      postalCode: s?.postalCode ?? null,
      country: s?.country ?? null,
    },
    mapUrl: s?.mapUrl ?? null,
    socials: Array.isArray(s?.socials) ? (s!.socials as Social[]).filter((x) => x && x.url) : [],
    footerDescription: s?.footerDescription ?? null,
    copyright: (s?.copyright ?? "© {year} India Uncharted").replace("{year}", String(year)),
    defaultCta: { label: s?.defaultCtaLabel ?? "Plan My Journey", href: s?.defaultCtaHref ?? "/plan-my-journey" },
    defaultOgImage: toMedia(s?.defaultOgImage, "India Uncharted"),
    newsletterEnabled: s?.newsletterEnabled ?? false,
  };
}

export type SeoSettingsView = Awaited<ReturnType<typeof getSeoSettings>>;

export async function getSeoSettings() {
  "use cache";
  cacheTag(TAGS.seo, TAGS.settings);
  cacheLife("days");
  const s = await db.seoSettings.findUnique({ where: { id: "singleton" } });
  const globalTags = await db.customMetaTag.findMany({ where: { seoId: null }, orderBy: { sortOrder: "asc" } });
  return {
    siteTitle: s?.siteTitle ?? "India Uncharted",
    titleSeparator: s?.titleSeparator ?? " | ",
    defaultMetaTitle: s?.defaultMetaTitle ?? null,
    defaultMetaDescription: s?.defaultMetaDescription ?? null,
    defaultKeywords: s?.defaultKeywords ?? [],
    defaultRobotsIndex: s?.defaultRobotsIndex ?? true,
    defaultRobotsFollow: s?.defaultRobotsFollow ?? true,
    defaultOgTitle: s?.defaultOgTitle ?? null,
    defaultOgDescription: s?.defaultOgDescription ?? null,
    defaultTwitterTitle: s?.defaultTwitterTitle ?? null,
    defaultTwitterDescription: s?.defaultTwitterDescription ?? null,
    twitterHandle: s?.twitterHandle ?? null,
    patterns: (s?.patterns ?? {}) as Record<string, { title?: string; description?: string }>,
    verification: {
      google: s?.googleVerification ?? null,
      bing: s?.bingVerification ?? null,
      yandex: s?.yandexVerification ?? null,
      pinterest: s?.pinterestVerification ?? null,
    },
    analytics: { ga4Id: s?.ga4Id ?? null, gtmId: s?.gtmId ?? null, metaPixelId: s?.metaPixelId ?? null, consentRequired: s?.consentRequired ?? true },
    customHeadTags: (s?.customHeadTags ?? []) as { tag: "meta" | "link"; attrs: Record<string, string> }[],
    organizationJsonLd: s?.organizationJsonLd ?? null,
    globalMetaTags: globalTags.map((t) => ({ attribute: t.attribute, key: t.key, content: t.content })),
  };
}
