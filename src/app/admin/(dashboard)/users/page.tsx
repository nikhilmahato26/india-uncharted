import { db } from "@/lib/db";
import { requireCapability } from "@/lib/auth/session";
import { ROLE_LABELS } from "@/lib/auth/rbac";
import { PageHeader, Panel } from "@/components/admin/ui";
import { UsersManager } from "@/components/admin/users-manager";

export const metadata = { title: "Users" };

export default async function UsersPage() {
  const me = await requireCapability("users.manage");
  const users = await db.user.findMany({
    orderBy: [{ isActive: "desc" }, { name: "asc" }],
    select: { id: true, name: true, email: true, role: true, isActive: true, lastLoginAt: true, createdAt: true },
  });

  return (
    <>
      <PageHeader title="Users" description="Who can sign in, and what each of them is allowed to do." />

      <Panel title="What each role can do" className="mb-6">
        <dl className="grid gap-4 sm:grid-cols-3">
          <div>
            <dt className="font-semibold text-ink">{ROLE_LABELS.EDITOR}</dt>
            <dd className="mt-1 text-small text-ink-2">Writes and edits content, and sets SEO on the pages they work on. Can’t publish, delete, or change settings.</dd>
          </div>
          <div>
            <dt className="font-semibold text-ink">{ROLE_LABELS.ADMIN}</dt>
            <dd className="mt-1 text-small text-ink-2">Everything an editor can do, plus publishing, deleting, redirects, enquiries and site settings.</dd>
          </div>
          <div>
            <dt className="font-semibold text-ink">{ROLE_LABELS.SUPER_ADMIN}</dt>
            <dd className="mt-1 text-small text-ink-2">Everything, including user accounts and the verification and analytics codes.</dd>
          </div>
        </dl>
      </Panel>

      <UsersManager
        me={me.id}
        users={users.map((u) => ({
          ...u,
          lastLoginAt: u.lastLoginAt?.toISOString() ?? null,
          createdAt: u.createdAt.toISOString(),
        }))}
      />
    </>
  );
}
