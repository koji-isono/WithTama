"use client";

import { FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

import { scheduleVisitAction } from "../service";
import type { BreederVisitDetailPageSummary } from "../types";
import { hasScheduleVisitValidationErrors, validateScheduleVisitForm } from "../validation";

type BreederVisitScheduleFormProps = {
  summary: BreederVisitDetailPageSummary;
  onSuccess: () => void;
  onError: (message: string | null) => void;
};

export function BreederVisitScheduleForm({
  summary,
  onSuccess,
  onError,
}: BreederVisitScheduleFormProps) {
  const [scheduledAt, setScheduledAt] = useState("");
  const [fieldError, setFieldError] = useState<string | undefined>();
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const errors = validateScheduleVisitForm({ scheduledAt });

    if (hasScheduleVisitValidationErrors(errors)) {
      setFieldError(errors.scheduledAt);
      onError(errors.scheduledAt ?? null);
      return;
    }

    setFieldError(undefined);
    onError(null);
    setIsSubmitting(true);

    try {
      const result = await scheduleVisitAction({
        visitId: summary.visitId,
        scheduledAt,
      });

      if (result.success) {
        onSuccess();
        return;
      }

      setFieldError(result.fieldErrors?.scheduledAt);
      onError(result.error);
    } catch {
      onError("見学日時の確定に失敗しました。時間をおいてもう一度お試しください。");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-2xl border border-[var(--border)] bg-white p-5 shadow-sm"
    >
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-neutral-900">見学日時の確定</h2>
        <p className="text-sm text-neutral-600">
          購入希望者の希望日時を参考に、見学日時を確定してください。
        </p>
      </div>

      <div className="space-y-2">
        <Label
          htmlFor="breeder-visit-scheduled-at"
          className="text-sm font-medium text-neutral-800"
        >
          確定日時
        </Label>
        <Input
          id="breeder-visit-scheduled-at"
          type="datetime-local"
          value={scheduledAt}
          onChange={(event) => {
            setScheduledAt(event.target.value);

            if (fieldError) {
              setFieldError(undefined);
            }
          }}
          disabled={isSubmitting}
          aria-invalid={Boolean(fieldError)}
          className={cn(
            "h-11 rounded-xl border-[var(--border)]",
            fieldError && "border-red-500 focus-visible:ring-red-500",
          )}
        />
        {fieldError ? (
          <p className="text-sm text-red-600" role="alert">
            {fieldError}
          </p>
        ) : null}
      </div>

      <Button type="submit" className="h-11 w-full rounded-xl sm:w-auto" disabled={isSubmitting}>
        {isSubmitting ? "確定中…" : "見学日時を確定する"}
      </Button>
    </form>
  );
}
