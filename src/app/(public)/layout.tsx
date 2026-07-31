import { SiteHeader } from "@/components/layout/site-header";
import { SupabaseConnectionStatus } from "@/components/dev/supabase-connection-status";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main>{children}</main>
      <SupabaseConnectionStatus />
    </>
  );
}
