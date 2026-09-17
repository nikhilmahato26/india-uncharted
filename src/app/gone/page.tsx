import { getNavigation } from "@/lib/content/nav";
import { routes } from "@/lib/site";
import { formatPhone, telHref } from "@/lib/phone";
import { Suspense } from "react";
import { SiteHeader } from "@/components/site/site-header";
import { HeaderFallback } from "@/components/site/header-fallback";
import { SiteFooter } from "@/components/site/site-footer";
import { Section } from "@/components/site/primitives";
import { LinkButton } from "@/components/ui/button";

export const metadata = { title: "Page removed | India Uncharted", robots: { index: false, follow: true } };

/** Rendered with a 410 by proxy.ts for URLs the client has retired for good. */
export default async function GonePage() {
  const nav = await getNavigation();
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
      <main id="main">
        <Section tone="paper" className="pt-[8rem] lg:pt-40">
          <h1 className="max-w-3xl text-display-lg text-ink">This page has been retired.</h1>
          <p className="measure mt-5 text-lead text-ink-2">It isn’t coming back, but the journeys and destinations it covered are still here.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <LinkButton href={routes.destinations()} variant="secondary">
              All destinations
            </LinkButton>
            <LinkButton href={routes.journeys()} variant="secondary">
              All journeys
            </LinkButton>
            <LinkButton href={routes.planMyJourney()}>Plan My Journey</LinkButton>
          </div>
        </Section>
      </main>
      <SiteFooter nav={nav} />
    </>
  );
}
