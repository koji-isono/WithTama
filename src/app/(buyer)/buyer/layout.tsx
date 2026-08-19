import { requireBuyer } from "@/features/auth/buyer-auth";

export default async function BuyerLayout({ children }: { children: React.ReactNode }) {
  await requireBuyer();

  return <>{children}</>;
}
