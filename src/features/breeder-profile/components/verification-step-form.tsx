"use client";

import { AlertCircle, Info } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { getBreederProfileStepBySlug } from "../constants";
import {
  BUSINESS_LICENSE_DESCRIPTION,
  IDENTITY_DOCUMENT_DESCRIPTION,
  VERIFICATION_PRIVACY_NOTICE,
} from "../document-constants";
import { completeBreederProfile } from "../service";
import type { ProfileMissingStep, VerificationStepInitialState } from "../types";
import { DocumentUploadField } from "./document-upload-field";

const introductionPath = getBreederProfileStepBySlug("introduction").path;
const dashboardPath = "/breeder/dashboard";

type VerificationStepFormProps = {
  initialState: VerificationStepInitialState;
};

function dedupeMissingSteps(steps: ProfileMissingStep[]): ProfileMissingStep[] {
  const seen = new Set<string>();

  return steps.filter((step) => {
    const key = `${step.step}-${step.label}`;

    if (seen.has(key)) {
      return false;
    }

    seen.add(key);
    return true;
  });
}

export function VerificationStepForm({ initialState }: VerificationStepFormProps) {
  const router = useRouter();
  const [identitySubmitted, setIdentitySubmitted] = useState(
    initialState.identityDocumentSubmitted,
  );
  const [licenseSubmitted, setLicenseSubmitted] = useState(initialState.businessLicenseSubmitted);
  const [missingSteps, setMissingSteps] = useState(initialState.missingSteps);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canComplete = identitySubmitted && licenseSubmitted;

  const visibleMissingSteps = useMemo(() => dedupeMissingSteps(missingSteps), [missingSteps]);

  const priorStepMissing = visibleMissingSteps.some((step) => step.step < 5);

  async function handleComplete() {
    setSubmitError(null);
    setIsSubmitting(true);

    try {
      const result = await completeBreederProfile();

      if (!result.success) {
        if (result.missingSteps) {
          setMissingSteps(result.missingSteps);
        }

        if (result.error) {
          setSubmitError(result.error);
        }

        return;
      }

      router.push(dashboardPath);
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleBack() {
    router.push(introductionPath);
  }

  function handleIdentityUploaded() {
    setIdentitySubmitted(true);
    setMissingSteps((current) => current.filter((step) => step.label !== "本人確認書類"));
  }

  function handleLicenseUploaded() {
    setLicenseSubmitted(true);
    setMissingSteps((current) => current.filter((step) => step.label !== "第一種動物取扱業登録証"));
  }

  return (
    <Card className="border-[var(--border)] bg-white shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">本人確認・登録証提出</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert className="border-blue-200 bg-blue-50 text-blue-900">
          <Info className="size-4 text-blue-600" />
          <AlertDescription>{VERIFICATION_PRIVACY_NOTICE}</AlertDescription>
        </Alert>

        {priorStepMissing ? (
          <Alert variant="destructive" className="border-amber-200 bg-amber-50 text-amber-900">
            <AlertCircle className="size-4 text-amber-600" />
            <AlertDescription>
              <p className="font-medium">未入力のステップがあります。</p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                {visibleMissingSteps
                  .filter((step) => step.step < 5)
                  .map((step) => (
                    <li key={`${step.step}-${step.label}`}>
                      <Link href={step.path} className="underline underline-offset-2">
                        Step {step.step}: {step.label}
                      </Link>
                    </li>
                  ))}
              </ul>
            </AlertDescription>
          </Alert>
        ) : null}

        <DocumentUploadField
          documentType="identity"
          label="本人確認書類"
          description={IDENTITY_DOCUMENT_DESCRIPTION}
          initiallySubmitted={initialState.identityDocumentSubmitted}
          disabled={isSubmitting}
          onUploaded={handleIdentityUploaded}
        />

        <DocumentUploadField
          documentType="license"
          label="第一種動物取扱業登録証"
          description={BUSINESS_LICENSE_DESCRIPTION}
          initiallySubmitted={initialState.businessLicenseSubmitted}
          disabled={isSubmitting}
          onUploaded={handleLicenseUploaded}
        />

        {submitError ? (
          <Alert variant="destructive" className="border-red-200 bg-red-50 text-red-800">
            <AlertCircle className="size-4 text-red-600" />
            <AlertDescription>
              <p>{submitError}</p>
              {visibleMissingSteps.length > 0 ? (
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                  {visibleMissingSteps.map((step) => (
                    <li key={`submit-${step.step}-${step.label}`}>
                      {step.step < 5 ? (
                        <Link href={step.path} className="underline underline-offset-2">
                          Step {step.step}: {step.label}
                        </Link>
                      ) : (
                        <span>
                          Step {step.step}: {step.label}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              ) : null}
            </AlertDescription>
          </Alert>
        ) : null}

        <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-between">
          <Button
            type="button"
            variant="outline"
            className="h-11 rounded-full border-[var(--border)] px-6"
            onClick={handleBack}
            disabled={isSubmitting}
          >
            戻る
          </Button>
          <Button
            type="button"
            className="h-11 rounded-full bg-[var(--primary)] px-6 hover:bg-[var(--primary)]/90 sm:ml-auto"
            disabled={!canComplete || isSubmitting}
            onClick={() => void handleComplete()}
          >
            {isSubmitting ? "提出中..." : "提出してプロフィールを完了"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
