import { notFound } from "next/navigation";

import { InquiryDetailView, loadInquiryDetailPage } from "@/features/inquiries";

export const dynamic = "force-dynamic";

type InquiryDetailPageProps = {
  params: Promise<{ inquiryId: string }>;
};

export default async function InquiryDetailPage({ params }: InquiryDetailPageProps) {
  const { inquiryId } = await params;
  const result = await loadInquiryDetailPage(inquiryId);

  if (!result.success) {
    notFound();
  }

  return <InquiryDetailView {...result.data} />;
}
