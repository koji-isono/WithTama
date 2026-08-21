import { SiteHeader } from "@/components/layout/site-header";
import { BuyerFavoritesView, loadBuyerFavoritesPageData } from "@/features/favorites";

export const metadata = {
  title: "お気に入り",
};

export default async function BuyerFavoritesPage() {
  const pageData = await loadBuyerFavoritesPageData();

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 py-6 sm:max-w-6xl sm:py-10">
        <BuyerFavoritesView {...pageData} />
      </main>
    </>
  );
}
