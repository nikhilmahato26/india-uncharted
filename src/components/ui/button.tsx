import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Buttons carry the folio grammar: a square plate with a hairline rule set
 * 3px inside it. On hover the rule breathes outward — the frame, not a glow.
 */

type Variant = "primary" | "secondary" | "ghost" | "on-dark" | "on-dark-solid";
type Size = "md" | "lg" | "sm";

const base =
  "group/btn relative inline-flex items-center justify-center gap-2.5 whitespace-nowrap font-sans font-semibold tracking-[0.01em] select-none " +
  "transition-[background-color,color,box-shadow] duration-(--duration-fast) ease-(--ease-out-expo) " +
  "before:pointer-events-none before:absolute before:inset-[3px] before:border before:transition-[inset,border-color] before:duration-(--duration-base) before:ease-(--ease-out-expo) " +
  "hover:before:inset-[5px] disabled:cursor-not-allowed disabled:opacity-45 aria-disabled:cursor-not-allowed aria-disabled:opacity-45";

const variants: Record<Variant, string> = {
  primary: "bg-terracotta-600 text-paper before:border-terracotta-300/55 hover:bg-terracotta-700 active:bg-terracotta-800",
  secondary: "bg-paper text-ink border border-ink/80 before:border-transparent hover:bg-paper-2 hover:before:border-ink/25",
  ghost: "bg-transparent text-ink before:border-transparent hover:bg-paper-2",
  "on-dark": "bg-transparent text-paper border border-paper/70 before:border-transparent hover:bg-paper/10 hover:before:border-paper/35",
  "on-dark-solid": "bg-paper text-ink before:border-ink/15 hover:bg-gold-100",
};

const sizes: Record<Size, string> = {
  sm: "min-h-10 px-4 text-small",
  md: "min-h-12 px-6 text-small",
  lg: "min-h-14 px-8 text-body",
};

export function buttonClasses({ variant = "primary", size = "md", className }: { variant?: Variant; size?: Size; className?: string } = {}) {
  return cn(base, variants[variant], sizes[size], className);
}

type ButtonProps = ComponentProps<"button"> & { variant?: Variant; size?: Size; loading?: boolean; icon?: ReactNode };

export function Button({ variant, size, loading, icon, className, children, disabled, ...rest }: ButtonProps) {
  return (
    <button
      {...rest}
      disabled={disabled}
      aria-busy={loading || undefined}
      className={buttonClasses({ variant, size, className: cn(loading && "cursor-progress", className) })}
    >
      {loading ? <Spinner /> : icon}
      <span>{children}</span>
    </button>
  );
}

type LinkButtonProps = Omit<ComponentProps<typeof Link>, "className"> & {
  variant?: Variant;
  size?: Size;
  icon?: ReactNode;
  iconAfter?: ReactNode;
  className?: string;
};

export function LinkButton({ variant, size, icon, iconAfter, className, children, ...rest }: LinkButtonProps) {
  return (
    <Link {...rest} className={buttonClasses({ variant, size, className })}>
      {icon}
      <span>{children}</span>
      {iconAfter}
    </Link>
  );
}

export function Spinner({ className }: { className?: string }) {
  return (
    <svg className={cn("size-4 animate-spin", className)} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2.5" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="square" />
    </svg>
  );
}

/** Text link with an arrow that advances on hover — for "View all" style actions. */
export function ArrowLink({ href, children, className, tone = "ink" }: { href: string; children: ReactNode; className?: string; tone?: "ink" | "paper" }) {
  return (
    <Link
      href={href}
      className={cn(
        "group/arrow inline-flex min-h-11 items-center gap-2 font-sans text-small font-semibold",
        tone === "ink" ? "text-terracotta-700 hover:text-terracotta-800" : "text-gold-200 hover:text-paper",
        className,
      )}
    >
      <span className="underline decoration-current/35 underline-offset-[0.3em] group-hover/arrow:decoration-current">{children}</span>
      <svg viewBox="0 0 20 10" className="h-2.5 w-5 transition-transform duration-(--duration-base) ease-(--ease-out-expo) group-hover/arrow:translate-x-1" aria-hidden="true">
        <path d="M0 5h18M14 1l4 4-4 4" fill="none" stroke="currentColor" strokeWidth="1.4" />
      </svg>
    </Link>
  );
}
