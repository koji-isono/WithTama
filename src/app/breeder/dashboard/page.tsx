import { BreederDashboardView, loadBreederDashboardPageData } from "@/features/breeder-dashboard";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "ブリーダーダッシュボード",
};

export default async function BreederDashboardPage() {
  const pageData = await loadBreederDashboardPageData();

  return <BreederDashboardView {...pageData} />;
}
