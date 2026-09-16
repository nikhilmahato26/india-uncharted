import Image from "next/image";
import Link from "next/link";
import type { Navigation } from "@/lib/content/nav";
import { formatPhone, telHref } from "@/lib/phone";
import { SunMark } from "@/components/brand/marks";
import { LinkButton } from "@/components/ui/button";

const SOCIAL_LABEL: Record<string, string> = {
  facebook: "Facebook",
  instagram: "Instagram",
  youtube: "YouTube",
  x: "X (Twitter)",
  linkedin: "LinkedIn",
  pinterest: "Pinterest",
  tripadvisor: "Tripadvisor",
};

export function SiteFooter({ nav }: { nav: Navigation }) {
  const { settings, footer, legal } = nav;
  const address = [settings.address.line1, settings.address.line2, [settings.address.city, settings.address.postalCode].filter(Boolean).join(" "), settings.address.region, settings.address.country]
    .filter(Boolean)
    .join(", ");

  return (
    <footer className="on-dark relative bg-forest-900 text-paper" data-surface="dark">
      <div aria-hidden="true" className="pearl-band h-2.5 [--band:var(--color-terracotta-600)]" />
      <div className="container-folio pt-16 pb-10 lg:pt-24">
        <div className="grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-5">
            <p className="font-display text-display-lg text-paper">
              India, <span className="font-display-italic text-gold-300">beyond</span> the obvious.
            </p>
            {settings.footerDescription ? <p className="measure mt-6 text-body text-paper/78">{settings.footerDescription}</p> : null}
            <div className="mt-8 flex flex-wrap gap-3">
              <LinkButton href={settings.defaultCta.href} variant="on-dark-solid">
                {settings.defaultCta.label}
              </LinkButton>
              {settings.phoneE164 ? (
                <a
                  href={telHref(settings.phoneE164)}
                  className="inline-flex min-h-12 items-center border border-paper/40 px-6 text-small font-semibold text-paper hover:bg-paper/10"
                >
                  {formatPhone(settings.phoneE164)}
                </a>
              ) : null}
            </div>
          </div>

          <nav aria-label="Footer" className="grid grid-cols-2 gap-x-8 gap-y-10 sm:grid-cols-4 lg:col-span-7">
            {footer.map((col) => (
              <div key={col.heading}>
                <h2 className="font-sans text-label uppercase text-gold-300">{col.heading}</h2>
                <ul className="mt-4 space-y-0.5">
                  {col.links.map((l) => (
                    <li key={`${col.heading}-${l.href}`}>
                      <Link href={l.href} className="inline-flex min-h-10 items-center text-small text-paper/82 hover:text-paper hover:underline">
                        {l.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>

        <div className="mt-16 grid gap-8 border-t border-paper/15 pt-10 lg:grid-cols-12">
          <address className="not-italic text-small text-paper/78 lg:col-span-5">
            <p className="font-display text-subtitle text-paper">{settings.businessName}</p>
            {address ? <p className="mt-2">{address}</p> : null}
            <p className="mt-2 flex flex-wrap gap-x-5 gap-y-1">
              {settings.phoneE164 ? (
                <a href={telHref(settings.phoneE164)} className="hover:text-paper hover:underline">
                  {formatPhone(settings.phoneE164)}
                </a>
              ) : null}
              {settings.email ? (
                <a href={`mailto:${settings.email}`} className="hover:text-paper hover:underline">
                  {settings.email}
                </a>
              ) : null}
            </p>
          </address>
          {settings.socials.length ? (
            <ul className="flex flex-wrap items-start gap-x-6 gap-y-2 lg:col-span-4" aria-label="India Uncharted on social media">
              {settings.socials.map((s) => (
                <li key={s.url}>
                  <a href={s.url} target="_blank" rel="noopener noreferrer me" className="inline-flex min-h-10 items-center text-small text-paper/82 underline decoration-paper/30 underline-offset-4 hover:text-paper hover:decoration-paper">
                    {SOCIAL_LABEL[s.network] ?? s.network}
                  </a>
                </li>
              ))}
            </ul>
          ) : null}
          <div className="flex items-start lg:col-span-3 lg:justify-end">
            {settings.logoLight ? (
              <Image src={settings.logoLight.src} alt="India Uncharted" width={settings.logoLight.width} height={settings.logoLight.height} className="h-12 w-auto opacity-90" />
            ) : (
              <SunMark className="size-10 text-gold-300" />
            )}
          </div>
        </div>

        <div className="mt-10 flex flex-col gap-3 text-caption text-paper/65 sm:flex-row sm:items-center sm:justify-between">
          <p>{settings.copyright}</p>
          {legal.length ? (
            <ul className="flex flex-wrap gap-x-5">
              {legal.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="inline-flex min-h-10 items-center hover:text-paper hover:underline">
                    {l.label}
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </footer>
  );
}
