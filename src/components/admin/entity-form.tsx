"use client";

import { useActionState, useEffect, useState } from "react";
import { AlertTriangle, Check, ExternalLink, Info, Trash2 } from "lucide-react";
import type { FieldDef, FieldGroup } from "@/lib/admin/fields";
import { seoFieldGroups } from "@/lib/admin/fields";
import type { EntityKey } from "@/lib/admin/registry";
import { saveEntity, deleteEntity, type SaveState } from "@/app/actions/content";
import type { Check as SeoCheck } from "@/lib/seo/analyze";
import { DESCRIPTION_MAX, TITLE_MAX } from "@/lib/seo/analyze";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/field";
import { RichEditor } from "./rich-editor";
import { ChipsInput } from "./chips-input";
import { MediaPicker, type MediaOption } from "./media-picker";
import { StatusPill } from "./ui";
import { slugify } from "@/lib/slug";
import { cn } from "@/lib/cn";

export type RelationOption = { value: string; label: string };

export type EntityFormProps = {
  entityKey: EntityKey;
  id: string | null;
  title: string;
  groups: FieldGroup[];
  values: Record<string, unknown>;
  seoValues: Record<string, unknown>;
  hasSeo: boolean;
  hasStatus: boolean;
  hasHero: boolean;
  status: string;
  publicPath: string | null;
  canPublish: boolean;
  canDelete: boolean;
  media: MediaOption[];
  relations: { key: string; label: string; help?: string; options: RelationOption[] }[];
  checks: SeoCheck[];
  siteUrl: string;
  titlePattern: string | null;
};

