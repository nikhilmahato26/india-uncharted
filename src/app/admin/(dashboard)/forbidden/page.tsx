import Link from "next/link";
import { requireUser } from "@/lib/auth/session";
import { ROLE_LABELS } from "@/lib/auth/rbac";
import { PageHeader, Panel } from "@/components/admin/ui";

export const metadata = { title: "Not allowed" };

const EXPLAIN: Record<string, string> = {
  "content.publish": "publishing pages",
  "content.delete": "deleting content",
  "seo.global": "the site-wide SEO settings",
  "seo.redirects": "redirects",
  "seo.head": "verification and analytics codes",
  "settings.edit": "site settings",
  "users.manage": "user accounts",
  "enquiries.manage": "moving enquiries through the pipeline",
  "notices.edit": "seasonal notices",
  "activity.read": "the activity log",
};

export default async function ForbiddenPage({ searchParams }: { searchParams: Promise<{ need?: string }> }) {
  const user = await requireUser();
  const { need } = await searchParams;
  const what = need ? EXPLAIN[need] : null;

  return (
    <>
      <PageHeader title="That part isn't yours to change" back={{ label: "Dashboard", href: "/admin" }} />
      <Panel>
        <p className="measure text-body text-ink-2">
          You’re signed in as <strong className="text-ink">{user.name}</strong> ({ROLE_LABELS[user.role].toLowerCase()}){what ? `, and ${what} needs a higher role` : ""}. Ask a super
          admin to make the change, or to change your role.
        </p>
        <p className="mt-4 text-small text-ink-3">
          Nothing was changed.{" "}
          <Link href="/admin" className="text-terracotta-700 underline underline-offset-4">
            Back to the dashboard
          </Link>
        </p>
      </Panel>
    </>
  );
}
