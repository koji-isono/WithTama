import { AdminPetReviewList, loadAdminPetReviewListPageData } from "@/features/admin";

export const metadata = {
  title: "犬猫掲載審査一覧",
};

export default async function AdminPetReviewsPage() {
  const { items } = await loadAdminPetReviewListPageData();

  return <AdminPetReviewList items={items} />;
}
