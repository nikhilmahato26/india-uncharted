import type { Metadata } from "next";
import { getPage } from "@/lib/content/editorial";
import { getSiteSettings } from "@/lib/content/settings";
import { resolveMetadata } from "@/lib/seo/metadata";
import { routes } from "@/lib/site";
import { formatPhone, telHref, whatsappHref, whatsappMessage } from "@/lib/phone";
import { ListingHeader } from "@/components/site/listing-header";
import { Section } from "@/components/site/primitives";
import { EnquiryForm } from "@/components/enquiry/enquiry-form";
import { RichText } from "@/components/richtext/render";

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPage("contact");
  return resolveMetadata({
    kind: "PAGE",
    name: page?.title ?? "Contact India Uncharted",
    path: routes.contact(),
    seo: page?.seo,
    description: page?.intro ?? "Talk to India Uncharted in Jodhpur, Rajasthan — by phone, email or enquiry form.",
  });
}

export default async function ContactPage() {
  const [page, settings] = await Promise.all([getPage("contact"), getSiteSettings()]);
  const a = settings.address;
  const addressLines = [a.line1, a.line2, [a.city, a.postalCode].filter(Boolean).join(" "), a.region, a.country].filter(Boolean) as string[];

  return (
    <>
      <ListingHeader
        title={page?.seo.h1Override ?? "Contact us"}
        lead={page?.intro ?? "We answer enquiries ourselves, from Jodhpur. Tell us what you're planning and we'll come back with a first outline."}
        crumbs={[{ label: "Contact", href: routes.contact() }]}
      />

      <Section tone="paper" className="pt-0">
        <div className="grid gap-14 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <h2 className="font-display text-title text-ink">Send an enquiry</h2>
            <EnquiryForm className="mt-6" context={{ entityType: "PAGE", entityName: "Contact" }} />
          </div>

          <div className="lg:col-span-4 lg:col-start-9">
            <div className="border border-rule bg-paper-2 p-6">
              <h2 className="font-display text-title text-ink">India Uncharted</h2>
              {addressLines.length ? (
                <address className="mt-4 not-italic text-body text-ink-2">
                  {addressLines.map((line) => (
                    <span key={line} className="block">
                      {line}
                    </span>
                  ))}
                </address>
              ) : null}
              <dl className="mt-6 space-y-4 border-t border-rule pt-5">
                {settings.phoneE164 ? (
                  <div>
                    <dt className="text-label uppercase text-ink-3">Phone</dt>
                    <dd className="mt-1">
                      <a href={telHref(settings.phoneE164)} className="text-body font-semibold text-terracotta-700 underline underline-offset-4">
                        {formatPhone(settings.phoneE164)}
                      </a>
                    </dd>
                  </div>
                ) : null}
                {settings.whatsappE164 ? (
                  <div>
                    <dt className="text-label uppercase text-ink-3">WhatsApp</dt>
                    <dd className="mt-1">
                      <a
                        href={whatsappHref(settings.whatsappE164, whatsappMessage({ entityName: null, url: null }))}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-body font-semibold text-terracotta-700 underline underline-offset-4"
                      >
                        {formatPhone(settings.whatsappE164)}
                      </a>
                    </dd>
                  </div>
                ) : null}
                {settings.email ? (
                  <div>
                    <dt className="text-label uppercase text-ink-3">Email</dt>
                    <dd className="mt-1">
                      <a href={`mailto:${settings.email}`} className="break-all text-body font-semibold text-terracotta-700 underline underline-offset-4">
                        {settings.email}
                      </a>
                    </dd>
                  </div>
                ) : null}
              </dl>
              {settings.socials.length ? (
                <ul className="mt-6 flex flex-wrap gap-x-5 gap-y-2 border-t border-rule pt-5">
                  {settings.socials.map((s) => (
                    <li key={s.url}>
                      <a href={s.url} target="_blank" rel="noopener noreferrer me" className="text-small text-ink-2 underline underline-offset-4 hover:text-ink">
                        {s.network.charAt(0).toUpperCase() + s.network.slice(1)}
                      </a>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>
        </div>

        {page?.body ? <RichText doc={page.body} className="mt-16" /> : null}
      </Section>
    </>
  );
}
