import { Fragment } from "react";
import { Check, Minus } from "lucide-react";
import type { JourneyPage as JourneyPageData } from "@/lib/content/travel";
import type { SiteSettingsView } from "@/lib/content/settings";
import { absoluteUrl, routes } from "@/lib/site";
import { docToPlainText } from "@/lib/richtext/text";
import { JsonLd } from "@/components/seo/json-ld";
import { PageHero } from "@/components/site/page-hero";
import { FactRow, Inscription, RouteLine, Section, SectionHead } from "@/components/site/primitives";
import { ArticleCard, DestinationCard, ExperienceCard, JourneyCard } from "@/components/site/cards";
import { dedupeMeta, seasonSummary } from "@/lib/content/cards";
import { wholeRows } from "@/lib/rows";
import { RichText } from "@/components/richtext/render";
import { FaqBlock } from "@/components/site/faq-block";
import { EnquiryDialog } from "@/components/enquiry/enquiry-dialog";
import { PlanStrip } from "@/components/site/plan-strip";
import { Itinerary } from "@/components/site/itinerary";
import { LinkButton } from "@/components/ui/button";
import { RidgeRule } from "@/components/brand/marks";

/** Fact cells hold a phrase, not a paragraph; the full text keeps its own section. */


const KIND_LABEL: Record<string, string> = {
  JOURNEY: "Private journey",
  RETREAT: "Retreat",
  COURSE: "Course",
  BIKE_TOUR: "Motorcycle journey",
};

