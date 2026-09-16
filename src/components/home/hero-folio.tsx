"use client";

import Image from "next/image";
import { useEffect, useRef } from "react";
import type { MediaSource } from "@/lib/content/media";
import { LinkButton } from "@/components/ui/button";

/**
 * The folio opens: the border band draws inward, the plate settles from a
 * slight scale, the cartouche rises, and the inscription is written across the
 * bottom band. On scroll the plate drifts behind its frame.
 * Everything is visible without JavaScript; the animation only adds motion.
 */
export function HeroFolio({
  media,
  title,
  lead,
  inscription,
  caption,
  primary,
  secondary,
}: {
  media: MediaSource | null;
  title: { lead: string; accent: string };
  lead: string;
  inscription: string;
  caption: string | null;
  primary: { label: string; href: string };
  secondary: { label: string; href: string };
}) {
  const root = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLDivElement>(null);
  const plate = useRef<HTMLDivElement>(null);
  const cartouche = useRef<HTMLDivElement>(null);
  const band = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let ctx: { revert: () => void } | undefined;
    let cancelled = false;

    (async () => {
      const [{ gsap }, { ScrollTrigger }] = await Promise.all([import("gsap"), import("gsap/ScrollTrigger")]);
      if (cancelled) return;
      gsap.registerPlugin(ScrollTrigger);
      ctx = gsap.context(() => {
        const bandSize = getComputedStyle(document.documentElement).getPropertyValue("--spacing-band") || "12px";
        gsap.fromTo(frame.current, { padding: 0 }, { padding: bandSize.trim(), duration: 1.1, ease: "expo.out" });
        gsap.fromTo(plate.current, { scale: 1.08 }, { scale: 1, duration: 1.6, ease: "expo.out" });
        gsap.fromTo(cartouche.current, { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.9, ease: "expo.out", delay: 0.25 });
        gsap.fromTo(
          band.current,
          { clipPath: "inset(0 100% 0 0)" },
          { clipPath: "inset(0 0% 0 0)", duration: 1.1, ease: "expo.out", delay: 0.5 },
        );
        gsap.to(plate.current, {
          yPercent: 8,
          ease: "none",
          scrollTrigger: { trigger: root.current, start: "top top", end: "bottom top", scrub: true },
        });
      }, root);
    })();

    return () => {
      cancelled = true;
      ctx?.revert();
    };
  }, []);

  return (
    <div ref={root} className="on-dark relative bg-paper p-(--spacing-band) pt-0" data-surface="dark">
      <div ref={frame} className="pearl-band relative h-[100svh] max-h-[62rem] min-h-[34rem] w-full p-(--spacing-band) [--band:var(--color-terracotta-600)]">
        <div className="relative h-full overflow-hidden bg-ink outline outline-gold-300/60 -outline-offset-1">
          <div ref={plate} className="absolute inset-0 will-change-transform">
            {media ? (
              <Image
                src={media.src}
                alt={media.alt}
                fill
                priority
                quality={80}
                sizes="100vw"
                placeholder={media.blurDataUrl ? "blur" : "empty"}
                blurDataURL={media.blurDataUrl ?? undefined}
                className="object-cover object-[50%_32%] sm:object-[50%_40%]"
              />
            ) : null}
          </div>
          <div
            aria-hidden="true"
            className="absolute inset-0 bg-[linear-gradient(to_top,rgb(18_14_10/0.82)_0%,rgb(18_14_10/0.42)_34%,rgb(18_14_10/0.12)_58%,rgb(18_14_10/0.55)_100%)]"
          />

          <div className="absolute inset-x-0 bottom-0 flex flex-col">
            <div className="container-folio pb-6 sm:pb-10">
              <div ref={cartouche} className="max-w-[38rem] bg-paper p-6 outline outline-gold-500/70 -outline-offset-[6px] sm:p-9">
                <h1 className="text-display-xl text-ink">
                  {title.lead} <span className="font-display-italic text-terracotta-700">{title.accent}</span>
                </h1>
                <p className="mt-4 max-w-md text-body text-ink-2 sm:text-lead">{lead}</p>
                <div className="mt-7 flex flex-col gap-3 sm:flex-row">
                  <LinkButton href={secondary.href} variant="secondary" size="lg" className="sm:min-w-44">
                    {secondary.label}
                  </LinkButton>
                  <LinkButton href={primary.href} variant="primary" size="lg" className="sm:min-w-44">
                    {primary.label}
                  </LinkButton>
                </div>
              </div>
            </div>

            <div ref={band} className="border-t border-gold-300/50 bg-terracotta-700">
              <div aria-hidden="true" className="pearl-band h-1.5 [--band:transparent] [--pearl:var(--color-gold-300)]" />
              <div className="container-folio flex items-baseline justify-between gap-6 py-3">
                <p className="text-label uppercase text-paper">{inscription}</p>
                {caption ? <p className="hidden text-caption text-gold-100 sm:block">{caption}</p> : null}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
