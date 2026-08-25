import { AlertCircle } from "lucide-react";

import { SiteHeader } from "@/components/layout/site-header";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  VISIT_LIST_LOAD_ERROR_MESSAGE,
  VisitListView,
  loadBuyerVisitsPageData,
} from "@/features/visits";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "見学予定一覧",
};

export default async function BuyerVisitsPage() {
  let pageData;

  try {
    pageData = await loadBuyerVisitsPageData();
  } catch {
    return (
      <>
        <SiteHeader />
        <main className="mx-auto max-w-2xl px-4 py-6 sm:max-w-4xl sm:py-10">
          <Alert variant="destructive" className="border-red-200 bg-red-50 text-red-800">
            <AlertCircle className="size-4 text-red-600" aria-hidden />
            <AlertDescription>{VISIT_LIST_LOAD_ERROR_MESSAGE}</AlertDescription>
          </Alert>
        </main>
      </>
    );
  }

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 py-6 sm:max-w-4xl sm:py-10">
        <VisitListView {...pageData} />
      </main>
    </>
  );
}
