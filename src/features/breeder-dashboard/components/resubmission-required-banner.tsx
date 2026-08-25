import Link from "next/link";
import { AlertCircle } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { BREEDER_PROFILE_BASIC_PATH } from "@/features/breeder-profile";

import {
  RESUBMISSION_BANNER_CTA_LABEL,
  RESUBMISSION_BANNER_DESCRIPTION,
  RESUBMISSION_BANNER_FALLBACK_MESSAGE,
  RESUBMISSION_BANNER_HEADLINE,
} from "../constants";
import type { ResubmissionBannerData } from "../types";

type ResubmissionRequiredBannerProps = ResubmissionBannerData;

export function ResubmissionRequiredBanner({ comment }: ResubmissionRequiredBannerProps) {
  return (
    <Alert className="border-amber-200 bg-amber-50 text-amber-950">
      <AlertCircle className="size-4 text-amber-700" aria-hidden />
      <AlertTitle className="text-base font-semibold text-amber-950">
        {RESUBMISSION_BANNER_HEADLINE}
      </AlertTitle>
      <AlertDescription className="space-y-3 text-amber-900">
        {comment ? (
          <>
            <p className="whitespace-pre-wrap leading-relaxed">{comment}</p>
            <p>{RESUBMISSION_BANNER_DESCRIPTION}</p>
          </>
        ) : (
          <p>{RESUBMISSION_BANNER_FALLBACK_MESSAGE}</p>
        )}
        <Button
          asChild
          className="h-10 rounded-full bg-[var(--primary)] px-5 hover:bg-[var(--primary)]/90"
        >
          <Link href={BREEDER_PROFILE_BASIC_PATH}>{RESUBMISSION_BANNER_CTA_LABEL}</Link>
        </Button>
      </AlertDescription>
    </Alert>
  );
}