/** Shared by /journeys/[slug] and /bike-tours/[slug]; the bike specs only render when they exist. */
export function JourneyTemplate({ journey: j, settings }: { journey: JourneyPageData; settings: SiteSettingsView }) {
  const isBike = j.kind === "BIKE_TOUR";
  const crumbs = [
    isBike ? { label: "Bike Tours", href: routes.bikeTours() } : { label: "Journeys", href: routes.journeys() },
    { label: j.name, href: j.href },
  ];
  const context = { entityType: "JOURNEY" as const, entityId: j.id, entityName: j.nameFull };

  const facts = [
    { label: "Duration", value: j.durationText },
    { label: "Tour type", value: j.tourType ?? KIND_LABEL[j.kind] },
    { label: "Travel style", value: j.styles.map((s) => s.name).join(", ") || null },
    { label: "Best time", value: seasonSummary(j.bestTime) },
  ];

  const bike = j.bike;
  const bikeFacts = bike
    ? [
        { label: "Distance", value: bike.totalDistanceKm ? `${bike.totalDistanceKm} km` : null },
        { label: "Terrain", value: bike.terrain },
        { label: "Difficulty", value: bike.difficulty ? bike.difficulty.charAt(0) + bike.difficulty.slice(1).toLowerCase() : null },
        { label: "Motorcycle", value: bike.motorcycleModel },
        { label: "Support vehicle", value: bike.supportVehicle },
        { label: "Riding season", value: bike.bestRidingSeason },
      ].filter((f) => f.value)
    : [];

  const metaParts = dedupeMeta([KIND_LABEL[j.kind], j.durationText, j.tourType]);

  return (
    <>
      <PageHero
        media={j.hero}
        title={j.name}
        crumbs={crumbs}
        band={isBike ? "forest" : "terracotta"}
        meta={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            {metaParts.map((part, i) => (
              <Fragment key={part}>
                {i > 0 ? <span aria-hidden="true">·</span> : null}
                <span>{part}</span>
              </Fragment>
            ))}
          </span>
        }
        lead={j.overview ? null : j.shortDescription}
        actions={
          <>
            <EnquiryDialog label="Enquire about this journey" context={context} title={`Plan: ${j.name}`} />
            <LinkButton href="#itinerary" variant="secondary" size="lg">
              View itinerary
            </LinkButton>
          </>
        }
      />

      <Section tone="paper" className="pt-12 lg:pt-16">
        <FactRow facts={facts} />
        {j.stops.length ? (
          <div className="mt-6">
            <RouteLine stops={j.stops.map((s) => ({ slug: s.slug, name: s.name, optional: s.optional, published: !s.isDraft }))} linked className="text-small" />
          </div>
        ) : null}

        <div className="mt-14 grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-7">
            {j.overview ? <RichText doc={j.overview} className="measure" /> : null}

            {j.highlights.length ? (
              <div className="mt-10">
                <h2 className="text-display-md text-ink">Highlights</h2>
                <ul className="mt-5 grid gap-x-8 gap-y-2.5 sm:grid-cols-2">
                  {j.highlights.map((h) => (
                    <li key={h} className="relative pl-6 text-body text-ink-2">
                      <span aria-hidden="true" className="absolute top-2.5 left-0 size-2 rotate-45 bg-terracotta-600" />
                      {h}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {bikeFacts.length ? (
              <div className="mt-10">
                <h2 className="text-display-md text-ink">Riding this route</h2>
                <FactRow facts={bikeFacts} className="mt-5 lg:grid-cols-3" />
                {bike?.riderRequirements ? (
                  <>
                    <h3 className="mt-8 font-display text-subtitle text-ink">Rider requirements</h3>
                    <p className="measure mt-2 text-body text-ink-2">{bike.riderRequirements}</p>
                  </>
                ) : null}
                {bike?.safetyInfo ? (
                  <>
                    <h3 className="mt-6 font-display text-subtitle text-ink">Safety</h3>
                    <p className="measure mt-2 text-body text-ink-2">{bike.safetyInfo}</p>
                  </>
                ) : null}
              </div>
            ) : null}
          </div>

          {/* The overview runs long; the way to ask about it should stay in view. */}
          <div className="lg:col-span-4 lg:col-start-9 lg:sticky lg:top-28 lg:self-start">
            <PlanStrip entity={context} phoneE164={settings.phoneE164} whatsappE164={settings.whatsappE164} priceText={j.priceText} />
          </div>
        </div>
      </Section>

      {j.itinerary.length ? (
        <Section tone="paper-2" id="itinerary" labelledBy="itinerary-head">
          <SectionHead id="itinerary-head" title="Day by day" lead={j.durationText ? `${j.durationText}, planned privately. Days can be reordered or extended.` : undefined} />
          <div className="mt-12 max-w-3xl">
            <Itinerary
              days={j.itinerary.map((d) => ({
                id: d.id,
                label: d.dayEnd ? `Days ${d.dayNumber}–${d.dayEnd}` : `Day ${d.dayNumber}`,
                title: d.title,
                overnight: d.overnight?.name ?? null,
                meals: d.meals,
                body: d.body ? <RichText doc={d.body} className="measure" /> : null,
              }))}
            />
          </div>
        </Section>
      ) : null}

      {j.inclusions.length || j.exclusions.length ? (
        <Section tone="paper" labelledBy="included">
          <SectionHead id="included" title="What's included" />
          <div className="mt-10 grid gap-10 lg:grid-cols-2">
            {j.inclusions.length ? (
              <div>
                <h3 className="font-display text-subtitle text-ink">Included</h3>
                <ul className="mt-4 space-y-2.5">
                  {j.inclusions.map((item) => (
                    <li key={item} className="flex gap-3 text-body text-ink-2">
                      <Check className="mt-1 size-4 shrink-0 text-forest-600" strokeWidth={2} aria-hidden="true" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
            {j.exclusions.length ? (
              <div>
                <h3 className="font-display text-subtitle text-ink">Not included</h3>
                <ul className="mt-4 space-y-2.5">
                  {j.exclusions.map((item) => (
                    <li key={item} className="flex gap-3 text-body text-ink-2">
                      <Minus className="mt-1 size-4 shrink-0 text-ink-3" strokeWidth={2} aria-hidden="true" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
          {j.accommodationNote || j.transportNote ? (
            <div className="mt-10 grid gap-8 lg:grid-cols-2">
              {j.accommodationNote ? (
                <p className="measure text-small text-ink-2">
                  <strong className="text-ink">Accommodation.</strong> {j.accommodationNote}
                </p>
              ) : null}
              {j.transportNote ? (
                <p className="measure text-small text-ink-2">
                  <strong className="text-ink">Transport.</strong> {j.transportNote}
                </p>
              ) : null}
            </div>
          ) : null}
        </Section>
      ) : null}

      {j.stops.length ? (
        <Section tone="paper-2" labelledBy="stops">
          <SectionHead id="stops" title="Where this journey goes" action={{ label: "All destinations", href: routes.destinations() }} />
          <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {j.stops.slice(0, 8).map((s) => (
              <div key={s.slug}>
                <DestinationCard destination={s} sizes="(max-width: 640px) 92vw, (max-width: 1024px) 45vw, 23vw" ratio="landscape" band="paper" clampTitle />
                {s.nights ? <Inscription className="mt-1">{s.nights} {s.nights === 1 ? "night" : "nights"}</Inscription> : null}
              </div>
            ))}
          </div>
        </Section>
      ) : null}

      {j.experiences.length ? (
        <Section tone="paper" labelledBy="experiences">
          <SectionHead id="experiences" title="Experiences you can add" lead="Days that can be built into this route." action={{ label: "All experiences", href: routes.experiences() }} />
          <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {wholeRows(j.experiences.slice(0, 6), 3).map((e) => (
              <ExperienceCard key={e.slug} experience={e} sizes="(max-width: 640px) 92vw, (max-width: 1024px) 45vw, 30vw" />
            ))}
          </div>
        </Section>
      ) : null}

      {j.bestTime || j.practicalInfo || j.whyChoose.length ? (
        <Section tone="paper-2" labelledBy="practical">
          <SectionHead id="practical" title="Practical information" />
          <div className="mt-10 grid gap-10 lg:grid-cols-2">
            {j.bestTime ? (
              <section>
                <h3 className="font-display text-subtitle text-ink">Best time to travel</h3>
                <p className="measure mt-2 whitespace-pre-line text-body text-ink-2">{j.bestTime}</p>
              </section>
            ) : null}
            {j.whyChoose.length ? (
              <section>
                <h3 className="font-display text-subtitle text-ink">Why travellers choose this route</h3>
                <ul className="mt-2 space-y-2">
                  {j.whyChoose.map((w) => (
                    <li key={w} className="relative pl-6 text-body text-ink-2">
                      <span aria-hidden="true" className="absolute top-2.5 left-0 size-2 rotate-45 bg-terracotta-600" />
                      {w}
                    </li>
                  ))}
                </ul>
              </section>
            ) : null}
            {j.practicalInfo ? (
              <div className="lg:col-span-2">
                <RichText doc={j.practicalInfo} />
              </div>
            ) : null}
          </div>
        </Section>
      ) : null}

      {j.faqs.length ? (
        <Section tone="paper">
          <FaqBlock faqs={j.faqs} heading={`${j.name}: common questions`} />
        </Section>
      ) : null}

      {j.related.length ? (
        <Section tone="paper" labelledBy="related">
          <SectionHead id="related" title="Related journeys" />
          <div className="mt-10 grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
            {wholeRows(j.related, 3).map((r) => (
              <JourneyCard key={r.slug} journey={r} sizes="(max-width: 640px) 92vw, (max-width: 1024px) 45vw, 30vw" ratio="landscape" />
            ))}
          </div>
        </Section>
      ) : null}

      {j.articles.length >= 2 ? (
        <Section tone="paper-2" labelledBy="reading">
          <SectionHead id="reading" title="Before you go" action={{ label: "Travel guide", href: routes.travelGuide() }} />
          <div className="mt-10 grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
            {wholeRows(j.articles, 3).map((a) => (
              <ArticleCard key={a.slug} article={a} sizes="(max-width: 640px) 92vw, (max-width: 1024px) 45vw, 30vw" />
            ))}
          </div>
        </Section>
      ) : null}

      <Section tone="forest" labelledBy="plan">
        <div className="mx-auto max-w-3xl text-center">
          <RidgeRule tone="paper" className="mx-auto max-w-40" />
          <h2 id="plan" className="mt-8 text-display-md text-paper">
            Make this journey yours
          </h2>
          <p className="measure mx-auto mt-4 text-lead text-paper/80">
            {j.priceText === "Price on request"
              ? "We quote each journey for your dates, your pace and where you want to stay."
              : "Tell us your dates and we'll confirm availability and the final quote."}
          </p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <EnquiryDialog label="Enquire about this journey" variant="on-dark-solid" context={context} title={`Plan: ${j.name}`} />
            <LinkButton href={routes.planMyJourney()} variant="on-dark" size="lg">
              Plan something different
            </LinkButton>
          </div>
        </div>
      </Section>

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "TouristTrip",
          name: j.nameFull,
          description: j.shortDescription ?? (docToPlainText(j.overview).slice(0, 300) || undefined),
          url: absoluteUrl(j.href),
          ...(j.hero ? { image: absoluteUrl(j.hero.src) } : {}),
          ...(j.days ? { subjectOf: { "@type": "CreativeWork", name: `${j.days}-day itinerary` } } : {}),
          ...(j.idealFor ? { touristType: j.idealFor } : {}),
          provider: { "@id": `${absoluteUrl("/")}#organization` },
          ...(j.stops.length
            ? {
                itinerary: {
                  "@type": "ItemList",
                  numberOfItems: j.stops.length,
                  itemListElement: j.stops.map((s, i) => ({
                    "@type": "ListItem",
                    position: i + 1,
                    item: { "@type": "TouristDestination", name: s.name, url: absoluteUrl(routes.destination(s.slug)) },
                  })),
                },
              }
            : {}),
          // No `offers`: these journeys are quoted, never publicly priced.
        }}
      />
    </>
  );
}
