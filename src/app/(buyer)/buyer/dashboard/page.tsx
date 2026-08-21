import { SiteHeader } from "@/components/layout/site-header";
import { BuyerDashboardView } from "@/features/buyers/components/buyer-dashboard-view";
import { loadBuyerDashboardPageData } from "@/features/buyers/loaders";

export const metadata = {
  title: "購入希望者ダッシュボード",
};

export default async function BuyerDashboardPage() {
  const pageData = await loadBuyerDashboardPageData();

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 py-6 sm:max-w-6xl sm:py-10">
        <BuyerDashboardView {...pageData} />
      </main>
    </>
  );
}
