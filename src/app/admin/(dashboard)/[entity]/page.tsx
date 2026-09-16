import { notFound } from "next/navigation";
import { getEntity, loadList } from "@/lib/admin/load";
import { requireUser } from "@/lib/auth/session";
import { can } from "@/lib/auth/rbac";
import { PageHeader } from "@/components/admin/ui";
import { EntityList } from "@/components/admin/entity-list";
import { LinkButton } from "@/components/ui/button";
import { EmptyState } from "@/components/admin/ui";

type Props = { params: Promise<{ entity: string }> };

export async function generateMetadata({ params }: Props) {
  const { entity } = await params;
  const def = getEntity(entity);
  return { title: def?.label ?? "Admin" };
}

export default async function EntityListPage({ params }: Props) {
  const { entity } = await params;
  const def = getEntity(entity);
  if (!def) notFound();

  const [user, rows] = await Promise.all([requireUser(), loadList(def)]);
  const canPublish = can(user.role, "content.publish");

  return (
    <>
      <PageHeader
        title={def.label}
        description={def.description}
        actions={<LinkButton href={`/admin/${def.key}/new`} size="sm">{`Add ${def.singular.toLowerCase()}`}</LinkButton>}
      />
      {rows.length ? (
        <EntityList entityKey={def.key} rows={rows} columns={def.columns} canOrder={def.hasOrder} canPublish={canPublish} />
      ) : (
        <EmptyState
          title={`No ${def.label.toLowerCase()} yet`}
          description={def.description}
          action={<LinkButton href={`/admin/${def.key}/new`}>{`Add the first ${def.singular.toLowerCase()}`}</LinkButton>}
        />
      )}
    </>
  );
}
