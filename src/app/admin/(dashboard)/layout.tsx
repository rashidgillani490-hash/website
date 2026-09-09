import { AdminShell } from "@/components/admin/AdminShell";
import { requireStaff } from "@/lib/auth";
import { getAdminRepo } from "@/lib/admin/repo";

// Every dashboard route is rendered per-request behind the auth gate.
export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireStaff();
  const repo = await getAdminRepo();

  return (
    <AdminShell email={session.email} mode={session.mode} backend={repo.backend}>
      {children}
    </AdminShell>
  );
}
