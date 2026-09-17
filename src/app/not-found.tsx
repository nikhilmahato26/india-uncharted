import { Suspense } from "react";
import { headers } from "next/headers";
import { logNotFound } from "@/lib/not-found-log";
import { getHomeData } from "@/lib/content/home";
import { getNavigation } from "@/lib/content/nav";
import { routes } from "@/lib/site";
import { formatPhone, telHref } from "@/lib/phone";
import { SiteHeader } from "@/components/site/site-header";
import { HeaderFallback } from "@/components/site/header-fallback";
import { SiteFooter } from "@/components/site/site-footer";
import { Section } from "@/components/site/primitives";
import { DestinationCard, JourneyCard } from "@/components/site/cards";
import { Input } from "@/components/ui/field";
import { Button, LinkButton } from "@/components/ui/button";
import { RidgeRule } from "@/components/brand/marks";

export const metadata = { title: "Page not found | India Uncharted", robots: { index: false, follow: true } };

/** A 404 that still offers the way onward: search, popular places, journeys. */
/**
 * Logging needs the request, which would stop this page being prerendered —
 * so it sits in its own boundary and renders nothing.
 */
async function MissLogger() {
  const h = await headers();
  const requested = h.get("x-pathname");
  if (requested) await logNotFound(requested, h.get("referer"));
  return null;
}

export default async function NotFound() {
  const [nav, data] = await Promise.all([getNavigation(), getHomeData()]);
  const { settings } = nav;

  return (
    <>
      <Suspense fallback={<HeaderFallback items={nav.header} cta={settings.defaultCta} />}>
        <SiteHeader
          items={nav.header}
          cta={settings.defaultCta}
          phone={settings.phoneE164 ? { href: telHref(settings.phoneE164), display: formatPhone(settings.phoneE164) } : null}
        />
      </Suspense>
      <Suspense fallback={null}>
        <MissLogger />
      </Suspense>
      <main id="main">
        <Section tone="paper" className="pt-[8rem] lg:pt-40">
          <p className="text-label uppercase text-terracotta-700">404</p>
          <h1 className="mt-4 max-w-3xl text-display-lg text-ink">This page has wandered off the route.</h1>
          <p className="measure mt-5 text-lead text-ink-2">
            The page you asked for isn’t here any more. Search for a place or a journey, or start from one of these.
          </p>
          <form action={routes.search()} method="get" role="search" className="mt-8 flex max-w-lg gap-3">
            <label htmlFor="q" className="sr-only">
              Search India Uncharted
            </label>
            <Input id="q" name="q" type="search" placeholder="Jaisalmer, yoga retreat, motorcycle…" />
            <Button type="submit">Search</Button>
          </form>
          <div className="mt-6 flex flex-wrap gap-3">
            <LinkButton href={routes.destinations()} variant="secondary">
              All destinations
            </LinkButton>
            <LinkButton href={routes.journeys()} variant="secondary">
              All journeys
            </LinkButton>
            <LinkButton href={routes.planMyJourney()}>Plan My Journey</LinkButton>
          </div>
          <RidgeRule className="mt-14" />
        </Section>

        {data.discover.length ? (
          <Section tone="paper" className="pt-0">
            <h2 className="font-display text-title text-ink">Popular destinations</h2>
            <div className="mt-8 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {data.discover.slice(0, 4).map((d) => (
                <DestinationCard key={d.slug} destination={d} sizes="(max-width: 640px) 92vw, (max-width: 1024px) 45vw, 23vw" ratio="landscape" band="paper" clampTitle />
              ))}
            </div>
          </Section>
        ) : null}

        {data.featuredJourneys.length ? (
          <Section tone="paper-2">
            <h2 className="font-display text-title text-ink">Journeys travellers ask for</h2>
            <div className="mt-8 grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
              {data.featuredJourneys.slice(0, 3).map((j) => (
                <JourneyCard key={j.slug} journey={j} sizes="(max-width: 640px) 92vw, (max-width: 1024px) 45vw, 30vw" ratio="landscape" />
              ))}
            </div>
          </Section>
        ) : null}
      </main>
      <SiteFooter nav={nav} />
    </>
  );
}
