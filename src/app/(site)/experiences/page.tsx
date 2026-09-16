import type { Metadata } from "next";
import { listCategories, listExperiences } from "@/lib/content/travel";
import { resolveStaticMetadata } from "@/lib/seo/metadata";
import { routes } from "@/lib/site";
import { ListingHeader } from "@/components/site/listing-header";
import { Section } from "@/components/site/primitives";
import { ExperienceCard } from "@/components/site/cards";

export async function generateMetadata(): Promise<Metadata> {
  return resolveStaticMetadata({
    title: "Things to Do in India: Walks, Food Trails & Desert Evenings",
    description: "Half-day and full-day experiences across India — heritage walks, food trails, cycle rides, guided sightseeing and desert evenings, all privately guided.",
    path: routes.experiences(),
  });
}

export default async function ExperiencesPage() {
  const [experiences, themes] = await Promise.all([listExperiences(), listCategories("EXPERIENCE_THEME")]);
  return (
    <>
      <ListingHeader
        title="Experiences"
        lead="The days that make a journey specific: walking the old city before it wakes, eating where the city eats, riding out to the dunes for the evening."
        crumbs={[{ label: "Experiences", href: routes.experiences() }]}
        count={`${experiences.length} experiences`}
        links={[
          { label: "All experiences", href: routes.experiences(), active: true },
          ...themes.filter((t) => t.experienceCount > 0).map((t) => ({ label: t.name, href: routes.experienceTheme(t.slug) })),
        ]}
      />
      <Section tone="paper" className="pt-0">
        <div className="grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {experiences.map((e) => (
            <ExperienceCard key={e.slug} experience={e} sizes="(max-width: 640px) 92vw, (max-width: 1024px) 45vw, 30vw" />
          ))}
        </div>
      </Section>
    </>
  );
}
