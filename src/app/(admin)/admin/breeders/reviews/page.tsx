import { AdminBreederReviewList, loadAdminBreederReviewListPageData } from "@/features/admin";

export const metadata = {
  title: "ブリーダー審査一覧",
};

export default async function AdminBreederReviewsPage() {
  const { items } = await loadAdminBreederReviewListPageData();

  return <AdminBreederReviewList items={items} />;
}
