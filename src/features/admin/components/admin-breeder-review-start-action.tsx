"use client";

import { Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import {
  ADMIN_BREEDER_REVIEW_START_DESCRIPTION,
  ADMIN_BREEDER_REVIEW_START_SUCCESS_MESSAGE,
  canStartBreederReview,
} from "../constants";
import { startBreederReviewAction } from "../service";

type AdminBreederReviewStartActionProps = {
  breederId: string;
  reviewStatus: string;
};

export function AdminBreederReviewStartAction({
  breederId,
  reviewStatus,
}: AdminBreederReviewStartActionProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!canStartBreederReview(reviewStatus)) {
    return null;
  }

  async function handleStartReview() {
    setActionError(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    try {
      const result = await startBreederReviewAction(breederId);

      if (!result.success) {
        setActionError(result.error);
        return;
      }

      setSuccessMessage(ADMIN_BREEDER_REVIEW_START_SUCCESS_MESSAGE);
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card className="border-[var(--border)] bg-white shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">審査操作</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-neutral-600">{ADMIN_BREEDER_REVIEW_START_DESCRIPTION}</p>

        {successMessage ? (
          <Alert>
            <AlertDescription>{successMessage}</AlertDescription>
          </Alert>
        ) : null}

        {actionError ? (
          <Alert variant="destructive">
            <AlertDescription>{actionError}</AlertDescription>
          </Alert>
        ) : null}

        <div className="flex justify-end">
          <Button
            type="button"
            className="h-10 rounded-full bg-[var(--primary)] px-5 hover:bg-[var(--primary)]/90"
            onClick={handleStartReview}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                処理中...
              </>
            ) : (
              "審査を開始する"
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
