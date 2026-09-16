import { Suspense } from "react";
import { getNavigation } from "@/lib/content/nav";
import { formatPhone, telHref } from "@/lib/phone";
import { SiteHeader } from "@/components/site/site-header";
import { HeaderFallback } from "@/components/site/header-fallback";
import { SiteFooter } from "@/components/site/site-footer";
import { OrganizationJsonLd } from "@/components/seo/organization";
import { SiteHead } from "@/components/seo/site-head";
import { PreviewBar } from "@/components/site/preview-bar";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const nav = await getNavigation();
  const { settings } = nav;
  return (
    <>
      <SiteHead />
      {/* The interactive header needs the current path, which only exists at request
          time; the shell ships a working static header until it arrives. */}
      <Suspense fallback={<HeaderFallback items={nav.header} logo={settings.logo} cta={settings.defaultCta} />}>
        <SiteHeader
          items={nav.header}
          logo={settings.logo}
          logoLight={settings.logoLight}
          cta={settings.defaultCta}
          phone={settings.phoneE164 ? { href: telHref(settings.phoneE164), display: formatPhone(settings.phoneE164) } : null}
        />
      </Suspense>
      <main id="main" tabIndex={-1} className="outline-none">
        {children}
      </main>
      <SiteFooter nav={nav} />
      <PreviewBar path="/" />
      <OrganizationJsonLd settings={settings} />
    </>
  );
}
