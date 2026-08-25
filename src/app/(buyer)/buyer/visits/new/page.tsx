import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertCircle } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  VisitRequestForm,
  getVisitRequestPageErrorMessage,
  loadVisitRequestPage,
  shouldVisitRequestPageNotFound,
} from "@/features/visits";

export const dynamic = "force-dynamic";

type VisitRequestPageProps = {
  searchParams: Promise<{ inquiryId?: string }>;
};

export default async function VisitRequestPage({ searchParams }: VisitRequestPageProps) {
  const { inquiryId } = await searchParams;
  const result = await loadVisitRequestPage(inquiryId);

  if (shouldVisitRequestPageNotFound(result)) {
    notFound();
  }

  if (!result.success) {
    const errorMessage = getVisitRequestPageErrorMessage(result);
    const inquiryDetailPath = "inquiryDetailPath" in result ? result.inquiryDetailPath : undefined;

    return (
      <div className="mx-auto max-w-2xl px-4 py-10 sm:py-12">
        <Alert variant="destructive" className="border-red-200 bg-red-50 text-red-800">
          <AlertCircle className="size-4 text-red-600" aria-hidden />
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
        <div className="mt-6 flex flex-wrap gap-3">
          {inquiryDetailPath ? (
            <Button asChild variant="outline" className="rounded-xl">
              <Link href={inquiryDetailPath}>問い合わせ詳細へ</Link>
            </Button>
          ) : null}
          <Button asChild variant="outline" className="rounded-xl">
            <Link href="/buyer/inquiries">問い合わせ履歴へ</Link>
          </Button>
        </div>
      </div>
    );
  }

  return <VisitRequestForm inquiryId={result.data.inquiryId} pet={result.data.pet} />;
}
