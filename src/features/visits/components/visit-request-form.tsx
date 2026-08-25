"use client";

import Link from "next/link";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  getBuyerInquiryDetailPath,
  INQUIRY_MESSAGE_MAX_LENGTH,
} from "@/features/inquiries/constants";
import { cn } from "@/lib/utils";

import { VISIT_REQUEST_SUCCESS_MESSAGE, getBuyerVisitDetailPath } from "../constants";
import { requestVisitAction } from "../service";
import type { VisitRequestFieldErrors, VisitRequestPageData } from "../types";
import { hasVisitRequestValidationErrors, validateVisitRequestForm } from "../validation";
import { VisitRequestSummaryCard } from "./visit-request-summary-card";

type VisitRequestFormProps = VisitRequestPageData;

export function VisitRequestForm({ inquiryId, pet }: VisitRequestFormProps) {
  const router = useRouter();
  const [requestedAt, setRequestedAt] = useState("");
  const [requestedAtSecond, setRequestedAtSecond] = useState("");
  const [requestedAtThird, setRequestedAtThird] = useState("");
  const [message, setMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<VisitRequestFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const errors = validateVisitRequestForm({
      inquiryId,
      requestedAt,
      requestedAtSecond,
      requestedAtThird,
      message,
    });

    if (hasVisitRequestValidationErrors(errors)) {
      setFieldErrors(errors);
      setFormError(null);
      setSuccessMessage(null);
      return;
    }

    setFieldErrors({});
    setFormError(null);
    setSuccessMessage(null);
    setIsSubmitting(true);

    try {
      const result = await requestVisitAction({
        inquiryId,
        requestedAt,
        requestedAtSecond,
        requestedAtThird,
        message,
      });

      if (result.success) {
        setSuccessMessage(VISIT_REQUEST_SUCCESS_MESSAGE);
        router.push(getBuyerVisitDetailPath(result.visitId));
        return;
      }

      if (result.redirectTo) {
        router.push(result.redirectTo);
        return;
      }

      if (result.fieldErrors) {
        setFieldErrors(result.fieldErrors);
      }

      setFormError(result.error);
    } catch {
      setFormError("見学希望を送信できませんでした。時間をおいてもう一度お試しください。");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 pb-12 sm:py-10">
      <nav className="mb-6">
        <Link
          href={getBuyerInquiryDetailPath(inquiryId)}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--primary)] transition hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2"
        >
          <ArrowLeft className="size-4" aria-hidden />
          問い合わせ詳細へ戻る
        </Link>
      </nav>

      <header className="mb-6 space-y-2">
        <p className="text-xs font-semibold tracking-widest text-[var(--primary)]">BY-07</p>
        <h1 className="text-2xl font-bold text-neutral-900">見学希望</h1>
        <p className="text-sm leading-relaxed text-neutral-600">
          ブリーダーへ見学希望日時を送信します。
        </p>
      </header>

      <div className="space-y-6">
        <VisitRequestSummaryCard pet={pet} />

        <form onSubmit={handleSubmit} className="space-y-6" noValidate>
          {successMessage ? (
            <Alert className="border-emerald-200 bg-emerald-50 text-emerald-900">
              <AlertDescription>{successMessage}</AlertDescription>
            </Alert>
          ) : null}

          {formError ? (
            <Alert variant="destructive" className="border-red-200 bg-red-50 text-red-800">
              <AlertCircle className="size-4 text-red-600" aria-hidden />
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          ) : null}

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="visit-requested-at" className="text-sm font-medium text-neutral-800">
                第一希望日時
                <span className="ml-1 text-red-600" aria-hidden>
                  *
                </span>
              </Label>
              <Input
                id="visit-requested-at"
                name="requestedAt"
                type="datetime-local"
                value={requestedAt}
                onChange={(event) => {
                  setRequestedAt(event.target.value);

                  if (fieldErrors.requestedAt) {
                    setFieldErrors((current) => {
                      const next = { ...current };
                      delete next.requestedAt;
                      return next;
                    });
                  }
                }}
                disabled={isSubmitting}
                aria-invalid={Boolean(fieldErrors.requestedAt)}
                aria-describedby={fieldErrors.requestedAt ? "visit-requested-at-error" : undefined}
                className={cn(
                  "h-11 rounded-xl border-[var(--border)] bg-white text-base",
                  fieldErrors.requestedAt && "border-red-500 focus-visible:ring-red-500",
                )}
              />
              {fieldErrors.requestedAt ? (
                <p id="visit-requested-at-error" className="text-sm text-red-600" role="alert">
                  {fieldErrors.requestedAt}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="visit-requested-at-second"
                className="text-sm font-medium text-neutral-800"
              >
                第二希望日時
              </Label>
              <Input
                id="visit-requested-at-second"
                name="requestedAtSecond"
                type="datetime-local"
                value={requestedAtSecond}
                onChange={(event) => {
                  setRequestedAtSecond(event.target.value);

                  if (fieldErrors.requestedAtSecond) {
                    setFieldErrors((current) => {
                      const next = { ...current };
                      delete next.requestedAtSecond;
                      return next;
                    });
                  }
                }}
                disabled={isSubmitting}
                aria-invalid={Boolean(fieldErrors.requestedAtSecond)}
                aria-describedby={
                  fieldErrors.requestedAtSecond ? "visit-requested-at-second-error" : undefined
                }
                className={cn(
                  "h-11 rounded-xl border-[var(--border)] bg-white text-base",
                  fieldErrors.requestedAtSecond && "border-red-500 focus-visible:ring-red-500",
                )}
              />
              {fieldErrors.requestedAtSecond ? (
                <p
                  id="visit-requested-at-second-error"
                  className="text-sm text-red-600"
                  role="alert"
                >
                  {fieldErrors.requestedAtSecond}
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <Label
                htmlFor="visit-requested-at-third"
                className="text-sm font-medium text-neutral-800"
              >
                第三希望日時
              </Label>
              <Input
                id="visit-requested-at-third"
                name="requestedAtThird"
                type="datetime-local"
                value={requestedAtThird}
                onChange={(event) => {
                  setRequestedAtThird(event.target.value);

                  if (fieldErrors.requestedAtThird) {
                    setFieldErrors((current) => {
                      const next = { ...current };
                      delete next.requestedAtThird;
                      return next;
                    });
                  }
                }}
                disabled={isSubmitting}
                aria-invalid={Boolean(fieldErrors.requestedAtThird)}
                aria-describedby={
                  fieldErrors.requestedAtThird ? "visit-requested-at-third-error" : undefined
                }
                className={cn(
                  "h-11 rounded-xl border-[var(--border)] bg-white text-base",
                  fieldErrors.requestedAtThird && "border-red-500 focus-visible:ring-red-500",
                )}
              />
              {fieldErrors.requestedAtThird ? (
                <p
                  id="visit-requested-at-third-error"
                  className="text-sm text-red-600"
                  role="alert"
                >
                  {fieldErrors.requestedAtThird}
                </p>
              ) : null}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="visit-message" className="text-sm font-medium text-neutral-800">
              メッセージ
              <span className="ml-1 text-red-600" aria-hidden>
                *
              </span>
            </Label>
            <Textarea
              id="visit-message"
              name="message"
              value={message}
              onChange={(event) => {
                setMessage(event.target.value);

                if (fieldErrors.message) {
                  setFieldErrors((current) => {
                    const next = { ...current };
                    delete next.message;
                    return next;
                  });
                }
              }}
              rows={6}
              maxLength={INQUIRY_MESSAGE_MAX_LENGTH + 1}
              disabled={isSubmitting}
              aria-invalid={Boolean(fieldErrors.message)}
              aria-describedby={
                fieldErrors.message
                  ? "visit-message-error visit-message-count"
                  : "visit-message-count"
              }
              className={cn(
                "min-h-[140px] resize-y rounded-xl border-[var(--border)] bg-white text-base leading-relaxed",
                fieldErrors.message && "border-red-500 focus-visible:ring-red-500",
              )}
              placeholder="例：土曜午前中を希望しています。子犬の性格についても教えてください。"
            />
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              {fieldErrors.message ? (
                <p id="visit-message-error" className="text-sm text-red-600" role="alert">
                  {fieldErrors.message}
                </p>
              ) : (
                <span className="sr-only" id="visit-message-error" />
              )}
              <p
                id="visit-message-count"
                className="text-xs text-neutral-500 sm:ml-auto"
                aria-live="polite"
              >
                {message.length} / {INQUIRY_MESSAGE_MAX_LENGTH}
              </p>
            </div>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="h-11 rounded-xl border-[var(--border)] bg-white"
              disabled={isSubmitting}
              onClick={() => router.push(getBuyerInquiryDetailPath(inquiryId))}
            >
              キャンセル
            </Button>
            <Button
              type="submit"
              className="h-11 rounded-xl bg-[var(--primary)] text-[var(--primary-foreground)] hover:bg-[var(--primary)]/90"
              disabled={isSubmitting}
              aria-busy={isSubmitting}
            >
              {isSubmitting ? "送信中…" : "見学希望を送る"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
