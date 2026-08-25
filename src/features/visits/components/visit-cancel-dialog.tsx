"use client";

import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

import {
  VISIT_CANCEL_CONFIRM_MESSAGE,
  VISIT_CANCEL_CONFIRM_TITLE,
  VISIT_CANCELLATION_REASON_MAX_LENGTH,
} from "../constants";

type VisitCancelDialogProps = {
  open: boolean;
  isSubmitting: boolean;
  error: string | null;
  cancellationReason: string;
  reasonError?: string;
  confirmMessage?: string;
  onCancellationReasonChange: (value: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
};

export function VisitCancelDialog({
  open,
  isSubmitting,
  error,
  cancellationReason,
  reasonError,
  confirmMessage = VISIT_CANCEL_CONFIRM_MESSAGE,
  onCancellationReasonChange,
  onCancel,
  onConfirm,
}: VisitCancelDialogProps) {
  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="visit-cancel-dialog-title"
    >
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg">
        <h2 id="visit-cancel-dialog-title" className="text-lg font-semibold text-neutral-900">
          {VISIT_CANCEL_CONFIRM_TITLE}
        </h2>
        <p className="mt-2 text-sm text-neutral-600">{confirmMessage}</p>

        <div className="mt-4 space-y-2">
          <Label
            htmlFor="visit-cancellation-reason"
            className="text-sm font-medium text-neutral-800"
          >
            キャンセル理由（任意）
          </Label>
          <Textarea
            id="visit-cancellation-reason"
            value={cancellationReason}
            onChange={(event) => onCancellationReasonChange(event.target.value)}
            rows={4}
            maxLength={VISIT_CANCELLATION_REASON_MAX_LENGTH + 1}
            disabled={isSubmitting}
            aria-invalid={Boolean(reasonError)}
            aria-describedby={reasonError ? "visit-cancellation-reason-error" : undefined}
            className={cn(
              "min-h-[100px] resize-y rounded-xl border-[var(--border)] bg-white text-sm leading-relaxed",
              reasonError && "border-red-500 focus-visible:ring-red-500",
            )}
            placeholder="例：都合が合わなくなったため"
          />
          {reasonError ? (
            <p id="visit-cancellation-reason-error" className="text-sm text-red-600" role="alert">
              {reasonError}
            </p>
          ) : null}
        </div>

        {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            className="h-10 rounded-full border-[var(--border)] px-5"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            戻る
          </Button>
          <Button
            type="button"
            variant="destructive"
            className="h-10 rounded-full px-5"
            onClick={onConfirm}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                キャンセル中…
              </>
            ) : (
              "見学をキャンセルする"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
