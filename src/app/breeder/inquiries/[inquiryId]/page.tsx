import { notFound } from "next/navigation";

import { BreederInquiryDetailView, loadBreederInquiryDetailPage } from "@/features/inquiries";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "問い合わせ詳細",
};

type BreederInquiryDetailPageProps = {
  params: Promise<{ inquiryId: string }>;
};

export default async function BreederInquiryDetailPage({ params }: BreederInquiryDetailPageProps) {
  const { inquiryId } = await params;
  const result = await loadBreederInquiryDetailPage(inquiryId);

  if (!result.success) {
    notFound();
  }

  return <BreederInquiryDetailView {...result.data} />;
}
