import { Suspense } from "react";
import { getSeoSettings } from "@/lib/content/settings";
import { SITE_INDEXABLE } from "@/lib/site";
import { hasTrackers } from "@/lib/analytics";
import { ConsentManager } from "@/components/site/consent-manager";
import { getNavigation } from "@/lib/content/nav";
import { formatPhone, telHref } from "@/lib/phone";
import { SiteHeader } from "@/components/site/site-header";
import { HeaderFallback } from "@/components/site/header-fallback";
import { SiteFooter } from "@/components/site/site-footer";
import { OrganizationJsonLd } from "@/components/seo/organization";
import { SiteHead } from "@/components/seo/site-head";
import { PreviewBar } from "@/components/site/preview-bar";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [nav, seo] = await Promise.all([getNavigation(), getSeoSettings()]);
  const { settings } = nav;
  const { analytics } = seo;
  // Only on the live site: previews and the owner's own testing would pollute the numbers.
  const analyticsLive = SITE_INDEXABLE && hasTrackers(analytics);
  return (
    <>
      <SiteHead />
      {/* The interactive header needs the current path, which only exists at request
          time; the shell ships a working static header until it arrives. */}
      <Suspense fallback={<HeaderFallback items={nav.header} cta={settings.defaultCta} />}>
        <SiteHeader
          items={nav.header}
          cta={settings.defaultCta}
          phone={settings.phoneE164 ? { href: telHref(settings.phoneE164), display: formatPhone(settings.phoneE164) } : null}
        />
      </Suspense>
      <main id="main" tabIndex={-1} className="outline-none">
        {children}
      </main>
      <SiteFooter nav={nav} cookieSettings={analyticsLive && analytics.consentRequired} />
      {analyticsLive ? (
        // usePathname inside needs the request, so it streams in after the static shell.
        <Suspense fallback={null}>
          <ConsentManager config={analytics} cookiePolicyHref={nav.legal.find((l) => l.key === "cookie-policy")?.href ?? null} />
        </Suspense>
      ) : null}
      <PreviewBar path="/" />
      <OrganizationJsonLd settings={settings} />
    </>
  );
}
