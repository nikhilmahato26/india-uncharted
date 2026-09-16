import type { Metadata } from "next";
import { getPage } from "@/lib/content/editorial";
import { getHomeData } from "@/lib/content/home";
import { getSiteSettings } from "@/lib/content/settings";
import { resolveMetadata } from "@/lib/seo/metadata";
import { routes } from "@/lib/site";
import { ListingHeader } from "@/components/site/listing-header";
import { Section, SectionHead } from "@/components/site/primitives";
import { RichText } from "@/components/richtext/render";
import { FaqBlock } from "@/components/site/faq-block";
import { DestinationCard } from "@/components/site/cards";
import { EnquiryDialog } from "@/components/enquiry/enquiry-dialog";
import { LinkButton } from "@/components/ui/button";
import { formatPhone, telHref } from "@/lib/phone";

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPage("about");
  return resolveMetadata({
    kind: "PAGE",
    name: page?.title ?? "About India Uncharted",
    path: routes.about(),
    seo: page?.seo,
    description: page?.intro ?? "India Uncharted designs private, tailor-made journeys across India from its base in Jodhpur, Rajasthan.",
  });
}

export default async function AboutPage() {
  const [page, data, settings] = await Promise.all([getPage("about"), getHomeData(), getSiteSettings()]);
  const city = settings.address.city;

  return (
    <>
      <ListingHeader
        title={page?.seo.h1Override ?? page?.title ?? "About India Uncharted"}
        lead={page?.intro}
        crumbs={[{ label: "About", href: routes.about() }]}
        count={city ? `Based in ${city}, ${settings.address.region ?? "India"}` : undefined}
      />

      <Section tone="paper" className="pt-0">
        <div className="grid gap-14 lg:grid-cols-12">
          <div className="lg:col-span-7">{page?.body ? <RichText doc={page.body} /> : null}</div>
          <div className="lg:col-span-4 lg:col-start-9">
            <div className="border border-rule bg-paper-2 p-6">
              <h2 className="font-display text-title text-ink">What we plan</h2>
              <dl className="mt-5 space-y-4">
                <div className="flex items-baseline justify-between gap-4 border-b border-rule pb-3">
                  <dt className="text-small text-ink-2">Destinations</dt>
                  <dd className="font-display text-title text-ink tabular">{data.counts.destinations}</dd>
                </div>
                <div className="flex items-baseline justify-between gap-4 border-b border-rule pb-3">
                  <dt className="text-small text-ink-2">Journeys</dt>
                  <dd className="font-display text-title text-ink tabular">{data.counts.journeys}</dd>
                </div>
                <div className="flex items-baseline justify-between gap-4">
                  <dt className="text-small text-ink-2">Experiences</dt>
                  <dd className="font-display text-title text-ink tabular">{data.counts.experiences}</dd>
                </div>
              </dl>
              <p className="mt-5 text-caption text-ink-3">Everything published on this site today. The list grows as we add routes.</p>
              <div className="mt-6 grid gap-3">
                <EnquiryDialog label="Talk to us" context={{ entityType: "PAGE", entityName: "About" }} size="md" className="w-full" title="Talk to India Uncharted" />
                {settings.phoneE164 ? (
                  <a href={telHref(settings.phoneE164)} className="inline-flex min-h-12 w-full items-center justify-center border border-ink/25 px-5 text-small font-semibold text-ink hover:bg-paper">
                    {formatPhone(settings.phoneE164)}
                  </a>
                ) : null}
              </div>
            </div>
          </div>
        </div>
      </Section>

      {data.offbeat.length ? (
        <Section tone="forest" labelledBy="offbeat">
          <SectionHead
            id="offbeat"
            title="The uncharted part"
            lead="Places already on our routes that most itineraries skip — the reason the name fits."
            tone="paper"
            action={{ label: "All destinations", href: routes.destinations() }}
          />
          <ul className="mt-10 grid gap-x-10 gap-y-5 sm:grid-cols-2 lg:grid-cols-3">
            {data.offbeat.map((d) => (
              <li key={d.slug} className="border-t border-paper/20 pt-4">
                <a href={d.href} className="font-display text-title text-paper hover:text-gold-200">
                  {d.name}
                </a>
                <p className="mt-1 text-caption text-paper/70">{d.state}</p>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {data.discover.length ? (
        <Section tone="paper" labelledBy="where">
          <SectionHead id="where" title="Where we work" action={{ label: "All destinations", href: routes.destinations() }} />
          <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {data.discover.slice(0, 4).map((d) => (
              <DestinationCard key={d.slug} destination={d} sizes="(max-width: 640px) 92vw, (max-width: 1024px) 45vw, 23vw" ratio="landscape" band="paper" clampTitle />
            ))}
          </div>
        </Section>
      ) : null}

      {page?.faqs.length ? (
        <Section tone="paper-2">
          <FaqBlock faqs={page.faqs} />
        </Section>
      ) : null}

      <Section tone="paper-2" labelledBy="cta">
        <div className="mx-auto max-w-2xl text-center">
          <h2 id="cta" className="text-display-md text-ink">
            Start with a conversation
          </h2>
          <p className="measure mx-auto mt-4 text-lead text-ink-2">Tell us the shape of the trip you have in mind. We’ll come back with a route.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-3">
            <LinkButton href={routes.planMyJourney()} size="lg">
              Plan My Journey
            </LinkButton>
            <LinkButton href={routes.contact()} variant="secondary" size="lg">
              Contact us
            </LinkButton>
          </div>
        </div>
      </Section>
    </>
  );
}
