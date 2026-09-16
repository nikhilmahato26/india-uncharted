import Link from "next/link";
import type { ArticleCard as ArticleCardType, DestinationCard as DestinationCardType, ExperienceCard as ExperienceCardType, JourneyCard as JourneyCardType } from "@/lib/content/cards";
import { cn } from "@/lib/cn";
import { Inscription, Plate, RouteLine } from "./primitives";

/**
 * Every card is a plate with its inscription underneath. Hover breathes the
 * gold rule outward and eases the photograph — the frame reacting, not a lift.
 */

const hoverPlate = "transition-[transform] duration-(--duration-slow) ease-(--ease-out-expo) group-hover/card:scale-[1.035]";
const hoverRule = "group-hover/card:after:inset-[calc(var(--spacing-band)-1px)]";

export function DestinationCard({
  destination,
  sizes,
  ratio = "portrait",
  band = "terracotta",
  priority,
  showDescription = false,
  clampTitle = false,
  className,
}: {
  destination: DestinationCardType;
  sizes: string;
  ratio?: "portrait" | "wide" | "landscape" | "tall" | "square";
  band?: "terracotta" | "forest" | "paper";
  priority?: boolean;
  showDescription?: boolean;
  clampTitle?: boolean;
  className?: string;
}) {
  const place = destination.region?.name ?? destination.state;
  const meta = [
    place && place !== destination.name ? place : null,
    destination.journeyCount ? `${destination.journeyCount} ${destination.journeyCount === 1 ? "journey" : "journeys"}` : null,
  ]
    .filter(Boolean)
    .join(" · ");
  return (
    <Link href={destination.href} className={cn("group/card block", className)}>
      <Plate
        media={destination.hero}
        ratio={ratio}
        sizes={sizes}
        band={band}
        priority={priority}
        label={destination.hero ? destination.name : undefined}
        className={hoverRule}
        imageClassName={hoverPlate}
      />
      <div className="mt-3.5">
        <h3 className={cn("font-display text-title text-ink transition-colors duration-(--duration-fast) group-hover/card:text-terracotta-700", clampTitle && "lines-2")}>
          {destination.name}
          {destination.title && !clampTitle ? <span className="font-display-italic text-ink-3"> — {destination.title}</span> : null}
        </h3>
        {meta ? <Inscription className="mt-1">{meta}</Inscription> : null}
        {showDescription && destination.shortDescription ? <p className="mt-2 line-clamp-2 text-small text-ink-2">{destination.shortDescription}</p> : null}
      </div>
    </Link>
  );
}

export function JourneyCard({
  journey,
  sizes,
  ratio = "wide",
  band = "terracotta",
  className,
  showDescription = true,
}: {
  journey: JourneyCardType;
  sizes: string;
  ratio?: "wide" | "landscape" | "portrait";
  band?: "terracotta" | "forest" | "paper";
  className?: string;
  showDescription?: boolean;
}) {
  return (
    <Link href={journey.href} className={cn("group/card block", className)}>
      <Plate media={journey.hero} ratio={ratio} sizes={sizes} band={band} label={journey.hero ? journey.name : undefined} className={hoverRule} imageClassName={hoverPlate} />
      <div className="mt-3.5">
        {journey.durationText ? <Inscription className="mb-1.5 uppercase tracking-[0.1em]">{journey.durationText}</Inscription> : null}
        <h3 className="lines-2 font-display text-title text-ink transition-colors duration-(--duration-fast) group-hover/card:text-terracotta-700">{journey.name}</h3>
        <RouteLine stops={journey.route} max={5} className="mt-2" />
        {showDescription && journey.shortDescription ? <p className="mt-2.5 line-clamp-2 text-small text-ink-2">{journey.shortDescription}</p> : null}
      </div>
    </Link>
  );
}

export function ExperienceCard({ experience, sizes, className }: { experience: ExperienceCardType; sizes: string; className?: string }) {
  const meta = [experience.destination?.name, experience.duration].filter(Boolean).join(" · ");
  return (
    <Link href={experience.href} className={cn("group/card block", className)}>
      <Plate media={experience.hero} ratio="landscape" sizes={sizes} band="paper" label={experience.hero ? experience.name : undefined} className={hoverRule} imageClassName={hoverPlate} />
      <div className="mt-3.5">
        <h3 className="lines-2 font-display text-subtitle text-ink transition-colors duration-(--duration-fast) group-hover/card:text-terracotta-700">{experience.name}</h3>
        {meta ? <Inscription className="mt-1">{meta}</Inscription> : null}
      </div>
    </Link>
  );
}

export function ArticleCard({ article, sizes, className }: { article: ArticleCardType; sizes: string; className?: string }) {
  const date = article.publishedAt ? new Date(article.publishedAt).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" }) : null;
  const meta = [article.category?.name, article.readingMinutes ? `${article.readingMinutes} min read` : null].filter(Boolean).join(" · ");
  return (
    <Link href={article.href} className={cn("group/card block", className)}>
      <Plate media={article.hero} ratio="landscape" sizes={sizes} band="paper" label={article.hero ? article.title : undefined} className={hoverRule} imageClassName={hoverPlate} />
      <div className="mt-3.5">
        {meta ? <Inscription className="mb-1.5 uppercase tracking-[0.1em]">{meta}</Inscription> : null}
        <h3 className="lines-2 font-display text-subtitle text-ink transition-colors duration-(--duration-fast) group-hover/card:text-terracotta-700">{article.title}</h3>
        {article.excerpt ? <p className="mt-2 line-clamp-2 text-small text-ink-2">{article.excerpt}</p> : null}
        {date ? (
          <Inscription className="mt-2">
            <time dateTime={article.publishedAt ?? undefined}>{date}</time>
          </Inscription>
        ) : null}
      </div>
    </Link>
  );
}
