import Link from "next/link";
import { adminCounts, recentActivity } from "@/lib/admin/load";
import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth/session";
import { can } from "@/lib/auth/rbac";
import { SITE_INDEXABLE } from "@/lib/site";
import { describeAudit } from "@/lib/admin/audit-text";
import { PageHeader, Panel, Stat, StatusPill } from "@/components/admin/ui";
import { LinkButton } from "@/components/ui/button";

export const metadata = { title: "Dashboard" };

export default async function AdminDashboard() {
  const user = await requireUser();
  const [counts, activity, recentEnquiries, drafts] = await Promise.all([
    adminCounts(),
    recentActivity(6),
    db.enquiry.findMany({ orderBy: { createdAt: "desc" }, take: 5, select: { id: true, refCode: true, name: true, entityNameSnapshot: true, status: true, createdAt: true } }),
    db.journey.findMany({ where: { status: "DRAFT" }, orderBy: { updatedAt: "desc" }, take: 4, select: { id: true, name: true, updatedAt: true } }),
  ]);

  const quickActions = [
    { label: "Add destination", href: "/admin/destinations/new" },
    { label: "Add journey", href: "/admin/journeys/new" },
    { label: "Add experience", href: "/admin/experiences/new" },
    { label: "Write a guide", href: "/admin/articles/new" },
  ];

  return (
    <>
      <PageHeader
        title={`Hello, ${user.name}`}
        description="Everything you change here appears on the live site straight away."
        actions={
          <LinkButton href="/admin/enquiries" size="sm">
            {counts.enquiriesNew} new {counts.enquiriesNew === 1 ? "enquiry" : "enquiries"}
          </LinkButton>
        }
      />

      {!SITE_INDEXABLE ? (
        <p className="mb-6 border border-warning/40 bg-warning-soft px-4 py-3 text-small text-warning">
          This copy of the site is <strong>hidden from search engines</strong>. That is right for a test copy. The live site is not hidden — your developer sets that per copy of the site, so a test site can never be indexed by mistake.
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="New enquiries" value={counts.enquiriesNew} href="/admin/enquiries" hint={`${counts.enquiriesWeek} in the last 7 days`} />
        <Stat label="Journeys live" value={counts.journeys} href="/admin/journeys" />
        <Stat label="Destinations live" value={counts.destinations} href="/admin/destinations" />
        <Stat label="Experiences live" value={counts.experiences} href="/admin/experiences" />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <Panel title="Latest enquiries" className="lg:col-span-2" actions={<Link href="/admin/enquiries" className="text-caption text-terracotta-700 underline underline-offset-4">All enquiries</Link>}>
          {recentEnquiries.length ? (
            <ul className="divide-y divide-rule">
              {recentEnquiries.map((e) => (
                <li key={e.id}>
                  <Link href={`/admin/enquiries/${e.id}`} className="flex flex-wrap items-baseline justify-between gap-2 py-3">
                    <span>
                      <span className="font-semibold text-ink">{e.name}</span>
                      <span className="ml-2 text-caption text-ink-3">{e.entityNameSnapshot ?? "General enquiry"}</span>
                    </span>
                    <span className="flex items-center gap-3 text-caption text-ink-3">
                      <span className="tabular">{e.refCode}</span>
                      <time dateTime={e.createdAt.toISOString()}>{e.createdAt.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}</time>
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-small text-ink-3">No enquiries yet. They arrive here the moment someone sends the form.</p>
          )}
        </Panel>

        <Panel title="Add something">
          <ul className="grid gap-2">
            {quickActions.map((a) => (
              <li key={a.href}>
                <Link href={a.href} className="flex min-h-11 items-center border border-rule px-3 text-small text-ink hover:border-ink/40 hover:bg-paper-2">
                  {a.label}
                </Link>
              </li>
            ))}
          </ul>
        </Panel>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Panel title="Needs attention" description="Things worth clearing before launch.">
          <ul className="grid gap-3 text-small">
            <AttentionRow label="Drafts waiting to be published" value={counts.drafts} href="/admin/journeys" />
            <AttentionRow label="Images without alt text" value={counts.mediaNoAlt} href="/admin/media?filter=no-alt" />
            <AttentionRow label="Guest stories not verified" value={counts.unverifiedTestimonials} href="/admin/testimonials" />
            <AttentionRow label="Missing pages people asked for (404s)" value={counts.notFound} href="/admin/seo/redirects" />
            {can(user.role, "seo.global") ? <AttentionRow label="SEO checks across the site" value="Open report" href="/admin/seo/health" /> : null}
          </ul>
        </Panel>

        <Panel title="Recent changes" actions={can(user.role, "activity.read") ? <Link href="/admin/activity" className="text-caption text-terracotta-700 underline underline-offset-4">Full log</Link> : undefined}>
          {activity.length ? (
            <ul className="divide-y divide-rule">
              {activity.map((a) => (
                <li key={a.id} className="flex flex-wrap items-baseline justify-between gap-2 py-2.5 text-small">
                  <span className="text-ink-2">
                    <span className="font-semibold text-ink">{a.user?.name ?? "Someone"}</span> {describeAudit(a.action, a.entityType)}
                    {a.label ? <span className="text-ink-3"> — {a.label}</span> : null}
                  </span>
                  <time dateTime={a.createdAt.toISOString()} className="text-caption text-ink-3">
                    {a.createdAt.toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                  </time>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-small text-ink-3">Nothing has been changed yet.</p>
          )}
          {drafts.length ? (
            <div className="mt-5 border-t border-rule pt-4">
              <p className="text-caption text-ink-3">Journeys still in draft</p>
              <ul className="mt-2 grid gap-1.5">
                {drafts.map((d) => (
                  <li key={d.id} className="flex items-center justify-between gap-3">
                    <Link href={`/admin/journeys/${d.id}`} className="truncate text-small text-ink hover:text-terracotta-700">
                      {d.name}
                    </Link>
                    <StatusPill status="DRAFT" />
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </Panel>
      </div>
    </>
  );
}

function AttentionRow({ label, value, href }: { label: string; value: number | string; href: string }) {
  const isZero = value === 0;
  return (
    <li>
      <Link href={href} className="flex items-center justify-between gap-4 border-b border-rule pb-2.5 hover:text-terracotta-700">
        <span className="text-ink-2">{label}</span>
        <span className={isZero ? "text-caption text-success" : "font-display text-subtitle text-ink tabular"}>{isZero ? "All clear" : value}</span>
      </Link>
    </li>
  );
}
