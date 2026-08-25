import { AlertCircle } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  BREEDER_VISIT_LIST_LOAD_ERROR_MESSAGE,
  BreederVisitListView,
  loadBreederVisitsPageData,
} from "@/features/visits";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "見学管理",
};

export default async function BreederVisitsPage() {
  let pageData;

  try {
    pageData = await loadBreederVisitsPageData();
  } catch {
    return (
      <div className="mx-auto max-w-4xl px-4 py-6 sm:py-10">
        <Alert variant="destructive" className="border-red-200 bg-red-50 text-red-800">
          <AlertCircle className="size-4 text-red-600" aria-hidden />
          <AlertDescription>{BREEDER_VISIT_LIST_LOAD_ERROR_MESSAGE}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return <BreederVisitListView {...pageData} />;
}
