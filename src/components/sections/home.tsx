import Link from "next/link";
import type { ReactNode } from "react";
import type { HomeData } from "@/lib/content/home";
import type { MediaSource } from "@/lib/content/media";
import type { SiteSettingsView } from "@/lib/content/settings";
import { parseSectionProps, type SectionProps, type SectionTypeKey } from "@/lib/sections/schemas";
import { cn } from "@/lib/cn";
import { pickDestinations } from "@/lib/content/home";
import { wholeRows } from "@/lib/rows";
import { routes } from "@/lib/site";
import { formatPhone, telHref } from "@/lib/phone";
import { MediaFrame } from "@/components/ui/media-frame";
import { LinkButton, ArrowLink } from "@/components/ui/button";
import { RidgeRule, SunMark } from "@/components/brand/marks";
import { Inscription, Plate, RouteLine, Section, SectionHead } from "@/components/site/primitives";
import { ArticleCard, DestinationCard, ExperienceCard, JourneyCard } from "@/components/site/cards";
import { RegionCarousel } from "@/components/site/region-carousel";
import { DestinationPlot } from "@/components/site/destination-plot";
import { ParallaxPlate } from "@/components/motion/parallax-plate";
import { HeroFolio } from "@/components/home/hero-folio";

export type HomeContext = { data: HomeData; media: Map<string, MediaSource>; settings: SiteSettingsView };

/**
 * Renders one homepage section from its CMS record. A section whose content is
 * thinner than its `minItems` returns null — the page closes the gap rather
 * than filling it with something that isn't true yet.
 */
