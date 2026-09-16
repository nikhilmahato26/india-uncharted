import type { Metadata } from "next";
import { listRegions } from "@/lib/content/travel";
import { resolveStaticMetadata } from "@/lib/seo/metadata";
import { routes } from "@/lib/site";
import { ListingHeader } from "@/components/site/listing-header";
import { Section, SectionHead } from "@/components/site/primitives";
import { DestinationCard } from "@/components/site/cards";
import { DestinationPlot } from "@/components/site/destination-plot";

export async function generateMetadata(): Promise<Metadata> {
  return resolveStaticMetadata({
    title: "Destinations in India",
    description:
      "Every place India Uncharted plans journeys through — Rajasthan's desert cities, Kashmir's valleys, Ladakh, Goa and the offbeat places in between.",
    path: routes.destinations(),
  });
}

export default async function DestinationsPage() {
  const regions = await listRegions();
  const all = regions.flatMap((r) => r.destinations);
  const offbeat = all.filter((d) => d.isOffbeat);

  return (
    <>
      <ListingHeader
        title="Where we travel in India"
        lead="Grouped by region, from the cities most first journeys start in to the quiet places we add when there's time."
        crumbs={[{ label: "Destinations", href: routes.destinations() }]}
        count={`${all.length} destinations · ${regions.length} regions`}
        links={regions.map((r) => ({ label: r.name, href: `#${r.slug}` }))}
      />

      {regions.map((region, i) => (
        <Section key={region.slug} tone={i % 2 === 0 ? "paper" : "paper-2"} id={region.slug} labelledBy={`${region.slug}-head`} className={i === 0 ? "pt-0" : undefined}>
          <SectionHead
            id={`${region.slug}-head`}
            title={region.name}
            lead={region.tagline}
            action={{ label: `About ${region.name}`, href: routes.region(region.slug) }}
          />
          <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {region.destinations.map((d) => (
              <DestinationCard
                key={d.slug}
                destination={d}
                sizes="(max-width: 640px) 92vw, (max-width: 1024px) 45vw, 23vw"
                ratio="landscape"
                band={i % 2 === 0 ? "terracotta" : "paper"}
                clampTitle
              />
            ))}
          </div>
        </Section>
      ))}

      <Section tone="forest" labelledBy="plot">
        <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
          <div className="lg:col-span-4">
            <SectionHead id="plot" title="Plotted by coordinate" lead={`${offbeat.length} of these are places most itineraries skip.`} tone="paper" />
          </div>
          <div className="lg:col-span-8">
            <DestinationPlot destinations={all} />
          </div>
        </div>
      </Section>
    </>
  );
}
