"use client";

import { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";
import type { CollectionFilter, TravellerCut } from "@/lib/content/destination-features";
import { Section, SectionHead } from "./primitives";
import { PackageCard, type PackageItem } from "./package-card";

/**
 * One catalogue, two ways into it. The chips cut by what a thing *is*; the
 * traveller cards further down the page cut by who it suits, and both write to
 * the same selection — so picking "Goa for Food Lovers" scrolls you back up to
 * a filtered grid rather than opening a page that repeats the same cards.
 *
 * The provider wraps server-rendered sections as children, which keeps
 * everything between the two client sections on the server.
 */

type Selection = { kind: "all" } | { kind: "filter"; key: string } | { kind: "traveller"; key: string };

type CatalogueState = {
  selection: Selection;
  select: (next: Selection) => void;
};

const CatalogueContext = createContext<CatalogueState | null>(null);

function useCatalogue(): CatalogueState {
  const ctx = useContext(CatalogueContext);
  if (!ctx) throw new Error("Catalogue components must be rendered inside <CatalogueProvider>");
  return ctx;
}

const CATALOGUE_ANCHOR = "packages";

export function CatalogueProvider({ children }: { children: ReactNode }) {
  const [selection, setSelection] = useState<Selection>({ kind: "all" });
  const value = useMemo<CatalogueState>(() => ({ selection, select: setSelection }), [selection]);
  return <CatalogueContext.Provider value={value}>{children}</CatalogueContext.Provider>;
}

function matchesFilter(item: PackageItem, filter: CollectionFilter): boolean {
  if (filter.kinds?.length && filter.kinds.includes(item.kind)) return true;
  if (filter.match?.length) return filter.match.some((slug) => item.categorySlugs.includes(slug));
  return false;
}

function matchesSlugs(item: PackageItem, slugs: string[]): boolean {
  return slugs.some((slug) => item.categorySlugs.includes(slug));
}

export function CatalogueSection({
  items,
  filters,
  travellers,
  heading,
  lead,
  whatsappE164,
  tone = "paper",
}: {
  items: PackageItem[];
  filters: CollectionFilter[];
  travellers: TravellerCut[];
  heading: string;
  lead: string;
  whatsappE164: string | null;
  tone?: "paper" | "paper-2";
}) {
  const { selection, select } = useCatalogue();

  // A chip that would empty the grid is not a filter, it is a dead end. Count first,
  // render only what has something behind it.
  const live = useMemo(
    () => filters.map((f) => ({ filter: f, count: items.filter((i) => matchesFilter(i, f)).length })).filter((f) => f.count > 0),
    [filters, items],
  );

  const shown = useMemo(() => {
    if (selection.kind === "all") return items;
    if (selection.kind === "filter") {
      const filter = filters.find((f) => f.key === selection.key);
      return filter ? items.filter((i) => matchesFilter(i, filter)) : items;
    }
    const traveller = travellers.find((t) => t.key === selection.key);
    return traveller ? items.filter((i) => matchesSlugs(i, traveller.match)) : items;
  }, [filters, items, selection, travellers]);

  const activeTraveller = selection.kind === "traveller" ? travellers.find((t) => t.key === selection.key) : undefined;

  return (
    <Section tone={tone} id={CATALOGUE_ANCHOR} labelledBy="catalogue-head">
      <SectionHead id="catalogue-head" title={heading} lead={lead} />

      <div className="mt-8 flex flex-wrap items-center gap-2" role="group" aria-label="Filter by category">
        <Chip active={selection.kind === "all"} onClick={() => select({ kind: "all" })}>
          All
          <Count>{items.length}</Count>
        </Chip>
        {live.map(({ filter, count }) => (
          <Chip key={filter.key} active={selection.kind === "filter" && selection.key === filter.key} onClick={() => select({ kind: "filter", key: filter.key })}>
            {filter.label}
            <Count>{count}</Count>
          </Chip>
        ))}
      </div>

      {activeTraveller ? (
        <p className="mt-5 text-small text-ink-2">
          Showing <strong className="font-semibold text-ink">{activeTraveller.label}</strong> — {activeTraveller.blurb}{" "}
          <button type="button" onClick={() => select({ kind: "all" })} className="font-semibold text-terracotta-700 underline-offset-4 hover:underline">
            Show everything
          </button>
        </p>
      ) : null}

      <p aria-live="polite" className="sr-only">
        {shown.length} of {items.length} shown
      </p>

      {shown.length ? (
        <div className="mt-10 grid gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map((item) => (
            <PackageCard key={item.key} item={item} whatsappE164={whatsappE164} sizes="(max-width: 640px) 92vw, (max-width: 1024px) 45vw, 30vw" />
          ))}
        </div>
      ) : (
        <p className="mt-10 border border-rule bg-paper-2 p-6 text-body text-ink-2">
          Nothing here yet under that heading.{" "}
          <button type="button" onClick={() => select({ kind: "all" })} className="font-semibold text-terracotta-700 underline-offset-4 hover:underline">
            Show everything
          </button>{" "}
          — or tell us what you had in mind and we will build it.
        </p>
      )}
    </Section>
  );
}

export function TravellerSection({
  heading,
  lead,
  items,
  tone = "paper-2",
}: {
  heading: string;
  lead: string;
  items: TravellerCut[];
  tone?: "paper" | "paper-2";
}) {
  const { selection, select } = useCatalogue();

  return (
    <Section tone={tone} labelledBy="travellers-head">
      <SectionHead id="travellers-head" title={heading} lead={lead} />
      <ul className="mt-10 grid gap-px border border-rule bg-rule sm:grid-cols-2 lg:grid-cols-3">
        {items.map((t) => {
          const active = selection.kind === "traveller" && selection.key === t.key;
          return (
            <li key={t.key} className="bg-paper">
              <button
                type="button"
                aria-pressed={active}
                onClick={() => {
                  select({ kind: "traveller", key: t.key });
                  document.getElementById(CATALOGUE_ANCHOR)?.scrollIntoView({ behavior: "smooth", block: "start" });
                }}
                className={cn(
                  "flex h-full w-full flex-col p-6 text-left transition-colors duration-(--duration-fast)",
                  active ? "bg-gold-100" : "hover:bg-paper-2",
                )}
              >
                <span className="font-display text-subtitle text-ink">{t.label}</span>
                <span className="mt-2 text-small text-ink-2">{t.blurb}</span>
                <span className="mt-4 text-caption font-semibold tracking-[0.04em] text-terracotta-700">{active ? "Showing these" : "Show these"}</span>
              </button>
            </li>
          );
        })}
      </ul>
    </Section>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn(
        "inline-flex min-h-10 items-center gap-2 border px-4 text-small font-semibold transition-colors duration-(--duration-fast)",
        active ? "border-ink bg-ink text-paper" : "border-ink/25 bg-paper text-ink hover:border-ink/60 hover:bg-paper-2",
      )}
    >
      {children}
    </button>
  );
}

function Count({ children }: { children: ReactNode }) {
  return <span className="text-caption font-normal opacity-60">{children}</span>;
}
