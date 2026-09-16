import Link from "next/link";
import type { ReactNode } from "react";
import { Breadcrumbs, type Crumb } from "@/components/ui/breadcrumbs";
import { RidgeRule } from "@/components/brand/marks";
import { cn } from "@/lib/cn";

/** The head of an index page: title, one line of orientation, and any hub links. */
export function ListingHeader({
  title,
  lead,
  crumbs,
  count,
  links,
  children,
}: {
  title: string;
  lead?: ReactNode;
  crumbs: Crumb[];
  count?: string;
  links?: { label: string; href: string; active?: boolean }[];
  children?: ReactNode;
}) {
  return (
    <header className="bg-paper pt-[6.5rem] pb-10 lg:pt-32">
      <div className="container-folio">
        <Breadcrumbs items={crumbs} />
        <h1 className="mt-5 max-w-3xl text-display-lg text-ink">{title}</h1>
        {lead ? <div className="measure mt-5 text-lead text-ink-2">{lead}</div> : null}
        {count ? <p className="mt-3 text-caption text-ink-3">{count}</p> : null}
        {links?.length ? (
          <nav aria-label="Filter" className="mt-8 flex flex-wrap gap-2">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                aria-current={l.active ? "page" : undefined}
                className={cn(
                  "inline-flex min-h-11 items-center border px-4 text-small transition-colors",
                  l.active ? "border-terracotta-600 bg-terracotta-600 text-paper" : "border-ink/20 text-ink-2 hover:border-ink/45 hover:text-ink",
                )}
              >
                {l.label}
              </Link>
            ))}
          </nav>
        ) : null}
        {children}
        <RidgeRule className="mt-10" />
      </div>
    </header>
  );
}
