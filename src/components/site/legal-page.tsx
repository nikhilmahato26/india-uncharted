import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getPage } from "@/lib/content/editorial";
import { resolveMetadata } from "@/lib/seo/metadata";
import { docToPlainText } from "@/lib/richtext/text";
import type { LegalPageKey } from "@/lib/site";
import { ListingHeader } from "@/components/site/listing-header";
import { Section } from "@/components/site/primitives";
import { RichText } from "@/components/richtext/render";

/**
 * Privacy, terms and cookies. Written by the client in Pages; this only lays it
 * out for reading. A policy that isn't published, or is published with nothing
 * in it, is a 404 — never an empty page with a legal title.
 */

export async function legalMetadata(key: LegalPageKey, fallbackTitle: string): Promise<Metadata> {
  const page = await getPage(key);
  return resolveMetadata({
    kind: "PAGE",
    name: page?.title ?? fallbackTitle,
    path: `/${key}`,
    seo: page?.seo,
    description: page?.intro ?? `${fallbackTitle} for India Uncharted.`,
  });
}

export async function LegalPage({ pageKey }: { pageKey: LegalPageKey }) {
  const page = await getPage(pageKey);
  if (!page || !docToPlainText(page.body).trim()) notFound();

  const updated = new Date(page.updatedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });

  return (
    <>
      <ListingHeader title={page.seo.h1Override ?? page.title} lead={page.intro} crumbs={[{ label: page.title, href: `/${pageKey}` }]} count={`Last updated ${updated}`} />
      <Section tone="paper" className="pt-0">
        <RichText doc={page.body} className="measure" />
      </Section>
    </>
  );
}
