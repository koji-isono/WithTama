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
  ADMIN_BREEDER_REVIEW_ACTIONS_DESCRIPTION,
  ADMIN_BREEDER_REVIEW_APPROVE_CONFIRM_MESSAGE,
  ADMIN_BREEDER_REVIEW_APPROVE_CONFIRM_NOTE,
  ADMIN_BREEDER_REVIEW_APPROVE_SUCCESS_MESSAGE,
  ADMIN_BREEDER_REVIEW_LEGAL_NOTICE,
  ADMIN_BREEDER_REVIEW_REJECT_CONFIRM_MESSAGE,
  ADMIN_BREEDER_REVIEW_REJECT_SUCCESS_MESSAGE,
  ADMIN_BREEDER_REVIEW_RETURN_COMMENT_PLACEHOLDER,
  ADMIN_BREEDER_REVIEW_RETURN_CONFIRM_MESSAGE,
  ADMIN_BREEDER_REVIEW_RETURN_SUCCESS_MESSAGE,
  canPerformBreederReviewActions,
} from "../constants";
import {
  approveBreederReviewAction,
  rejectBreederReviewAction,
  returnBreederReviewAction,
} from "../service";

type AdminBreederReviewActionsProps = {
  breederId: string;
  breederDisplayName: string;
  reviewStatus: string;
};

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  message: string;
  note?: string;
  breederDisplayName: string;
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
  note,
  breederDisplayName,
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
      aria-labelledby="admin-breeder-review-dialog-title"
    >
      <div className="w-full max-w-md rounded-xl bg-white p-6 shadow-lg">
        <h2
          id="admin-breeder-review-dialog-title"
          className="text-lg font-semibold text-neutral-900"
        >
          {title}
        </h2>
        <p className="mt-2 text-sm text-neutral-600">{message}</p>
        {note ? <p className="mt-2 text-sm text-neutral-500">{note}</p> : null}
        <p className="mt-2 text-sm font-medium text-neutral-800">{breederDisplayName}</p>
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

