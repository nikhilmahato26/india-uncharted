import Link from "next/link";
import { routes } from "@/lib/site";
import type { DestinationPage } from "@/lib/content/travel";
import type { DestinationFeature } from "@/lib/content/destination-features";
import { Inscription, Plate, Section, SectionHead } from "./primitives";
import { CatalogueProvider, CatalogueSection, TravellerSection } from "./destination-catalogue";
import type { PackageItem } from "./package-card";

/**
 * The sections a destination gets once its catalogue is too large for two plain
 * grids: one filterable list of everything bookable, the named sub-areas, the
 * traveller cuts, and the handful of journeys we wrote ourselves.
 *
 * Everything is derived from records that already exist. A destination with no
 * child places renders no areas block; a signature slug with no record behind it
 * is skipped rather than printed as a dead card.
 */

const KIND_LABELS: Record<string, string> = {
  JOURNEY: "Tour package",
  RETREAT: "Retreat",
  COURSE: "Course",
  BIKE_TOUR: "Motorcycle journey",
  EXPERIENCE: "Experience",
};

export function toPackageItems(d: DestinationPage): PackageItem[] {
  const journeys: PackageItem[] = d.journeys.map((j) => ({
    key: `journey:${j.slug}`,
    href: j.href,
    name: j.name,
    category: j.styles[0]?.name ?? KIND_LABELS[j.kind] ?? "Journey",
    categorySlugs: j.styles.map((s) => s.slug),
    kind: j.kind,
    location: j.route.length ? j.route.slice(0, 3).map((r) => r.name).join(" · ") : d.name,
    duration: j.durationText,
    description: j.shortDescription,
    priceText: j.priceText,
    hero: j.hero,
  }));

  const experiences: PackageItem[] = d.experiences.map((e) => ({
    key: `experience:${e.slug}`,
    href: e.href,
    name: e.name,
    category: e.themes[0]?.name ?? e.formatLabel,
    categorySlugs: e.themes.map((t) => t.slug),
    kind: "EXPERIENCE",
    location: e.location ?? e.destination?.name ?? d.name,
    duration: e.duration,
    description: e.shortDescription,
    priceText: e.priceText,
    hero: e.hero,
  }));

  return [...journeys, ...experiences];
}

export function DestinationSections({
  d,
  feature,
  whatsappE164,
}: {
  d: DestinationPage;
  feature: DestinationFeature;
  whatsappE164: string | null;
}) {
  const items = toPackageItems(d);
  if (!items.length) return null;

  const signature = feature.signature
    ? feature.signature.slugs.map((slug) => items.find((i) => i.href.endsWith(`/${slug}`))).filter((i): i is PackageItem => Boolean(i))
    : [];
  const signatureKeys = new Set(signature.map((i) => i.key));
  // A journey shown large above should not appear again, smaller, ten rows down.
  const catalogue = signature.length ? items.filter((i) => !signatureKeys.has(i.key)) : items;

  return (
    <CatalogueProvider>
      <CatalogueSection
        items={catalogue}
        filters={feature.filters}
        travellers={feature.travellers?.items ?? []}
        heading={feature.collection.heading}
        lead={feature.collection.lead}
        whatsappE164={whatsappE164}
      />

      {feature.areas && d.areas.length ? <AreasSection name={d.name} heading={feature.areas.heading} lead={feature.areas.lead} areas={d.areas} /> : null}

      {feature.travellers ? <TravellerSection heading={feature.travellers.heading} lead={feature.travellers.lead} items={feature.travellers.items} /> : null}

      {feature.signature && signature.length ? <SignatureSection heading={feature.signature.heading} lead={feature.signature.lead} items={signature} /> : null}
    </CatalogueProvider>
  );
}

function AreasSection({
  name,
  heading,
  lead,
  areas,
}: {
  name: string;
  heading: string;
  lead: string;
  areas: DestinationPage["areas"];
}) {
  return (
    <Section tone="paper" labelledBy="areas-head">
      <SectionHead id="areas-head" title={heading} lead={lead} action={{ label: `All of ${name}`, href: routes.destinations() }} />
      <div className="mt-10 grid gap-10 lg:grid-cols-2">
        {areas.map((area) => (
          <article key={area.slug} className="group/card">
            <Link href={area.href} className="block">
              <Plate
                media={area.hero}
                ratio="landscape"
                sizes="(max-width: 1024px) 92vw, 46vw"
                band="terracotta"
                label={area.hero ? area.name : undefined}
                className="group-hover/card:after:inset-[calc(var(--spacing-band)-1px)]"
                imageClassName="transition-[transform] duration-(--duration-slow) ease-(--ease-out-expo) group-hover/card:scale-[1.035]"
              />
              <h3 className="mt-4 font-display text-title text-ink transition-colors duration-(--duration-fast) group-hover/card:text-terracotta-700">{area.name}</h3>
            </Link>
            {area.shortDescription ? <p className="measure mt-2 text-body text-ink-2">{area.shortDescription}</p> : null}
            {area.places.length ? (
              <>
                <Inscription className="mt-4 uppercase tracking-[0.1em]">Where we send people</Inscription>
                <p className="mt-1.5 text-small text-ink-2">{area.places.join(" · ")}</p>
              </>
            ) : null}
          </article>
        ))}
      </div>
    </Section>
  );
}

function SignatureSection({ heading, lead, items }: { heading: string; lead: string; items: PackageItem[] }) {
  return (
    <Section tone="ink" labelledBy="signature-head">
      <SectionHead id="signature-head" title={heading} lead={lead} tone="paper" />
      <div className="mt-12 grid gap-10 lg:grid-cols-2">
        {items.map((item, i) => (
          <Link
            key={item.key}
            href={item.href}
            className={
              // The first one runs the full width: it is the journey we would book ourselves.
              i === 0 && items.length > 2 ? "group/card block lg:col-span-2" : "group/card block"
            }
          >
            <Plate
              media={item.hero}
              ratio={i === 0 && items.length > 2 ? "wide" : "landscape"}
              sizes={i === 0 && items.length > 2 ? "(max-width: 1024px) 92vw, 94vw" : "(max-width: 1024px) 92vw, 46vw"}
              band="paper"
              scrim="bottom"
              label={item.hero ? item.name : undefined}
              className="group-hover/card:after:inset-[calc(var(--spacing-band)-1px)]"
              imageClassName="transition-[transform] duration-(--duration-slow) ease-(--ease-out-expo) group-hover/card:scale-[1.035]"
            />
            <div className="mt-4">
              <Inscription tone="paper" className="uppercase tracking-[0.1em]">
                {[item.category, item.duration].filter(Boolean).join(" · ")}
              </Inscription>
              <h3 className="mt-1.5 font-display text-title text-paper transition-colors duration-(--duration-fast) group-hover/card:text-gold-100">{item.name}</h3>
              {item.description ? <p className="measure mt-2 text-body text-paper/75">{item.description}</p> : null}
            </div>
          </Link>
        ))}
      </div>
    </Section>
  );
}
