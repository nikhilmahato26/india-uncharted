import { db } from "@/lib/db";
import { requireCapability } from "@/lib/auth/session";
import { can } from "@/lib/auth/rbac";
import { countUsage } from "@/app/actions/media";
import { PageHeader } from "@/components/admin/ui";
import { MediaLibrary } from "@/components/admin/media-library";

export const metadata = { title: "Media" };

export default async function MediaPage({ searchParams }: { searchParams: Promise<{ filter?: string }> }) {
  const user = await requireCapability("media.upload");
  const { filter } = await searchParams;

  const where = filter === "no-alt" ? { altText: "" } : filter === "unknown-licence" ? { licence: "UNKNOWN" as const } : {};
  const [items, total, noAlt, unknownLicence] = await Promise.all([
    db.media.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 200,
      select: { id: true, url: true, altText: true, title: true, caption: true, credit: true, licence: true, width: true, height: true, bytes: true, createdAt: true },
    }),
    db.media.count(),
    db.media.count({ where: { altText: "" } }),
    db.media.count({ where: { licence: "UNKNOWN" } }),
  ]);

  // Usage counts drive the "safe to delete" affordance.
  const usage = Object.fromEntries(await Promise.all(items.map(async (m) => [m.id, await countUsage(m.id)] as const)));

  return (
    <>
      <PageHeader
        title="Media"
        description="Every image on the site. Alt text describes the picture for screen readers and search engines — write it as if you were telling someone what they're missing."
      />
      <MediaLibrary
        items={items.map((m) => ({ ...m, createdAt: m.createdAt.toISOString(), usageCount: usage[m.id] ?? 0 }))}
        totals={{ total, noAlt, unknownLicence }}
        activeFilter={filter ?? null}
        canDelete={can(user.role, "media.delete")}
      />
    </>
  );
}
