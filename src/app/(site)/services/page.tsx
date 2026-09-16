import type { Metadata } from "next";
import Link from "next/link";
import { listServices } from "@/lib/content/travel";
import { resolveStaticMetadata } from "@/lib/seo/metadata";
import { routes } from "@/lib/site";
import { ListingHeader } from "@/components/site/listing-header";
import { Inscription, Plate, Section } from "@/components/site/primitives";

export async function generateMetadata(): Promise<Metadata> {
  return resolveStaticMetadata({
    title: "Services",
    description: "Transfers, private drivers and the practical side of travelling in India with India Uncharted.",
    path: routes.services(),
  });
}

export default async function ServicesPage() {
  const services = await listServices();
  return (
    <>
      <ListingHeader
        title="Services"
        lead="The practical side of a journey — the parts that have to work before anything else does."
        crumbs={[{ label: "Services", href: routes.services() }]}
      />
      <Section tone="paper" className="pt-0">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-3">
          {services.map((s) => (
            <Link key={s.slug} href={s.href} className="group/card block">
              <Plate
                media={s.hero}
                ratio="landscape"
                sizes="(max-width: 640px) 92vw, (max-width: 1024px) 45vw, 30vw"
                band="paper"
                label={s.name}
                className="group-hover/card:after:inset-[calc(var(--spacing-band)-1px)]"
                imageClassName="transition-transform duration-(--duration-slow) ease-(--ease-out-expo) group-hover/card:scale-[1.035]"
              />
              <h2 className="mt-3.5 font-display text-title text-ink group-hover/card:text-terracotta-700">{s.name}</h2>
              {s.shortDescription ? <Inscription className="mt-1.5 line-clamp-2">{s.shortDescription}</Inscription> : null}
            </Link>
          ))}
        </div>
      </Section>
    </>
  );
}