export function HomeSection({ type, props: raw, ctx }: { type: string; props: unknown; ctx: HomeContext }) {
  const props = parseSectionProps(type as SectionTypeKey, raw);
  if (!props) return null;
  const { data, media, settings } = ctx;
  const img = (id?: string) => (id ? media.get(id) ?? null : null);

  switch (type) {
    case "HERO": {
      const p = props as SectionProps<"HERO">;
      return (
        <HeroFolio
          media={img(p.mediaId)}
          title={{ lead: p.titleLead, accent: p.titleAccent }}
          lead={p.lead ?? ""}
          inscription={p.inscription ?? "Private journeys · India"}
          caption={p.caption ?? null}
          primary={{ label: p.primaryLabel, href: p.primaryHref }}
          secondary={{ label: p.secondaryLabel, href: p.secondaryHref }}
        />
      );
    }

    case "IMAGE_TEXT": {
      const p = props as SectionProps<"IMAGE_TEXT">;
      if (p.variant === "plate") {
        const plate = img(p.mediaId);
        return (
          <section className="on-dark relative bg-paper p-(--spacing-band)" data-surface="dark">
            <div className="folio pearl-band [--band:var(--color-forest-800)]">
              <div className="relative h-[70svh] max-h-[46rem] min-h-[26rem] overflow-hidden bg-ink">
                <ParallaxPlate className="absolute inset-0 overflow-hidden" amount={12}>
                  <MediaFrame media={plate} ratio="fill" sizes="100vw" label={p.heading} />
                </ParallaxPlate>
                <div
                  aria-hidden="true"
                  className="absolute inset-0 bg-[linear-gradient(to_top,rgb(18_14_10/0.92)_0%,rgb(18_14_10/0.6)_38%,rgb(18_14_10/0.12)_72%)]"
                />
                <div className="absolute inset-x-0 bottom-0">
                  <div className="container-folio pb-10">
                    <div className="max-w-xl">
                      {p.heading ? <h2 className="text-display-md text-paper">{p.heading}</h2> : null}
                      {p.body ? <p className="measure mt-4 text-lead text-paper/85">{p.body}</p> : null}
                      {p.ctaLabel && p.ctaHref ? (
                        <LinkButton href={p.ctaHref} variant="on-dark" className="mt-7">
                          {p.ctaLabel}
                        </LinkButton>
                      ) : null}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>
        );
      }
      if (p.variant === "split") {
        const plate = img(p.mediaId);
        return (
          <Section tone={p.tone ?? "paper-2"}>
            <div className={cn("grid items-center gap-10 lg:grid-cols-2 lg:gap-16", p.imageSide === "left" && "lg:[&>*:first-child]:order-2")}>
              <div>
                {p.heading ? <h2 className="text-display-md text-ink">{p.heading}</h2> : null}
                {p.body ? <p className="measure mt-5 text-lead text-ink-2">{p.body}</p> : null}
                {p.pillars?.length ? (
                  <dl className="mt-8 space-y-6">
                    {p.pillars.map((pillar) => (
                      <div key={pillar.title} className="border-t border-rule pt-4">
                        <dt className="font-display text-subtitle text-ink">{pillar.title}</dt>
                        <dd className="measure mt-1.5 text-small text-ink-2">{pillar.body}</dd>
                      </div>
                    ))}
                  </dl>
                ) : null}
                {p.ctaLabel && p.ctaHref ? <ArrowLink href={p.ctaHref} className="mt-8">{p.ctaLabel}</ArrowLink> : null}
              </div>
              <Plate media={plate} ratio="portrait" sizes="(max-width: 1024px) 92vw, 44vw" band="terracotta" label={p.heading} />
            </div>
          </Section>
        );
      }
      // editorial: two columns of type, the brand statement
      return (
        <Section tone={p.tone ?? "paper"}>
          <div className="grid gap-10 lg:grid-cols-12 lg:gap-16">
            <div className="lg:col-span-6">
              {p.heading ? <h2 className="text-display-lg text-ink">{p.heading}</h2> : null}
            </div>
            <div className="lg:col-span-5 lg:col-start-8">
              <SunMark className="size-9 text-terracotta-600" />
              {p.body ? <p className="measure mt-5 text-lead text-ink-2">{p.body}</p> : null}
              {p.ctaLabel && p.ctaHref ? <ArrowLink href={p.ctaHref} className="mt-6">{p.ctaLabel}</ArrowLink> : null}
            </div>
          </div>
        </Section>
      );
    }

    case "DESTINATION_GRID": {
      const p = props as SectionProps<"DESTINATION_GRID">;
      // "manual" is what the homepage editor saves: the owner's own places, in their order.
      const pool =
        p.source === "offbeat"
          ? data.offbeat
          : p.source === "manual" && p.slugs?.length
            ? pickDestinations(data.destinationsBySlug, p.slugs)
            : data.discover;
      const items = pool.slice(0, p.limit);
      if (items.length < p.minItems) return null;

      if (p.variant === "index") {
        // The offbeat index: places carried by type, not by stock photography.
        return (
          <Section tone="forest" labelledBy="beyond-obvious">
            <SectionHead id="beyond-obvious" title={p.heading ?? "Off the usual route"} lead={p.lead} tone="paper" action={p.ctaLabel && p.ctaHref ? { label: p.ctaLabel, href: p.ctaHref } : undefined} />
            <ul className="mt-12 grid gap-px border border-paper/15 bg-paper/15 sm:grid-cols-2 lg:grid-cols-3">
              {items.map((d) => (
                <li key={d.slug} className="bg-forest-900">
                  <Link href={d.href} className="group/idx flex h-full flex-col justify-between gap-6 p-6 transition-colors hover:bg-forest-800 lg:p-8">
                    <div>
                      <h3 className="font-display text-title text-paper group-hover/idx:text-gold-200">{d.name}</h3>
                      <Inscription tone="paper" className="mt-1.5">
                        {[d.state, d.coords ? `${d.coords.lat.toFixed(2)}°N ${d.coords.lng.toFixed(2)}°E` : null].filter(Boolean).join(" · ")}
                      </Inscription>
                    </div>
                    <p className="text-caption text-gold-300">
                      {d.journeyCount === 1 ? "1 journey passes through" : `${d.journeyCount} journeys pass through`}
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          </Section>
        );
      }

      // editorial: one tall plate leading a run of four
      const [lead, ...rest] = items;
      return (
        <Section tone={p.tone ?? "paper"} labelledBy="discover-india">
          <SectionHead id="discover-india" title={p.heading ?? "Discover India"} lead={p.lead} action={p.ctaLabel && p.ctaHref ? { label: p.ctaLabel, href: p.ctaHref } : undefined} />
          <div className="mt-12 grid items-start gap-8 sm:grid-cols-2 lg:grid-cols-12 lg:gap-10">
            {lead ? (
              <DestinationCard
                destination={lead}
                ratio="tall"
                sizes="(max-width: 640px) 92vw, (max-width: 1024px) 46vw, 46vw"
                className="sm:col-span-2 lg:col-span-6 lg:row-span-2"
                priority
              />
            ) : null}
            {rest.slice(0, 4).map((d) => (
              <DestinationCard
                key={d.slug}
                destination={d}
                ratio="landscape"
                sizes="(max-width: 640px) 92vw, (max-width: 1024px) 46vw, 28vw"
                band="paper"
                className="lg:col-span-3"
                clampTitle
              />
            ))}
          </div>
        </Section>
      );
    }

    case "REGION_CAROUSEL": {
      const p = props as SectionProps<"REGION_CAROUSEL">;
      if (data.regions.length < p.minItems) return null;
      return (
        <Section tone={p.tone ?? "paper-2"} labelledBy="regions">
          <SectionHead id="regions" title={p.heading ?? "Explore India by region"} lead={p.lead} action={{ label: "All regions", href: routes.regions() }} />
          <div className="mt-12">
            <RegionCarousel
              items={data.regions.map((r) => ({
                slug: r.slug,
                name: r.name,
                tagline: r.tagline,
                destinationCount: r.destinations.length,
                journeyCount: r.journeyCount,
                image: r.hero ? { src: r.hero.src, alt: r.hero.alt, blurDataUrl: r.hero.blurDataUrl } : null,
              }))}
            />
          </div>
        </Section>
      );
    }

    case "JOURNEY_GRID": {
      const p = props as SectionProps<"JOURNEY_GRID">;
      const items = (p.source === "bike" ? data.bikeTours : data.featuredJourneys).slice(0, p.limit);
      if (items.length < p.minItems) return null;

      if (p.variant === "cinematic") {
        const plate = img(p.mediaId) ?? items.find((j) => j.hero)?.hero ?? null;
        return (
          <section className="on-dark relative bg-ink text-paper" data-surface="dark" aria-labelledby="ride-india">
            <div className="relative">
              <div className="p-(--spacing-band) pb-0">
                <div className="folio pearl-band [--band:var(--color-forest-800)]">
                  <div className="relative h-[42svh] max-h-[30rem] min-h-[16rem] overflow-hidden bg-ink">
                    <ParallaxPlate className="absolute inset-0 overflow-hidden" amount={14}>
                      <MediaFrame media={plate} ratio="fill" sizes="100vw" scrim="top-bottom" label={p.heading} />
                    </ParallaxPlate>
                  </div>
                </div>
              </div>
              <div className="container-folio pt-14 pb-(--spacing-section)">
                <div className="max-w-2xl">
                  <h2 id="ride-india" className="text-display-lg text-paper">
                    {p.heading ?? "Ride India. Feel every mile."}
                  </h2>
                  {p.lead ? <p className="measure mt-4 text-lead text-paper/80">{p.lead}</p> : null}
                </div>
                <ul className="mt-12 divide-y divide-paper/15 border-y border-paper/15">
                  {items.map((j) => (
                    <li key={j.slug}>
                      <Link href={j.href} className="group/ride flex flex-col gap-2 py-6 transition-colors hover:text-gold-200 sm:flex-row sm:items-center sm:justify-between sm:gap-10">
                        <div className="min-w-0">
                          <h3 className="font-display text-title text-paper transition-colors group-hover/ride:text-gold-200">{j.name}</h3>
                          <RouteLine stops={j.route} tone="paper" max={6} className="mt-2" />
                        </div>
                        <span className="shrink-0 text-small text-paper/75">{j.durationText}</span>
                      </Link>
                    </li>
                  ))}
                </ul>
                {p.ctaLabel && p.ctaHref ? (
                  <LinkButton href={p.ctaHref} variant="on-dark" className="mt-10">
                    {p.ctaLabel}
                  </LinkButton>
                ) : null}
              </div>
            </div>
          </section>
        );
      }

      return (
        <Section tone={p.tone ?? "paper"} labelledBy="featured-journeys">
          <SectionHead id="featured-journeys" title={p.heading ?? "Featured journeys"} lead={p.lead} action={p.ctaLabel && p.ctaHref ? { label: p.ctaLabel, href: p.ctaHref } : undefined} />
          <div className="mt-12 grid gap-10 sm:grid-cols-2">
            {items.map((j) => (
              <JourneyCard key={j.slug} journey={j} sizes="(max-width: 640px) 92vw, 45vw" />
            ))}
          </div>
        </Section>
      );
    }

    case "CARD_GRID": {
      const p = props as SectionProps<"CARD_GRID">;
      const styles = data.styles;
      if (styles.length < p.minItems) return null;
      const featured = styles.find((s) => s.slug === (p.featuredSlug ?? "motorcycle"));
      const rest = styles.filter((s) => s !== featured);
      return (
        <Section tone={p.tone ?? "paper"} labelledBy="travel-your-way">
          <SectionHead id="travel-your-way" title={p.heading ?? "Travel your way"} lead={p.lead} />
          <div className="mt-12 grid gap-px border border-rule bg-rule sm:grid-cols-2 lg:grid-cols-3">
            {featured ? (
              <Link href={routes.travelStyle(featured.slug)} className="group/style relative overflow-hidden bg-forest-900 sm:col-span-2 sm:row-span-2">
                <MediaFrame media={featured.hero} ratio="fill" sizes="(max-width: 640px) 92vw, 60vw" label={featured.name} imageClassName="transition-transform duration-(--duration-slow) ease-(--ease-out-expo) group-hover/style:scale-[1.04]" />
                <div aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(to_top,rgb(18_14_10/0.88)_0%,rgb(18_14_10/0.45)_45%,rgb(18_14_10/0.1)_100%)]" />
                <div className="relative flex min-h-64 flex-col justify-end p-6 lg:min-h-80 lg:p-8">
                  <h3 className="font-display text-title text-paper">{featured.name}</h3>
                  <p className="mt-1 text-caption text-paper/80">
                    {featured.journeyCount} {featured.journeyCount === 1 ? "journey" : "journeys"}
                  </p>
                </div>
              </Link>
            ) : null}
            {rest.map((s) => (
              <Link key={s.slug} href={routes.travelStyle(s.slug)} className="group/style flex min-h-32 flex-col justify-between bg-paper p-5 transition-colors hover:bg-paper-2 lg:p-6">
                <h3 className="font-display text-subtitle text-ink group-hover/style:text-terracotta-700">{s.name}</h3>
                <p className="mt-6 text-caption text-ink-3">
                  {s.journeyCount + s.experienceCount} {s.journeyCount + s.experienceCount === 1 ? "journey" : "journeys"}
                </p>
              </Link>
            ))}
          </div>
        </Section>
      );
    }

    case "INDIA_MAP": {
      const p = props as SectionProps<"INDIA_MAP">;
      const all = [...data.discover, ...data.offbeat, ...data.regions.flatMap((r) => r.destinations)];
      const unique = [...new Map(all.map((d) => [d.slug, d])).values()];
      return (
        <Section tone="forest" labelledBy="where-we-travel">
          <div className="grid gap-12 lg:grid-cols-12 lg:gap-16">
            <div className="lg:col-span-4">
              <SectionHead id="where-we-travel" title={p.heading ?? "Where we travel"} lead={p.lead} tone="paper" />
              <RidgeRule tone="paper" className="mt-8 max-w-48" />
              {p.ctaLabel && p.ctaHref ? (
                <LinkButton href={p.ctaHref} variant="on-dark" className="mt-8">
                  {p.ctaLabel}
                </LinkButton>
              ) : null}
            </div>
            <div className="lg:col-span-8">
              <DestinationPlot destinations={unique} />
            </div>
          </div>
        </Section>
      );
    }

    case "EXPERIENCE_GRID": {
      const p = props as SectionProps<"EXPERIENCE_GRID">;
      if (p.source === "themes") {
        const items = wholeRows(data.themes.slice(0, p.limit), 4);
        if (items.length < p.minItems) return null;
        return (
          <Section tone={p.tone ?? "paper-2"} labelledBy="experiences">
            <SectionHead id="experiences" title={p.heading ?? "Experiences"} lead={p.lead} action={{ label: "All experiences", href: routes.experiences() }} />
            <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {items.map((t) => (
                <Link key={t.slug} href={routes.experienceTheme(t.slug)} className="group/card block">
                  <Plate media={t.hero} ratio="themeCard" sizes="(max-width: 640px) 92vw, (max-width: 1024px) 45vw, 23vw" band="paper" label={t.name} className="group-hover/card:after:inset-[calc(var(--spacing-band)-1px)]" imageClassName="transition-transform duration-(--duration-slow) ease-(--ease-out-expo) group-hover/card:scale-[1.035]" />
                  <h3 className="mt-3.5 font-display text-subtitle text-ink group-hover/card:text-terracotta-700">{t.name}</h3>
                  <Inscription className="mt-1">
                    {t.experienceCount + t.journeyCount} {t.experienceCount + t.journeyCount === 1 ? "experience" : "experiences"}
                  </Inscription>
                </Link>
              ))}
            </div>
          </Section>
        );
      }
      const items = wholeRows(data.experiences.slice(0, p.limit), 4);
      if (items.length < p.minItems) return null;
      return (
        <Section tone={p.tone ?? "paper"} labelledBy="experiences">
          <SectionHead id="experiences" title={p.heading ?? "Experiences"} lead={p.lead} action={{ label: "All experiences", href: routes.experiences() }} />
          <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {items.map((e) => (
              <ExperienceCard key={e.slug} experience={e} sizes="(max-width: 640px) 92vw, (max-width: 1024px) 45vw, 23vw" />
            ))}
          </div>
        </Section>
      );
    }

    case "ARTICLE_GRID": {
      const p = props as SectionProps<"ARTICLE_GRID">;
      const items = wholeRows(data.articles.slice(0, p.limit), 3);
      if (items.length < p.minItems) return null;
      return (
        <Section tone={p.tone ?? "paper"} labelledBy="journal">
          <SectionHead id="journal" title={p.heading ?? "Travel journal"} lead={p.lead} action={{ label: "All stories", href: routes.travelGuide() }} />
          <div className="mt-12 grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((a) => (
              <ArticleCard key={a.slug} article={a} sizes="(max-width: 640px) 92vw, (max-width: 1024px) 45vw, 30vw" />
            ))}
          </div>
        </Section>
      );
    }

    case "TESTIMONIALS": {
      const p = props as SectionProps<"TESTIMONIALS">;
      // Only verified guest stories reach the page; below the threshold the section hides.
      if (data.testimonials.length < p.minItems) return null;
      return (
        <Section tone={p.tone ?? "paper-2"} labelledBy="guest-stories">
          <SectionHead id="guest-stories" title={p.heading ?? "Guest stories"} lead={p.lead} />
          <ul className="mt-12 grid gap-10 md:grid-cols-3">
            {data.testimonials.slice(0, 3).map((t) => (
              <li key={t.id} className="border-t border-rule pt-6">
                <blockquote className="font-display text-subtitle text-ink">
                  {t.headline ? <p className="mb-3">{t.headline}</p> : null}
                  <p className="font-sans text-body text-ink-2">{t.body}</p>
                </blockquote>
                <p className="mt-4 text-caption text-ink-3">
                  {t.authorName}
                  {t.location ? ` · ${t.location}` : ""}
                </p>
              </li>
            ))}
          </ul>
        </Section>
      );
    }

    case "CTA": {
      const p = props as SectionProps<"CTA">;
      const plate = img(p.mediaId);
      return (
        <section className="on-dark relative bg-paper p-(--spacing-band)" data-surface="dark" aria-labelledby="plan-cta">
          <div className="folio pearl-band [--band:var(--color-terracotta-600)]">
            <div className="relative min-h-[26rem] overflow-hidden bg-ink">
              <MediaFrame media={plate} ratio="fill" sizes="100vw" label={p.heading} />
              <div aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(to_right,rgb(18_14_10/0.88)_0%,rgb(18_14_10/0.72)_42%,rgb(18_14_10/0.35)_100%)]" />
              <div className="relative container-folio flex min-h-[26rem] flex-col items-start justify-center py-16 text-left">
                <h2 id="plan-cta" className="max-w-3xl text-display-lg text-paper">
                  {p.heading ?? "Where will your India story begin?"}
                </h2>
                {p.lead ? <p className="measure mt-5 text-lead text-paper/85">{p.lead}</p> : null}
                <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                  <LinkButton href={p.ctaHref ?? routes.planMyJourney()} variant="on-dark-solid" size="lg">
                    {p.ctaLabel ?? "Plan My Journey"}
                  </LinkButton>
                  {settings.phoneE164 ? (
                    <a href={telHref(settings.phoneE164)} className="inline-flex min-h-14 items-center justify-center border border-paper/50 px-8 text-body font-semibold text-paper hover:bg-paper/10">
                      Call {formatPhone(settings.phoneE164)}
                    </a>
                  ) : p.secondaryLabel && p.secondaryHref ? (
                    <LinkButton href={p.secondaryHref} variant="on-dark" size="lg">
                      {p.secondaryLabel}
                    </LinkButton>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </section>
      );
    }

    case "NEWSLETTER": {
      // Hidden until the client confirms a provider and double opt-in.
      if (!settings.newsletterEnabled) return null;
      const p = props as SectionProps<"NEWSLETTER">;
      return (
        <Section tone="forest" labelledBy="newsletter">
          <div className="grid gap-8 lg:grid-cols-2 lg:items-center">
            <SectionHead id="newsletter" title={p.heading ?? "Stories from India, occasionally"} lead={p.lead} tone="paper" />
          </div>
        </Section>
      );
    }

    default:
      return null;
  }
}

export function SectionList({ sections, ctx }: { sections: { id: string; type: string; props: Record<string, unknown> }[]; ctx: HomeContext }): ReactNode {
  return sections.map((s) => <HomeSection key={s.id} type={s.type} props={s.props} ctx={ctx} />);
}
