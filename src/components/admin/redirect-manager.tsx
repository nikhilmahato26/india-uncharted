"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { deleteRedirect, saveRedirect, type SettingsState } from "@/app/actions/seo-settings";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/field";
import { Panel, EmptyState } from "./ui";

type Redirect = { id: string; fromPath: string; toPath: string | null; statusCode: number; origin: string; hits: number; lastHitAt: string | null; note: string | null };
type NotFound = { id: string; path: string; hits: number; lastSeenAt: string; referrer: string | null };

const STATUS_HELP: Record<number, string> = {
  301: "Moved for good (use this for a renamed page)",
  302: "Moved for now",
  307: "Moved for now, keeps the form data",
  308: "Moved for good, keeps the form data",
  410: "Gone — the page has been retired on purpose",
};

export function RedirectManager({ redirects, notFound }: { redirects: Redirect[]; notFound: NotFound[] }) {
  const [state, action, pending] = useActionState<SettingsState, FormData>(saveRedirect, null);
  const [prefill, setPrefill] = useState<string>("");
  const [query, setQuery] = useState("");
  const [, startTransition] = useTransition();
  const router = useRouter();

  const filtered = redirects.filter((r) => !query || `${r.fromPath} ${r.toPath ?? ""}`.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="grid gap-6">
      <Panel title="Add a redirect">
        <form action={action} className="grid gap-4 lg:grid-cols-[1fr_1fr_12rem_auto] lg:items-end">
          <Field label="Old address" htmlFor="fromPath" hint="Starts with / — for example /old-rajasthan-tour">
            <Input id="fromPath" name="fromPath" key={prefill} defaultValue={prefill} placeholder="/old-page" />
          </Field>
          <Field label="Goes to" htmlFor="toPath" hint="Where it should land now.">
            <Input id="toPath" name="toPath" placeholder="/journeys/rajasthan-motorcycle-tour" />
          </Field>
          <Field label="Type" htmlFor="statusCode">
            <Select id="statusCode" name="statusCode" defaultValue="301">
              {[301, 302, 307, 308, 410].map((c) => (
                <option key={c} value={c}>
                  {c} — {STATUS_HELP[c]}
                </option>
              ))}
            </Select>
          </Field>
          <Button type="submit" loading={pending}>
            Save redirect
          </Button>
        </form>
        {state?.ok ? (
          <p role="status" className="mt-3 text-small text-success">
            {state.message}
          </p>
        ) : null}
        {state && !state.ok ? (
          <p role="alert" className="mt-3 text-small text-danger">
            {state.error}
          </p>
        ) : null}
      </Panel>

      {notFound.length ? (
        <Panel title="Pages people asked for that don't exist" description="Recorded from real visits. Point the useful ones somewhere.">
          <ul className="divide-y divide-rule">
            {notFound.map((n) => (
              <li key={n.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate font-mono text-small text-ink">{n.path}</p>
                  <p className="text-caption text-ink-3">
                    {n.hits} {n.hits === 1 ? "visit" : "visits"} · last seen {new Date(n.lastSeenAt).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                    {n.referrer ? ` · from ${n.referrer}` : ""}
                  </p>
                </div>
                <button type="button" onClick={() => setPrefill(n.path)} className="min-h-11 px-2 text-small font-semibold text-terracotta-700 underline underline-offset-4">
                  Create a redirect
                </button>
              </li>
            ))}
          </ul>
        </Panel>
      ) : null}

      <Panel title={`Redirects (${redirects.length})`}>
        <div className="mb-4">
          <label htmlFor="redirect-search" className="sr-only">
            Search redirects
          </label>
          <Input id="redirect-search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search addresses…" />
        </div>
        {filtered.length ? (
          <div className="overflow-x-auto">
            <table className="w-full text-small">
              <thead>
                <tr className="border-b border-rule text-left">
                  <th scope="col" className="py-2 pr-4 font-semibold text-ink">
                    From
                  </th>
                  <th scope="col" className="py-2 pr-4 font-semibold text-ink">
                    To
                  </th>
                  <th scope="col" className="py-2 pr-4 font-semibold text-ink">
                    Type
                  </th>
                  <th scope="col" className="py-2 pr-4 font-semibold text-ink">
                    Used
                  </th>
                  <th scope="col" className="py-2 font-semibold text-ink">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className="border-b border-rule last:border-b-0">
                    <td className="py-2.5 pr-4 font-mono text-caption text-ink">{r.fromPath}</td>
                    <td className="py-2.5 pr-4 font-mono text-caption text-ink-2">{r.toPath ?? "— gone —"}</td>
                    <td className="py-2.5 pr-4 text-caption text-ink-3">{r.statusCode}</td>
                    <td className="py-2.5 pr-4 text-caption text-ink-3 tabular">{r.hits}</td>
                    <td className="py-2.5 text-right">
                      <button
                        type="button"
                        onClick={() => startTransition(async () => { await deleteRedirect(r.id); router.refresh(); })}
                        aria-label={`Delete redirect from ${r.fromPath}`}
                        className="flex size-9 items-center justify-center text-ink-3 hover:text-danger"
                      >
                        <Trash2 className="size-4" strokeWidth={1.75} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState title="Nothing matches that" />
        )}
      </Panel>
    </div>
  );
}
