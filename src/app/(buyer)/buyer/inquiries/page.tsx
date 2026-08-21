import { AlertCircle } from "lucide-react";

import { SiteHeader } from "@/components/layout/site-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  BuyerInquiriesView,
  INQUIRY_LIST_LOAD_ERROR_MESSAGE,
  loadBuyerInquiriesPageData,
} from "@/features/inquiries";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "問い合わせ履歴",
};

export default async function BuyerInquiriesPage() {
  let pageData;

  try {
    pageData = await loadBuyerInquiriesPageData();
  } catch {
    return (
      <>
        <SiteHeader />
        <main className="mx-auto max-w-2xl px-4 py-6 sm:max-w-4xl sm:py-10">
          <Alert variant="destructive" className="border-red-200 bg-red-50 text-red-800">
            <AlertCircle className="size-4 text-red-600" aria-hidden />
            <AlertDescription>{INQUIRY_LIST_LOAD_ERROR_MESSAGE}</AlertDescription>
          </Alert>
        </main>
      </>
    );
  }

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 py-6 sm:max-w-4xl sm:py-10">
        <BuyerInquiriesView {...pageData} />
      </main>
    </>
  );
}
