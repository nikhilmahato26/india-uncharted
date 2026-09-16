import { db } from "@/lib/db";
import { requireCapability } from "@/lib/auth/session";
import { loadMediaOptions } from "@/lib/admin/load";
import { formatPhone } from "@/lib/phone";
import { PageHeader } from "@/components/admin/ui";
import { SiteSettingsForm } from "@/components/admin/site-settings-form";

export const metadata = { title: "Site settings" };

export default async function SettingsPage() {
  await requireCapability("settings.edit");
  const [settings, media] = await Promise.all([db.siteSettings.findUnique({ where: { id: "singleton" } }), loadMediaOptions(200)]);

  const socials = Array.isArray(settings?.socials) ? (settings!.socials as { network: string; url: string }[]) : [];

  return (
    <>
      <PageHeader title="Site settings" description="The business details that appear in the header, the footer, contact pages and the structured data search engines read." />
      <SiteSettingsForm
        values={{
          businessName: settings?.businessName ?? "India Uncharted",
          brandLine: settings?.brandLine ?? "",
          tagline: settings?.tagline ?? "",
          phone: settings?.phoneE164 ? formatPhone(settings.phoneE164) : "",
          whatsapp: settings?.whatsappE164 ? formatPhone(settings.whatsappE164) : "",
          email: settings?.email ?? "",
          enquiryEmail: settings?.enquiryEmail ?? "",
          addressLine1: settings?.addressLine1 ?? "",
          addressLine2: settings?.addressLine2 ?? "",
          city: settings?.city ?? "",
          region: settings?.region ?? "",
          postalCode: settings?.postalCode ?? "",
          country: settings?.country ?? "India",
          mapUrl: settings?.mapUrl ?? "",
          footerDescription: settings?.footerDescription ?? "",
          copyright: settings?.copyright ?? "",
          defaultCtaLabel: settings?.defaultCtaLabel ?? "Plan My Journey",
          defaultCtaHref: settings?.defaultCtaHref ?? "/plan-my-journey",
          newsletterEnabled: settings?.newsletterEnabled ?? false,
          logoId: settings?.logoId ?? "",
          logoLightId: settings?.logoLightId ?? "",
          defaultOgImageId: settings?.defaultOgImageId ?? "",
        }}
        socials={socials}
        media={media}
      />
    </>
  );
}
