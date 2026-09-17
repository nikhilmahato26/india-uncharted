"use client";

import { useActionState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";
import { addGlobalMetaTag, deleteGlobalMetaTag, saveSeoSettings, type SettingsState } from "@/app/actions/seo-settings";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/field";
import { Panel } from "./ui";

const ENTITY_TYPES: { key: string; label: string; example: string }[] = [
  { key: "DESTINATION", label: "Destinations", example: "{name} Travel Guide & Tour Packages" },
  { key: "JOURNEY", label: "Journeys", example: "{name}" },
  { key: "EXPERIENCE", label: "Experiences", example: "{name}" },
  { key: "REGION", label: "Regions", example: "{name} Tours & Destinations" },
  { key: "ARTICLE", label: "Travel guide", example: "{name}" },
  { key: "CATEGORY", label: "Travel styles", example: "{name} Journeys in India" },
  { key: "EXPERIENCE_THEME", label: "Experience themes", example: "{name} Experiences in India" },
  { key: "SERVICE", label: "Services", example: "{name}" },
  { key: "PAGE", label: "Pages", example: "{name}" },
];

export function SeoSettingsForm({
  values,
  patterns,
  metaTags,
  canEditHead,
}: {
  values: Record<string, string | boolean>;
  patterns: Record<string, { title?: string; description?: string }>;
  metaTags: { id: string; attribute: string; key: string; content: string }[];
  canEditHead: boolean;
}) {
  const [state, action, pending] = useActionState<SettingsState, FormData>(saveSeoSettings, null);
  const [tagState, tagAction, tagPending] = useActionState<SettingsState, FormData>(addGlobalMetaTag, null);
  const [, startTransition] = useTransition();
  const router = useRouter();
  const err = (k: string) => (state && !state.ok ? state.fieldErrors?.[k] : undefined);

  return (
    <div className="grid gap-6 pb-10">
      <form action={action} className="grid gap-6">
        {state?.ok ? (
          <p role="status" className="border border-success/40 bg-success-soft px-4 py-3 text-small text-success">
            {state.message}
          </p>
        ) : null}
        {state && !state.ok ? (
          <p role="alert" className="border border-danger/40 bg-danger-soft px-4 py-3 text-small text-danger">
            {state.error}
          </p>
        ) : null}

        <Panel title="Defaults" description="Used when a page has nothing of its own.">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field label="Site name" htmlFor="siteTitle" required error={err("siteTitle")}>
              <Input id="siteTitle" name="siteTitle" defaultValue={String(values.siteTitle)} />
            </Field>
            <Field label="Title separator" htmlFor="titleSeparator" hint="Sits between the page title and the site name.">
              <Input id="titleSeparator" name="titleSeparator" defaultValue={String(values.titleSeparator)} />
            </Field>
            <Field label="Default meta title" htmlFor="defaultMetaTitle" className="sm:col-span-2">
              <Input id="defaultMetaTitle" name="defaultMetaTitle" defaultValue={String(values.defaultMetaTitle)} />
            </Field>
            <Field
              label="Default meta description"
              htmlFor="defaultMetaDescription"
              className="sm:col-span-2"
              hint="The fallback snippet for any page without its own description. Write it once, properly."
            >
              <Textarea id="defaultMetaDescription" name="defaultMetaDescription" rows={3} defaultValue={String(values.defaultMetaDescription)} />
            </Field>
            <Field label="X (Twitter) handle" htmlFor="twitterHandle" hint="With the @.">
              <Input id="twitterHandle" name="twitterHandle" defaultValue={String(values.twitterHandle)} />
            </Field>
          </div>
        </Panel>

        <Panel title="Title patterns" description="How titles are built when a page doesn't set its own. {name} is replaced by the page's name.">
          <div className="grid gap-4">
            {ENTITY_TYPES.map((t) => (
              <div key={t.key} className="grid gap-2 sm:grid-cols-[10rem_1fr] sm:items-center">
                <label htmlFor={`pattern.${t.key}.title`} className="text-small font-semibold text-ink">
                  {t.label}
                </label>
                <Input id={`pattern.${t.key}.title`} name={`pattern.${t.key}.title`} defaultValue={patterns[t.key]?.title ?? ""} placeholder={t.example} />
              </div>
            ))}
          </div>
        </Panel>

        <Panel
          title="Verification and analytics"
          description={
            canEditHead
              ? "Paste only the code each service gives you — never a whole script tag."
              : "Only a super admin can change these."
          }
        >
          <fieldset disabled={!canEditHead} className="grid gap-5 sm:grid-cols-2">
            <Field label="Google Search Console" htmlFor="googleVerification" error={err("googleVerification")} hint="The content value from the meta tag Google shows you.">
              <Input id="googleVerification" name="googleVerification" defaultValue={String(values.googleVerification)} />
            </Field>
            <Field label="Bing Webmaster" htmlFor="bingVerification" error={err("bingVerification")}>
              <Input id="bingVerification" name="bingVerification" defaultValue={String(values.bingVerification)} />
            </Field>
            <Field label="Google Analytics (GA4)" htmlFor="ga4Id" error={err("ga4Id")} hint="Looks like G-XXXXXXX.">
              <Input id="ga4Id" name="ga4Id" defaultValue={String(values.ga4Id)} />
            </Field>
            <Field label="Google Tag Manager" htmlFor="gtmId" error={err("gtmId")} hint="Looks like GTM-XXXXXX.">
              <Input id="gtmId" name="gtmId" defaultValue={String(values.gtmId)} />
            </Field>
            <Field label="Meta Pixel" htmlFor="metaPixelId" error={err("metaPixelId")} hint="Digits only.">
              <Input id="metaPixelId" name="metaPixelId" defaultValue={String(values.metaPixelId)} />
            </Field>
            <div className="sm:col-span-2">
              <Checkbox
                name="consentRequired"
                defaultChecked={Boolean(values.consentRequired)}
                label="Ask visitors for consent before analytics loads (required for visitors in the EU and UK)"
              />
              <p className="mt-2 text-caption text-ink-3">
                Analytics runs only on the live site, never on previews. With consent switched on, nothing is loaded for a visitor until they press Accept, and a browser
                sending a “do not track” privacy signal is treated as having declined.
              </p>
            </div>
          </fieldset>
        </Panel>

        <div className="sticky bottom-0 -mx-4 border-t border-rule bg-paper/97 px-4 py-3 backdrop-blur-[2px] sm:-mx-6 sm:px-6">
          <Button type="submit" loading={pending}>
            Save SEO settings
          </Button>
        </div>
      </form>

      <Panel title="Custom meta tags" description="Extra tags added to every page. Tags that have their own field here are refused.">
        {metaTags.length ? (
          <ul className="mb-5 divide-y divide-rule border-y border-rule">
            {metaTags.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-4 py-2.5">
                <code className="text-caption text-ink-2">
                  &lt;meta {t.attribute.toLowerCase().replace("_", "-")}=&quot;{t.key}&quot; content=&quot;{t.content}&quot;&gt;
                </code>
                <button
                  type="button"
                  onClick={() => startTransition(async () => { await deleteGlobalMetaTag(t.id); router.refresh(); })}
                  aria-label={`Remove ${t.key}`}
                  className="flex size-9 items-center justify-center text-ink-3 hover:text-danger"
                >
                  <Trash2 className="size-4" strokeWidth={1.75} />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mb-5 text-small text-ink-3">No custom tags yet.</p>
        )}

        <form action={tagAction} className="grid gap-4 sm:grid-cols-[8rem_1fr_1fr_auto] sm:items-end">
          <Field label="Attribute" htmlFor="attribute">
            <Select id="attribute" name="attribute" defaultValue="NAME">
              <option value="NAME">name</option>
              <option value="PROPERTY">property</option>
              <option value="HTTP_EQUIV">http-equiv</option>
            </Select>
          </Field>
          <Field label="Name" htmlFor="key">
            <Input id="key" name="key" placeholder="author" />
          </Field>
          <Field label="Content" htmlFor="content">
            <Input id="content" name="content" placeholder="India Uncharted" />
          </Field>
          <Button type="submit" size="sm" loading={tagPending}>
            Add tag
          </Button>
        </form>
        {tagState && !tagState.ok ? (
          <p role="alert" className="mt-3 text-small text-danger">
            {tagState.error}
          </p>
        ) : null}
      </Panel>
    </div>
  );
}
