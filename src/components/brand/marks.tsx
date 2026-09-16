import { cn } from "@/lib/cn";

/**
 * Geometry lifted from the India Uncharted logo — the rising sun and the
 * mountain ridge — drawn as crisp vectors, never as illustration.
 */

export function SunMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={cn("size-6", className)} fill="none" aria-hidden="true">
      <path d="M10 32a14 14 0 0 1 28 0" fill="currentColor" />
      {[-60, -35, -12, 12, 35, 60].map((deg) => (
        <line
          key={deg}
          x1="24"
          y1="12"
          x2="24"
          y2="5"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="square"
          transform={`rotate(${deg} 24 32)`}
        />
      ))}
      <line x1="4" y1="36" x2="44" y2="36" stroke="currentColor" strokeWidth="2" />
    </svg>
  );
}

/** A horizontal rule with the ridge line from the logo at its centre. */
export function RidgeRule({ className, tone = "gold" }: { className?: string; tone?: "gold" | "ink" | "paper" }) {
  const color = tone === "gold" ? "text-gold-500" : tone === "ink" ? "text-ink/40" : "text-paper/45";
  return (
    <div className={cn("flex items-center gap-4", color, className)} aria-hidden="true">
      <span className="h-px flex-1 bg-current" />
      <svg viewBox="0 0 64 16" className="h-4 w-16" fill="none">
        <path d="M0 15 L14 6 L22 11 L34 1 L46 10 L52 7 L64 15" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="miter" />
      </svg>
      <span className="h-px flex-1 bg-current" />
    </div>
  );
}

/** The small diamond used as a route separator and list marker. */
export function Lozenge({ className }: { className?: string }) {
  return <span aria-hidden="true" className={cn("inline-block size-[0.4em] rotate-45 bg-current", className)} />;
}
