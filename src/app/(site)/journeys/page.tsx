import type { Metadata } from "next";
import { listCategories, listJourneys } from "@/lib/content/travel";
import { resolveStaticMetadata } from "@/lib/seo/metadata";
import { routes } from "@/lib/site";
import { ListingHeader } from "@/components/site/listing-header";
import { Section } from "@/components/site/primitives";
import { JourneyCard } from "@/components/site/cards";

export async function generateMetadata(): Promise<Metadata> {
  return resolveStaticMetadata({
    title: "India Tour Packages & Private Journeys",
    description:
      "Private, tailor-made journeys across India: Golden Triangle and Rajasthan routes, Kashmir holidays, wildlife and photography tours, yoga retreats and motorcycle expeditions.",
    path: routes.journeys(),
  });
}

export default async function JourneysPage() {
  const [journeys, styles] = await Promise.all([listJourneys(["JOURNEY", "RETREAT", "COURSE"]), listCategories("TRAVEL_STYLE")]);

  return (
    <>
      <ListingHeader
        title="Private journeys across India"
        lead="Every route is planned privately and adjusted to your dates, your pace and the places you actually want to see. Prices are quoted per journey, never published."
        crumbs={[{ label: "Journeys", href: routes.journeys() }]}
        count={`${journeys.length} journeys`}
        links={[
          { label: "All journeys", href: routes.journeys(), active: true },
          ...styles.filter((s) => s.journeyCount > 0).map((s) => ({ label: s.name, href: routes.travelStyle(s.slug) })),
          { label: "Bike Tours", href: routes.bikeTours() },
        ]}
      />
      <Section tone="paper" className="pt-0">
        <div className="grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {journeys.map((j) => (
            <JourneyCard key={j.slug} journey={j} sizes="(max-width: 640px) 92vw, (max-width: 1024px) 45vw, 30vw" ratio="landscape" />
          ))}
        </div>
      </Section>
    </>
  );
}
