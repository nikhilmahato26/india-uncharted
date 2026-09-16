"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ChevronDown, ChevronUp, Copy, ExternalLink, Pencil, Search } from "lucide-react";
import type { EntityKey } from "@/lib/admin/registry";
import { duplicateEntity, moveEntity, setEntityStatus } from "@/app/actions/content";
import { StatusPill } from "./ui";
import { Input } from "@/components/ui/field";
import { cn } from "@/lib/cn";

export type ListRow = {
  id: string;
  title: string;
  status: string;
  publicPath: string | null;
  cells: { key: string; value: string }[];
  canPublish: boolean;
};

/**
 * The shared list screen. A table on a desktop, cards on a phone — the owner
 * edits from both. The publish switch takes effect immediately and says so.
 */
export function EntityList({
  entityKey,
  rows,
  columns,
  canOrder,
  canPublish,
}: {
  entityKey: EntityKey;
  rows: ListRow[];
  columns: { key: string; label: string; className?: string }[];
  canOrder: boolean;
  canPublish: boolean;
}) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PUBLISHED" | "DRAFT" | "ARCHIVED">("ALL");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  // With the Live/Draft switch in every row, a status column would say the same
  // thing twice; without the right to publish, the badge is the only statement.
  const shownColumns = canPublish ? columns.filter((c) => c.key !== "status") : columns;

  const filtered = rows.filter((r) => {
    const matchesQuery = !query || `${r.title} ${r.cells.map((c) => c.value).join(" ")}`.toLowerCase().includes(query.toLowerCase());
    const matchesStatus = statusFilter === "ALL" || r.status === statusFilter;
    return matchesQuery && matchesStatus;
  });

  const run = (fn: () => Promise<unknown>) => {
    setError(null);
    startTransition(async () => {
      try {
        await fn();
        router.refresh();
      } catch (e) {
        setError(e instanceof Error ? e.message : "That didn't work.");
      }
    });
  };

  return (
    <div className={cn(pending && "opacity-70")}>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-3" strokeWidth={1.75} aria-hidden="true" />
          <label htmlFor="list-search" className="sr-only">
            Search
          </label>
          <Input id="list-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search…" className="pl-9" />
        </div>
        <div className="flex gap-1">
          {(["ALL", "PUBLISHED", "DRAFT", "ARCHIVED"] as const).map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(s)}
              aria-pressed={statusFilter === s}
              className={cn(
                "min-h-11 border px-3 text-caption font-semibold transition-colors",
                statusFilter === s ? "border-ink bg-ink text-paper" : "border-ink/20 text-ink-2 hover:border-ink/40",
              )}
            >
              {s === "ALL" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <p role="alert" className="mb-4 border border-danger/40 bg-danger-soft px-4 py-3 text-small text-danger">
          {error}
        </p>
      ) : null}

      <p className="mb-3 text-caption text-ink-3">
        {filtered.length} of {rows.length}
      </p>

      {/* desktop */}
      <div className="hidden overflow-x-auto border border-rule bg-paper lg:block">
        <table className="w-full text-small">
          <thead>
            <tr className="border-b border-rule bg-paper-2 text-left">
              {shownColumns.map((c) => (
                <th key={c.key} scope="col" className="px-4 py-3 font-semibold text-ink">
                  {c.label}
                </th>
              ))}
              <th scope="col" className="px-4 py-3 text-right font-semibold text-ink">
                Actions
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((row, i) => (
              <tr key={row.id} className="border-b border-rule last:border-b-0 hover:bg-paper-2/60">
                {shownColumns.map((c, ci) => (
                  <td key={c.key} className={cn("px-4 py-3 align-middle", c.className)}>
                    {ci === 0 ? (
                      <Link href={`/admin/${entityKey}/${row.id}`} className="font-semibold text-ink hover:text-terracotta-700">
                        {row.title}
                      </Link>
                    ) : c.key === "status" ? (
                      <StatusPill status={row.status} />
                    ) : (
                      <span className="text-ink-2">{row.cells.find((cell) => cell.key === c.key)?.value ?? "—"}</span>
                    )}
                  </td>
                ))}
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-1">
                    {canOrder ? (
                      <>
                        <IconButton label="Move up" disabled={i === 0} onClick={() => run(() => moveEntity(entityKey, row.id, "up"))}>
                          <ChevronUp className="size-4" strokeWidth={1.75} />
                        </IconButton>
                        <IconButton label="Move down" disabled={i === filtered.length - 1} onClick={() => run(() => moveEntity(entityKey, row.id, "down"))}>
                          <ChevronDown className="size-4" strokeWidth={1.75} />
                        </IconButton>
                      </>
                    ) : null}
                    {row.publicPath && row.status === "PUBLISHED" ? (
                      <a
                        href={row.publicPath}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex size-9 items-center justify-center text-ink-2 hover:text-ink"
                        aria-label={`View ${row.title} on the site`}
                        title="View on the site"
                      >
                        <ExternalLink className="size-4" strokeWidth={1.75} />
                      </a>
                    ) : null}
                    <IconButton label={`Duplicate ${row.title}`} onClick={() => run(() => duplicateEntity(entityKey, row.id))}>
                      <Copy className="size-4" strokeWidth={1.75} />
                    </IconButton>
                    <Link href={`/admin/${entityKey}/${row.id}`} className="flex size-9 items-center justify-center text-ink-2 hover:text-ink" aria-label={`Edit ${row.title}`} title="Edit">
                      <Pencil className="size-4" strokeWidth={1.75} />
                    </Link>
                    {canPublish ? (
                      <PublishSwitch
                        checked={row.status === "PUBLISHED"}
                        label={row.title}
                        onChange={(next) => run(() => setEntityStatus(entityKey, row.id, next ? "PUBLISHED" : "DRAFT"))}
                      />
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* mobile */}
      <ul className="grid gap-3 lg:hidden">
        {filtered.map((row) => (
          <li key={row.id} className="border border-rule bg-paper p-4">
            <div className="flex items-start justify-between gap-3">
              <Link href={`/admin/${entityKey}/${row.id}`} className="font-semibold text-ink">
                {row.title}
              </Link>
              {canPublish ? null : <StatusPill status={row.status} />}
            </div>
            <p className="mt-1 text-caption text-ink-3">{row.cells.filter((c) => c.key !== "status" && c.value).map((c) => c.value).join(" · ")}</p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <Link href={`/admin/${entityKey}/${row.id}`} className="text-caption font-semibold text-terracotta-700 underline underline-offset-4">
                Edit
              </Link>
              {row.publicPath && row.status === "PUBLISHED" ? (
                <a href={row.publicPath} target="_blank" rel="noopener noreferrer" className="text-caption text-ink-2 underline underline-offset-4">
                  View
                </a>
              ) : null}
              {canPublish ? (
                <PublishSwitch
                  checked={row.status === "PUBLISHED"}
                  label={row.title}
                  onChange={(next) => run(() => setEntityStatus(entityKey, row.id, next ? "PUBLISHED" : "DRAFT"))}
                />
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function IconButton({ label, children, onClick, disabled }: { label: string; children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      className="flex size-9 items-center justify-center text-ink-2 transition-colors hover:text-ink disabled:opacity-30"
    >
      {children}
    </button>
  );
}

/** A switch, so it applies at once — never a checkbox that waits for Save. */
function PublishSwitch({ checked, label, onChange }: { checked: boolean; label: string; onChange: (next: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center gap-2">
      <span className="sr-only">{checked ? `Unpublish ${label}` : `Publish ${label}`}</span>
      <input type="checkbox" role="switch" checked={checked} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
      <span
        aria-hidden="true"
        className="relative h-6 w-11 border border-ink/25 bg-paper-3 transition-colors peer-checked:border-success peer-checked:bg-success peer-checked:[&>span]:translate-x-5 peer-focus-visible:outline-2 peer-focus-visible:outline-terracotta-600 peer-focus-visible:outline-offset-2"
      >
        <span className="absolute top-0.5 left-0.5 size-4.5 bg-paper transition-transform duration-(--duration-fast)" />
      </span>
      <span className="text-caption text-ink-3">{checked ? "Live" : "Draft"}</span>
    </label>
  );
}
