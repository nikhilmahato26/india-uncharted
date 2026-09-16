import type { Metadata } from "next";
import { getPage } from "@/lib/content/editorial";
import { listCategories, listDestinations } from "@/lib/content/travel";
import { getSiteSettings } from "@/lib/content/settings";
import { resolveMetadata } from "@/lib/seo/metadata";
import { routes } from "@/lib/site";
import { formatPhone, telHref } from "@/lib/phone";
import { ListingHeader } from "@/components/site/listing-header";
import { Section } from "@/components/site/primitives";
import { EnquiryForm } from "@/components/enquiry/enquiry-form";
import { RichText } from "@/components/richtext/render";
import { SunMark } from "@/components/brand/marks";

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPage("plan-my-journey");
  return resolveMetadata({
    kind: "PAGE",
    name: page?.title ?? "Plan My Journey",
    path: routes.planMyJourney(),
    seo: page?.seo,
    description: page?.intro ?? "Tell us your dates and what you want from India. We'll design a private journey around them and send a first outline.",
  });
}

export default async function PlanMyJourneyPage() {
  const [page, destinations, styles, settings] = await Promise.all([getPage("plan-my-journey"), listDestinations(), listCategories("TRAVEL_STYLE"), getSiteSettings()]);

  const destinationOptions = destinations
    .filter((d) => d.journeyCount > 0)
    .slice(0, 18)
    .map((d) => ({ value: d.name, label: d.name }));
  const styleOptions = styles.map((s) => ({ value: s.name, label: s.name }));

  const steps = [
    { title: "You tell us the shape of the trip", body: "Dates or a rough month, how long you have, and what you want India to feel like." },
    { title: "We design a route", body: "A first outline with places, pace and where the quiet days go — yours to change." },
    { title: "We refine it until it fits", body: "Swap a city, add a desert night, slow the middle down. The plan is not fixed until you say so." },
  ];

  return (
    <>
      <ListingHeader
        title={page?.seo.h1Override ?? "Plan your journey"}
        lead={page?.intro ?? "Tell us what you want from India and we'll design the journey around it — private, at your pace, quoted for your dates."}
        crumbs={[{ label: "Plan My Journey", href: routes.planMyJourney() }]}
      />

      <Section tone="paper" className="pt-0">
        <div className="grid gap-14 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <EnquiryForm expanded destinations={destinationOptions} styles={styleOptions} />
          </div>

          <div className="lg:col-span-4 lg:col-start-9">
            <div className="border border-rule bg-paper-2 p-6">
              <SunMark className="size-7 text-terracotta-600" />
              <h2 className="mt-3 font-display text-title text-ink">How this works</h2>
              <ol className="mt-5 space-y-5">
                {steps.map((s, i) => (
                  <li key={s.title} className="border-t border-rule pt-4 first:border-t-0 first:pt-0">
                    <p className="font-display text-subtitle text-ink">
                      <span className="text-terracotta-600 tabular">{i + 1}. </span>
                      {s.title}
                    </p>
                    <p className="mt-1.5 text-small text-ink-2">{s.body}</p>
                  </li>
                ))}
              </ol>
              {settings.phoneE164 ? (
                <p className="mt-6 border-t border-rule pt-5 text-small text-ink-2">
                  Prefer to talk?{" "}
                  <a href={telHref(settings.phoneE164)} className="font-semibold text-terracotta-700 underline underline-offset-4">
                    {formatPhone(settings.phoneE164)}
                  </a>
                </p>
              ) : null}
            </div>
          </div>
        </div>

        {page?.body ? <RichText doc={page.body} className="mt-16" /> : null}
      </Section>
    </>
  );
}
