import { AlertCircle } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  RESUBMISSION_BANNER_DESCRIPTION,
  RESUBMISSION_BANNER_FALLBACK_MESSAGE,
  RESUBMISSION_BANNER_HEADLINE,
  RESUBMISSION_REASON_LABEL,
} from "@/features/breeder-review/constants";

import type { ProfileResubmissionNoticeData } from "../types";

type ProfileResubmissionNoticeProps = ProfileResubmissionNoticeData;

export function ProfileResubmissionNotice({ comment }: ProfileResubmissionNoticeProps) {
  return (
    <Alert className="border-amber-200 bg-amber-50 text-amber-950">
      <AlertCircle className="size-4 text-amber-700" aria-hidden />
      <AlertTitle className="text-base font-semibold text-amber-950">
        {RESUBMISSION_BANNER_HEADLINE}
      </AlertTitle>
      <AlertDescription className="space-y-3 text-amber-900">
        {comment ? (
          <>
            <div className="space-y-2">
              <p className="text-sm font-medium text-amber-950">{RESUBMISSION_REASON_LABEL}</p>
              <p className="whitespace-pre-wrap rounded-xl border border-amber-100 bg-white/70 p-3 text-sm leading-relaxed text-neutral-800">
                {comment}
              </p>
            </div>
            <p>{RESUBMISSION_BANNER_DESCRIPTION}</p>
          </>
        ) : (
          <p>{RESUBMISSION_BANNER_FALLBACK_MESSAGE}</p>
        )}
      </AlertDescription>
    </Alert>
  );
}
