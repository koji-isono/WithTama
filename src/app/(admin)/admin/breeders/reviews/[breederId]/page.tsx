import { notFound } from "next/navigation";

import { AdminBreederReviewDetail, loadAdminBreederReviewDetailPageData } from "@/features/admin";

type AdminBreederReviewDetailPageProps = {
  params: Promise<{ breederId: string }>;
};

export async function generateMetadata({ params }: AdminBreederReviewDetailPageProps) {
  const { breederId } = await params;

  return {
    title: `ブリーダー審査詳細 (${breederId.slice(0, 8)}…)`,
  };
}

export default async function AdminBreederReviewDetailPage({
  params,
}: AdminBreederReviewDetailPageProps) {
  const { breederId } = await params;
  const data = await loadAdminBreederReviewDetailPageData(breederId);

  if (!data) {
    notFound();
  }

  return <AdminBreederReviewDetail data={data} />;
}
