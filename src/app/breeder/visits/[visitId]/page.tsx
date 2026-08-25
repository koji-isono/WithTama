import { notFound } from "next/navigation";

import { BreederVisitDetailView, loadBreederVisitDetailPage } from "@/features/visits";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "見学詳細",
};

type BreederVisitDetailPageProps = {
  params: Promise<{ visitId: string }>;
};

export default async function BreederVisitDetailPage({ params }: BreederVisitDetailPageProps) {
  const { visitId } = await params;
  const result = await loadBreederVisitDetailPage(visitId);

  if (!result.success) {
    notFound();
  }

  return <BreederVisitDetailView {...result.data} />;
}
