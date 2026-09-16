import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getRegionPage } from "@/lib/content/travel";
import { resolveMetadata } from "@/lib/seo/metadata";
import { routes } from "@/lib/site";
import { docToPlainText } from "@/lib/richtext/text";
import { PageHero } from "@/components/site/page-hero";
import { Section, SectionHead } from "@/components/site/primitives";
import { ArticleCard, DestinationCard, ExperienceCard, JourneyCard } from "@/components/site/cards";
import { RichText } from "@/components/richtext/render";
import { FaqBlock } from "@/components/site/faq-block";
import { EnquiryDialog } from "@/components/enquiry/enquiry-dialog";
import { LinkButton } from "@/components/ui/button";
import { DestinationPlot } from "@/components/site/destination-plot";

import { db } from "@/lib/db";

type Props = { params: Promise<{ slug: string }> };

/** Known pages are prerendered at build; anything new is rendered on first visit and then cached. */
export async function generateStaticParams() {
  const rows = await db.region.findMany({ where: { status: "PUBLISHED" }, select: { slug: true } });
  return rows.map((r) => ({ slug: r.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const r = await getRegionPage(slug);
  if (!r) return {};
  return resolveMetadata({
    kind: "REGION",
    name: r.name,
    path: routes.region(r.slug),
    seo: r.seo,
    description: r.shortDescription ?? r.tagline ?? docToPlainText(r.intro),
    image: r.hero,
  });
}

export default async function RegionPage({ params }: Props) {
  const { slug } = await params;
  const r = await getRegionPage(slug);
  if (!r) notFound();

  return (
    <>
      <PageHero
        media={r.hero}
        title={r.seo.h1Override || r.name}
        crumbs={[
          { label: "Regions", href: routes.regions() },
          { label: r.name, href: routes.region(r.slug) },
        ]}
        band="forest"
        meta={`${r.destinations.length} destinations · ${r.journeys.length} journeys`}
        lead={r.tagline}
        actions={
          <>
            <EnquiryDialog label={`Plan a ${r.name} journey`} context={{ entityType: "REGION", entityId: r.id, entityName: r.name }} title={`Plan your ${r.name} journey`} />
            <LinkButton href="#destinations" variant="secondary" size="lg">
              See destinations
            </LinkButton>
          </>
        }
      />

      {r.intro ? (
        <Section tone="paper" className="pt-12 lg:pt-16">
          <RichText doc={r.intro} />
        </Section>
      ) : null}

      <Section tone={r.intro ? "paper-2" : "paper"} id="destinations" labelledBy="destinations-head" className={r.intro ? undefined : "pt-12"}>
        <SectionHead id="destinations-head" title={`Destinations in ${r.name}`} action={{ label: "All destinations", href: routes.destinations() }} />
        <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          {r.destinations.map((d) => (
            <DestinationCard key={d.slug} destination={d} sizes="(max-width: 640px) 92vw, (max-width: 1024px) 45vw, 23vw" ratio="landscape" band="paper" clampTitle />
          ))}
        </div>
      </Section>

      {r.journeys.length ? (
        <Section tone="paper" labelledBy="journeys">
          <SectionHead id="journeys" title={`Journeys through ${r.name}`} action={{ label: "All journeys", href: routes.journeys() }} />
          <div className="mt-10 grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
            {r.journeys.slice(0, 6).map((j) => (
              <JourneyCard key={j.slug} journey={j} sizes="(max-width: 640px) 92vw, (max-width: 1024px) 45vw, 30vw" ratio="landscape" />
            ))}
          </div>
        </Section>
      ) : null}

      {r.experiences.length ? (
        <Section tone="paper-2" labelledBy="experiences">
          <SectionHead id="experiences" title={`Experiences in ${r.name}`} action={{ label: "All experiences", href: routes.experiences() }} />
          <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {r.experiences.slice(0, 6).map((e) => (
              <ExperienceCard key={e.slug} experience={e} sizes="(max-width: 640px) 92vw, (max-width: 1024px) 45vw, 30vw" />
            ))}
          </div>
        </Section>
      ) : null}

      <Section tone="forest" labelledBy="plot">
        <div className="grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-4">
            <SectionHead id="plot" title={`${r.name}, plotted`} lead="Every destination in this region, by coordinate." tone="paper" />
          </div>
          <div className="lg:col-span-8">
            <DestinationPlot destinations={r.destinations} />
          </div>
        </div>
      </Section>

      {r.articles.length ? (
        <Section tone="paper" labelledBy="reading">
          <SectionHead id="reading" title={`Reading about ${r.name}`} action={{ label: "Travel guide", href: routes.travelGuide() }} />
          <div className="mt-10 grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
            {r.articles.map((a) => (
              <ArticleCard key={a.slug} article={a} sizes="(max-width: 640px) 92vw, (max-width: 1024px) 45vw, 30vw" />
            ))}
          </div>
        </Section>
      ) : null}

      {r.faqs.length ? (
        <Section tone="paper-2">
          <FaqBlock faqs={r.faqs} heading={`${r.name}: common questions`} />
        </Section>
      ) : null}
    </>
  );
}
