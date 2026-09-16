import { db } from "@/lib/db";
import { requireCapability } from "@/lib/auth/session";
import { PageHeader, Panel } from "@/components/admin/ui";
import { NoticesManager } from "@/components/admin/notices-manager";

export const metadata = { title: "Seasonal notices" };

export default async function NoticesPage() {
  await requireCapability("notices.edit");
  const [notices, destinations, journeys, regions] = await Promise.all([
    db.seasonalNotice.findMany({ orderBy: [{ isActive: "desc" }, { createdAt: "desc" }] }),
    db.destination.findMany({ where: { status: "PUBLISHED" }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.journey.findMany({ where: { status: "PUBLISHED" }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
    db.region.findMany({ where: { status: "PUBLISHED" }, orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  return (
    <>
      <PageHeader
        title="Seasonal notices"
        description="For the times when something can't be travelled: a monsoon, a closed pass, a park's off-season. A notice explains it on the pages it affects."
      />
      <Panel className="mb-6">
        <p className="text-small text-ink-2">
          Notices are <strong>scoped</strong>. A notice on one journey never appears on another, and a site-wide notice never hides itself behind a page-level one — the most specific
          notice wins. Nothing is shown until you switch it on.
        </p>
      </Panel>
      <NoticesManager
        notices={notices.map((n) => ({
          id: n.id,
          scope: n.scope,
          targetId: n.targetId,
          title: n.title,
          body: n.body,
          startsOn: n.startsOn?.toISOString().slice(0, 10) ?? "",
          endsOn: n.endsOn?.toISOString().slice(0, 10) ?? "",
          blocksEnquiry: n.blocksEnquiry,
          isActive: n.isActive,
        }))}
        targets={{
          DESTINATION: destinations.map((d) => ({ value: d.id, label: d.name })),
          JOURNEY: journeys.map((j) => ({ value: j.id, label: j.name })),
          REGION: regions.map((r) => ({ value: r.id, label: r.name })),
          EXPERIENCE: [],
        }}
      />
    </>
  );
}
