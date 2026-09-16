import { requireUser } from "@/lib/auth/session";
import { ROLE_LABELS } from "@/lib/auth/rbac";
import { PageHeader, Panel } from "@/components/admin/ui";
import { PasswordForm } from "@/components/admin/password-form";

export const metadata = { title: "Your account" };

export default async function AccountPage() {
  const user = await requireUser();
  return (
    <>
      <PageHeader title="Your account" description="Change your password. Everyone else signed in as you — on any device — is signed out when you do." />
      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="You">
          <dl className="grid gap-3 text-small">
            <div>
              <dt className="text-caption text-ink-3">Name</dt>
              <dd className="text-ink">{user.name}</dd>
            </div>
            <div>
              <dt className="text-caption text-ink-3">Email</dt>
              <dd className="text-ink">{user.email}</dd>
            </div>
            <div>
              <dt className="text-caption text-ink-3">Role</dt>
              <dd className="text-ink">{ROLE_LABELS[user.role]}</dd>
            </div>
          </dl>
        </Panel>
        <Panel title="Change password">
          <PasswordForm />
        </Panel>
      </div>
    </>
  );
}
