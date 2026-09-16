"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/cn";

type Item = {
  slug: string;
  name: string;
  tagline: string | null;
  destinationCount: number;
  journeyCount: number;
  image: { src: string; alt: string; blurDataUrl: string | null } | null;
};

/**
 * Regions as a run of folio plates: scroll-snapped and swipeable, with arrow
 * controls on pointer devices. Native scrolling, so keyboard and touch work
 * without our help.
 */
export function RegionCarousel({ items }: { items: Item[] }) {
  const track = useRef<HTMLUListElement>(null);
  const [edge, setEdge] = useState<{ start: boolean; end: boolean }>({ start: true, end: false });

  const update = useCallback(() => {
    const el = track.current;
    if (!el) return;
    setEdge({ start: el.scrollLeft < 8, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 8 });
  }, []);

  useEffect(() => {
    update();
    const el = track.current;
    if (!el) return;
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [update]);

  const scrollBy = (dir: 1 | -1) => {
    const el = track.current;
    if (!el) return;
    const card = el.querySelector("li");
    const step = card ? card.getBoundingClientRect().width + 24 : el.clientWidth * 0.8;
    el.scrollBy({ left: dir * step * 2, behavior: "smooth" });
  };

  return (
    <div className="relative">
      <ul
        ref={track}
        className="flex snap-x snap-mandatory gap-6 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {items.map((r) => (
          <li key={r.slug} className="w-[85%] shrink-0 snap-start sm:w-[44%] lg:w-[23rem]">
            <Link href={`/regions/${r.slug}`} className="group/card block">
              <div className="folio [--band:var(--color-forest-800)] group-hover/card:after:inset-[calc(var(--spacing-band)-1px)]">
                <div className="relative aspect-[3/4] overflow-hidden bg-paper-3">
                  {r.image ? (
                    <Image
                      src={r.image.src}
                      alt={r.image.alt}
                      fill
                      sizes="(max-width: 640px) 85vw, (max-width: 1024px) 44vw, 23rem"
                      placeholder={r.image.blurDataUrl ? "blur" : "empty"}
                      blurDataURL={r.image.blurDataUrl ?? undefined}
                      className="object-cover transition-transform duration-(--duration-slow) ease-(--ease-out-expo) group-hover/card:scale-[1.04]"
                    />
                  ) : null}
                  <div aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(to_top,rgb(18_14_10/0.75),transparent_55%)]" />
                  <div className="absolute inset-x-0 bottom-0 p-5">
                    <h3 className="font-display text-title text-paper">{r.name}</h3>
                    {r.tagline ? <p className="mt-1 text-caption text-paper/80">{r.tagline}</p> : null}
                  </div>
                </div>
              </div>
              <p className="mt-3 text-caption text-ink-3">
                {r.destinationCount} {r.destinationCount === 1 ? "destination" : "destinations"}
                {r.journeyCount ? ` · ${r.journeyCount} journeys` : ""}
              </p>
            </Link>
          </li>
        ))}
      </ul>

      <div className="mt-6 hidden gap-2 md:flex">
        <button
          type="button"
          onClick={() => scrollBy(-1)}
          disabled={edge.start}
          aria-label="Previous regions"
          className={cn("flex size-11 items-center justify-center border border-ink/25 text-ink transition-colors", edge.start ? "opacity-35" : "hover:bg-paper-2")}
        >
          <ChevronLeft className="size-5" strokeWidth={1.5} />
        </button>
        <button
          type="button"
          onClick={() => scrollBy(1)}
          disabled={edge.end}
          aria-label="Next regions"
          className={cn("flex size-11 items-center justify-center border border-ink/25 text-ink transition-colors", edge.end ? "opacity-35" : "hover:bg-paper-2")}
        >
          <ChevronRight className="size-5" strokeWidth={1.5} />
        </button>
      </div>
    </div>
  );
}
