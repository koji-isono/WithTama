import { AlertCircle } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  BreederInquiriesView,
  INQUIRY_BREEDER_LIST_LOAD_ERROR_MESSAGE,
  loadBreederInquiriesPageData,
} from "@/features/inquiries";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "問い合わせ",
};

export default async function BreederInquiriesPage() {
  let pageData;

  try {
    pageData = await loadBreederInquiriesPageData();
  } catch {
    return (
      <div className="mx-auto max-w-4xl px-4 py-6 sm:py-10">
        <Alert variant="destructive" className="border-red-200 bg-red-50 text-red-800">
          <AlertCircle className="size-4 text-red-600" aria-hidden />
          <AlertDescription>{INQUIRY_BREEDER_LIST_LOAD_ERROR_MESSAGE}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return <BreederInquiriesView {...pageData} />;
}
