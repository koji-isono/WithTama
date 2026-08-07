"use client";

import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";

type PetSubmitReviewDialogProps = {
  open: boolean;
  petName: string;
  isSubmitting: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: () => void;
};

export function PetSubmitReviewDialog({
  open,
  petName,
  isSubmitting,
  error,
  onCancel,
  onConfirm,
}: PetSubmitReviewDialogProps) {
  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pet-submit-review-title"
    >
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg">
        <h2 id="pet-submit-review-title" className="text-lg font-semibold text-neutral-900">
          この犬猫を公開申請しますか？
        </h2>
        <p className="mt-2 text-sm font-medium text-neutral-800">{petName}</p>
        <p className="mt-3 text-sm text-neutral-600">
          申請後は管理者による掲載内容の審査が行われます。
        </p>
        {error ? <p className="mt-3 text-sm text-red-700">{error}</p> : null}
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            className="h-10 rounded-full border-[var(--border)] px-5"
            onClick={onCancel}
            disabled={isSubmitting}
          >
            キャンセル
          </Button>
          <Button
            type="button"
            className="h-10 rounded-full bg-[var(--primary)] px-5 hover:bg-[var(--primary)]/90"
            onClick={onConfirm}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                申請中...
              </>
            ) : (
              "公開申請する"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
