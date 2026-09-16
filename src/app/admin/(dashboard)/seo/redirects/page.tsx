import { db } from "@/lib/db";
import { requireCapability } from "@/lib/auth/session";
import { PageHeader, Panel } from "@/components/admin/ui";
import { RedirectManager } from "@/components/admin/redirect-manager";

export const metadata = { title: "Redirects" };

export default async function RedirectsPage() {
  await requireCapability("seo.redirects");
  const [redirects, notFound, counts] = await Promise.all([
    db.redirect.findMany({ orderBy: [{ hits: "desc" }, { fromPath: "asc" }], take: 400 }),
    db.notFoundLog.findMany({ where: { resolved: false }, orderBy: { hits: "desc" }, take: 50 }),
    db.redirect.groupBy({ by: ["origin"], _count: true }),
  ]);

  return (
    <>
      <PageHeader
        title="Redirects"
        description="When an address changes, a redirect keeps the old one working — for people who bookmarked it and for search engines that already know it."
        back={{ label: "SEO manager", href: "/admin/seo" }}
      />

      <Panel className="mb-6">
        <p className="text-small text-ink-2">
          {counts.find((c) => c.origin === "MIGRATION")?._count ?? 0} came from the old WordPress site,{" "}
          {counts.find((c) => c.origin === "SLUG_CHANGE")?._count ?? 0} were created automatically when an address was renamed, and{" "}
          {counts.find((c) => c.origin === "MANUAL")?._count ?? 0} were added by hand.
        </p>
      </Panel>

      <RedirectManager
        redirects={redirects.map((r) => ({
          id: r.id,
          fromPath: r.fromPath,
          toPath: r.toPath,
          statusCode: r.statusCode,
          origin: r.origin,
          hits: r.hits,
          lastHitAt: r.lastHitAt?.toISOString() ?? null,
          note: r.note,
        }))}
        notFound={notFound.map((n) => ({ id: n.id, path: n.path, hits: n.hits, lastSeenAt: n.lastSeenAt.toISOString(), referrer: n.lastReferrer }))}
      />
    </>
  );
}
