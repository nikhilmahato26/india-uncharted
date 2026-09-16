"use client";

import { useActionState, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteNotice, saveNotice, setNoticeActive } from "@/app/actions/notices";
import type { SettingsState } from "@/app/actions/seo-settings";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/field";
import { Panel, EmptyState } from "./ui";

type Notice = {
  id: string;
  scope: string;
  targetId: string | null;
  title: string;
  body: string;
  startsOn: string;
  endsOn: string;
  blocksEnquiry: boolean;
  isActive: boolean;
};

export function NoticesManager({ notices, targets }: { notices: Notice[]; targets: Record<string, { value: string; label: string }[]> }) {
  const [state, action, pending] = useActionState<SettingsState, FormData>(saveNotice, null);
  const [scope, setScope] = useState("GLOBAL");
  const [editing, setEditing] = useState<Notice | null>(null);
  const [, startTransition] = useTransition();
  const router = useRouter();

  const options = targets[scope] ?? [];

  return (
    <div className="grid gap-6">
      <Panel title={editing ? "Edit notice" : "Add a notice"}>
        <form action={action} className="grid gap-5 sm:grid-cols-2">
          {editing ? <input type="hidden" name="id" value={editing.id} /> : null}
          {state?.ok ? (
            <p role="status" className="sm:col-span-2 border border-success/40 bg-success-soft px-4 py-3 text-small text-success">
              {state.message}
            </p>
          ) : null}
          {state && !state.ok ? (
            <p role="alert" className="sm:col-span-2 border border-danger/40 bg-danger-soft px-4 py-3 text-small text-danger">
              {state.error}
            </p>
          ) : null}

          <Field label="Applies to" htmlFor="scope">
            <Select id="scope" name="scope" value={scope} onChange={(e) => setScope(e.target.value)}>
              <option value="GLOBAL">The whole site</option>
              <option value="REGION">One region</option>
              <option value="DESTINATION">One destination</option>
              <option value="JOURNEY">One journey</option>
            </Select>
          </Field>
          {scope !== "GLOBAL" ? (
            <Field label="Which one" htmlFor="targetId">
              <Select id="targetId" name="targetId" defaultValue={editing?.targetId ?? ""}>
                <option value="">— choose —</option>
                {options.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </Select>
            </Field>
          ) : null}

          <Field label="Title" htmlFor="title" required className="sm:col-span-2">
            <Input id="title" name="title" defaultValue={editing?.title} placeholder="The Manali–Leh road is closed for winter" />
          </Field>
          <Field label="What travellers should know" htmlFor="body" required className="sm:col-span-2">
            <Textarea id="body" name="body" rows={3} defaultValue={editing?.body} placeholder="The passes usually reopen in late May. We can plan this route for a summer departure, or fly you into Leh instead." />
          </Field>
          <Field label="From" htmlFor="startsOn" hint="Leave empty to start now.">
            <Input id="startsOn" name="startsOn" type="date" defaultValue={editing?.startsOn} />
          </Field>
          <Field label="Until" htmlFor="endsOn" hint="Leave empty to keep it until you switch it off.">
            <Input id="endsOn" name="endsOn" type="date" defaultValue={editing?.endsOn} />
          </Field>
          <div className="sm:col-span-2 grid gap-3">
            <Checkbox name="blocksEnquiry" defaultChecked={editing?.blocksEnquiry} label="Also hide the enquiry buttons while this notice is showing" />
            <Checkbox name="isActive" defaultChecked={editing?.isActive} label="Show this notice on the site now" />
          </div>
          <div className="sm:col-span-2 flex gap-3">
            <Button type="submit" loading={pending}>
              {editing ? "Save notice" : "Add notice"}
            </Button>
            {editing ? (
              <button type="button" onClick={() => setEditing(null)} className="min-h-11 px-3 text-small text-ink-2 underline underline-offset-4">
                Cancel
              </button>
            ) : null}
          </div>
        </form>
      </Panel>

      <Panel title={`Notices (${notices.length})`}>
        {notices.length ? (
          <ul className="divide-y divide-rule">
            {notices.map((n) => (
              <li key={n.id} className="flex flex-wrap items-start justify-between gap-4 py-3">
                <div className="min-w-0">
                  <p className="font-semibold text-ink">
                    {n.title}
                    <span className={`ml-2 text-caption font-normal ${n.isActive ? "text-success" : "text-ink-3"}`}>{n.isActive ? "showing" : "off"}</span>
                  </p>
                  <p className="measure mt-1 text-small text-ink-2">{n.body}</p>
                  <p className="mt-1 text-caption text-ink-3">
                    {n.scope === "GLOBAL" ? "Whole site" : `${n.scope.toLowerCase()}: ${targets[n.scope]?.find((t) => t.value === n.targetId)?.label ?? "—"}`}
                    {n.startsOn || n.endsOn ? ` · ${n.startsOn || "now"} → ${n.endsOn || "until switched off"}` : ""}
                    {n.blocksEnquiry ? " · hides enquiry buttons" : ""}
                  </p>
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => startTransition(async () => { await setNoticeActive(n.id, !n.isActive); router.refresh(); })}
                    className="min-h-11 px-2 text-small font-semibold text-terracotta-700 underline underline-offset-4"
                  >
                    {n.isActive ? "Switch off" : "Switch on"}
                  </button>
                  <button type="button" onClick={() => setEditing(n)} className="min-h-11 px-2 text-small text-ink-2 underline underline-offset-4">
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => startTransition(async () => { await deleteNotice(n.id); router.refresh(); })}
                    className="min-h-11 px-2 text-small text-danger underline underline-offset-4"
                  >
                    Delete
                  </button>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState title="No notices" description="Add one before a season that affects travel — you can write it now and switch it on later." />
        )}
      </Panel>
    </div>
  );
}
