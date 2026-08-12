import { notFound } from "next/navigation";

import { AdminPetReviewDetail, loadAdminPetReviewDetailPageData } from "@/features/admin";

type AdminPetReviewDetailPageProps = {
  params: Promise<{ petId: string }>;
};

export async function generateMetadata({ params }: AdminPetReviewDetailPageProps) {
  const { petId } = await params;

  return {
    title: `犬猫掲載審査詳細 (${petId.slice(0, 8)}…)`,
  };
}

export default async function AdminPetReviewDetailPage({ params }: AdminPetReviewDetailPageProps) {
  const { petId } = await params;
  const data = await loadAdminPetReviewDetailPageData(petId);

  if (!data) {
    notFound();
  }

  return <AdminPetReviewDetail data={data} />;
}
