import Link from "next/link";
import { db } from "@/lib/db";
import { requireCapability } from "@/lib/auth/session";
import { can } from "@/lib/auth/rbac";
import { SITE_INDEXABLE, SITE_URL } from "@/lib/site";
import { PageHeader, Panel } from "@/components/admin/ui";
import { SeoSettingsForm } from "@/components/admin/seo-settings-form";

export const metadata = { title: "SEO manager" };

export default async function SeoManagerPage() {
  const user = await requireCapability("seo.global");
  const [settings, metaTags] = await Promise.all([
    db.seoSettings.findUnique({ where: { id: "singleton" } }),
    db.customMetaTag.findMany({ where: { seoId: null }, orderBy: { sortOrder: "asc" } }),
  ]);

  return (
    <>
      <PageHeader
        title="SEO manager"
        description="Site-wide defaults. Anything set on an individual page beats what you set here."
        actions={
          <div className="flex flex-wrap gap-2">
            <Link href="/admin/seo/health" className="inline-flex min-h-11 items-center border border-ink/25 px-4 text-small font-semibold text-ink hover:bg-paper-2">
              Health report
            </Link>
            <Link href="/admin/seo/redirects" className="inline-flex min-h-11 items-center border border-ink/25 px-4 text-small font-semibold text-ink hover:bg-paper-2">
              Redirects
            </Link>
          </div>
        }
      />

      <Panel title="Indexing" className="mb-6">
        <p className="text-small text-ink-2">
          This site is currently{" "}
          {SITE_INDEXABLE ? (
            <strong className="text-success">open to search engines</strong>
          ) : (
            <strong className="text-warning">closed to search engines</strong>
          )}
          . This is set per copy of the site by your developer rather than being a field here, so a test copy can never be indexed by accident and the live site can never be hidden by a mis-click.
        </p>
        <p className="mt-3 text-caption text-ink-3">
          Sitemap: <a href={`${SITE_URL}/sitemap.xml`} className="underline underline-offset-4">{SITE_URL}/sitemap.xml</a> · robots:{" "}
          <a href={`${SITE_URL}/robots.txt`} className="underline underline-offset-4">{SITE_URL}/robots.txt</a>
        </p>
      </Panel>

      <SeoSettingsForm
        values={{
          siteTitle: settings?.siteTitle ?? "India Uncharted",
          titleSeparator: settings?.titleSeparator ?? " | ",
          defaultMetaTitle: settings?.defaultMetaTitle ?? "",
          defaultMetaDescription: settings?.defaultMetaDescription ?? "",
          twitterHandle: settings?.twitterHandle ?? "",
          googleVerification: settings?.googleVerification ?? "",
          bingVerification: settings?.bingVerification ?? "",
          ga4Id: settings?.ga4Id ?? "",
          gtmId: settings?.gtmId ?? "",
          metaPixelId: settings?.metaPixelId ?? "",
          consentRequired: settings?.consentRequired ?? true,
        }}
        patterns={(settings?.patterns as Record<string, { title?: string; description?: string }>) ?? {}}
        metaTags={metaTags.map((t) => ({ id: t.id, attribute: t.attribute, key: t.key, content: t.content }))}
        canEditHead={can(user.role, "seo.head")}
      />
    </>
  );
}
