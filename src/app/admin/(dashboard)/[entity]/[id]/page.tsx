import { notFound } from "next/navigation";
import Link from "next/link";
import { getEntity, loadMediaOptions, loadRecord, loadRelationOptions } from "@/lib/admin/load";
import { checksFor } from "@/lib/admin/seo-subject";
import { getSeoSettings } from "@/lib/content/settings";
import { requireUser } from "@/lib/auth/session";
import { can } from "@/lib/auth/rbac";
import { SITE_URL } from "@/lib/site";
import { db } from "@/lib/db";
import { PageHeader } from "@/components/admin/ui";
import { EntityForm } from "@/components/admin/entity-form";

type Props = { params: Promise<{ entity: string; id: string }> };

export async function generateMetadata({ params }: Props) {
  const { entity, id } = await params;
  const def = getEntity(entity);
  if (!def) return {};
  if (id === "new") return { title: `New ${def.singular.toLowerCase()}` };
  const row = await loadRecord(def, id);
  return { title: row ? String(row[def.titleField] ?? def.singular) : def.singular };
}

export default async function EntityEditorPage({ params }: Props) {
  const { entity, id } = await params;
  const def = getEntity(entity);
  if (!def) notFound();

  const isNew = id === "new";
  const user = await requireUser();
  const [row, media, relations, seoSettings] = await Promise.all([
    isNew ? Promise.resolve(null) : loadRecord(def, id),
    loadMediaOptions(),
    loadRelationOptions(def.key, isNew ? null : id),
    getSeoSettings(),
  ]);
  if (!isNew && !row) notFound();

  const values: Record<string, unknown> = { ...(row ?? {}) };
  if (def.key === "testimonials" && row) values.verified = Boolean(row.verifiedAt);
  if (row?.travelledOn) values.travelledOn = new Date(row.travelledOn as Date).toISOString().slice(0, 10);

  const seoRow = (row?.seo as Record<string, unknown> | null) ?? null;
  const seoValues: Record<string, unknown> = seoRow
    ? { ...seoRow, customJsonLd: seoRow.customJsonLd ? JSON.stringify(seoRow.customJsonLd, null, 2) : "" }
    : { robotsIndex: true, robotsFollow: true };

  const checks = row ? await checksFor(def, row) : [];
  const title = String(row?.[def.titleField] ?? `New ${def.singular.toLowerCase()}`);
  const publicPath = def.publicPath && row?.slug ? def.publicPath({ slug: String(row.slug), kind: (row.kind as string) ?? null }) : null;

  const history = row
    ? await db.auditLog.findMany({
        where: { entityType: def.singular, entityId: String(row.id) },
        orderBy: { createdAt: "desc" },
        take: 6,
        select: { id: true, action: true, createdAt: true, user: { select: { name: true } } },
      })
    : [];

  return (
    <>
      <PageHeader
        title={title}
        back={{ label: def.label, href: `/admin/${def.key}` }}
        description={
          history.length ? (
            <span>
              Last changed by {history[0]!.user?.name ?? "someone"} on{" "}
              <time dateTime={history[0]!.createdAt.toISOString()}>{history[0]!.createdAt.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}</time>.{" "}
              <Link href="/admin/activity" className="underline underline-offset-4">
                Full history
              </Link>
            </span>
          ) : (
            def.description
          )
        }
      />
      <EntityForm
        entityKey={def.key}
        id={isNew ? null : id}
        title={title}
        groups={def.groups}
        values={values}
        seoValues={seoValues}
        hasSeo={def.hasSeo}
        hasStatus={def.hasStatus}
        hasHero={def.hasHero}
        status={String(row?.status ?? "DRAFT")}
        publicPath={publicPath}
        canPublish={can(user.role, "content.publish")}
        canDelete={can(user.role, "content.delete")}
        media={media}
        relations={relations}
        checks={checks}
        siteUrl={SITE_URL}
        titlePattern={seoSettings.patterns?.[def.entityType]?.title ?? null}
      />
    </>
  );
}
