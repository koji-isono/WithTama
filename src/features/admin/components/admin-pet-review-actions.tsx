"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import {
  ADMIN_PET_REVIEWS_PATH,
  ADMIN_PET_REVIEW_APPROVE_CONFIRM_MESSAGE,
  ADMIN_PET_REVIEW_RETURN_CONFIRM_MESSAGE,
} from "../constants";
import { approvePetForPublishAction, returnPetReviewAction } from "../service";

type AdminPetReviewActionsProps = {
  petId: string;
  petDisplayName: string;
};

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  message: string;
  petDisplayName: string;
  confirmLabel: string;
  isSubmitting: boolean;
  error: string | null;
  onCancel: () => void;
  onConfirm: () => void;
  variant?: "default" | "destructive";
};

function ConfirmDialog({
  open,
  title,
  message,
  petDisplayName,
  confirmLabel,
  isSubmitting,
  error,
  onCancel,
  onConfirm,
  variant = "default",
}: ConfirmDialogProps) {
  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="admin-pet-review-dialog-title"
    >
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg">
        <h2 id="admin-pet-review-dialog-title" className="text-lg font-semibold text-neutral-900">
          {title}
        </h2>
        <p className="mt-2 text-sm text-neutral-600">{message}</p>
        <p className="mt-2 text-sm font-medium text-neutral-800">{petDisplayName}</p>
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
            variant={variant === "destructive" ? "destructive" : "default"}
            className={
              variant === "default"
                ? "h-10 rounded-full bg-[var(--primary)] px-5 hover:bg-[var(--primary)]/90"
                : "h-10 rounded-full px-5"
            }
            onClick={onConfirm}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                処理中...
              </>
            ) : (
              confirmLabel
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function AdminPetReviewActions({ petId, petDisplayName }: AdminPetReviewActionsProps) {
  const router = useRouter();
  const [returnComment, setReturnComment] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isReturning, setIsReturning] = useState(false);

  const isBusy = isApproving || isReturning;
  const canSubmitReturn = returnComment.trim().length > 0;

  function handleNavigateToList() {
    router.push(ADMIN_PET_REVIEWS_PATH);
    router.refresh();
  }

  async function handleConfirmApprove() {
    setActionError(null);
    setIsApproving(true);

    try {
      const result = await approvePetForPublishAction(petId);

      if (!result.success) {
        setActionError(result.error);
        return;
      }

      setApproveDialogOpen(false);
      handleNavigateToList();
    } finally {
      setIsApproving(false);
    }
  }

  async function handleConfirmReturn() {
    setActionError(null);
    setIsReturning(true);

    try {
      const result = await returnPetReviewAction(petId, returnComment);

      if (!result.success) {
        setActionError(result.error);
        return;
      }

      setReturnDialogOpen(false);
      handleNavigateToList();
    } finally {
      setIsReturning(false);
    }
  }

  function handleOpenApproveDialog() {
    setActionError(null);
    setApproveDialogOpen(true);
  }

  function handleOpenReturnDialog() {
    if (!canSubmitReturn) {
      setActionError("差戻し理由を入力してください。");
      return;
    }

    setActionError(null);
    setReturnDialogOpen(true);
  }

  function handleCloseApproveDialog() {
    if (!isBusy) {
      setApproveDialogOpen(false);
      setActionError(null);
    }
  }

  function handleCloseReturnDialog() {
    if (!isBusy) {
      setReturnDialogOpen(false);
      setActionError(null);
    }
  }

  return (
    <>
      <Card className="border-[var(--border)] bg-white shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">審査操作</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5">
          <p className="text-sm text-neutral-600">
            内容を確認のうえ、公開承認または差戻しを行ってください。
          </p>

          {actionError && !approveDialogOpen && !returnDialogOpen ? (
            <Alert variant="destructive">
              <AlertDescription>{actionError}</AlertDescription>
            </Alert>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="return-comment">差戻し理由</Label>
            <Textarea
              id="return-comment"
              value={returnComment}
              onChange={(event) => setReturnComment(event.target.value)}
              placeholder="ブリーダーへ伝える修正内容を入力してください"
              rows={4}
              disabled={isBusy}
              className="resize-y"
            />
            <p className="text-xs text-neutral-500">差戻し時は理由の入力が必須です。</p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="h-10 rounded-full border-[var(--border)] px-5"
              onClick={handleOpenReturnDialog}
              disabled={isBusy || !canSubmitReturn}
            >
              差戻し
            </Button>
            <Button
              type="button"
              className="h-10 rounded-full bg-[var(--primary)] px-5 hover:bg-[var(--primary)]/90"
              onClick={handleOpenApproveDialog}
              disabled={isBusy}
            >
              承認して公開
            </Button>
          </div>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={approveDialogOpen}
        title="公開承認の確認"
        message={ADMIN_PET_REVIEW_APPROVE_CONFIRM_MESSAGE}
        petDisplayName={petDisplayName}
        confirmLabel="承認して公開"
        isSubmitting={isApproving}
        error={actionError}
        onCancel={handleCloseApproveDialog}
        onConfirm={handleConfirmApprove}
      />

      <ConfirmDialog
        open={returnDialogOpen}
        title="差戻しの確認"
        message={ADMIN_PET_REVIEW_RETURN_CONFIRM_MESSAGE}
        petDisplayName={petDisplayName}
        confirmLabel="差戻しする"
        isSubmitting={isReturning}
        error={actionError}
        onCancel={handleCloseReturnDialog}
        onConfirm={handleConfirmReturn}
        variant="destructive"
      />
    </>
  );
}
