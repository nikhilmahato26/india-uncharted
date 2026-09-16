import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getDestinationPage } from "@/lib/content/travel";
import { getSiteSettings } from "@/lib/content/settings";
import { resolveMetadata } from "@/lib/seo/metadata";
import { absoluteUrl, routes } from "@/lib/site";
import { wholeRows } from "@/lib/rows";
import { docToPlainText } from "@/lib/richtext/text";
import { JsonLd } from "@/components/seo/json-ld";
import { PageHero } from "@/components/site/page-hero";
import { FactRow, Section, SectionHead } from "@/components/site/primitives";
import { DestinationCard, ArticleCard, ExperienceCard, JourneyCard } from "@/components/site/cards";
import { RichText } from "@/components/richtext/render";
import { FaqBlock } from "@/components/site/faq-block";
import { EnquiryDialog } from "@/components/enquiry/enquiry-dialog";
import { LinkButton } from "@/components/ui/button";
import { PlanStrip } from "@/components/site/plan-strip";

import { db } from "@/lib/db";

type Props = { params: Promise<{ slug: string }> };

/** Known pages are prerendered at build; anything new is rendered on first visit and then cached. */
export async function generateStaticParams() {
  const rows = await db.destination.findMany({ where: { status: "PUBLISHED" }, select: { slug: true } });
  return rows.map((r) => ({ slug: r.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const d = await getDestinationPage(slug);
  if (!d) return {};
  return resolveMetadata({
    kind: "DESTINATION",
    name: d.name,
    path: routes.destination(d.slug),
    seo: d.seo,
    description: d.shortDescription ?? docToPlainText(d.intro),
    image: d.hero,
    vars: { state: d.state, region: d.region?.name },
  });
}

export default async function DestinationPage({ params }: Props) {
  const { slug } = await params;
  const [d, settings] = await Promise.all([getDestinationPage(slug), getSiteSettings()]);
  if (!d) notFound();

  const heading = d.seo.h1Override || d.name;
  const crumbs = [
    { label: "Destinations", href: routes.destinations() },
    ...(d.region ? [{ label: d.region.name, href: routes.region(d.region.slug) }] : []),
    ...(d.parent ? [{ label: d.parent.name, href: routes.destination(d.parent.slug) }] : []),
    { label: d.name, href: routes.destination(d.slug) },
  ];

  const facts = [
    { label: "Region", value: d.region?.name ?? d.state },
    { label: "Best time", value: d.facts.bestTime },
    { label: "How long", value: d.facts.recommendedDuration },
    { label: "Journeys", value: d.journeyCount ? `${d.journeyCount} through ${d.name}` : null },
  ];

  const placesToVisit = d.highlights.filter((h) => h.kind === "PLACE_TO_VISIT");
  const thingsToDo = d.highlights.filter((h) => h.kind === "THING_TO_DO");
  const beyond = d.highlights.filter((h) => h.kind === "BEYOND_OBVIOUS");

  return (
    <>
      <PageHero
        media={d.hero}
        title={heading}
        italicTitle={d.title}
        crumbs={crumbs}
        meta={[...new Set([d.state, d.region?.name].filter(Boolean))].join(" · ")}
        lead={d.intro ? null : d.shortDescription}
        actions={
          <>
            <EnquiryDialog label={`Plan a journey to ${d.name}`} context={{ entityType: "DESTINATION", entityId: d.id, entityName: d.name }} title={`Plan your ${d.name} journey`} />
            {d.journeys.length ? (
              <LinkButton href="#journeys" variant="secondary" size="lg">
                See {d.journeys.length} {d.journeys.length === 1 ? "journey" : "journeys"}
              </LinkButton>
            ) : null}
          </>
        }
      />

      <Section tone="paper" className="pt-12 lg:pt-16">
        <FactRow facts={facts} />

        {(d.intro || d.whyVisit) && (
          <div className="mt-14 grid gap-12 lg:grid-cols-12">
            <div className="lg:col-span-7">
              {d.intro ? <RichText doc={d.intro} className="measure" /> : null}
              {d.whyVisit ? (
                <div className="mt-10">
                  <h2 className="text-display-md text-ink">Why visit {d.name}</h2>
                  <RichText doc={d.whyVisit} className="mt-5" />
                </div>
              ) : null}
            </div>
            <div className="lg:col-span-4 lg:col-start-9">
              <PlanStrip
                destinationName={d.name}
                entity={{ entityType: "DESTINATION", entityId: d.id, entityName: d.name }}
                phoneE164={settings.phoneE164}
                whatsappE164={settings.whatsappE164}
              />
            </div>
          </div>
        )}
      </Section>

      {placesToVisit.length ? (
        <Section tone="paper-2" labelledBy="places">
          <SectionHead id="places" title={`Places to visit in ${d.name}`} />
          <div className="mt-10 grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
            {placesToVisit.map((h) => (
              <article key={h.id}>
                <h3 className="font-display text-subtitle text-ink">{h.title}</h3>
                {h.body ? <p className="mt-2 text-small text-ink-2">{h.body}</p> : null}
              </article>
            ))}
          </div>
        </Section>
      ) : null}

      {d.experiences.length ? (
        <Section tone="paper" labelledBy="experiences">
          <SectionHead id="experiences" title={`Things to do in ${d.name}`} action={{ label: "All experiences", href: routes.experiences() }} />
          <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {wholeRows(d.experiences, 3).map((e) => (
              <ExperienceCard key={e.slug} experience={e} sizes="(max-width: 640px) 92vw, (max-width: 1024px) 45vw, 30vw" />
            ))}
          </div>
        </Section>
      ) : null}

      {thingsToDo.length || beyond.length ? (
        <Section tone="paper-2">
          {thingsToDo.length ? (
            <ul className="grid gap-8 sm:grid-cols-2">
              {thingsToDo.map((h) => (
                <li key={h.id}>
                  <h3 className="font-display text-subtitle text-ink">{h.title}</h3>
                  {h.body ? <p className="mt-2 text-small text-ink-2">{h.body}</p> : null}
                </li>
              ))}
            </ul>
          ) : null}
          {beyond.length ? (
            <div className="mt-12">
              <h2 className="text-display-md text-ink">Beyond the obvious</h2>
              <ul className="mt-6 grid gap-8 sm:grid-cols-2">
                {beyond.map((h) => (
                  <li key={h.id}>
                    <h3 className="font-display text-subtitle text-ink">{h.title}</h3>
                    {h.body ? <p className="mt-2 text-small text-ink-2">{h.body}</p> : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </Section>
      ) : null}

      {d.journeys.length ? (
        <Section tone="paper" id="journeys" labelledBy="journeys-head">
          <SectionHead
            id="journeys-head"
            title={`Journeys through ${d.name}`}
            lead={`Every route below includes ${d.name}. All of them are private and adjusted to your dates.`}
            action={{ label: "All journeys", href: routes.journeys() }}
          />
          <div className="mt-10 grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
            {wholeRows(d.journeys.slice(0, 6), 3).map((j) => (
              <JourneyCard key={j.slug} journey={j} sizes="(max-width: 640px) 92vw, (max-width: 1024px) 45vw, 30vw" ratio="landscape" />
            ))}
          </div>
        </Section>
      ) : null}

      {(d.facts.howToReach || d.facts.weather || d.facts.localTransport || d.travelTips || d.food || d.whereToStay) && (
        <Section tone="paper-2" labelledBy="practical">
          <SectionHead id="practical" title={`Practical information for ${d.name}`} />
          <div className="mt-10 grid gap-10 lg:grid-cols-2">
            {d.facts.howToReach ? (
              <section>
                <h3 className="font-display text-subtitle text-ink">How to reach</h3>
                <p className="measure mt-2 text-body text-ink-2">{d.facts.howToReach}</p>
              </section>
            ) : null}
            {d.facts.localTransport ? (
              <section>
                <h3 className="font-display text-subtitle text-ink">Getting around</h3>
                <p className="measure mt-2 text-body text-ink-2">{d.facts.localTransport}</p>
              </section>
            ) : null}
            {d.facts.weather ? (
              <section>
                <h3 className="font-display text-subtitle text-ink">Weather</h3>
                <p className="measure mt-2 text-body text-ink-2">{d.facts.weather}</p>
              </section>
            ) : null}
            {d.food ? (
              <section>
                <h3 className="font-display text-subtitle text-ink">Food</h3>
                <RichText doc={d.food} className="mt-2" />
              </section>
            ) : null}
            {d.whereToStay ? (
              <section>
                <h3 className="font-display text-subtitle text-ink">Where to stay</h3>
                <RichText doc={d.whereToStay} className="mt-2" />
              </section>
            ) : null}
            {d.travelTips ? (
              <section>
                <h3 className="font-display text-subtitle text-ink">Travel tips</h3>
                <RichText doc={d.travelTips} className="mt-2" />
              </section>
            ) : null}
          </div>
        </Section>
      )}

      {d.children.length || d.nearby.length ? (
        <Section tone="paper" labelledBy="nearby">
          <SectionHead id="nearby" title={d.children.length ? `In and around ${d.name}` : d.region ? `Also in ${d.region.name}` : `Near ${d.name}`} />
          <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {[...d.children, ...d.nearby].slice(0, 4).map((n) => (
              <DestinationCard key={n.slug} destination={n} sizes="(max-width: 640px) 92vw, (max-width: 1024px) 45vw, 23vw" ratio="landscape" band="paper" clampTitle />
            ))}
          </div>
        </Section>
      ) : null}

      {d.articles.length ? (
        <Section tone="paper-2" labelledBy="reading">
          <SectionHead id="reading" title={`Reading about ${d.name}`} action={{ label: "Travel guide", href: routes.travelGuide() }} />
          <div className="mt-10 grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
            {wholeRows(d.articles, 3).map((a) => (
              <ArticleCard key={a.slug} article={a} sizes="(max-width: 640px) 92vw, (max-width: 1024px) 45vw, 30vw" />
            ))}
          </div>
        </Section>
      ) : null}

      {d.faqs.length ? (
        <Section tone="paper">
          <FaqBlock faqs={d.faqs} heading={`${d.name}: common questions`} />
        </Section>
      ) : null}

      <Section tone="forest" labelledBy="plan">
        <div className="grid gap-8 lg:grid-cols-12 lg:items-end">
          <div className="lg:col-span-7">
            <h2 id="plan" className="text-display-md text-paper">
              Plan your journey to {d.name}
            </h2>
            <p className="measure mt-4 text-lead text-paper/80">
              Tell us your dates and what you want from {d.name}. We’ll design the route around them — private, at your pace.
            </p>
          </div>
          <div className="flex flex-wrap gap-3 lg:col-span-5 lg:justify-end">
            <EnquiryDialog
              label="Plan My Journey"
              variant="on-dark-solid"
              context={{ entityType: "DESTINATION", entityId: d.id, entityName: d.name }}
              title={`Plan your ${d.name} journey`}
            />
            <LinkButton href={routes.destinations()} variant="on-dark" size="lg">
              All destinations
            </LinkButton>
          </div>
        </div>
      </Section>

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "TouristDestination",
          name: d.name,
          description: d.shortDescription ?? (docToPlainText(d.intro).slice(0, 300) || undefined),
          url: absoluteUrl(routes.destination(d.slug)),
          ...(d.hero ? { image: absoluteUrl(d.hero.src) } : {}),
          ...(d.coords ? { geo: { "@type": "GeoCoordinates", latitude: d.coords.lat, longitude: d.coords.lng } } : {}),
          address: { "@type": "PostalAddress", addressRegion: d.state ?? undefined, addressCountry: "IN" },
          ...(d.children.length
            ? { containsPlace: d.children.map((c) => ({ "@type": "TouristDestination", name: c.name, url: absoluteUrl(routes.destination(c.slug)) })) }
            : {}),
        }}
      />
    </>
  );
}