export function EntityForm(props: EntityFormProps) {
  const [tab, setTab] = useState<"content" | "seo" | "relations">("content");
  const [state, action, pending] = useActionState<SaveState, FormData>(saveEntity.bind(null, props.entityKey, props.id), null);
  const [status, setStatus] = useState(props.status);
  const [dirty, setDirty] = useState(false);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  // Live SERP preview values
  const [name, setName] = useState(String(props.values[Object.keys(props.values).find((k) => k === "name" || k === "title") ?? "name"] ?? props.title));
  const [slug, setSlug] = useState(String(props.values.slug ?? ""));
  const [metaTitle, setMetaTitle] = useState(String(props.seoValues.metaTitle ?? ""));
  const [metaDescription, setMetaDescription] = useState(String(props.seoValues.metaDescription ?? ""));

  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  const saveId = state?.ok ? `${state.id}:${state.message}` : null;
  if (saveId && saveId !== savedAt) {
    setSavedAt(saveId);
    if (dirty) setDirty(false);
  }

  const resolvedTitle = metaTitle || (props.titlePattern ? props.titlePattern.replace("{name}", name) : name);
  const previewUrl = `${props.siteUrl}${props.publicPath ?? (slug ? `/${slug}` : "")}`;

  const fieldError = (n: string) => (state && !state.ok ? state.fieldErrors?.[n] : undefined);

  return (
    <form action={action} onChange={() => setDirty(true)} className="pb-28">
      <input type="hidden" name="status" value={status} />
      {props.hasSeo ? <input type="hidden" name="seo.present" value="1" /> : null}

      <div className="mb-6 flex flex-wrap items-center gap-2 border-b border-rule">
        {(["content", ...(props.hasSeo ? (["seo"] as const) : []), ...(props.relations.length ? (["relations"] as const) : [])] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setTab(t)}
            aria-current={tab === t ? "page" : undefined}
            className={cn(
              "-mb-px min-h-11 border-b-2 px-4 text-small font-semibold capitalize transition-colors",
              tab === t ? "border-terracotta-600 text-ink" : "border-transparent text-ink-3 hover:text-ink",
            )}
          >
            {t === "seo" ? "SEO" : t}
          </button>
        ))}
      </div>

      {state && !state.ok ? (
        <p role="alert" className="mb-5 border border-danger/40 bg-danger-soft px-4 py-3 text-small text-danger">
          {state.error}
        </p>
      ) : null}
      {state?.ok ? (
        <p role="status" className="mb-5 border border-success/40 bg-success-soft px-4 py-3 text-small text-success">
          {state.message} <span className="text-ink-2">Changes appear on the site straight away.</span>
        </p>
      ) : null}

      {/* ── Content ─────────────────────────────────────────── */}
      <div className={cn("grid gap-6", tab !== "content" && "hidden")}>
        {props.groups.map((group) => (
          <fieldset key={group.title} className="border border-rule bg-paper p-5">
            <legend className="px-2 font-display text-subtitle text-ink">{group.title}</legend>
            {group.description ? <p className="mb-5 text-caption text-ink-3">{group.description}</p> : null}
            <div className="grid gap-5 sm:grid-cols-2">
              {group.fields.map((f) => (
                <FieldRenderer
                  key={f.name}
                  field={f}
                  value={props.values[f.name]}
                  error={fieldError(f.name)}
                  media={props.media}
                  onNameChange={f.name === "name" || f.name === "title" ? setName : undefined}
                  onSlugChange={f.type === "slug" ? setSlug : undefined}
                  nameValue={name}
                />
              ))}
            </div>
          </fieldset>
        ))}
        {props.hasHero ? (
          <fieldset className="border border-rule bg-paper p-5">
            <legend className="px-2 font-display text-subtitle text-ink">Main image</legend>
            <MediaPicker name="heroId" label="Main image" options={props.media} initialId={props.values.heroId as string | null} help="Used at the top of the page, on cards and when the page is shared." />
          </fieldset>
        ) : null}
      </div>

      {/* ── SEO ─────────────────────────────────────────────── */}
      {props.hasSeo ? (
        <div className={cn("grid gap-6 lg:grid-cols-3", tab !== "seo" && "hidden")}>
          <div className="grid gap-6 lg:col-span-2">
            {seoFieldGroups.map((group) => (
              <fieldset key={group.title} className="border border-rule bg-paper p-5">
                <legend className="px-2 font-display text-subtitle text-ink">{group.title}</legend>
                {group.description ? <p className="mb-5 text-caption text-ink-3">{group.description}</p> : null}
                <div className="grid gap-5 sm:grid-cols-2">
                  {group.fields.map((f) => (
                    <FieldRenderer
                      key={f.name}
                      field={{ ...f, name: `seo.${f.name}` }}
                      value={props.seoValues[f.name]}
                      error={fieldError(`seo.${f.name}`)}
                      media={props.media}
                      counter={
                        f.name === "metaTitle"
                          ? { value: metaTitle.length, max: TITLE_MAX, fallback: resolvedTitle.length }
                          : f.name === "metaDescription"
                            ? { value: metaDescription.length, max: DESCRIPTION_MAX }
                            : undefined
                      }
                      onValueChange={f.name === "metaTitle" ? setMetaTitle : f.name === "metaDescription" ? setMetaDescription : undefined}
                    />
                  ))}
                </div>
              </fieldset>
            ))}
          </div>

          <div className="grid gap-6 lg:col-span-1">
            <section className="border border-rule bg-paper p-5">
              <h2 className="font-display text-subtitle text-ink">Google preview</h2>
              <p className="mt-1 text-caption text-ink-3">Roughly how this appears in results.</p>
              <div className="mt-4 border border-rule bg-paper-2 p-4">
                <p className="truncate text-caption text-ink-3">{previewUrl}</p>
                <p className="mt-1 line-clamp-2 text-body text-serp-link">{resolvedTitle.slice(0, TITLE_MAX)}{resolvedTitle.length > TITLE_MAX ? "…" : ""}</p>
                <p className="mt-1 line-clamp-2 text-small text-ink-2">
                  {metaDescription ? `${metaDescription.slice(0, DESCRIPTION_MAX)}${metaDescription.length > DESCRIPTION_MAX ? "…" : ""}` : "Google will choose a snippet from the page."}
                </p>
              </div>
            </section>

            <section className="border border-rule bg-paper p-5">
              <h2 className="font-display text-subtitle text-ink">Checks</h2>
              <p className="mt-1 text-caption text-ink-3">Recommendations, refreshed when you save. They don’t guarantee a ranking.</p>
              <ul className="mt-4 space-y-2.5">
                {props.checks.map((c) => (
                  <li key={c.id} className="flex gap-2.5">
                    <span className="mt-0.5 shrink-0">
                      {c.status === "pass" ? (
                        <Check className="size-4 text-success" strokeWidth={2} aria-hidden="true" />
                      ) : c.status === "warn" ? (
                        <Info className="size-4 text-warning" strokeWidth={2} aria-hidden="true" />
                      ) : (
                        <AlertTriangle className="size-4 text-danger" strokeWidth={2} aria-hidden="true" />
                      )}
                    </span>
                    <span>
                      <span className={cn("text-small", c.status === "pass" ? "text-ink-2" : "text-ink")}>{c.label}</span>
                      {c.detail ? <span className="block text-caption text-ink-3">{c.detail}</span> : null}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>
      ) : null}

      {/* ── Relations ───────────────────────────────────────── */}
      {props.relations.length ? (
        <div className={cn("grid gap-6", tab !== "relations" && "hidden")}>
          <fieldset className="border border-rule bg-paper p-5">
            <legend className="px-2 font-display text-subtitle text-ink">Connections</legend>
            <p className="mb-5 text-caption text-ink-3">These links build the breadcrumbs, the related sections and the internal links search engines follow.</p>
            <div className="grid gap-5 sm:grid-cols-2">
              {props.relations.map((r) => (
                <Field key={r.key} label={r.label} htmlFor={r.key} hint={r.help}>
                  <Select id={r.key} name={r.key} defaultValue={String(props.values[r.key] ?? "")}>
                    <option value="">— none —</option>
                    {r.options.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </Select>
                </Field>
              ))}
            </div>
          </fieldset>
        </div>
      ) : null}

      {/* ── Action bar ──────────────────────────────────────── */}
      <div className="fixed inset-x-0 bottom-0 z-sticky border-t border-rule bg-paper/97 backdrop-blur-[2px]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3 sm:px-6 lg:pl-74">
          {props.hasStatus ? (
            <div className="flex items-center gap-2">
              {/* With the menu here, a badge beside it would only say it twice. */}
              {props.canPublish ? null : <StatusPill status={status} />}
              {props.canPublish ? (
                <select
                  aria-label="Status"
                  value={status}
                  onChange={(e) => {
                    setStatus(e.target.value);
                    setDirty(true);
                  }}
                  className="min-h-11 border border-ink/25 bg-paper px-3 text-small"
                  title="Whether this page is live on the site"
                >
                  <option value="DRAFT">Draft</option>
                  <option value="PUBLISHED">Published</option>
                  <option value="ARCHIVED">Archived</option>
                </select>
              ) : (
                <span className="text-caption text-ink-3">Your role can edit but not publish.</span>
              )}
            </div>
          ) : null}

          <div className="ml-auto flex flex-wrap items-center gap-2">
            {props.publicPath ? (
              <>
                <a
                  href={`/api/preview?path=${encodeURIComponent(props.publicPath)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex min-h-11 items-center gap-1.5 px-3 text-small text-ink-2 underline underline-offset-4 hover:text-ink"
                >
                  Preview
                </a>
                {props.status === "PUBLISHED" ? (
                  <a href={props.publicPath} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center gap-1.5 px-3 text-small text-ink-2 underline underline-offset-4 hover:text-ink">
                    View on site
                    <ExternalLink className="size-3.5" strokeWidth={1.75} aria-hidden="true" />
                  </a>
                ) : null}
              </>
            ) : null}
            {props.id && props.canDelete ? <DeleteButton entityKey={props.entityKey} id={props.id} title={props.title} /> : null}
            <Button type="submit" loading={pending} size="md">
              {pending ? "Saving…" : "Save"}
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}

function DeleteButton({ entityKey, id, title }: { entityKey: EntityKey; id: string; title: string }) {
  const [confirming, setConfirming] = useState(false);
  const [value, setValue] = useState("");
  if (!confirming)
    return (
      <button type="button" onClick={() => setConfirming(true)} className="inline-flex min-h-11 items-center gap-1.5 px-3 text-small text-danger underline underline-offset-4">
        <Trash2 className="size-3.5" strokeWidth={1.75} aria-hidden="true" />
        Delete
      </button>
    );
  return (
    <span className="flex items-center gap-2">
      <label htmlFor="confirm-delete" className="text-caption text-ink-2">
        Type the name to delete:
      </label>
      <input
        id="confirm-delete"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="min-h-11 w-40 border border-danger/50 bg-paper px-2 text-small"
        placeholder={title}
      />
      <button
        type="button"
        disabled={value.trim() !== title.trim()}
        onClick={() => deleteEntity(entityKey, id)}
        className="min-h-11 bg-danger px-3 text-small font-semibold text-paper disabled:opacity-40"
      >
        Delete
      </button>
      <button type="button" onClick={() => setConfirming(false)} className="min-h-11 px-2 text-small text-ink-2 underline underline-offset-4">
        Cancel
      </button>
    </span>
  );
}

function FieldRenderer({
  field,
  value,
  error,
  media,
  counter,
  onNameChange,
  onSlugChange,
  onValueChange,
  nameValue,
}: {
  field: FieldDef;
  value: unknown;
  error?: string;
  media: MediaOption[];
  counter?: { value: number; max: number; fallback?: number };
  onNameChange?: (v: string) => void;
  onSlugChange?: (v: string) => void;
  onValueChange?: (v: string) => void;
  nameValue?: string;
}) {
  const span = field.span === 2 ? "sm:col-span-2" : "";
  const hint = (
    <>
      {field.help}
      {field.recommendation ? <span className="block text-ink-3">Recommended: {field.recommendation}</span> : null}
      {counter ? (
        <span className={cn("block", counter.value > counter.max ? "text-warning" : "text-ink-3")}>
          {counter.value === 0 && counter.fallback !== undefined
            ? `Empty — the automatic one is used (${counter.fallback} of ${counter.max} characters)`
            : `${counter.value} / ${counter.max} characters`}
        </span>
      ) : null}
    </>
  );

  if (field.type === "rich") {
    return (
      <div className={span}>
        <p className="mb-1.5 text-small font-semibold text-ink">{field.label}</p>
        {field.help ? <p className="mb-2 text-caption text-ink-3">{field.help}</p> : null}
        <RichEditor name={field.name} initial={value} label={field.label} />
      </div>
    );
  }

  if (field.type === "chips") {
    return (
      <div className={span}>
        <ChipsInput name={field.name} label={field.label} initial={(value as string[]) ?? []} help={field.help} />
      </div>
    );
  }

  if (field.type === "media") {
    return (
      <div className={span}>
        <MediaPicker name={field.name} label={field.label} options={media} initialId={value as string | null} help={field.help} />
      </div>
    );
  }

  if (field.type === "switch") {
    return (
      <div className={cn("flex items-start gap-3", span)}>
        <span className="relative mt-1 flex size-5 shrink-0 items-center justify-center">
          <input
            id={field.name}
            name={field.name}
            type="checkbox"
            role="switch"
            defaultChecked={Boolean(value)}
            className="peer absolute inset-0 size-5 appearance-none border border-ink/35 bg-paper checked:border-terracotta-600 checked:bg-terracotta-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-terracotta-600"
          />
          <Check aria-hidden="true" strokeWidth={3} className="pointer-events-none relative size-3.5 text-paper opacity-0 peer-checked:opacity-100" />
        </span>
        <label htmlFor={field.name} className="text-small text-ink-2">
          <span className="font-semibold text-ink">{field.label}</span>
          {field.help ? <span className="block text-caption text-ink-3">{field.help}</span> : null}
        </label>
      </div>
    );
  }

  if (field.type === "select") {
    return (
      <Field label={field.label} htmlFor={field.name} hint={hint} error={error} className={span} required={field.required}>
        <Select id={field.name} name={field.name} defaultValue={String(value ?? "")} error={Boolean(error)}>
          {!field.required ? <option value="">— none —</option> : null}
          {field.options?.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      </Field>
    );
  }

  if (field.type === "textarea") {
    return (
      <Field label={field.label} htmlFor={field.name} hint={hint} error={error} className={span} required={field.required}>
        <Textarea
          id={field.name}
          name={field.name}
          rows={field.rows ?? 4}
          defaultValue={String(value ?? "")}
          error={Boolean(error)}
          onChange={onValueChange ? (e) => onValueChange(e.target.value) : undefined}
        />
      </Field>
    );
  }

  if (field.type === "list") {
    const lines = Array.isArray(value) ? (value as string[]).join("\n") : String(value ?? "");
    return (
      <Field label={field.label} htmlFor={field.name} hint={hint} error={error} className={span}>
        <Textarea id={field.name} name={field.name} rows={field.rows ?? 5} defaultValue={lines} error={Boolean(error)} />
      </Field>
    );
  }

  if (field.type === "slug") {
    return (
      <Field label={field.label} htmlFor={field.name} hint={hint} error={error} className={span}>
        <Input
          id={field.name}
          name={field.name}
          defaultValue={String(value ?? "")}
          placeholder={nameValue ? slugify(nameValue) : "auto"}
          error={Boolean(error)}
          onChange={(e) => onSlugChange?.(e.target.value)}
        />
      </Field>
    );
  }

  return (
    <Field label={field.label} htmlFor={field.name} hint={hint} error={error} className={span} required={field.required}>
      <Input
        id={field.name}
        name={field.name}
        type={field.type === "number" ? "number" : field.type === "date" ? "date" : "text"}
        step={field.type === "number" ? "any" : undefined}
        defaultValue={String(value ?? "")}
        placeholder={field.placeholder}
        error={Boolean(error)}
        onChange={(e) => {
          onNameChange?.(e.target.value);
          onValueChange?.(e.target.value);
        }}
      />
    </Field>
  );
}
