import Link from "next/link";
import { ArrowRight, MessageCircle } from "lucide-react";
import { cn } from "@/lib/cn";
import type { ItemKind } from "@/lib/content/destination-features";
import { whatsappHref, whatsappMessage } from "@/lib/phone";
import { absoluteUrl } from "@/lib/site";
import { Inscription, Plate } from "./primitives";

/**
 * The catalogue card for a place that sells many things: everything a person
 * needs to shortlist without opening the page, and two ways out of it — the
 * page itself, or a WhatsApp thread that already names the trip.
 *
 * The title carries a stretched link so the whole plate is clickable; the
 * WhatsApp anchor sits above it, which is why it is the one element that
 * raises itself. Two competing full-card links would make the card ambiguous
 * to a screen reader, so only one exists.
 */

export type PackageItem = {
  key: string;
  href: string;
  name: string;
  /** Category chip text — the travel style or experience theme it leads with. */
  category: string | null;
  /** Every category slug on the record, used by the filter bar. */
  categorySlugs: string[];
  kind: ItemKind;
  location: string | null;
  duration: string | null;
  description: string | null;
  priceText: string;
  hero: {
    id: string;
    src: string;
    width: number;
    height: number;
    alt: string;
    blurDataUrl: string | null;
    caption: string | null;
    credit: string | null;
  } | null;
};

export function PackageCard({
  item,
  sizes,
  whatsappE164,
  className,
}: {
  item: PackageItem;
  sizes: string;
  whatsappE164: string | null;
  className?: string;
}) {
  const meta = [item.location, item.duration].filter(Boolean).join(" · ");
  return (
    <article className={cn("group/card relative flex flex-col", className)}>
      <Plate
        media={item.hero}
        ratio="landscape"
        sizes={sizes}
        band="paper"
        label={item.hero ? item.name : undefined}
        className="group-hover/card:after:inset-[calc(var(--spacing-band)-1px)]"
        imageClassName="transition-[transform] duration-(--duration-slow) ease-(--ease-out-expo) group-hover/card:scale-[1.035]"
      />

      <div className="mt-3.5 flex flex-1 flex-col">
        {item.category ? <Inscription className="mb-1.5 uppercase tracking-[0.1em]">{item.category}</Inscription> : null}

        <h3 className="font-display text-subtitle text-ink transition-colors duration-(--duration-fast) group-hover/card:text-terracotta-700">
          <Link href={item.href} className="before:absolute before:inset-0 before:content-['']">
            <span className="lines-2">{item.name}</span>
          </Link>
        </h3>

        {meta ? <Inscription className="mt-1">{meta}</Inscription> : null}

        {item.description ? <p className="mt-2 line-clamp-3 text-small text-ink-2">{item.description}</p> : null}

        <p className="mt-3 font-sans text-caption font-semibold tracking-[0.04em] text-ink">{item.priceText}</p>

        <div className="mt-3.5 flex flex-wrap items-center gap-x-5 gap-y-2 pt-0.5">
          <span className="inline-flex items-center gap-1.5 text-small font-semibold text-terracotta-700">
            View details
            <ArrowRight className="size-3.5 transition-transform duration-(--duration-fast) group-hover/card:translate-x-0.5" strokeWidth={1.75} aria-hidden="true" />
          </span>

          {whatsappE164 ? (
            <a
              href={whatsappHref(whatsappE164, whatsappMessage({ entityName: item.name, url: absoluteUrl(item.href) }))}
              target="_blank"
              rel="noopener noreferrer"
              className="relative z-10 inline-flex items-center gap-1.5 text-small font-semibold text-ink-2 underline-offset-4 hover:text-ink hover:underline"
            >
              <MessageCircle className="size-3.5" strokeWidth={1.75} aria-hidden="true" />
              Enquire on WhatsApp
              <span className="sr-only"> about {item.name}</span>
            </a>
          ) : null}
        </div>
      </div>
    </article>
  );
}
