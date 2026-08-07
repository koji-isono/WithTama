import { requireAdmin } from "@/features/auth/admin-auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  await requireAdmin();

  return <>{children}</>;
}
