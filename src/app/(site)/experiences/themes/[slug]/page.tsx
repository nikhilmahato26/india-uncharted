import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getCategoryPage, listCategories } from "@/lib/content/travel";
import { resolveMetadata } from "@/lib/seo/metadata";
import { routes } from "@/lib/site";
import { ListingHeader } from "@/components/site/listing-header";
import { Section, SectionHead } from "@/components/site/primitives";
import { ExperienceCard, JourneyCard } from "@/components/site/cards";
import { RichText } from "@/components/richtext/render";
import { FaqBlock } from "@/components/site/faq-block";

import { db } from "@/lib/db";

type Props = { params: Promise<{ slug: string }> };

/** Known pages are prerendered at build; anything new is rendered on first visit and then cached. */
export async function generateStaticParams() {
  const rows = await db.category.findMany({ where: { type: "EXPERIENCE_THEME", status: "PUBLISHED" }, select: { slug: true } });
  return rows.map((r) => ({ slug: r.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const c = await getCategoryPage("EXPERIENCE_THEME", slug);
  if (!c) return {};
  return resolveMetadata({
    kind: "EXPERIENCE_THEME",
    name: c.name,
    path: routes.experienceTheme(c.slug),
    seo: c.seo,
    description: c.intro ?? `${c.name} experiences and journeys across India, planned privately by India Uncharted.`,
    image: c.hero,
  });
}

export default async function ExperienceThemePage({ params }: Props) {
  const { slug } = await params;
  const [c, themes] = await Promise.all([getCategoryPage("EXPERIENCE_THEME", slug), listCategories("EXPERIENCE_THEME")]);
  if (!c) notFound();

  return (
    <>
      <ListingHeader
        title={c.seo.h1Override || `${c.name} in India`}
        lead={c.intro}
        crumbs={[
          { label: "Experiences", href: routes.experiences() },
          { label: c.name, href: routes.experienceTheme(c.slug) },
        ]}
        count={[c.experiences.length ? `${c.experiences.length} experiences` : null, c.journeys.length ? `${c.journeys.length} journeys` : null].filter(Boolean).join(" · ")}
        links={[
          { label: "All experiences", href: routes.experiences() },
          ...themes.map((t) => ({ label: t.name, href: routes.experienceTheme(t.slug), active: t.slug === c.slug })),
        ]}
      />

      {c.body ? (
        <Section tone="paper" className="pt-0">
          <RichText doc={c.body} />
        </Section>
      ) : null}

      {c.experiences.length ? (
        <Section tone="paper" className={c.body ? undefined : "pt-0"}>
          <div className="grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
            {c.experiences.map((e) => (
              <ExperienceCard key={e.slug} experience={e} sizes="(max-width: 640px) 92vw, (max-width: 1024px) 45vw, 30vw" />
            ))}
          </div>
        </Section>
      ) : null}

      {c.journeys.length ? (
        <Section tone="paper-2" labelledBy="journeys">
          <SectionHead id="journeys" title={`Journeys built around ${c.name.toLowerCase()}`} action={{ label: "All journeys", href: routes.journeys() }} />
          <div className="mt-10 grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
            {c.journeys.slice(0, 6).map((j) => (
              <JourneyCard key={j.slug} journey={j} sizes="(max-width: 640px) 92vw, (max-width: 1024px) 45vw, 30vw" ratio="landscape" />
            ))}
          </div>
        </Section>
      ) : null}

      {c.faqs.length ? (
        <Section tone="paper">
          <FaqBlock faqs={c.faqs} heading={`${c.name}: common questions`} />
        </Section>
      ) : null}
    </>
  );
}
