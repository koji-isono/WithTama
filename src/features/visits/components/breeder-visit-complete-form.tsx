"use client";

import { FormEvent, useState } from "react";

import { Button } from "@/components/ui/button";
import { SelectField } from "@/components/ui/select-field";

import {
  VISIT_COMPLETE_CONTRACTED_HINT,
  VISIT_COMPLETE_FUTURE_HINT,
  VISIT_COMPLETE_RESULT_OPTIONS,
} from "../constants";
import { completeVisitAction } from "../service";
import type { BreederVisitDetailPageSummary } from "../types";
import { hasCompleteVisitValidationErrors, validateCompleteVisitForm } from "../validation";

type BreederVisitCompleteFormProps = {
  summary: BreederVisitDetailPageSummary;
  canCompleteNow: boolean;
  onSuccess: () => void;
  onError: (message: string | null) => void;
};

export function BreederVisitCompleteForm({
  summary,
  canCompleteNow,
  onSuccess,
  onError,
}: BreederVisitCompleteFormProps) {
  const [animalConfirmed, setAnimalConfirmed] = useState(false);
  const [explanationCompleted, setExplanationCompleted] = useState(false);
  const [result, setResult] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{
    animalConfirmed?: string;
    explanationCompleted?: string;
    result?: string;
  }>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const errors = validateCompleteVisitForm({
      animalConfirmed,
      explanationCompleted,
      result,
    });

    if (hasCompleteVisitValidationErrors(errors)) {
      setFieldErrors(errors);
      onError(errors.animalConfirmed ?? errors.explanationCompleted ?? errors.result ?? null);
      return;
    }

    setFieldErrors({});
    onError(null);
    setIsSubmitting(true);

    try {
      const actionResult = await completeVisitAction({
        visitId: summary.visitId,
        animalConfirmed,
        explanationCompleted,
        result,
      });

      if (actionResult.success) {
        onSuccess();
        return;
      }

      setFieldErrors(actionResult.fieldErrors ?? {});
      onError(actionResult.error);
    } catch {
      onError("見学の完了処理に失敗しました。時間をおいてもう一度お試しください。");
    } finally {
      setIsSubmitting(false);
    }
  }

  const isSubmitDisabled = isSubmitting || !canCompleteNow;
  const resultHints = [
    VISIT_COMPLETE_CONTRACTED_HINT,
    !canCompleteNow ? VISIT_COMPLETE_FUTURE_HINT : null,
  ].filter((hint): hint is string => Boolean(hint));

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5 rounded-2xl border border-[var(--border)] bg-white p-5 shadow-sm"
    >
      <div className="space-y-1">
        <h2 className="text-lg font-semibold text-neutral-900">見学完了</h2>
        <p className="text-sm text-neutral-600">見学の実施内容と結果を記録してください。</p>
      </div>

      <div className="space-y-3">
        <label className="flex items-start gap-3 text-sm text-neutral-800">
          <input
            type="checkbox"
            checked={animalConfirmed}
            onChange={(event) => {
              setAnimalConfirmed(event.target.checked);

              if (fieldErrors.animalConfirmed) {
                setFieldErrors((current) => ({ ...current, animalConfirmed: undefined }));
              }
            }}
            disabled={isSubmitting}
            className="mt-0.5 size-4 rounded border-[var(--border)]"
          />
          <span>現物確認を実施した</span>
        </label>
        {fieldErrors.animalConfirmed ? (
          <p className="text-sm text-red-600" role="alert">
            {fieldErrors.animalConfirmed}
          </p>
        ) : null}

        <label className="flex items-start gap-3 text-sm text-neutral-800">
          <input
            type="checkbox"
            checked={explanationCompleted}
            onChange={(event) => {
              setExplanationCompleted(event.target.checked);

              if (fieldErrors.explanationCompleted) {
                setFieldErrors((current) => ({ ...current, explanationCompleted: undefined }));
              }
            }}
            disabled={isSubmitting}
            className="mt-0.5 size-4 rounded border-[var(--border)]"
          />
          <span>対面説明を実施した</span>
        </label>
        {fieldErrors.explanationCompleted ? (
          <p className="text-sm text-red-600" role="alert">
            {fieldErrors.explanationCompleted}
          </p>
        ) : null}
      </div>

      <SelectField
        id="breeder-visit-result"
        label="見学結果"
        value={result}
        onValueChange={(value) => {
          setResult(value);

          if (fieldErrors.result) {
            setFieldErrors((current) => ({ ...current, result: undefined }));
          }
        }}
        options={VISIT_COMPLETE_RESULT_OPTIONS}
        placeholder="見学結果を選択"
        error={fieldErrors.result}
        hints={resultHints}
        disabled={isSubmitting}
        required
      />

      <div className="border-t border-[var(--border)] pt-5">
        <Button
          type="submit"
          className="h-11 w-full rounded-xl sm:w-auto"
          disabled={isSubmitDisabled}
        >
          {isSubmitting ? "完了処理中…" : "見学を完了する"}
        </Button>
      </div>
    </form>
  );
}
