"use client";

import { AlertCircle, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { ProfileFormField } from "@/features/breeder-profile/components/profile-form-field";
import { cn } from "@/lib/utils";

import { DESCRIPTION_REVIEW_STATUS_LABELS, PET_DESCRIPTION_MAX_LENGTH } from "../constants";
import {
  savePetDescriptionRevisionDraftAction,
  submitPetDescriptionRevisionAction,
} from "../service";
import type { DescriptionReviewStatus } from "../types";
import { validatePendingDescriptionDraft } from "../validation";

type PetDescriptionRevisionSectionProps = {
  petId: string;
  publishedDescription: string | null;
  pendingDescription: string | null;
  descriptionReviewStatus: DescriptionReviewStatus;
  descriptionReturnReason: string | null;
};

function ReadOnlyDescription({ label, value }: { label: string; value: string | null }) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium text-neutral-800">{label}</p>
      <div className="rounded-xl border border-[var(--border)] bg-neutral-50/80 px-4 py-3 text-sm whitespace-pre-wrap text-neutral-700">
        {value?.trim() || "（未入力）"}
      </div>
    </div>
  );
}

export function PetDescriptionRevisionSection({
  petId,
  publishedDescription,
  pendingDescription,
  descriptionReviewStatus,
  descriptionReturnReason,
}: PetDescriptionRevisionSectionProps) {
  const router = useRouter();
  const [pendingDraft, setPendingDraft] = useState(pendingDescription ?? "");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isUnderReview = descriptionReviewStatus === "under_review";
  const canEditPending = ["none", "draft", "returned"].includes(descriptionReviewStatus);
  const reviewBadgeLabel = DESCRIPTION_REVIEW_STATUS_LABELS[descriptionReviewStatus];

  async function handleSaveDraft(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFieldError(null);
    setActionError(null);
    setSaveSuccess(false);
    setSubmitSuccess(false);

    const validationError = validatePendingDescriptionDraft(pendingDraft);

    if (validationError) {
      setFieldError(validationError);
      return;
    }

    setIsSaving(true);

    try {
      const result = await savePetDescriptionRevisionDraftAction(petId, pendingDraft);

      if (!result.success) {
        setFieldError(result.fieldErrors?.pendingDescription ?? result.error ?? null);
        setActionError(result.error ?? null);
        return;
      }

      setSaveSuccess(true);
      router.refresh();
    } finally {
      setIsSaving(false);
    }
  }

  async function handleSubmitRevision() {
    setFieldError(null);
    setActionError(null);
    setSaveSuccess(false);
    setSubmitSuccess(false);

    const validationError = validatePendingDescriptionDraft(pendingDraft);

    if (validationError) {
      setFieldError(validationError);
      return;
    }

    setIsSubmitting(true);

    try {
      const saveResult = await savePetDescriptionRevisionDraftAction(petId, pendingDraft);

      if (!saveResult.success) {
        setFieldError(saveResult.fieldErrors?.pendingDescription ?? saveResult.error ?? null);
        setActionError(saveResult.error ?? null);
        return;
      }

      const submitResult = await submitPetDescriptionRevisionAction(petId);

      if (!submitResult.success) {
        setFieldError(submitResult.fieldErrors?.pendingDescription ?? submitResult.error ?? null);
        setActionError(submitResult.error ?? null);
        return;
      }

      setSubmitSuccess(true);
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  const isBusy = isSaving || isSubmitting;

  return (
    <Card className="mt-6 border-[var(--border)] bg-white shadow-sm">
      <CardHeader className="pb-2">
        <div className="flex flex-wrap items-center gap-3">
          <CardTitle className="text-lg">紹介文</CardTitle>
          {reviewBadgeLabel ? (
            <Badge className="border-transparent bg-amber-100 text-amber-900 hover:bg-amber-100">
              {reviewBadgeLabel}
            </Badge>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <ReadOnlyDescription label="現在公開中の紹介文" value={publishedDescription} />

        {descriptionReturnReason ? (
          <Alert variant="destructive" className="border-red-200 bg-red-50 text-red-800">
            <AlertCircle className="size-4 text-red-600" />
            <AlertDescription>
              <span className="font-medium">差戻し理由:</span>
              <span className="mt-1 block whitespace-pre-wrap">{descriptionReturnReason}</span>
            </AlertDescription>
          </Alert>
        ) : null}

        {isUnderReview ? (
          <ReadOnlyDescription label="審査中の変更案" value={pendingDescription} />
        ) : (
          <form className="space-y-4" onSubmit={handleSaveDraft} noValidate>
            <ProfileFormField
              id="pending_description"
              label="変更案"
              optional
              description="公開中の紹介文を変更する場合は、こちらに新しい内容を入力し、保存後に申請してください。"
              error={fieldError ?? undefined}
            >
              <div className="space-y-1">
                <Textarea
                  id="pending_description"
                  name="pending_description"
                  value={pendingDraft}
                  onChange={(event) => {
                    setPendingDraft(event.target.value);
                    setFieldError(null);
                    setActionError(null);
                    setSaveSuccess(false);
                    setSubmitSuccess(false);
                  }}
                  placeholder={
                    "人と遊ぶことが大好きで、普段は兄弟たちと元気に過ごしています。\n初めて会う人には少し慎重ですが、慣れるとそばに寄ってくる子です。"
                  }
                  disabled={!canEditPending || isBusy}
                  maxLength={PET_DESCRIPTION_MAX_LENGTH}
                  rows={6}
                  aria-invalid={Boolean(fieldError)}
                  className={cn(
                    "min-h-[120px] resize-y rounded-xl border-[var(--border)] bg-white",
                    fieldError && "border-red-400 focus-visible:ring-red-400",
                  )}
                />
                <p className="text-right text-xs text-neutral-500">
                  {pendingDraft.length} / {PET_DESCRIPTION_MAX_LENGTH}
                </p>
              </div>
            </ProfileFormField>

            {saveSuccess ? (
              <Alert className="border-emerald-200 bg-emerald-50 text-emerald-900">
                <CheckCircle2 className="size-4 text-emerald-600" />
                <AlertDescription>変更案を保存しました</AlertDescription>
              </Alert>
            ) : null}

            {submitSuccess ? (
              <Alert className="border-emerald-200 bg-emerald-50 text-emerald-900">
                <CheckCircle2 className="size-4 text-emerald-600" />
                <AlertDescription>紹介文変更を申請しました</AlertDescription>
              </Alert>
            ) : null}

            {actionError ? (
              <Alert variant="destructive" className="border-red-200 bg-red-50 text-red-800">
                <AlertCircle className="size-4 text-red-600" />
                <AlertDescription>{actionError}</AlertDescription>
              </Alert>
            ) : null}

            {canEditPending ? (
              <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                <Button
                  type="submit"
                  variant="outline"
                  className="h-11 rounded-full border-[var(--border)] px-6"
                  disabled={isBusy}
                >
                  {isSaving ? "保存中..." : "変更案を保存"}
                </Button>
                <Button
                  type="button"
                  className="h-11 rounded-full bg-[var(--primary)] px-6 hover:bg-[var(--primary)]/90"
                  disabled={isBusy}
                  onClick={handleSubmitRevision}
                >
                  {isSubmitting ? "申請中..." : "紹介文変更を申請"}
                </Button>
              </div>
            ) : null}
          </form>
        )}
      </CardContent>
    </Card>
  );
}