export function AdminBreederReviewActions({
  breederId,
  breederDisplayName,
  reviewStatus,
}: AdminBreederReviewActionsProps) {
  const router = useRouter();
  const [returnComment, setReturnComment] = useState("");
  const [rejectComment, setRejectComment] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [approveDialogOpen, setApproveDialogOpen] = useState(false);
  const [returnDialogOpen, setReturnDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [isApproving, setIsApproving] = useState(false);
  const [isReturning, setIsReturning] = useState(false);
  const [isRejecting, setIsRejecting] = useState(false);

  if (!canPerformBreederReviewActions(reviewStatus)) {
    return null;
  }

  const isBusy = isApproving || isReturning || isRejecting;
  const canSubmitReturn = returnComment.trim().length > 0;
  const canSubmitReject = rejectComment.trim().length > 0;
  const dialogOpen = approveDialogOpen || returnDialogOpen || rejectDialogOpen;

  async function handleConfirmApprove() {
    setActionError(null);
    setIsApproving(true);

    try {
      const result = await approveBreederReviewAction(breederId);

      if (!result.success) {
        setActionError(result.error);
        return;
      }

      setApproveDialogOpen(false);
      setSuccessMessage(ADMIN_BREEDER_REVIEW_APPROVE_SUCCESS_MESSAGE);
      router.refresh();
    } finally {
      setIsApproving(false);
    }
  }

  async function handleConfirmReturn() {
    setActionError(null);
    setIsReturning(true);

    try {
      const result = await returnBreederReviewAction(breederId, returnComment);

      if (!result.success) {
        setActionError(result.error);
        return;
      }

      setReturnDialogOpen(false);
      setSuccessMessage(ADMIN_BREEDER_REVIEW_RETURN_SUCCESS_MESSAGE);
      router.refresh();
    } finally {
      setIsReturning(false);
    }
  }

  async function handleConfirmReject() {
    setActionError(null);
    setIsRejecting(true);

    try {
      const result = await rejectBreederReviewAction(breederId, rejectComment);

      if (!result.success) {
        setActionError(result.error);
        return;
      }

      setRejectDialogOpen(false);
      setSuccessMessage(ADMIN_BREEDER_REVIEW_REJECT_SUCCESS_MESSAGE);
      router.refresh();
    } finally {
      setIsRejecting(false);
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

  function handleOpenRejectDialog() {
    if (!canSubmitReject) {
      setActionError("却下理由を入力してください。");
      return;
    }

    setActionError(null);
    setRejectDialogOpen(true);
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

  function handleCloseRejectDialog() {
    if (!isBusy) {
      setRejectDialogOpen(false);
      setActionError(null);
    }
  }

  return (
    <>
      <Card className="border-[var(--border)] bg-white shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">審査操作</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <p className="text-sm text-neutral-600">{ADMIN_BREEDER_REVIEW_ACTIONS_DESCRIPTION}</p>
          <p className="text-xs text-neutral-500">{ADMIN_BREEDER_REVIEW_LEGAL_NOTICE}</p>

          {successMessage ? (
            <Alert>
              <AlertDescription>{successMessage}</AlertDescription>
            </Alert>
          ) : null}

          {actionError && !dialogOpen ? (
            <Alert variant="destructive">
              <AlertDescription>{actionError}</AlertDescription>
            </Alert>
          ) : null}

          <div className="flex justify-end">
            <Button
              type="button"
              className="h-10 rounded-full bg-[var(--primary)] px-5 hover:bg-[var(--primary)]/90"
              onClick={handleOpenApproveDialog}
              disabled={isBusy}
            >
              承認する
            </Button>
          </div>

          <div className="space-y-2 border-t border-[var(--border)] pt-6">
            <Label htmlFor="return-comment">差戻し理由（必須）</Label>
            <Textarea
              id="return-comment"
              value={returnComment}
              onChange={(event) => setReturnComment(event.target.value)}
              placeholder={ADMIN_BREEDER_REVIEW_RETURN_COMMENT_PLACEHOLDER}
              rows={4}
              disabled={isBusy}
              className="resize-y"
            />
            <div className="flex justify-end">
              <Button
                type="button"
                variant="outline"
                className="h-10 rounded-full border-[var(--border)] px-5"
                onClick={handleOpenReturnDialog}
                disabled={isBusy || !canSubmitReturn}
              >
                差戻す
              </Button>
            </div>
          </div>

          <div className="space-y-2 border-t border-[var(--border)] pt-6">
            <Label htmlFor="reject-comment">却下理由（必須）</Label>
            <Textarea
              id="reject-comment"
              value={rejectComment}
              onChange={(event) => setRejectComment(event.target.value)}
              placeholder="却下理由を入力してください"
              rows={4}
              disabled={isBusy}
              className="resize-y"
            />
            <p className="text-xs text-neutral-500">
              却下後は第1期では再申請できません。慎重に操作してください。
            </p>
            <div className="flex justify-end">
              <Button
                type="button"
                variant="destructive"
                className="h-10 rounded-full px-5"
                onClick={handleOpenRejectDialog}
                disabled={isBusy || !canSubmitReject}
              >
                却下する
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <ConfirmDialog
        open={approveDialogOpen}
        title="承認の確認"
        message={ADMIN_BREEDER_REVIEW_APPROVE_CONFIRM_MESSAGE}
        note={ADMIN_BREEDER_REVIEW_APPROVE_CONFIRM_NOTE}
        breederDisplayName={breederDisplayName}
        confirmLabel="承認する"
        isSubmitting={isApproving}
        error={actionError}
        onCancel={handleCloseApproveDialog}
        onConfirm={handleConfirmApprove}
      />

      <ConfirmDialog
        open={returnDialogOpen}
        title="差戻しの確認"
        message={ADMIN_BREEDER_REVIEW_RETURN_CONFIRM_MESSAGE}
        breederDisplayName={breederDisplayName}
        confirmLabel="差戻す"
        isSubmitting={isReturning}
        error={actionError}
        onCancel={handleCloseReturnDialog}
        onConfirm={handleConfirmReturn}
      />

      <ConfirmDialog
        open={rejectDialogOpen}
        title="却下の確認"
        message={ADMIN_BREEDER_REVIEW_REJECT_CONFIRM_MESSAGE}
        breederDisplayName={breederDisplayName}
        confirmLabel="却下する"
        isSubmitting={isRejecting}
        error={actionError}
        onCancel={handleCloseRejectDialog}
        onConfirm={handleConfirmReject}
        variant="destructive"
      />
    </>
  );
}
