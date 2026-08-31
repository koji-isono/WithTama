import { AlertCircle } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  BREEDER_BILLING_LOAD_ERROR_MESSAGE,
  BreederBillingView,
  loadBreederBillingPageData,
} from "@/features/billing";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "月額会費",
};

export default async function BreederBillingPage() {
  let pageData;

  try {
    pageData = await loadBreederBillingPageData();
  } catch {
    return (
      <div className="mx-auto max-w-lg px-4 py-6 sm:py-10">
        <Alert variant="destructive" className="border-red-200 bg-red-50 text-red-800">
          <AlertCircle className="size-4 text-red-600" aria-hidden />
          <AlertDescription>{BREEDER_BILLING_LOAD_ERROR_MESSAGE}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return <BreederBillingView {...pageData} />;
}
