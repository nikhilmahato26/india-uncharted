import Link from "next/link";
import { absoluteUrl } from "@/lib/site";
import { cn } from "@/lib/cn";
import { JsonLd } from "@/components/seo/json-ld";

export type Crumb = { label: string; href: string };

/** Visual breadcrumb trail plus its BreadcrumbList structured data, from the same array. */
export function Breadcrumbs({ items, tone = "ink", className }: { items: Crumb[]; tone?: "ink" | "paper"; className?: string }) {
  const trail: Crumb[] = [{ label: "Home", href: "/" }, ...items];
  return (
    <>
      <nav aria-label="Breadcrumb" className={cn("text-caption", className)}>
        <ol className={cn("flex flex-wrap items-center gap-x-2 gap-y-1", tone === "ink" ? "text-ink-3" : "text-paper/80")}>
          {trail.map((c, i) => {
            const last = i === trail.length - 1;
            return (
              <li key={c.href} className="flex items-center gap-2">
                {last ? (
                  <span aria-current="page" className={tone === "ink" ? "text-ink-2" : "text-paper"}>
                    {c.label}
                  </span>
                ) : (
                  <>
                    <Link href={c.href} className="inline-flex min-h-8 items-center underline decoration-current/30 underline-offset-4 hover:decoration-current">
                      {c.label}
                    </Link>
                    <span aria-hidden="true" className="inline-block size-1 rotate-45 bg-current opacity-60" />
                  </>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "BreadcrumbList",
          itemListElement: trail.map((c, i) => ({ "@type": "ListItem", position: i + 1, name: c.label, item: absoluteUrl(c.href) })),
        }}
      />
    </>
  );
}
