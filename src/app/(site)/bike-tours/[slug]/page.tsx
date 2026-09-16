import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import { getJourneyPage } from "@/lib/content/travel";
import { getSiteSettings } from "@/lib/content/settings";
import { resolveMetadata } from "@/lib/seo/metadata";
import { routes } from "@/lib/site";
import { docToPlainText } from "@/lib/richtext/text";
import { JourneyTemplate } from "@/components/site/journey-page";
import { db } from "@/lib/db";

type Props = { params: Promise<{ slug: string }> };

/** Known pages are prerendered at build; anything new is rendered on first visit and then cached. */
export async function generateStaticParams() {
  const rows = await db.journey.findMany({ where: { status: "PUBLISHED", kind: "BIKE_TOUR" }, select: { slug: true } });
  return rows.map((r) => ({ slug: r.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const j = await getJourneyPage(slug, "BIKE_TOUR");
  if (!j) return {};
  return resolveMetadata({
    kind: "JOURNEY",
    name: j.nameFull,
    path: j.href,
    seo: j.seo,
    description: j.shortDescription ?? docToPlainText(j.overview),
    image: j.hero,
    vars: { days: j.days, nights: j.nights },
  });
}

export default async function BikeTourPage({ params }: Props) {
  const { slug } = await params;
  const [journey, settings] = await Promise.all([getJourneyPage(slug, "BIKE_TOUR"), getSiteSettings()]);
  if (!journey) {
    const other = await db.journey.findFirst({ where: { slug, kind: { not: "BIKE_TOUR" }, status: "PUBLISHED" }, select: { slug: true } });
    if (other) permanentRedirect(routes.journey(other.slug));
    notFound();
  }
  return <JourneyTemplate journey={journey} settings={settings} />;
}
