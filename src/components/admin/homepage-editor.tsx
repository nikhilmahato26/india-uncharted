"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronDown, ChevronUp, Plus } from "lucide-react";
import { addSection, deleteSection, moveSection, saveSection, setSectionVisible, type SectionSaveState } from "@/app/actions/sections";
import { SECTION_EDITOR, isEditableSectionType, type EditorField, type SectionEditorDef } from "@/lib/sections/editor";
import { DESTINATION_SLOTS } from "@/lib/sections/defaults";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { MediaPicker, type MediaOption } from "./media-picker";
import { Panel } from "./ui";
import { cn } from "@/lib/cn";

export type EditorSection = { id: string; type: string; editable: boolean; isVisible: boolean; title: string; props: Record<string, unknown> };
type Option = { slug: string; name: string };

type Props = {
  sections: EditorSection[];
  media: MediaOption[];
  destinations: Option[];
  styles: Option[];
  canPublish: boolean;
  canDelete: boolean;
  addable: { type: string; label: string; description: string }[];
};

export function HomepageEditor({ sections, media, destinations, styles, canPublish, canDelete, addable }: Props) {
  const router = useRouter();
  const [openId, setOpenId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

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
    // min-w-0 down the tree: grid items otherwise refuse to shrink below their widest
    // line, and a single-line truncated title pushes the whole page sideways on a phone.
    <div className="grid min-w-0 gap-6">
      {error ? (
        <p role="alert" className="border border-danger/40 bg-danger-soft px-4 py-3 text-small text-danger">
          {error}
        </p>
      ) : null}

      <ol className={cn("grid min-w-0 gap-3", pending && "opacity-70")} aria-busy={pending || undefined}>
        {sections.map((s, i) => {
          const def: SectionEditorDef | null = isEditableSectionType(s.type) ? SECTION_EDITOR[s.type] : null;
          const open = openId === s.id;
          return (
            <li key={s.id} className={cn("min-w-0 border bg-paper", open ? "border-ink/40" : "border-rule", !s.isVisible && "bg-paper-2")}>
              <div className="flex flex-wrap items-center gap-x-4 gap-y-3 p-4">
                <span className="w-7 shrink-0 text-right font-display text-title text-ink-3 tabular-nums" aria-hidden="true">
                  {i + 1}
                </span>
                <div className="min-w-0 flex-1 basis-56">
                  <p className="text-label uppercase text-ink-3">
                    {def?.label ?? s.type}
                    {!s.isVisible ? <span className="ml-2 text-warning">· Hidden</span> : null}
                  </p>
                  <p className={cn("truncate font-display text-subtitle", s.isVisible ? "text-ink" : "text-ink-3")}>{s.title}</p>
                </div>

                <div className="flex flex-wrap items-center gap-1">
                  {canPublish ? (
                    <>
                      <IconButton label={`Move “${s.title}” up`} disabled={i === 0 || pending} onClick={() => run(() => moveSection(s.id, "up"))}>
                        <ChevronUp className="size-4" strokeWidth={1.75} />
                      </IconButton>
                      <IconButton label={`Move “${s.title}” down`} disabled={i === sections.length - 1 || pending} onClick={() => run(() => moveSection(s.id, "down"))}>
                        <ChevronDown className="size-4" strokeWidth={1.75} />
                      </IconButton>
                      <VisibilitySwitch checked={s.isVisible} label={s.title} disabled={pending} onChange={(next) => run(() => setSectionVisible(s.id, next))} />
                    </>
                  ) : null}
                  {def ? (
                    <Button type="button" size="sm" variant={open ? "primary" : "secondary"} onClick={() => setOpenId(open ? null : s.id)} aria-expanded={open} aria-controls={`section-${s.id}`}>
                      {open ? "Close" : "Edit"}
                    </Button>
                  ) : (
                    <span className="text-caption text-ink-3">Not editable here</span>
                  )}
                </div>
              </div>

              {open && def ? (
                <div id={`section-${s.id}`} className="border-t border-rule p-4 sm:p-6">
                  <p className="measure text-small text-ink-2">{def.description}</p>
                  {def.note ? <p className="measure mt-1 text-caption text-ink-3">{def.note}</p> : null}
                  <SectionForm
                    key={s.id}
                    section={s}
                    fields={def.fields}
                    media={media}
                    destinations={destinations}
                    styles={styles}
                    canDelete={canDelete}
                    onDelete={() => run(async () => { await deleteSection(s.id); setOpenId(null); })}
                    onClose={() => setOpenId(null)}
                  />
                </div>
              ) : null}
            </li>
          );
        })}
      </ol>

      {canPublish ? <AddSection addable={addable} onAdded={(id) => { setOpenId(id); router.refresh(); }} /> : null}
    </div>
  );
}

