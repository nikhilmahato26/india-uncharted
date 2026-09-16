import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { search } from "@/lib/content/search";
import { resolveStaticMetadata } from "@/lib/seo/metadata";
import { routes } from "@/lib/site";
import { ListingHeader } from "@/components/site/listing-header";
import { Section } from "@/components/site/primitives";
import { Input } from "@/components/ui/field";
import { Button } from "@/components/ui/button";

export async function generateMetadata(): Promise<Metadata> {
  const meta = await resolveStaticMetadata({ title: "Search", description: "Search destinations, journeys, experiences and guides across India Uncharted.", path: routes.search() });
  return { ...meta, robots: { index: false, follow: true } };
}

async function Results({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q = "" } = await searchParams;
  const query = q.trim();
  if (!query) return null;
  const hits = await search(query);

  if (!hits.length) {
    return (
      <div className="max-w-2xl">
        <p className="text-lead text-ink-2">
          Nothing matched <strong className="text-ink">“{query}”</strong>.
        </p>
        <p className="mt-4 text-body text-ink-2">
          Try a place (Jaisalmer, Kashmir), a kind of trip (yoga, wildlife, motorcycle), or{" "}
          <Link href={routes.planMyJourney()} className="text-terracotta-700 underline underline-offset-4">
            tell us what you’re planning
          </Link>{" "}
          and we’ll answer directly.
        </p>
      </div>
    );
  }

  return (
    <>
      <p className="text-caption text-ink-3">
        {hits.length} {hits.length === 1 ? "result" : "results"} for “{query}”
      </p>
      <ul className="mt-8 divide-y divide-rule border-t border-rule">
        {hits.map((h) => (
          <li key={h.href}>
            <Link href={h.href} className="group/hit flex flex-col gap-1 py-5">
              <span className="text-label uppercase text-terracotta-700">{h.type}</span>
              <span className="font-display text-title text-ink group-hover/hit:text-terracotta-700">{h.title}</span>
              {h.meta ? <span className="text-caption text-ink-3">{h.meta}</span> : null}
              {h.snippet ? <span className="measure line-clamp-2 text-small text-ink-2">{h.snippet}</span> : null}
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  return (
    <>
      <ListingHeader title="Search" crumbs={[{ label: "Search", href: routes.search() }]}>
        <form action={routes.search()} method="get" role="search" className="mt-8 flex max-w-xl gap-3">
          <label htmlFor="q" className="sr-only">
            Search India Uncharted
          </label>
          <Input id="q" name="q" type="search" placeholder="Jaisalmer, yoga retreat, motorcycle…" autoComplete="off" />
          <Button type="submit">Search</Button>
        </form>
      </ListingHeader>
      <Section tone="paper" className="pt-0">
        <Suspense fallback={<p className="text-body text-ink-3">Searching…</p>}>
          <Results searchParams={searchParams} />
        </Suspense>
      </Section>
    </>
  );
}
