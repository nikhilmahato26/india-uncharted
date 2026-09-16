import type { Metadata } from "next";
import { listArticles } from "@/lib/content/editorial";
import { resolveStaticMetadata } from "@/lib/seo/metadata";
import { routes } from "@/lib/site";
import { ListingHeader } from "@/components/site/listing-header";
import { Section } from "@/components/site/primitives";
import { ArticleCard } from "@/components/site/cards";

export async function generateMetadata(): Promise<Metadata> {
  return resolveStaticMetadata({
    title: "India Travel Guide & Journal",
    description: "Guides and notes from the places we travel: seasons, routes, retreats and what each destination is actually like when you get there.",
    path: routes.travelGuide(),
  });
}

export default async function TravelGuidePage() {
  const articles = await listArticles();
  const [lead, ...rest] = articles;
  return (
    <>
      <ListingHeader
        title="Travel journal"
        lead="Guides and notes written from the places we plan journeys through."
        crumbs={[{ label: "Travel Guide", href: routes.travelGuide() }]}
        count={`${articles.length} ${articles.length === 1 ? "story" : "stories"}`}
      />
      <Section tone="paper" className="pt-0">
        {lead ? (
          <div className="mb-14 border-b border-rule pb-14">
            <ArticleCard article={lead} sizes="(max-width: 1024px) 92vw, 60vw" className="lg:max-w-4xl" />
          </div>
        ) : null}
        <div className="grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {rest.map((a) => (
            <ArticleCard key={a.slug} article={a} sizes="(max-width: 640px) 92vw, (max-width: 1024px) 45vw, 30vw" />
          ))}
        </div>
      </Section>
    </>
  );
}
