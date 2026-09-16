import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";
import { MediaFrame, type Ratio } from "@/components/ui/media-frame";
import type { MediaSource } from "@/lib/content/media";
import { ArrowLink } from "@/components/ui/button";
import { Lozenge } from "@/components/brand/marks";

/**
 * The folio vocabulary: a plate inside a coloured band with a gold hairline,
 * an inscription under it, and section heads that stand on their own.
 */

type Band = "terracotta" | "forest" | "paper" | "ink" | "none";

const bandVars: Record<Band, string> = {
  terracotta: "[--band:var(--color-terracotta-600)] [--rule:var(--color-gold-300)]",
  forest: "[--band:var(--color-forest-800)] [--rule:var(--color-gold-300)]",
  paper: "[--band:var(--color-paper-3)] [--rule:var(--color-gold-500)]",
  ink: "[--band:var(--color-ink)] [--rule:var(--color-gold-400)]",
  none: "",
};

export function Plate({
  media,
  ratio = "wide",
  sizes,
  band = "terracotta",
  pearl = false,
  priority,
  label,
  scrim,
  className,
  imageClassName,
  children,
}: {
  media: MediaSource | null;
  ratio?: Ratio;
  sizes: string;
  band?: Band;
  pearl?: boolean;
  priority?: boolean;
  label?: string;
  scrim?: "none" | "bottom" | "top-bottom" | "full";
  className?: string;
  imageClassName?: string;
  children?: ReactNode;
}) {
  return (
    <div className={cn(band === "none" ? "relative" : "folio relative", bandVars[band], pearl && "pearl-band", className)}>
      <MediaFrame media={media} ratio={ratio} sizes={sizes} priority={priority} label={label} scrim={scrim} imageClassName={imageClassName} />
      {children}
    </div>
  );
}

/** The line written under a plate: what it shows and where it is. */
export function Inscription({ children, className, tone = "ink" }: { children: ReactNode; className?: string; tone?: "ink" | "paper" }) {
  return (
    <p className={cn("font-sans text-caption", tone === "ink" ? "text-ink-3" : "text-paper/75", className)}>
      {children}
    </p>
  );
}

export function SectionHead({
  title,
  lead,
  action,
  tone = "ink",
  align = "start",
  as: Tag = "h2",
  id,
  className,
}: {
  title: ReactNode;
  lead?: ReactNode;
  action?: { label: string; href: string };
  tone?: "ink" | "paper";
  align?: "start" | "center";
  as?: "h2" | "h3";
  id?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-5 md:flex-row md:items-end md:justify-between md:gap-12",
        align === "center" && "md:flex-col md:items-center md:text-center",
        className,
      )}
    >
      <div className={cn("max-w-2xl", align === "center" && "mx-auto")}>
        <Tag id={id} className={cn("text-display-md", tone === "ink" ? "text-ink" : "text-paper")}>
          {title}
        </Tag>
        {lead ? <p className={cn("measure mt-4 text-lead", tone === "ink" ? "text-ink-2" : "text-paper/80")}>{lead}</p> : null}
      </div>
      {action ? (
        <ArrowLink href={action.href} tone={tone === "ink" ? "ink" : "paper"} className="shrink-0">
          {action.label}
        </ArrowLink>
      ) : null}
    </div>
  );
}

/** Delhi ◆ Agra ◆ Jaipur — the journey's stops, in order. */
export function RouteLine({
  stops,
  tone = "ink",
  className,
  linked = false,
  max,
}: {
  stops: { slug: string; name: string; optional?: boolean; published?: boolean }[];
  tone?: "ink" | "paper";
  className?: string;
  linked?: boolean;
  max?: number;
}) {
  if (!stops.length) return null;
  const shown = max ? stops.slice(0, max) : stops;
  const rest = stops.length - shown.length;
  return (
    <p className={cn("flex flex-wrap items-center gap-x-2 gap-y-1 font-sans text-caption", tone === "ink" ? "text-ink-3" : "text-paper/75", className)}>
      {shown.map((s, i) => (
        <span key={`${s.slug}-${i}`} className="inline-flex items-center gap-2">
          {i > 0 ? <Lozenge className="opacity-55" /> : null}
          {linked && s.published !== false ? (
            <Link href={`/destinations/${s.slug}`} className="hover:text-terracotta-700 hover:underline underline-offset-4">
              {s.name}
            </Link>
          ) : (
            <span>{s.name}</span>
          )}
          {s.optional ? <span className="opacity-70">(optional)</span> : null}
        </span>
      ))}
      {rest > 0 ? (
        <span className="inline-flex items-center gap-2">
          <Lozenge className="opacity-55" />
          <span>{rest} more</span>
        </span>
      ) : null}
    </p>
  );
}

/** A fact strip: label above value, separated by hairlines. Used for quick facts. */
export function FactRow({ facts, tone = "ink", className }: { facts: { label: string; value: ReactNode }[]; tone?: "ink" | "paper"; className?: string }) {
  const items = facts.filter((f) => f.value);
  if (!items.length) return null;
  // The grid takes its column count from what there is, so a missing fact never
  // leaves an empty cell sitting in the band.
  const columns = { 1: "sm:grid-cols-1", 2: "sm:grid-cols-2", 3: "sm:grid-cols-3", 4: "sm:grid-cols-2 lg:grid-cols-4" }[Math.min(items.length, 4)];
  return (
    <dl className={cn("grid gap-px overflow-hidden border", columns, tone === "ink" ? "border-rule bg-rule" : "border-paper/20 bg-paper/20", className)}>
      {items.map((f) => (
        <div key={f.label} className={cn("px-5 py-4", tone === "ink" ? "bg-paper" : "bg-forest-900")}>
          <dt className={cn("text-label uppercase", tone === "ink" ? "text-ink-3" : "text-gold-300")}>{f.label}</dt>
          <dd className={cn("mt-1.5 text-small", tone === "ink" ? "text-ink" : "text-paper")}>{f.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Section({
  children,
  className,
  tone = "paper",
  id,
  labelledBy,
}: {
  children: ReactNode;
  className?: string;
  tone?: "paper" | "paper-2" | "forest" | "ink";
  id?: string;
  labelledBy?: string;
}) {
  const tones = {
    paper: "bg-paper text-ink",
    "paper-2": "bg-paper-2 text-ink",
    forest: "on-dark bg-forest-900 text-paper",
    ink: "on-dark bg-ink text-paper",
  } as const;
  return (
    <section
      id={id}
      aria-labelledby={labelledBy}
      data-surface={tone === "forest" || tone === "ink" ? "dark" : "light"}
      className={cn("py-(--spacing-section)", tones[tone], className)}
    >
      <div className="container-folio">{children}</div>
    </section>
  );
}
