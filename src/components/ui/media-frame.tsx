import Image from "next/image";
import type { MediaSource } from "@/lib/content/media";
import { cn } from "@/lib/cn";
import { SunMark } from "@/components/brand/marks";

/**
 * The only component that renders a photograph. Fixed aspect ratios, blur-up,
 * and an honest empty state for places that don't have a photograph yet.
 */

const ratios = {
  hero: "aspect-[4/5] sm:aspect-[16/10] lg:aspect-[21/9]",
  wide: "aspect-[3/2]",
  landscape: "aspect-[4/3]",
  portrait: "aspect-[4/5]",
  tall: "aspect-[3/4]",
  square: "aspect-square",
  /** Landscape on a phone, tall from small screens up — used for theme cards. */
  themeCard: "aspect-3/2 sm:aspect-3/4",
  fill: "absolute inset-0",
} as const;

export type Ratio = keyof typeof ratios;

type Props = {
  media: MediaSource | null;
  ratio?: Ratio;
  sizes: string;
  priority?: boolean;
  className?: string;
  imageClassName?: string;
  /** Shown in the empty state so the frame still says what belongs there. */
  label?: string;
  scrim?: "none" | "bottom" | "top-bottom" | "full";
  quality?: 70 | 75 | 80;
};

export function MediaFrame({ media, ratio = "wide", sizes, priority, className, imageClassName, label, scrim = "none", quality = 75 }: Props) {
  return (
    <div className={cn("relative overflow-hidden bg-paper-3", ratio !== "fill" && ratios[ratio], ratio === "fill" && ratios.fill, className)}>
      {media ? (
        <Image
          src={media.src}
          alt={media.alt}
          fill
          sizes={sizes}
          priority={priority}
          quality={quality}
          placeholder={media.blurDataUrl ? "blur" : "empty"}
          blurDataURL={media.blurDataUrl ?? undefined}
          className={cn("object-cover", imageClassName)}
        />
      ) : (
        <div className="absolute inset-0 grid place-items-center bg-paper-3 text-ink-3" role="img" aria-label={label ? `${label} — photograph to come` : "Photograph to come"}>
          <div className="flex flex-col items-center gap-2 px-4 text-center">
            <SunMark className="size-8 text-terracotta-600/60" />
            {label ? <span className="font-display text-subtitle text-ink-2">{label}</span> : null}
          </div>
        </div>
      )}
      {media && scrim !== "none" ? (
        <div
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute inset-0",
            scrim === "bottom" && "bg-[linear-gradient(to_top,rgb(18_14_10/0.72)_0%,rgb(18_14_10/0.25)_38%,transparent_62%)]",
            scrim === "top-bottom" &&
              "bg-[linear-gradient(to_bottom,rgb(18_14_10/0.55)_0%,transparent_22%,transparent_55%,rgb(18_14_10/0.7)_100%)]",
            scrim === "full" && "bg-ink/45",
          )}
        />
      ) : null}
    </div>
  );
}