function SectionForm({
  section,
  fields,
  media,
  destinations,
  styles,
  canDelete,
  onDelete,
  onClose,
}: {
  section: EditorSection;
  fields: EditorField[];
  media: MediaOption[];
  destinations: Option[];
  styles: Option[];
  canDelete: boolean;
  onDelete: () => void;
  onClose: () => void;
}) {
  const router = useRouter();
  const [state, action, saving] = useActionState<SectionSaveState, FormData>(saveSection.bind(null, section.id), null);
  const [, startSave] = useTransition();
  const [dirty, setDirty] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  // Selects that decide which other fields apply, tracked so those fields appear and disappear as you choose.
  const [choices, setChoices] = useState<Record<string, string>>(() =>
    Object.fromEntries(fields.filter((f) => f.kind === "select").map((f) => [f.name, String(section.props[f.name] ?? f.options?.[0]?.value ?? "")])),
  );

  // A save changes the title shown in the list; refresh once it lands.
  useEffect(() => {
    if (state?.ok) router.refresh();
  }, [state, router]);

  const shown = fields.filter((f) => !f.showWhen || f.showWhen.values.includes(choices[f.showWhen.field] ?? ""));
  const err = (name: string) => (state && !state.ok ? state.fieldErrors?.[name] : undefined);
  const id = (name: string) => `${section.id}-${name}`;

  return (
    <form
      // Submitted by hand rather than through the form's action prop: React resets a
      // form after an action, which would put the pre-save text back in the fields —
      // and a second Save would quietly undo the first.
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        setDirty(false);
        startSave(() => action(fd));
      }}
      onChange={() => setDirty(true)}
      className="mt-6 grid gap-5 sm:grid-cols-2"
    >
      {state && !state.ok ? (
        <p role="alert" className="border border-danger/40 bg-danger-soft px-4 py-3 text-small text-danger sm:col-span-2">
          {state.error}
        </p>
      ) : null}

      {shown.map((f) => {
        const value = section.props[f.name];
        const span = f.span === 2 ? "sm:col-span-2" : "";
        switch (f.kind) {
          case "media":
            return (
              <div key={f.name} className={span}>
                <MediaPicker name={f.name} label={f.label} options={media} initialId={typeof value === "string" ? value : null} help={f.help} />
                {err(f.name) ? <p role="alert" className="mt-1 text-caption text-danger">{err(f.name)}</p> : null}
              </div>
            );
          case "textarea":
            return (
              <Field key={f.name} label={f.label} htmlFor={id(f.name)} hint={f.help} error={err(f.name)} className={span}>
                <Textarea id={id(f.name)} name={f.name} rows={f.rows ?? 3} maxLength={f.max} defaultValue={typeof value === "string" ? value : ""} error={Boolean(err(f.name))} />
              </Field>
            );
          case "select":
            return (
              // A layout choice always has a value, so it isn't marked "(optional)".
              <Field key={f.name} label={f.label} htmlFor={id(f.name)} hint={f.help} error={err(f.name)} className={span} required>
                <Select
                  id={id(f.name)}
                  name={f.name}
                  value={choices[f.name]}
                  onChange={(e) => setChoices((c) => ({ ...c, [f.name]: e.target.value }))}
                  error={Boolean(err(f.name))}
                >
                  {f.options?.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </Select>
              </Field>
            );
          case "number":
            return (
              <Field key={f.name} label={f.label} htmlFor={id(f.name)} hint={f.help} error={err(f.name)} className={span}>
                <Input id={id(f.name)} name={f.name} type="number" inputMode="numeric" min={f.min} max={f.max} defaultValue={typeof value === "number" ? value : ""} error={Boolean(err(f.name))} className="max-w-32" />
              </Field>
            );
          case "travel-style":
            return (
              <Field key={f.name} label={f.label} htmlFor={id(f.name)} hint={f.help} error={err(f.name)} className={span}>
                <Select id={id(f.name)} name={f.name} defaultValue={typeof value === "string" ? value : ""} error={Boolean(err(f.name))}>
                  <option value="">No large tile</option>
                  {styles.map((o) => (
                    <option key={o.slug} value={o.slug}>
                      {o.name}
                    </option>
                  ))}
                </Select>
              </Field>
            );
          case "destination-slots": {
            const chosen = Array.isArray(value) ? (value as string[]) : [];
            return (
              <fieldset key={f.name} className={cn("border border-rule p-4", span)}>
                <legend className="px-1 text-small font-semibold text-ink">{f.label}</legend>
                <input type="hidden" name={`${f.name}__present`} value="1" />
                {f.help ? <p className="mb-3 text-caption text-ink-3">{f.help}</p> : null}
                <div className="grid gap-3 sm:grid-cols-2">
                  {Array.from({ length: DESTINATION_SLOTS }, (_, slot) => (
                    <div key={slot} className={slot === 0 ? "sm:col-span-2" : ""}>
                      <label htmlFor={id(`${f.name}-${slot}`)} className="text-caption text-ink-2">
                        {slot === 0 ? "Large photograph" : `Place ${slot + 1}`}
                      </label>
                      <Select id={id(`${f.name}-${slot}`)} name={f.name} defaultValue={chosen[slot] ?? ""} className="mt-1">
                        <option value="">— none —</option>
                        {destinations.map((o) => (
                          <option key={o.slug} value={o.slug}>
                            {o.name}
                          </option>
                        ))}
                      </Select>
                    </div>
                  ))}
                </div>
                {err(f.name) ? <p role="alert" className="mt-2 text-caption text-danger">{err(f.name)}</p> : null}
              </fieldset>
            );
          }
          default:
            return (
              <Field key={f.name} label={f.label} htmlFor={id(f.name)} hint={f.help} error={err(f.name)} className={span}>
                <Input
                  id={id(f.name)}
                  name={f.name}
                  maxLength={f.max}
                  placeholder={f.kind === "link" ? "/plan-my-journey or https://…" : undefined}
                  defaultValue={typeof value === "string" ? value : ""}
                  error={Boolean(err(f.name))}
                />
              </Field>
            );
        }
      })}

      <div className="flex flex-wrap items-center gap-3 border-t border-rule pt-5 sm:col-span-2">
        <Button type="submit" loading={saving}>
          Save section
        </Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            if (dirty && !window.confirm("Close without saving your changes?")) return;
            onClose();
          }}
        >
          Close
        </Button>
        {state?.ok ? (
          <p role="status" className="text-small text-success">
            {state.message}
          </p>
        ) : null}

        {canDelete ? (
          <div className="ml-auto flex items-center gap-2">
            {confirmDelete ? (
              <>
                <span className="text-caption text-ink-2">Delete this section for good?</span>
                <button type="button" onClick={onDelete} className="min-h-11 bg-danger px-3 text-small font-semibold text-paper">
                  Delete
                </button>
                <button type="button" onClick={() => setConfirmDelete(false)} className="min-h-11 px-2 text-small text-ink-2 underline underline-offset-4">
                  Keep it
                </button>
              </>
            ) : (
              <button type="button" onClick={() => setConfirmDelete(true)} className="min-h-11 px-2 text-small text-danger underline underline-offset-4">
                Delete section
              </button>
            )}
          </div>
        ) : null}
      </div>
    </form>
  );
}

