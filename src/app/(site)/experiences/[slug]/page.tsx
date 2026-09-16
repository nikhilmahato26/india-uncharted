import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getExperiencePage } from "@/lib/content/travel";
import { getSiteSettings } from "@/lib/content/settings";
import { resolveMetadata } from "@/lib/seo/metadata";
import { absoluteUrl, routes } from "@/lib/site";
import { docToPlainText } from "@/lib/richtext/text";
import { JsonLd } from "@/components/seo/json-ld";
import { PageHero } from "@/components/site/page-hero";
import { FactRow, Section, SectionHead } from "@/components/site/primitives";
import { DestinationCard, ExperienceCard, JourneyCard } from "@/components/site/cards";
import { RichText } from "@/components/richtext/render";
import { FaqBlock } from "@/components/site/faq-block";
import { EnquiryDialog } from "@/components/enquiry/enquiry-dialog";
import { PlanStrip } from "@/components/site/plan-strip";
import { Check, Minus } from "lucide-react";

import { db } from "@/lib/db";

type Props = { params: Promise<{ slug: string }> };

/** Known pages are prerendered at build; anything new is rendered on first visit and then cached. */
export async function generateStaticParams() {
  const rows = await db.experience.findMany({ where: { status: "PUBLISHED" }, select: { slug: true } });
  return rows.map((r) => ({ slug: r.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const e = await getExperiencePage(slug);
  if (!e) return {};
  return resolveMetadata({
    kind: "EXPERIENCE",
    name: e.name,
    path: routes.experience(e.slug),
    seo: e.seo,
    description: e.shortDescription ?? docToPlainText(e.overview),
    image: e.hero,
    vars: { destination: e.destination?.name },
  });
}

export default async function ExperiencePage({ params }: Props) {
  const { slug } = await params;
  const [e, settings] = await Promise.all([getExperiencePage(slug), getSiteSettings()]);
  if (!e) notFound();

  const context = { entityType: "EXPERIENCE" as const, entityId: e.id, entityName: e.name };
  const primaryTheme = e.themes[0];

  return (
    <>
      <PageHero
        media={e.hero}
        title={e.seo.h1Override || e.name}
        crumbs={[
          { label: "Experiences", href: routes.experiences() },
          ...(primaryTheme ? [{ label: primaryTheme.name, href: routes.experienceTheme(primaryTheme.slug) }] : []),
          { label: e.name, href: routes.experience(e.slug) },
        ]}
        size="md"
        meta={[e.formatLabel, e.destination?.name, e.duration].filter(Boolean).join(" · ")}
        lead={e.shortDescription}
        actions={<EnquiryDialog label="Enquire about this experience" context={context} title={`Plan: ${e.name}`} />}
      />

      <Section tone="paper" className="pt-12 lg:pt-16">
        <FactRow
          facts={[
            { label: "Duration", value: e.duration },
            { label: "Where", value: e.location ?? e.destination?.name },
            { label: "Pickup", value: e.pickupDrop },
            { label: "Ideal for", value: e.idealFor },
          ]}
        />

        <div className="mt-14 grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-7">
            {e.overview ? <RichText doc={e.overview} /> : null}
            {e.highlights.length ? (
              <div className="mt-10">
                <h2 className="text-display-md text-ink">Highlights</h2>
                <ul className="mt-5 grid gap-x-8 gap-y-2.5 sm:grid-cols-2">
                  {e.highlights.map((h) => (
                    <li key={h} className="relative pl-6 text-body text-ink-2">
                      <span aria-hidden="true" className="absolute top-2.5 left-0 size-2 rotate-45 bg-terracotta-600" />
                      {h}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
          <div className="lg:col-span-4 lg:col-start-9">
            <PlanStrip
              entity={context}
              phoneE164={settings.phoneE164}
              whatsappE164={settings.whatsappE164}
              priceText={e.priceText}
              note="Experiences are quoted per group, so the price depends on your party size and the day you want."
            />
          </div>
        </div>
      </Section>

      {e.steps.length ? (
        <Section tone="paper-2" labelledBy="what-happens">
          <SectionHead id="what-happens" title="What happens" lead={e.duration ? `About ${e.duration.toLowerCase()}, at your pace.` : undefined} />
          <ol className="mt-12 max-w-3xl">
            {e.steps.map((s, i) => (
              <li key={s.id} className="relative flex gap-6 border-t border-rule py-6 first:border-t-0 first:pt-0">
                <span className="mt-1 font-display text-title text-terracotta-600 tabular">{String(i + 1).padStart(2, "0")}</span>
                <div>
                  <h3 className="font-display text-subtitle text-ink">{s.title}</h3>
                  {s.body ? <p className="measure mt-2 whitespace-pre-line text-body text-ink-2">{s.body}</p> : null}
                </div>
              </li>
            ))}
          </ol>
        </Section>
      ) : null}

      {e.inclusions.length || e.exclusions.length ? (
        <Section tone="paper" labelledBy="included">
          <SectionHead id="included" title="What's included" />
          <div className="mt-10 grid gap-10 lg:grid-cols-2">
            {e.inclusions.length ? (
              <div>
                <h3 className="font-display text-subtitle text-ink">Included</h3>
                <ul className="mt-4 space-y-2.5">
                  {e.inclusions.map((item) => (
                    <li key={item} className="flex gap-3 text-body text-ink-2">
                      <Check className="mt-1 size-4 shrink-0 text-forest-600" strokeWidth={2} aria-hidden="true" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {e.exclusions.length ? (
              <div>
                <h3 className="font-display text-subtitle text-ink">Not included</h3>
                <ul className="mt-4 space-y-2.5">
                  {e.exclusions.map((item) => (
                    <li key={item} className="flex gap-3 text-body text-ink-2">
                      <Minus className="mt-1 size-4 shrink-0 text-ink-3" strokeWidth={2} aria-hidden="true" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </Section>
      ) : null}

      {e.thingsToKnow || e.travelTips || e.bestTime ? (
        <Section tone="paper-2" labelledBy="know">
          <SectionHead id="know" title="Good to know" />
          <div className="mt-10 grid gap-10 lg:grid-cols-2">
            {e.bestTime ? (
              <section>
                <h3 className="font-display text-subtitle text-ink">Best time</h3>
                <p className="measure mt-2 whitespace-pre-line text-body text-ink-2">{e.bestTime}</p>
              </section>
            ) : null}
            {e.thingsToKnow ? <RichText doc={e.thingsToKnow} className="lg:col-span-2" /> : null}
            {e.travelTips ? <RichText doc={e.travelTips} className="lg:col-span-2" /> : null}
          </div>
        </Section>
      ) : null}

      {e.destinationCard ? (
        <Section tone="paper" labelledBy="where">
          <SectionHead id="where" title={`In ${e.destinationCard.name}`} action={{ label: `${e.destinationCard.name} travel guide`, href: e.destinationCard.href }} />
          <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            <DestinationCard destination={e.destinationCard} sizes="(max-width: 640px) 92vw, 23vw" ratio="landscape" band="paper" clampTitle />
            {e.relatedExperiences.slice(0, 3).map((r) => (
              <ExperienceCard key={r.slug} experience={r} sizes="(max-width: 640px) 92vw, (max-width: 1024px) 45vw, 23vw" />
            ))}
          </div>
        </Section>
      ) : null}

      {e.journeys.length ? (
        <Section tone="paper-2" labelledBy="journeys">
          <SectionHead id="journeys" title="Journeys that can include this" action={{ label: "All journeys", href: routes.journeys() }} />
          <div className="mt-10 grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
            {e.journeys.map((j) => (
              <JourneyCard key={j.slug} journey={j} sizes="(max-width: 640px) 92vw, (max-width: 1024px) 45vw, 30vw" ratio="landscape" />
            ))}
          </div>
        </Section>
      ) : null}

      {e.faqs.length ? (
        <Section tone="paper">
          <FaqBlock faqs={e.faqs} heading={`${e.name}: common questions`} />
        </Section>
      ) : null}

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "TouristTrip",
          name: e.name,
          description: e.shortDescription ?? (docToPlainText(e.overview).slice(0, 300) || undefined),
          url: absoluteUrl(routes.experience(e.slug)),
          ...(e.hero ? { image: absoluteUrl(e.hero.src) } : {}),
          provider: { "@id": `${absoluteUrl("/")}#organization` },
          ...(e.destinationCard
            ? {
                itinerary: {
                  "@type": "ItemList",
                  itemListElement: [
                    {
                      "@type": "ListItem",
                      position: 1,
                      item: { "@type": "TouristDestination", name: e.destinationCard.name, url: absoluteUrl(e.destinationCard.href) },
                    },
                  ],
                },
              }
            : {}),
        }}
      />
    </>
  );
}
