import type { Metadata } from "next";
import { listJourneys } from "@/lib/content/travel";
import { resolveStaticMetadata } from "@/lib/seo/metadata";
import { routes } from "@/lib/site";
import { ListingHeader } from "@/components/site/listing-header";
import { Section } from "@/components/site/primitives";
import { JourneyCard } from "@/components/site/cards";

export async function generateMetadata(): Promise<Metadata> {
  return resolveStaticMetadata({
    title: "Motorcycle Tours in India",
    description: "Guided motorcycle journeys across Rajasthan and the Manali–Leh road, planned privately for riders and small groups.",
    path: routes.bikeTours(),
  });
}

export default async function BikeToursPage() {
  const tours = await listJourneys(["BIKE_TOUR"]);
  return (
    <>
      <ListingHeader
        title="Ride India"
        lead="Motorcycle expeditions across Rajasthan's desert cities and the high road to Ladakh. Routes are private, and we plan each one around your riding experience."
        crumbs={[{ label: "Bike Tours", href: routes.bikeTours() }]}
        count={`${tours.length} motorcycle ${tours.length === 1 ? "journey" : "journeys"}`}
        links={[
          { label: "Bike Tours", href: routes.bikeTours(), active: true },
          { label: "All journeys", href: routes.journeys() },
        ]}
      />
      <Section tone="paper" className="pt-0">
        <div className="grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {tours.map((j) => (
            <JourneyCard key={j.slug} journey={j} sizes="(max-width: 640px) 92vw, (max-width: 1024px) 45vw, 30vw" ratio="landscape" band="forest" />
          ))}
        </div>
      </Section>
    </>
  );
}
