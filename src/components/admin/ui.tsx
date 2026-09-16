import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Admin chrome primitives. Quiet by default; colour means state, not decoration. */

export function PageHeader({
  title,
  description,
  actions,
  back,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  back?: { label: string; href: string };
}) {
  return (
    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        {back ? (
          <Link href={back.href} className="mb-2 inline-flex min-h-8 items-center text-caption text-ink-3 underline underline-offset-4 hover:text-ink">
            ← {back.label}
          </Link>
        ) : null}
        <h1 className="font-display text-display-md text-ink">{title}</h1>
        {description ? <p className="measure mt-2 text-small text-ink-2">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}

export function Panel({ title, description, children, className, actions }: { title?: string; description?: ReactNode; children: ReactNode; className?: string; actions?: ReactNode }) {
  return (
    <section className={cn("border border-rule bg-paper", className)}>
      {title ? (
        <div className="flex items-start justify-between gap-4 border-b border-rule px-5 py-4">
          <div>
            <h2 className="font-display text-subtitle text-ink">{title}</h2>
            {description ? <p className="mt-1 text-caption text-ink-3">{description}</p> : null}
          </div>
          {actions}
        </div>
      ) : null}
      <div className="p-5">{children}</div>
    </section>
  );
}

export function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    PUBLISHED: "border-success/40 bg-success-soft text-success",
    DRAFT: "border-warning/40 bg-warning-soft text-warning",
    ARCHIVED: "border-ink/20 bg-paper-3 text-ink-2",
  };
  const label: Record<string, string> = { PUBLISHED: "Published", DRAFT: "Draft", ARCHIVED: "Archived" };
  return <span className={cn("inline-flex items-center border px-2 py-0.5 text-caption font-semibold", map[status] ?? map.DRAFT)}>{label[status] ?? status}</span>;
}

export function Stat({ label, value, href, hint }: { label: string; value: ReactNode; href?: string; hint?: string }) {
  const body = (
    <>
      <p className="text-caption text-ink-3">{label}</p>
      <p className="mt-1 font-display text-display-md text-ink tabular">{value}</p>
      {hint ? <p className="mt-1 text-caption text-ink-3">{hint}</p> : null}
    </>
  );
  return href ? (
    <Link href={href} className="block border border-rule bg-paper p-5 transition-colors hover:border-ink/30 hover:bg-paper-2">
      {body}
    </Link>
  ) : (
    <div className="border border-rule bg-paper p-5">{body}</div>
  );
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="border border-dashed border-rule bg-paper px-6 py-12 text-center">
      <p className="font-display text-subtitle text-ink">{title}</p>
      {description ? <p className="measure mx-auto mt-2 text-small text-ink-2">{description}</p> : null}
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function IssuePill({ fail, warn }: { fail: number; warn: number }) {
  if (!fail && !warn) return <span className="text-caption text-success">✓ No issues</span>;
  return (
    <span className="flex items-center gap-2 text-caption">
      {fail ? <span className="border border-danger/40 bg-danger-soft px-1.5 py-0.5 font-semibold text-danger">{fail} to fix</span> : null}
      {warn ? <span className="border border-warning/40 bg-warning-soft px-1.5 py-0.5 font-semibold text-warning">{warn} to check</span> : null}
    </span>
  );
}
