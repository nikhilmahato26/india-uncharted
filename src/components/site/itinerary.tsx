"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * The day-by-day plan as continuous narration: one unbroken rule down the
 * page, a lozenge per day, and the day you are reading lit as you scroll.
 * Content is fully rendered and readable without JavaScript.
 */
export function Itinerary({
  days,
}: {
  days: { id: string; label: string; title: string; overnight: string | null; meals: string | null; body: ReactNode }[];
}) {
  const [active, setActive] = useState(0);
  const refs = useRef<(HTMLLIElement | null)[]>([]);

  useEffect(() => {
    if (typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (!visible) return;
        const index = refs.current.findIndex((el) => el === visible.target);
        if (index >= 0) setActive(index);
      },
      { rootMargin: "-25% 0px -60% 0px", threshold: 0 },
    );
    for (const el of refs.current) if (el) observer.observe(el);
    return () => observer.disconnect();
  }, [days.length]);

  return (
    <ol className="relative">
      <span aria-hidden="true" className="absolute top-2 bottom-2 left-[7px] w-px bg-rule sm:left-[9px]" />
      {days.map((day, i) => (
        <li
          key={day.id}
          ref={(el) => {
            refs.current[i] = el;
          }}
          className="relative pb-10 pl-8 last:pb-0 sm:pl-12"
        >
          <span
            aria-hidden="true"
            className={cn(
              "absolute top-1.5 left-0 size-4 rotate-45 border transition-[background-color,border-color,transform] duration-(--duration-base) ease-(--ease-out-expo) sm:size-5",
              i === active ? "scale-110 border-terracotta-600 bg-terracotta-600" : "border-rule bg-paper",
            )}
          />
          <p className={cn("text-label uppercase transition-colors duration-(--duration-base)", i === active ? "text-terracotta-700" : "text-ink-3")}>{day.label}</p>
          <h3 className="mt-1.5 font-display text-title text-ink">{day.title}</h3>
          {day.overnight || day.meals ? (
            <p className="mt-1 text-caption text-ink-3">{[day.overnight ? `Overnight in ${day.overnight}` : null, day.meals].filter(Boolean).join(" · ")}</p>
          ) : null}
          <div className="mt-3">{day.body}</div>
        </li>
      ))}
    </ol>
  );
}
