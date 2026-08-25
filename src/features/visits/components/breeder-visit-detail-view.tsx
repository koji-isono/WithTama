"use client";

import Link from "next/link";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { getBreederInquiryDetailPath } from "@/features/inquiries/constants";

import {
  BREEDER_VISIT_CANCEL_CONFIRM_MESSAGE,
  BREEDER_VISIT_DETAIL_SCREEN_ID,
  BREEDER_VISIT_LIST_PATH,
  VISIT_CANCEL_SUCCESS_MESSAGE,
  VISIT_COMPLETE_SUCCESS_MESSAGE,
  VISIT_SCHEDULE_SUCCESS_MESSAGE,
} from "../constants";
import { cancelVisitActionForBreeder } from "../service";
import type { BreederVisitDetailPageData } from "../types";
import { validateCancellationReason } from "../validation";
import { BreederVisitCompleteForm } from "./breeder-visit-complete-form";
import { BreederVisitDetailSummary } from "./breeder-visit-detail-summary";
import { BreederVisitScheduleForm } from "./breeder-visit-schedule-form";
import { VisitCancelDialog } from "./visit-cancel-dialog";

type BreederVisitDetailViewProps = BreederVisitDetailPageData;

export function BreederVisitDetailView({
  summary,
  canSchedule,
  canComplete,
  canCompleteNow,
  canCancel,
}: BreederVisitDetailViewProps) {
  const router = useRouter();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [cancellationReason, setCancellationReason] = useState("");
  const [reasonError, setReasonError] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleConfirmCancel() {
    const errors = validateCancellationReason(cancellationReason);

    if (errors.cancellationReason) {
      setReasonError(errors.cancellationReason);
      setFormError(null);
      return;
    }

    setReasonError(undefined);
    setFormError(null);
    setIsSubmitting(true);

    try {
      const result = await cancelVisitActionForBreeder({
        visitId: summary.visitId,
        cancellationReason,
      });

      if (result.success) {
        setDialogOpen(false);
        setSuccessMessage(VISIT_CANCEL_SUCCESS_MESSAGE);
        router.refresh();
        return;
      }

      if (result.fieldErrors?.cancellationReason) {
        setReasonError(result.fieldErrors.cancellationReason);
      }

      setFormError(result.error);
    } catch {
      setFormError("見学のキャンセルに失敗しました。時間をおいてもう一度お試しください。");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-6 pb-12 sm:py-10">
      <nav className="mb-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
        <Link
          href={BREEDER_VISIT_LIST_PATH}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--primary)] transition hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2"
        >
          <ArrowLeft className="size-4" aria-hidden />
          見学管理一覧へ戻る
        </Link>
        <Link
          href={getBreederInquiryDetailPath(summary.inquiryId)}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-600 transition hover:text-[var(--primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2"
        >
          問い合わせ詳細を見る
        </Link>
      </nav>

      <header className="mb-6 space-y-2">
        <p className="text-xs font-semibold tracking-widest text-[var(--primary)]">
          {BREEDER_VISIT_DETAIL_SCREEN_ID}
        </p>
        <h1 className="text-2xl font-bold text-neutral-900">見学詳細</h1>
        <p className="text-sm leading-relaxed text-neutral-600">
          見学希望の内容を確認し、日時確定や見学完了の記録を行えます。
        </p>
      </header>

      <div className="space-y-6">
        {successMessage ? (
          <Alert className="border-emerald-200 bg-emerald-50 text-emerald-900">
            <AlertDescription>{successMessage}</AlertDescription>
          </Alert>
        ) : null}

        {formError && !dialogOpen ? (
          <Alert variant="destructive" className="border-red-200 bg-red-50 text-red-800">
            <AlertCircle className="size-4 text-red-600" aria-hidden />
            <AlertDescription>{formError}</AlertDescription>
          </Alert>
        ) : null}

        <BreederVisitDetailSummary summary={summary} />

        {canSchedule ? (
          <BreederVisitScheduleForm
            summary={summary}
            onSuccess={() => {
              setSuccessMessage(VISIT_SCHEDULE_SUCCESS_MESSAGE);
              setFormError(null);
              router.refresh();
            }}
            onError={setFormError}
          />
        ) : null}

        {canComplete ? (
          <BreederVisitCompleteForm
            summary={summary}
            canCompleteNow={canCompleteNow}
            onSuccess={() => {
              setSuccessMessage(VISIT_COMPLETE_SUCCESS_MESSAGE);
              setFormError(null);
              router.refresh();
            }}
            onError={setFormError}
          />
        ) : null}

        {canCancel ? (
          <section className="border-t border-[var(--border)] pt-6">
            <h2 className="mb-4 text-lg font-semibold text-neutral-900">キャンセル</h2>
            <Button
              type="button"
              variant="destructive"
              className="h-11 w-full rounded-xl sm:w-auto"
              onClick={() => {
                setFormError(null);
                setReasonError(undefined);
                setDialogOpen(true);
              }}
            >
              見学をキャンセルする
            </Button>
          </section>
        ) : null}
      </div>

      <VisitCancelDialog
        open={dialogOpen}
        isSubmitting={isSubmitting}
        error={formError}
        cancellationReason={cancellationReason}
        reasonError={reasonError}
        confirmMessage={BREEDER_VISIT_CANCEL_CONFIRM_MESSAGE}
        onCancellationReasonChange={(value) => {
          setCancellationReason(value);

          if (reasonError) {
            setReasonError(undefined);
          }
        }}
        onCancel={() => {
          if (!isSubmitting) {
            setDialogOpen(false);
            setFormError(null);
            setReasonError(undefined);
          }
        }}
        onConfirm={handleConfirmCancel}
      />
    </div>
  );
}
