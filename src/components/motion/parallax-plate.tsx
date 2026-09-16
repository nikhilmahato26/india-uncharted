"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Scrub-driven drift for full-width plates. The image is fully visible without
 * JavaScript; GSAP only adds the slow travel behind the frame.
 */
export function ParallaxPlate({ children, amount = 10, className }: { children: ReactNode; amount?: number; className?: string }) {
  const root = useRef<HTMLDivElement>(null);
  const inner = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let ctx: { revert: () => void } | undefined;
    let cancelled = false;
    (async () => {
      const [{ gsap }, { ScrollTrigger }] = await Promise.all([import("gsap"), import("gsap/ScrollTrigger")]);
      if (cancelled) return;
      gsap.registerPlugin(ScrollTrigger);
      ctx = gsap.context(() => {
        gsap.fromTo(
          inner.current,
          { yPercent: -amount / 2 },
          { yPercent: amount / 2, ease: "none", scrollTrigger: { trigger: root.current, start: "top bottom", end: "bottom top", scrub: true } },
        );
      }, root);
    })();
    return () => {
      cancelled = true;
      ctx?.revert();
    };
  }, [amount]);

  return (
    <div ref={root} className={className}>
      <div ref={inner} className="h-[112%] will-change-transform">
        {children}
      </div>
    </div>
  );
}
