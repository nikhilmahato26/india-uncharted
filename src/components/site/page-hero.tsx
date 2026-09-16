import type { ReactNode } from "react";
import type { MediaSource } from "@/lib/content/media";
import { cn } from "@/lib/cn";
import { MediaFrame } from "@/components/ui/media-frame";
import { Breadcrumbs, type Crumb } from "@/components/ui/breadcrumbs";

/**
 * The inner-page folio: a plate held in its band, with the title written on a
 * paper cartouche that overlaps the lower edge. Without a photograph the
 * cartouche simply sits on paper, so a place with no picture still reads well.
 */
export function PageHero({
  media,
  title,
  italicTitle,
  meta,
  lead,
  crumbs,
  actions,
  size = "md",
  band = "terracotta",
}: {
  media: MediaSource | null;
  title: string;
  italicTitle?: string | null;
  meta?: ReactNode;
  lead?: ReactNode | null;
  crumbs: Crumb[];
  actions?: ReactNode;
  size?: "sm" | "md" | "lg";
  band?: "terracotta" | "forest";
}) {
  const heights = { sm: "h-[42svh] min-h-[16rem]", md: "h-[58svh] min-h-[20rem] max-h-[40rem]", lg: "h-[72svh] min-h-[24rem] max-h-[48rem]" };
  const bandVar = band === "forest" ? "[--band:var(--color-forest-800)]" : "[--band:var(--color-terracotta-600)]";

  return (
    <header className="bg-paper pt-[4.5rem] lg:pt-20">
      {media ? (
        <div className="p-(--spacing-band) pb-0">
          <div className={cn("folio pearl-band", bandVar)}>
            <div className={cn("relative overflow-hidden bg-ink", heights[size])}>
              <MediaFrame media={media} ratio="fill" sizes="100vw" priority scrim="top-bottom" label={title} />
            </div>
          </div>
        </div>
      ) : null}

      <div className={cn("container-folio", media ? "-mt-px" : "pt-8")}>
        <div className={cn(media && "relative -mt-16 sm:-mt-20 lg:-mt-24")}>
          <div className={cn("max-w-3xl", media && "bg-paper p-6 outline outline-gold-500/70 -outline-offset-[6px] sm:p-9")}>
            <Breadcrumbs items={crumbs} className="mb-4" />
            <h1 className="text-display-lg text-ink">
              {title}
              {italicTitle ? <span className="font-display-italic text-ink-3"> — {italicTitle}</span> : null}
            </h1>
            {meta ? <div className="mt-3 text-small text-ink-3">{meta}</div> : null}
            {lead ? <div className="measure mt-4 text-lead text-ink-2">{lead}</div> : null}
            {actions ? <div className="mt-7 flex flex-wrap gap-3">{actions}</div> : null}
          </div>
        </div>
      </div>
    </header>
  );
}
