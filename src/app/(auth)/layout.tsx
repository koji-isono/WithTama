import { SiteFooter } from "@/components/layout/site-footer";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <div className="min-h-[70vh]">{children}</div>
      <SiteFooter />
    </>
  );
}
