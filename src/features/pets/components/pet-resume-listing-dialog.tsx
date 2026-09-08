"use client";

import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";

type PetResumeListingDialogProps = {
  open: boolean;
  petName: string;
  isSubmitting: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: () => void;
};

export function PetResumeListingDialog({
  open,
  petName,
  isSubmitting,
  error,
  onCancel,
  onConfirm,
}: PetResumeListingDialogProps) {
  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pet-resume-listing-title"
    >
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg">
        <h2 id="pet-resume-listing-title" className="text-lg font-semibold text-neutral-900">
          再公開の確認
        </h2>
        <p className="mt-2 text-sm font-medium text-neutral-800">{petName}</p>
        <p className="mt-3 text-sm text-neutral-600">この犬猫を再公開しますか？</p>
        <p className="mt-2 text-sm text-neutral-600">
          停止前に承認されていた内容で再び公開されます。
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
                再公開中...
              </>
            ) : (
              "再公開する"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
