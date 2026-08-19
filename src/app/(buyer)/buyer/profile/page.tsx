import { SiteHeader } from "@/components/layout/site-header";
import { BuyerProfileForm } from "@/features/buyers/components/buyer-profile-form";
import { loadBuyerProfilePageData } from "@/features/buyers/loaders";

export const metadata = {
  title: "購入希望者プロフィール",
};

export default async function BuyerProfilePage() {
  const pageData = await loadBuyerProfilePageData();

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 py-6 sm:py-10">
        <BuyerProfileForm {...pageData} />
      </main>
    </>
  );
}
