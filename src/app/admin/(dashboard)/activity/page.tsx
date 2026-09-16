import { db } from "@/lib/db";
import { requireCapability } from "@/lib/auth/session";
import { PageHeader, Panel, EmptyState } from "@/components/admin/ui";
import { describeAudit } from "@/lib/admin/audit-text";

export const metadata = { title: "Activity" };

export default async function ActivityPage() {
  await requireCapability("activity.read");
  const entries = await db.auditLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 200,
    select: { id: true, action: true, entityType: true, entityId: true, label: true, diff: true, createdAt: true, user: { select: { name: true } } },
  });

  return (
    <>
      <PageHeader title="Activity" description="Who changed what, and when. Kept so a mistake can always be traced and explained." />
      <Panel>
        {entries.length ? (
          <ul className="divide-y divide-rule">
            {entries.map((e) => {
              const diff = (e.diff as Record<string, { from: unknown; to: unknown }> | null) ?? null;
              const fields = diff ? Object.keys(diff) : [];
              return (
                <li key={e.id} className="py-3">
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <p className="text-small text-ink-2">
                      <span className="font-semibold text-ink">{e.user?.name ?? "Someone"}</span> {describeAudit(e.action, e.entityType)}
                      {e.label ? <span className="text-ink-3"> — {e.label}</span> : null}
                    </p>
                    <time dateTime={e.createdAt.toISOString()} className="text-caption text-ink-3">
                      {e.createdAt.toLocaleString("en-GB", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
                    </time>
                  </div>
                  {fields.length ? <p className="mt-1 text-caption text-ink-3">Changed: {fields.join(", ")}</p> : null}
                </li>
              );
            })}
          </ul>
        ) : (
          <EmptyState title="Nothing recorded yet" description="Every change made in the admin is listed here from now on." />
        )}
      </Panel>
    </>
  );
}
