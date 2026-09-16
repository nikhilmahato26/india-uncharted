"use client";

import { useId, type ComponentProps, type ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Form controls in the folio grammar: square, hairline-ruled, with the label
 * always visible and the error message naming the problem.
 */

const controlBase =
  "w-full min-h-12 border border-ink/25 bg-paper px-3.5 py-2.5 text-body text-ink placeholder:text-ink-3/70 " +
  "transition-[border-color,box-shadow] duration-(--duration-fast) focus:border-terracotta-600 focus:outline-none focus:ring-1 focus:ring-terracotta-600 " +
  "aria-[invalid=true]:border-danger disabled:cursor-not-allowed disabled:bg-paper-2 disabled:text-ink-3";

export function Field({
  label,
  hint,
  error,
  required,
  children,
  className,
  htmlFor,
}: {
  label: string;
  hint?: ReactNode;
  error?: string;
  required?: boolean;
  children: ReactNode;
  className?: string;
  htmlFor?: string;
}) {
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={htmlFor} className="text-small font-semibold text-ink">
        {label}
        {required ? (
          <span className="text-terracotta-700" aria-hidden="true">
            {" "}
            *
          </span>
        ) : (
          <span className="font-normal text-ink-3"> (optional)</span>
        )}
      </label>
      {children}
      {/* Under the control, not above it: a hint on one field of a row would
          otherwise push its input out of line with the field beside it. */}
      {hint ? <p className="text-caption text-ink-3">{hint}</p> : null}
      {error ? (
        <p role="alert" className="text-caption text-danger">
          {error}
        </p>
      ) : null}
    </div>
  );
}

export function Input({ className, error, ...rest }: ComponentProps<"input"> & { error?: boolean }) {
  return <input {...rest} aria-invalid={error || undefined} className={cn(controlBase, className)} />;
}

export function Textarea({ className, error, ...rest }: ComponentProps<"textarea"> & { error?: boolean }) {
  return <textarea {...rest} aria-invalid={error || undefined} className={cn(controlBase, "min-h-32 resize-y", className)} />;
}

export function Select({ className, error, children, ...rest }: ComponentProps<"select"> & { error?: boolean }) {
  return (
    <select {...rest} aria-invalid={error || undefined} className={cn(controlBase, "appearance-none bg-[length:0]", className)}>
      {children}
    </select>
  );
}

export function Checkbox({ label, className, id, ...rest }: ComponentProps<"input"> & { label: ReactNode }) {
  const fallbackId = useId();
  const inputId = id ?? fallbackId;
  return (
    <div className={cn("flex items-start gap-3", className)}>
      <input
        {...rest}
        id={inputId}
        type="checkbox"
        className="mt-1 size-5 shrink-0 appearance-none border border-ink/35 bg-paper checked:border-terracotta-600 checked:bg-terracotta-600 checked:bg-[url('data:image/svg+xml;utf8,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 16 16%22 fill=%22none%22 stroke=%22%23f4eddf%22 stroke-width=%222%22><path d=%22M3 8.5l3.5 3.5L13 5%22/></svg>')] bg-center bg-no-repeat focus-visible:outline-2 focus-visible:outline-terracotta-600 focus-visible:outline-offset-2"
      />
      <label htmlFor={inputId} className="text-small text-ink-2">
        {label}
      </label>
    </div>
  );
}

/** Multi-select chips — used for destinations and travel styles. */
export function ChipGroup({ name, options, defaultValue = [] }: { name: string; options: { value: string; label: string }[]; defaultValue?: string[] }) {
  return (
    <fieldset className="flex flex-wrap gap-2">
      {options.map((o) => (
        <label
          key={o.value}
          className="group/chip inline-flex cursor-pointer items-center border border-ink/25 px-3.5 py-2 text-small text-ink-2 transition-colors has-checked:border-terracotta-600 has-checked:bg-terracotta-600 has-checked:text-paper hover:border-ink/45"
        >
          <input type="checkbox" name={name} value={o.value} defaultChecked={defaultValue.includes(o.value)} className="sr-only" />
          {o.label}
        </label>
      ))}
    </fieldset>
  );
}
