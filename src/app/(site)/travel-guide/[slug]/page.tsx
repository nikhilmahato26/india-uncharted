import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getArticlePage } from "@/lib/content/editorial";
import { resolveMetadata } from "@/lib/seo/metadata";
import { absoluteUrl, routes } from "@/lib/site";
import { JsonLd } from "@/components/seo/json-ld";
import { Breadcrumbs } from "@/components/ui/breadcrumbs";
import { MediaFrame } from "@/components/ui/media-frame";
import { Section, SectionHead } from "@/components/site/primitives";
import { ArticleCard, DestinationCard, JourneyCard } from "@/components/site/cards";
import { RichText } from "@/components/richtext/render";
import { FaqBlock } from "@/components/site/faq-block";
import { EnquiryDialog } from "@/components/enquiry/enquiry-dialog";
import { RidgeRule } from "@/components/brand/marks";

import { db } from "@/lib/db";

type Props = { params: Promise<{ slug: string }> };

/** Known pages are prerendered at build; anything new is rendered on first visit and then cached. */
export async function generateStaticParams() {
  const rows = await db.article.findMany({ where: { status: "PUBLISHED" }, select: { slug: true } });
  return rows.map((r) => ({ slug: r.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const a = await getArticlePage(slug);
  if (!a) return {};
  return resolveMetadata({
    kind: "ARTICLE",
    name: a.title,
    path: routes.article(a.slug),
    seo: a.seo,
    description: a.excerpt,
    image: a.hero,
    article: { publishedAt: a.publishedAt, updatedAt: a.updatedAt, author: a.author?.name, section: a.category?.name },
  });
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;
  const a = await getArticlePage(slug);
  if (!a) notFound();

  const published = a.publishedAt ? new Date(a.publishedAt) : null;
  const updated = a.updatedAt ? new Date(a.updatedAt) : null;
  const fmt = (d: Date) => d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

  return (
    <>
      <article>
        <header className="bg-paper pt-[6.5rem] lg:pt-32">
          <div className="container-folio">
            <Breadcrumbs
              items={[
                { label: "Travel Guide", href: routes.travelGuide() },
                { label: a.title, href: routes.article(a.slug) },
              ]}
            />
            <div className="mt-6 max-w-3xl">
              <p className="text-label uppercase text-terracotta-700">
                {[a.kind === "GUIDE" ? "Guide" : a.category?.name, a.readingMinutes ? `${a.readingMinutes} min read` : null].filter(Boolean).join(" · ")}
              </p>
              <h1 className="mt-3 text-display-lg text-ink">{a.seo.h1Override || a.title}</h1>
              {a.excerpt ? <p className="measure mt-5 text-lead text-ink-2">{a.excerpt}</p> : null}
              <p className="mt-5 text-caption text-ink-3">
                {a.author ? <span>By {a.author.name}</span> : null}
                {published ? (
                  <>
                    {a.author ? " · " : ""}
                    <time dateTime={a.publishedAt ?? undefined}>{fmt(published)}</time>
                  </>
                ) : null}
                {updated && published && updated.getTime() - published.getTime() > 86_400_000 ? (
                  <>
                    {" · Updated "}
                    <time dateTime={a.updatedAt ?? undefined}>{fmt(updated)}</time>
                  </>
                ) : null}
              </p>
            </div>
          </div>
          {a.hero ? (
            <div className="mt-10 p-(--spacing-band)">
              <div className="folio pearl-band">
                <MediaFrame media={a.hero} ratio="wide" sizes="100vw" priority label={a.title} />
              </div>
            </div>
          ) : null}
        </header>

        <Section tone="paper" className="pt-12 lg:pt-16">
          <div className="grid gap-12 lg:grid-cols-12">
            {a.toc.length > 2 ? (
              <nav aria-label="On this page" className="lg:col-span-3 lg:sticky lg:top-28 lg:self-start">
                <h2 className="text-label uppercase text-ink-3">On this page</h2>
                <ul className="mt-4 space-y-1 border-l border-rule">
                  {a.toc.map((h) => (
                    <li key={h.id}>
                      <a
                        href={`#${h.id}`}
                        className={`-ml-px flex min-h-9 items-center border-l pl-4 text-small text-ink-2 hover:border-terracotta-600 hover:text-terracotta-700 ${
                          h.level > 2 ? "border-transparent pl-7" : "border-transparent"
                        }`}
                      >
                        {h.text}
                      </a>
                    </li>
                  ))}
                </ul>
              </nav>
            ) : null}

            <div className={a.toc.length > 2 ? "lg:col-span-8 lg:col-start-5" : "lg:col-span-8"}>
              <RichText doc={a.body} />

              {a.tags.length ? (
                <ul className="mt-12 flex flex-wrap gap-2">
                  {a.tags.map((t) => (
                    <li key={t.slug} className="border border-ink/20 px-3 py-1.5 text-caption text-ink-2">
                      {t.name}
                    </li>
                  ))}
                </ul>
              ) : null}

              <RidgeRule className="mt-14" />

              <div className="mt-10 border border-rule bg-paper-2 p-6">
                <h2 className="font-display text-title text-ink">Planning this trip?</h2>
                <p className="measure mt-2 text-body text-ink-2">
                  We design private journeys around the places in this guide — tell us your dates and we’ll send a first outline.
                </p>
                <EnquiryDialog
                  label="Plan My Journey"
                  className="mt-5"
                  context={{ entityType: "ARTICLE", entityId: a.id, entityName: a.title }}
                  title="Plan your journey"
                />
              </div>
            </div>
          </div>
        </Section>

        {a.faqs.length ? (
          <Section tone="paper-2">
            <FaqBlock faqs={a.faqs} />
          </Section>
        ) : null}
      </article>

      {a.journeys.length ? (
        <Section tone="paper" labelledBy="journeys">
          <SectionHead id="journeys" title="Journeys from this guide" action={{ label: "All journeys", href: routes.journeys() }} />
          <div className="mt-10 grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
            {a.journeys.slice(0, 3).map((j) => (
              <JourneyCard key={j.slug} journey={j} sizes="(max-width: 640px) 92vw, (max-width: 1024px) 45vw, 30vw" ratio="landscape" />
            ))}
          </div>
        </Section>
      ) : null}

      {a.destinations.length ? (
        <Section tone="paper-2" labelledBy="places">
          <SectionHead id="places" title="Places in this guide" action={{ label: "All destinations", href: routes.destinations() }} />
          <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {a.destinations.map((d) => (
              <DestinationCard key={d.slug} destination={d} sizes="(max-width: 640px) 92vw, (max-width: 1024px) 45vw, 23vw" ratio="landscape" band="paper" clampTitle />
            ))}
          </div>
        </Section>
      ) : null}

      {a.more.length ? (
        <Section tone="paper" labelledBy="more">
          <SectionHead id="more" title="Keep reading" action={{ label: "Travel guide", href: routes.travelGuide() }} />
          <div className="mt-10 grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
            {a.more.map((m) => (
              <ArticleCard key={m.slug} article={m} sizes="(max-width: 640px) 92vw, (max-width: 1024px) 45vw, 30vw" />
            ))}
          </div>
        </Section>
      ) : null}

      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": a.kind === "GUIDE" ? "Article" : "BlogPosting",
          headline: a.title,
          description: a.excerpt ?? undefined,
          url: absoluteUrl(routes.article(a.slug)),
          ...(a.hero ? { image: absoluteUrl(a.hero.src) } : {}),
          datePublished: a.publishedAt ?? undefined,
          dateModified: a.updatedAt ?? a.publishedAt ?? undefined,
          author: { "@type": "Organization", name: a.author?.name ?? "India Uncharted", url: absoluteUrl("/") },
          publisher: { "@id": `${absoluteUrl("/")}#organization` },
          mainEntityOfPage: absoluteUrl(routes.article(a.slug)),
          ...(a.category ? { articleSection: a.category.name } : {}),
        }}
      />
    </>
  );
}
