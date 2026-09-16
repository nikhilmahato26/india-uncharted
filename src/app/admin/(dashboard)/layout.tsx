import { requireUser } from "@/lib/auth/session";
import { AdminShell } from "@/components/admin/shell";

// Admin pages are per-user and always render at request time.
export const instant = false;

export const metadata = { title: { default: "Admin", template: "%s | India Uncharted admin" }, robots: { index: false, follow: false } };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  return <AdminShell user={user}>{children}</AdminShell>;
}
