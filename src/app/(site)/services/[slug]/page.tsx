import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getServicePage } from "@/lib/content/travel";
import { getSiteSettings } from "@/lib/content/settings";
import { resolveMetadata } from "@/lib/seo/metadata";
import { routes } from "@/lib/site";
import { docToPlainText } from "@/lib/richtext/text";
import { PageHero } from "@/components/site/page-hero";
import { Section, SectionHead } from "@/components/site/primitives";
import { RichText } from "@/components/richtext/render";
import { FaqBlock } from "@/components/site/faq-block";
import { EnquiryDialog } from "@/components/enquiry/enquiry-dialog";
import { MediaFrame } from "@/components/ui/media-frame";
import { formatPhone, telHref } from "@/lib/phone";

import { db } from "@/lib/db";

type Props = { params: Promise<{ slug: string }> };

/** Known pages are prerendered at build; anything new is rendered on first visit and then cached. */
export async function generateStaticParams() {
  const rows = await db.service.findMany({ where: { status: "PUBLISHED" }, select: { slug: true } });
  return rows.map((r) => ({ slug: r.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const s = await getServicePage(slug);
  if (!s) return {};
  return resolveMetadata({
    kind: "SERVICE",
    name: s.name,
    path: routes.service(s.slug),
    seo: s.seo,
    description: s.shortDescription ?? docToPlainText(s.description),
    image: s.hero,
  });
}

export default async function ServicePage({ params }: Props) {
  const { slug } = await params;
  const [s, settings] = await Promise.all([getServicePage(slug), getSiteSettings()]);
  if (!s) notFound();
  const context = { entityType: "SERVICE" as const, entityId: s.id, entityName: s.name };

  return (
    <>
      <PageHero
        media={s.hero ?? s.vehicles.find((v) => v.media)?.media ?? null}
        title={s.seo.h1Override || s.name}
        crumbs={[
          { label: "Services", href: routes.services() },
          { label: s.name, href: routes.service(s.slug) },
        ]}
        size="sm"
        lead={s.shortDescription}
        actions={
          <>
            <EnquiryDialog label="Book a transfer" context={context} title={`Book: ${s.name}`} />
            {settings.phoneE164 ? (
              <a href={telHref(settings.phoneE164)} className="inline-flex min-h-14 items-center border border-ink/80 px-8 text-body font-semibold text-ink hover:bg-paper-2">
                {formatPhone(settings.phoneE164)}
              </a>
            ) : null}
          </>
        }
      />

      <Section tone="paper" className="pt-12 lg:pt-16">
        <div className="grid gap-12 lg:grid-cols-12">
          <div className="lg:col-span-7">{s.description ? <RichText doc={s.description} /> : null}</div>
          {s.features.length ? (
            <div className="lg:col-span-4 lg:col-start-9">
              <h2 className="text-label uppercase text-ink-3">What we drive</h2>
              <ul className="mt-4 grid gap-2">
                {s.features.map((f) => (
                  <li key={f} className="relative border-b border-rule pb-2 pl-6 text-small text-ink-2">
                    <span aria-hidden="true" className="absolute top-2 left-0 size-2 rotate-45 bg-terracotta-600" />
                    {f}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </Section>

      {s.vehicles.length ? (
        <Section tone="paper-2" labelledBy="fleet">
          <SectionHead id="fleet" title="The fleet" lead="Every vehicle is air-conditioned and driven by a professional driver." />
          <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {s.vehicles.map((v) => (
              <article key={v.id}>
                <div className="folio [--band:var(--color-paper-4)] [--rule:var(--color-gold-500)]">
                  <MediaFrame media={v.media} ratio="landscape" sizes="(max-width: 640px) 92vw, (max-width: 1024px) 45vw, 30vw" label={v.name} />
                </div>
                <div className="mt-3.5">
                  {v.class ? <p className="text-label uppercase text-ink-3">{v.class}</p> : null}
                  <h3 className="mt-1 font-display text-subtitle text-ink">{v.name}</h3>
                  {v.seats ? <p className="mt-1 text-caption text-ink-3">Capacity: {v.seats} including driver</p> : null}
                  {v.features.length ? (
                    <ul className="mt-3 flex flex-wrap gap-1.5">
                      {v.features.map((f) => (
                        <li key={f} className="border border-ink/20 px-2.5 py-1 text-caption text-ink-2">
                          {f}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        </Section>
      ) : null}

      {s.benefits.length ? (
        <Section tone="paper" labelledBy="why">
          <SectionHead id="why" title="What you can expect" />
          <ul className="mt-10 grid gap-x-10 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
            {s.benefits.map((b) => (
              <li key={b} className="border-t border-rule pt-4 font-display text-subtitle text-ink">
                {b}
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {s.faqs.length ? (
        <Section tone="paper-2">
          <FaqBlock faqs={s.faqs} heading={`${s.name}: common questions`} />
        </Section>
      ) : null}
    </>
  );
}
