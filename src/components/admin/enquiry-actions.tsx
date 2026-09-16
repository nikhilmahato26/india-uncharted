"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addEnquiryNote, assignEnquiry, setEnquiryStatus } from "@/app/actions/enquiry-admin";
import { Button } from "@/components/ui/button";
import { Textarea, Select, Field } from "@/components/ui/field";
import type { EnquiryStatus } from "@/generated/prisma/enums";

const PIPELINE: { value: EnquiryStatus; label: string; hint: string }[] = [
  { value: "NEW", label: "New", hint: "Nobody has replied yet." },
  { value: "CONTACTED", label: "Contacted", hint: "We've written or called." },
  { value: "QUOTED", label: "Quoted", hint: "An itinerary and price are with them." },
  { value: "CONFIRMED", label: "Confirmed", hint: "They've booked." },
  { value: "COMPLETED", label: "Completed", hint: "They've travelled." },
  { value: "LOST", label: "Lost", hint: "Not going ahead." },
];

export function EnquiryActions({
  id,
  status,
  assignedToId,
  team,
  canManage,
  notes,
}: {
  id: string;
  status: string;
  assignedToId: string | null;
  team: { id: string; name: string }[];
  canManage: boolean;
  notes: { id: string; body: string; author: string; createdAt: string }[];
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const form = useRef<HTMLFormElement>(null);
  const router = useRouter();

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
    <div className={pending ? "opacity-70" : undefined}>
      {error ? (
        <p role="alert" className="mb-4 border border-danger/40 bg-danger-soft px-4 py-3 text-small text-danger">
          {error}
        </p>
      ) : null}

      {canManage ? (
        <div className="mb-6 grid gap-4 sm:grid-cols-2">
          <Field label="Stage" htmlFor="stage" hint={PIPELINE.find((p) => p.value === status)?.hint}>
            <Select id="stage" value={status} onChange={(e) => run(() => setEnquiryStatus(id, e.target.value as EnquiryStatus))}>
              {PIPELINE.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Looked after by" htmlFor="assignee">
            <Select id="assignee" value={assignedToId ?? ""} onChange={(e) => run(() => assignEnquiry(id, e.target.value || null))}>
              <option value="">— nobody yet —</option>
              {team.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      ) : null}

      <form
        ref={form}
        action={(fd) =>
          run(async () => {
            await addEnquiryNote(id, fd);
            form.current?.reset();
          })
        }
        className="grid gap-3"
      >
        <Field label="Add a note" htmlFor="note">
          <Textarea id="note" name="body" rows={3} placeholder="What was agreed, what to send next, anything the next person needs to know." />
        </Field>
        <Button type="submit" size="sm" className="justify-self-start" loading={pending}>
          Add note
        </Button>
      </form>

      {notes.length ? (
        <ul className="mt-6 divide-y divide-rule border-t border-rule">
          {notes.map((n) => (
            <li key={n.id} className="py-3">
              <p className="whitespace-pre-line text-small text-ink-2">{n.body}</p>
              <p className="mt-1 text-caption text-ink-3">
                {n.author} · <time dateTime={n.createdAt}>{new Date(n.createdAt).toLocaleString("en-GB", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}</time>
              </p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-6 text-small text-ink-3">No notes yet.</p>
      )}
    </div>
  );
}
