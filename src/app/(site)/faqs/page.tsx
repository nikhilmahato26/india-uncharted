import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPage, listFaqs } from "@/lib/content/editorial";
import { resolveMetadata } from "@/lib/seo/metadata";
import { routes } from "@/lib/site";
import { ListingHeader } from "@/components/site/listing-header";
import { Section } from "@/components/site/primitives";
import { FaqBlock } from "@/components/site/faq-block";

export async function generateMetadata(): Promise<Metadata> {
  const page = await getPage("faqs");
  if (!page) return { robots: { index: false, follow: false } };
  return resolveMetadata({ kind: "PAGE", name: page.title, path: routes.faqs(), seo: page.seo, description: page.intro });
}

export default async function FaqsPage() {
  const [page, faqs] = await Promise.all([getPage("faqs"), listFaqs()]);
  // The page is DRAFT until the client writes real answers — no invented FAQs.
  if (!page) notFound();

  const grouped = new Map<string, typeof faqs>();
  for (const f of faqs) {
    const key = f.category?.name ?? "General";
    grouped.set(key, [...(grouped.get(key) ?? []), f]);
  }

  return (
    <>
      <ListingHeader title={page.seo.h1Override ?? page.title} lead={page.intro} crumbs={[{ label: "FAQs", href: routes.faqs() }]} />
      <Section tone="paper" className="pt-0">
        {[...grouped.entries()].map(([group, items], i) => (
          <FaqBlock key={group} faqs={items} heading={group} className={i ? "mt-16" : undefined} structuredData={i === 0} />
        ))}
      </Section>
    </>
  );
}