function AddSection({ addable, onAdded }: { addable: { type: string; label: string; description: string }[]; onAdded: (id: string) => void }) {
  const [type, setType] = useState(addable[0]?.type ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const chosen = addable.find((a) => a.type === type);

  return (
    <Panel title="Add a section" description="New sections start hidden. Fill them in, then switch them on.">
      <div className="flex flex-wrap items-end gap-3">
        <div className="min-w-64 flex-1">
          <label htmlFor="add-section-type" className="text-small font-semibold text-ink">
            Kind of section
          </label>
          <Select id="add-section-type" value={type} onChange={(e) => setType(e.target.value)} className="mt-1.5">
            {addable.map((a) => (
              <option key={a.type} value={a.type}>
                {a.label}
              </option>
            ))}
          </Select>
          {chosen ? <p className="mt-1.5 text-caption text-ink-3">{chosen.description}</p> : null}
        </div>
        <Button
          type="button"
          loading={pending}
          icon={<Plus className="size-4" strokeWidth={1.75} />}
          onClick={() =>
            startTransition(async () => {
              setError(null);
              try {
                const created = await addSection(type);
                onAdded(created.id);
              } catch (e) {
                setError(e instanceof Error ? e.message : "That didn't work.");
              }
            })
          }
        >
          Add section
        </Button>
      </div>
      {error ? (
        <p role="alert" className="mt-3 text-small text-danger">
          {error}
        </p>
      ) : null}
    </Panel>
  );
}

function IconButton({ label, children, onClick, disabled }: { label: string; children: React.ReactNode; onClick: () => void; disabled?: boolean }) {
  return (
    <button type="button" onClick={onClick} disabled={disabled} aria-label={label} title={label} className="flex size-11 items-center justify-center text-ink-2 transition-colors hover:text-ink disabled:opacity-30">
      {children}
    </button>
  );
}

/** Applies at once, like the Live switch on content lists — no Save needed. */
function VisibilitySwitch({ checked, label, disabled, onChange }: { checked: boolean; label: string; disabled?: boolean; onChange: (next: boolean) => void }) {
  return (
    <label className="flex min-h-11 cursor-pointer items-center gap-2 px-1">
      <span className="sr-only">{checked ? `Hide “${label}”` : `Show “${label}”`}</span>
      <input type="checkbox" role="switch" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
      <span
        aria-hidden="true"
        className="relative h-6 w-11 border border-ink/25 bg-paper-3 transition-colors peer-checked:border-success peer-checked:bg-success peer-checked:[&>span]:translate-x-5 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-terracotta-600"
      >
        <span className="absolute top-0.5 left-0.5 size-4.5 bg-paper transition-transform duration-(--duration-fast)" />
      </span>
      <span className="w-12 text-caption text-ink-3">{checked ? "Shown" : "Hidden"}</span>
    </label>
  );
}
