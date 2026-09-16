"use client";

import { useActionState } from "react";
import { saveSiteSettings } from "@/app/actions/settings";
import type { SettingsState } from "@/app/actions/seo-settings";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Textarea } from "@/components/ui/field";
import { MediaPicker, type MediaOption } from "./media-picker";
import { Panel } from "./ui";

const NETWORKS = [
  { key: "facebook", label: "Facebook" },
  { key: "instagram", label: "Instagram" },
  { key: "youtube", label: "YouTube" },
  { key: "x", label: "X (Twitter)" },
  { key: "linkedin", label: "LinkedIn" },
  { key: "pinterest", label: "Pinterest" },
  { key: "tripadvisor", label: "Tripadvisor" },
];

export function SiteSettingsForm({
  values,
  socials,
  media,
}: {
  values: Record<string, string | boolean>;
  socials: { network: string; url: string }[];
  media: MediaOption[];
}) {
  const [state, action, pending] = useActionState<SettingsState, FormData>(saveSiteSettings, null);
  const err = (k: string) => (state && !state.ok ? state.fieldErrors?.[k] : undefined);
  const socialUrl = (network: string) => socials.find((s) => s.network === network)?.url ?? "";

  return (
    <form action={action} className="grid gap-6 pb-10">
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

      <Panel title="Business">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Business name" htmlFor="businessName" required error={err("businessName")}>
            <Input id="businessName" name="businessName" defaultValue={String(values.businessName)} />
          </Field>
          <Field label="Brand line" htmlFor="brandLine" hint="The line under the logo in the footer.">
            <Input id="brandLine" name="brandLine" defaultValue={String(values.brandLine)} />
          </Field>
          <Field label="Tagline" htmlFor="tagline" className="sm:col-span-2" hint="One sentence describing what you do. Used in structured data.">
            <Input id="tagline" name="tagline" defaultValue={String(values.tagline)} />
          </Field>
          <Field label="Footer description" htmlFor="footerDescription" className="sm:col-span-2">
            <Textarea id="footerDescription" name="footerDescription" rows={3} defaultValue={String(values.footerDescription)} />
          </Field>
          <Field label="Copyright line" htmlFor="copyright" hint="Use {year} and it fills in automatically.">
            <Input id="copyright" name="copyright" defaultValue={String(values.copyright)} />
          </Field>
        </div>
      </Panel>

      <Panel title="How travellers reach you">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Phone" htmlFor="phone" error={err("phone")} hint="With the country code.">
            <Input id="phone" name="phone" defaultValue={String(values.phone)} />
          </Field>
          <Field
            label="WhatsApp number"
            htmlFor="whatsapp"
            error={err("whatsapp")}
            hint="Leave empty if you don't use WhatsApp. WhatsApp buttons only appear on the site once this is filled in."
          >
            <Input id="whatsapp" name="whatsapp" defaultValue={String(values.whatsapp)} />
          </Field>
          <Field label="Public email" htmlFor="email" error={err("email")}>
            <Input id="email" name="email" type="email" defaultValue={String(values.email)} />
          </Field>
          <Field label="Where enquiry alerts go" htmlFor="enquiryEmail" error={err("enquiryEmail")} hint="Can be different from the public address.">
            <Input id="enquiryEmail" name="enquiryEmail" type="email" defaultValue={String(values.enquiryEmail)} />
          </Field>
        </div>
      </Panel>

      <Panel title="Address" description="Shown in the footer and on the contact page, and used in the structured data search engines read.">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Street" htmlFor="addressLine1" className="sm:col-span-2">
            <Input id="addressLine1" name="addressLine1" defaultValue={String(values.addressLine1)} />
          </Field>
          <Field label="Area" htmlFor="addressLine2" className="sm:col-span-2">
            <Input id="addressLine2" name="addressLine2" defaultValue={String(values.addressLine2)} />
          </Field>
          <Field label="City" htmlFor="city">
            <Input id="city" name="city" defaultValue={String(values.city)} />
          </Field>
          <Field label="State" htmlFor="region">
            <Input id="region" name="region" defaultValue={String(values.region)} />
          </Field>
          <Field label="Postcode" htmlFor="postalCode">
            <Input id="postalCode" name="postalCode" defaultValue={String(values.postalCode)} />
          </Field>
          <Field label="Country" htmlFor="country">
            <Input id="country" name="country" defaultValue={String(values.country)} />
          </Field>
          <Field label="Map link" htmlFor="mapUrl" className="sm:col-span-2" error={err("mapUrl")} hint="A Google Maps link to your office, if you want one shown.">
            <Input id="mapUrl" name="mapUrl" defaultValue={String(values.mapUrl)} />
          </Field>
        </div>
      </Panel>

      <Panel title="Social profiles" description="Only fill in the ones that exist. Empty ones are hidden everywhere.">
        <div className="grid gap-5 sm:grid-cols-2">
          {NETWORKS.map((n) => (
            <Field key={n.key} label={n.label} htmlFor={`social.${n.key}`}>
              <Input id={`social.${n.key}`} name={`social.${n.key}`} defaultValue={socialUrl(n.key)} placeholder="https://" />
            </Field>
          ))}
        </div>
      </Panel>

      <Panel title="Brand images">
        <div className="grid gap-6 sm:grid-cols-3">
          <MediaPicker name="logoId" label="Logo" options={media} initialId={String(values.logoId) || null} help="Used on light backgrounds." />
          <MediaPicker name="logoLightId" label="Logo (light version)" options={media} initialId={String(values.logoLightId) || null} help="Used over photographs and in the footer." />
          <MediaPicker name="defaultOgImageId" label="Default sharing image" options={media} initialId={String(values.defaultOgImageId) || null} help="Used when a page has no image of its own." />
        </div>
      </Panel>

      <Panel title="Homepage options">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Main button label" htmlFor="defaultCtaLabel">
            <Input id="defaultCtaLabel" name="defaultCtaLabel" defaultValue={String(values.defaultCtaLabel)} />
          </Field>
          <Field label="Main button link" htmlFor="defaultCtaHref">
            <Input id="defaultCtaHref" name="defaultCtaHref" defaultValue={String(values.defaultCtaHref)} />
          </Field>
          <div className="sm:col-span-2">
            <Checkbox
              name="newsletterEnabled"
              defaultChecked={Boolean(values.newsletterEnabled)}
              label="Show the newsletter section (only switch this on once you have somewhere to send the emails)"
            />
          </div>
        </div>
      </Panel>

      <div className="sticky bottom-0 -mx-4 border-t border-rule bg-paper/97 px-4 py-3 backdrop-blur-[2px] sm:-mx-6 sm:px-6">
        <Button type="submit" loading={pending}>
          Save settings
        </Button>
      </div>
    </form>
  );
}
