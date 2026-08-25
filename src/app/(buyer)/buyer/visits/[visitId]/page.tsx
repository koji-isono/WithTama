import { notFound } from "next/navigation";

import { VisitDetailView, loadVisitDetailPage } from "@/features/visits";

export const dynamic = "force-dynamic";

type VisitDetailPageProps = {
  params: Promise<{ visitId: string }>;
};

export default async function VisitDetailPage({ params }: VisitDetailPageProps) {
  const { visitId } = await params;
  const result = await loadVisitDetailPage(visitId);

  if (!result.success) {
    notFound();
  }

  return <VisitDetailView summary={result.data.summary} canCancel={result.data.canCancel} />;
}
