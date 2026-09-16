import Link from "next/link";
import type { DestinationCard } from "@/lib/content/cards";
import { cn } from "@/lib/cn";

/**
 * Where India Uncharted works, plotted by real coordinates on a survey
 * graticule. Deliberately no political boundaries: a map of India must follow
 * Survey of India-approved borders, so until the client supplies a compliant
 * outline we plot places, not lines. Pure CSS — hover and focus reveal labels.
 */

const PAD = 1.6; // degrees of breathing room around the outermost places

export function DestinationPlot({ destinations, className }: { destinations: DestinationCard[]; className?: string }) {
  const plotted = destinations.filter((d) => d.coords).slice(0, 60);
  if (plotted.length < 6) return null;

  const lats = plotted.map((d) => d.coords!.lat);
  const lngs = plotted.map((d) => d.coords!.lng);
  const bounds = {
    minLat: Math.min(...lats) - PAD,
    maxLat: Math.max(...lats) + PAD,
    minLng: Math.min(...lngs) - PAD,
    maxLng: Math.max(...lngs) + PAD,
  };
  // Plot inside a 4% inset so a pin on the edge — and its 10px hit area — stays
  // within the frame instead of widening the page on a phone.
  const INSET = 4;
  const project = (lat: number, lng: number) => ({
    x: INSET + ((lng - bounds.minLng) / (bounds.maxLng - bounds.minLng)) * (100 - INSET * 2),
    y: INSET + ((bounds.maxLat - lat) / (bounds.maxLat - bounds.minLat)) * (100 - INSET * 2),
  });

  const ticks = (min: number, max: number) => {
    const out: number[] = [];
    for (let v = Math.ceil(min / 5) * 5; v <= max; v += 5) out.push(v);
    return out;
  };
  const latTicks = ticks(bounds.minLat, bounds.maxLat);
  const lngTicks = ticks(bounds.minLng, bounds.maxLng);

  return (
    <figure className={cn("relative", className)}>
      <div className="relative aspect-4/5 w-full overflow-hidden border border-paper/20 bg-forest-950/60 sm:aspect-16/11">
        <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 size-full" aria-hidden="true">
          {latTicks.map((lat) => (
            <line key={`lat-${lat}`} x1="0" y1={project(lat, 0).y} x2="100" y2={project(lat, 0).y} stroke="currentColor" className="text-paper/12" strokeWidth="0.12" />
          ))}
          {lngTicks.map((lng) => (
            <line key={`lng-${lng}`} x1={project(0, lng).x} y1="0" x2={project(0, lng).x} y2="100" stroke="currentColor" className="text-paper/12" strokeWidth="0.12" />
          ))}
        </svg>

        {latTicks.map((lat) => (
          <span key={`latlabel-${lat}`} style={{ top: `${project(lat, 0).y}%` }} className="pointer-events-none absolute left-1.5 -translate-y-1/2 text-caption text-paper/35 tabular">
            {lat}°N
          </span>
        ))}
        {lngTicks.map((lng) => (
          <span key={`lnglabel-${lng}`} style={{ left: `${project(0, lng).x}%` }} className="pointer-events-none absolute bottom-1 -translate-x-1/2 text-caption text-paper/35 tabular">
            {lng}°E
          </span>
        ))}

        {plotted.map((d) => {
          const { x, y } = project(d.coords!.lat, d.coords!.lng);
          const flip = x > 62;
          return (
            <Link
              key={d.slug}
              href={d.href}
              style={{ left: `${x}%`, top: `${y}%` }}
              tabIndex={-1}
              aria-hidden="true"
              className="group/pin pointer-events-none absolute z-raised hidden -translate-x-1/2 -translate-y-1/2 p-3 md:block md:pointer-events-auto"
            >
              <span
                aria-hidden="true"
                className={cn(
                  "block size-2 rotate-45 border transition-transform duration-(--duration-base) ease-(--ease-out-expo)",
                  d.isOffbeat ? "border-gold-300 bg-transparent" : "border-terracotta-400 bg-terracotta-500",
                  "group-hover/pin:scale-150 group-focus-visible/pin:scale-150",
                )}
              />
              <span
                aria-hidden="true"
                className={cn(
                  "pointer-events-none absolute top-1/2 z-sticky -translate-y-1/2 whitespace-nowrap bg-ink/90 px-2 py-1 text-caption text-paper opacity-0 transition-opacity duration-(--duration-fast) group-hover/pin:opacity-100 group-focus-visible/pin:opacity-100",
                  flip ? "right-full mr-1" : "left-full ml-1",
                )}
              >
                {d.name}
                {d.journeyCount ? ` · ${d.journeyCount} journeys` : ""}
              </span>
            </Link>
          );
        })}
      </div>
      {/* The pins sit on top of each other where places are close together, which makes
          them unreliable as touch targets. The same places are listed here as ordinary
          links — readable on a phone and by a screen reader. */}
      <ul className="mt-5 flex flex-wrap gap-x-4 gap-y-1.5">
        {plotted.map((d) => (
          <li key={d.slug}>
            <Link href={d.href} className="inline-flex min-h-9 items-center text-caption text-paper/80 underline decoration-paper/25 underline-offset-4 hover:text-paper hover:decoration-paper">
              {d.name}
            </Link>
          </li>
        ))}
      </ul>

      <figcaption className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-2 text-caption text-paper/70">
        <span className="inline-flex items-center gap-2">
          <span aria-hidden="true" className="size-2 rotate-45 border border-terracotta-400 bg-terracotta-500" />
          Destination we travel
        </span>
        <span className="inline-flex items-center gap-2">
          <span aria-hidden="true" className="size-2 rotate-45 border border-gold-300" />
          Quieter stop
        </span>
        <span className="text-paper/55">Plotted by coordinates — no boundaries drawn</span>
      </figcaption>
    </figure>
  );
}
