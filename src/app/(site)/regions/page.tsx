import type { Metadata } from "next";
import Link from "next/link";
import { listRegions } from "@/lib/content/travel";
import { resolveStaticMetadata } from "@/lib/seo/metadata";
import { routes } from "@/lib/site";
import { ListingHeader } from "@/components/site/listing-header";
import { Inscription, Plate, Section } from "@/components/site/primitives";

export async function generateMetadata(): Promise<Metadata> {
  return resolveStaticMetadata({
    title: "Regions of India",
    description: "India by region: Rajasthan, North India, the Himalayas, Ladakh, Goa and Central India — what each one is for, and the journeys that cross them.",
    path: routes.regions(),
  });
}

export default async function RegionsPage() {
  const regions = await listRegions();
  return (
    <>
      <ListingHeader
        title="India by region"
        lead="Six regions we plan journeys through today. Each one lists its destinations, its routes and the experiences that belong to it."
        crumbs={[{ label: "Regions", href: routes.regions() }]}
        count={`${regions.length} regions`}
      />
      <Section tone="paper" className="pt-0">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
          {regions.map((r) => (
            <Link key={r.slug} href={routes.region(r.slug)} className="group/card block">
              <Plate
                media={r.hero}
                ratio="landscape"
                sizes="(max-width: 640px) 92vw, (max-width: 1024px) 45vw, 30vw"
                band="forest"
                label={r.name}
                className="group-hover/card:after:inset-[calc(var(--spacing-band)-1px)]"
                imageClassName="transition-transform duration-(--duration-slow) ease-(--ease-out-expo) group-hover/card:scale-[1.035]"
              />
              <h2 className="mt-3.5 font-display text-title text-ink group-hover/card:text-terracotta-700">{r.name}</h2>
              {r.tagline ? <p className="mt-1 text-small text-ink-2">{r.tagline}</p> : null}
              <Inscription className="mt-2">
                {r.destinations.length} {r.destinations.length === 1 ? "destination" : "destinations"}
                {r.journeyCount ? ` · ${r.journeyCount} journeys` : ""}
              </Inscription>
            </Link>
          ))}
        </div>
      </Section>
    </>
  );
}
