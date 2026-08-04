import { BreederHeader } from "@/components/layout/breeder-header";
import { BreederMobileNav } from "@/components/layout/breeder-mobile-nav";
import { BreederSidebar } from "@/components/layout/breeder-sidebar";

export default function BreederLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      <BreederSidebar />

      <div className="flex min-h-screen flex-col md:pl-60">
        <BreederHeader />
        <main className="flex-1 pb-20 md:pb-0">{children}</main>
      </div>

      <BreederMobileNav />
    </div>
  );
}
