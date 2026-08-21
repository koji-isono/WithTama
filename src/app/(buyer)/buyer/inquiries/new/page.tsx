import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertCircle } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  InquiryNewForm,
  getInquiryNewPageErrorMessage,
  loadInquiryNewPage,
  shouldInquiryNewPageNotFound,
} from "@/features/inquiries";

export const dynamic = "force-dynamic";

type InquiryNewPageProps = {
  searchParams: Promise<{ petId?: string }>;
};

export default async function InquiryNewPage({ searchParams }: InquiryNewPageProps) {
  const { petId } = await searchParams;
  const result = await loadInquiryNewPage(petId);

  if (shouldInquiryNewPageNotFound(result)) {
    notFound();
  }

  if (!result.success) {
    const errorMessage = getInquiryNewPageErrorMessage(result);
    const listPath = "petListPath" in result ? result.petListPath : "/pets";

    return (
      <div className="mx-auto max-w-2xl px-4 py-10 sm:py-12">
        <Alert variant="destructive" className="border-red-200 bg-red-50 text-red-800">
          <AlertCircle className="size-4 text-red-600" aria-hidden />
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
        <div className="mt-6">
          <Button asChild variant="outline" className="rounded-xl">
            <Link href={listPath}>犬猫一覧へ</Link>
          </Button>
        </div>
      </div>
    );
  }

  return <InquiryNewForm petId={result.data.petId} pet={result.data.pet} />;
}
