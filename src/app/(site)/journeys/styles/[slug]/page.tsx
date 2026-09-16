import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCategoryPage, listCategories } from "@/lib/content/travel";
import { resolveMetadata } from "@/lib/seo/metadata";
import { routes } from "@/lib/site";
import { ListingHeader } from "@/components/site/listing-header";
import { Section, SectionHead } from "@/components/site/primitives";
import { ExperienceCard, JourneyCard } from "@/components/site/cards";
import { RichText } from "@/components/richtext/render";
import { FaqBlock } from "@/components/site/faq-block";

import { db } from "@/lib/db";

type Props = { params: Promise<{ slug: string }> };

/** Known pages are prerendered at build; anything new is rendered on first visit and then cached. */
export async function generateStaticParams() {
  const rows = await db.category.findMany({ where: { type: "TRAVEL_STYLE", status: "PUBLISHED" }, select: { slug: true } });
  return rows.map((r) => ({ slug: r.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const c = await getCategoryPage("TRAVEL_STYLE", slug);
  if (!c) return {};
  return resolveMetadata({
    kind: "CATEGORY",
    name: c.name,
    path: routes.travelStyle(c.slug),
    seo: c.seo,
    description: c.intro ?? `${c.name} journeys across India, planned privately by India Uncharted.`,
    image: c.hero,
  });
}

export default async function TravelStylePage({ params }: Props) {
  const { slug } = await params;
  const [c, styles] = await Promise.all([getCategoryPage("TRAVEL_STYLE", slug), listCategories("TRAVEL_STYLE")]);
  if (!c) notFound();

  return (
    <>
      <ListingHeader
        title={c.seo.h1Override || `${c.name} journeys in India`}
        lead={c.intro}
        crumbs={[
          { label: "Journeys", href: routes.journeys() },
          { label: c.name, href: routes.travelStyle(c.slug) },
        ]}
        count={`${c.journeys.length} ${c.journeys.length === 1 ? "journey" : "journeys"}`}
        links={[
          { label: "All journeys", href: routes.journeys() },
          ...styles.map((s) => ({ label: s.name, href: routes.travelStyle(s.slug), active: s.slug === c.slug })),
        ]}
      />

      {c.body ? (
        <Section tone="paper" className="pt-0">
          <RichText doc={c.body} />
        </Section>
      ) : null}

      <Section tone="paper" className={c.body ? undefined : "pt-0"}>
        <div className="grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {c.journeys.map((j) => (
            <JourneyCard key={j.slug} journey={j} sizes="(max-width: 640px) 92vw, (max-width: 1024px) 45vw, 30vw" ratio="landscape" />
          ))}
        </div>
      </Section>

      {c.experiences.length ? (
        <Section tone="paper-2" labelledBy="experiences">
          <SectionHead id="experiences" title="Experiences to add" action={{ label: "All experiences", href: routes.experiences() }} />
          <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {c.experiences.slice(0, 6).map((e) => (
              <ExperienceCard key={e.slug} experience={e} sizes="(max-width: 640px) 92vw, (max-width: 1024px) 45vw, 30vw" />
            ))}
          </div>
        </Section>
      ) : null}

      {c.faqs.length ? (
        <Section tone="paper">
          <FaqBlock faqs={c.faqs} heading={`${c.name} journeys: common questions`} />
        </Section>
      ) : null}
    </>
  );
}
