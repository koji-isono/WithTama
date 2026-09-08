"use client";

import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";

type PetPauseListingDialogProps = {
  open: boolean;
  petName: string;
  hasDescriptionRevisionInReview: boolean;
  isSubmitting: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: () => void;
};

export function PetPauseListingDialog({
  open,
  petName,
  hasDescriptionRevisionInReview,
  isSubmitting,
  error,
  onCancel,
  onConfirm,
}: PetPauseListingDialogProps) {
  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pet-pause-listing-title"
    >
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg">
        <h2 id="pet-pause-listing-title" className="text-lg font-semibold text-neutral-900">
          公開停止の確認
        </h2>
        <p className="mt-2 text-sm font-medium text-neutral-800">{petName}</p>
        <p className="mt-3 text-sm text-neutral-600">この犬猫の公開を停止しますか？</p>
        <p className="mt-2 text-sm text-neutral-600">
          停止すると、購入希望者向けの犬猫一覧・詳細ページから表示されなくなります。
          進行中の問い合わせ・見学の履歴は保持されます。
        </p>
        {hasDescriptionRevisionInReview ? (
          <p className="mt-2 text-sm text-neutral-600">審査中の紹介文変更案は取り消されます。</p>
        ) : null}
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
            variant="destructive"
            className="h-10 rounded-full px-5"
            onClick={onConfirm}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                停止中...
              </>
            ) : (
              "公開を停止"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
