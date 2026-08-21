"use client";

import Link from "next/link";
import { AlertCircle, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { getPublicPetDetailPath } from "@/features/pets/constants";
import { cn } from "@/lib/utils";

import { INQUIRY_MESSAGE_MAX_LENGTH, getBuyerInquiryDetailPath } from "../constants";
import { createInquiryAction } from "../service";
import type { InquiryMessageFieldErrors, InquiryNewPageData } from "../types";
import { hasInquiryMessageValidationErrors, validateInquiryMessage } from "../validation";
import { InquiryPetSummaryCard } from "./inquiry-pet-summary-card";

type InquiryNewFormProps = InquiryNewPageData;

export function InquiryNewForm({ petId, pet }: InquiryNewFormProps) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<InquiryMessageFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const errors = validateInquiryMessage(message);

    if (hasInquiryMessageValidationErrors(errors)) {
      setFieldErrors(errors);
      setFormError(null);
      return;
    }

    setFieldErrors({});
    setFormError(null);
    setIsSubmitting(true);

    try {
      const result = await createInquiryAction(petId, message);

      if (result.success) {
        router.push(getBuyerInquiryDetailPath(result.inquiryId));
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
      setFormError("送信に失敗しました。時間をおいて再度お試しください。");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 pb-12 sm:py-10">
      <nav className="mb-6">
        <Link
          href={getPublicPetDetailPath(petId)}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--primary)] transition hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2"
        >
          <ArrowLeft className="size-4" aria-hidden />
          犬猫詳細へ戻る
        </Link>
      </nav>

      <header className="mb-6 space-y-2">
        <p className="text-xs font-semibold tracking-widest text-[var(--primary)]">BY-04</p>
        <h1 className="text-2xl font-bold text-neutral-900">問い合わせ入力</h1>
        <p className="text-sm leading-relaxed text-neutral-600">
          気になる点や見学の希望など、ブリーダーへのメッセージを入力してください。
        </p>
      </header>

      <div className="space-y-6">
        <InquiryPetSummaryCard pet={pet} />

        <form onSubmit={handleSubmit} className="space-y-6" noValidate>
          {formError ? (
            <Alert variant="destructive" className="border-red-200 bg-red-50 text-red-800">
              <AlertCircle className="size-4 text-red-600" aria-hidden />
              <AlertDescription>{formError}</AlertDescription>
            </Alert>
          ) : null}

          <div className="space-y-2">
            <Label htmlFor="inquiry-message" className="text-sm font-medium text-neutral-800">
              お問い合わせ内容
              <span className="ml-1 text-red-600" aria-hidden>
                *
              </span>
            </Label>
            <Textarea
              id="inquiry-message"
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
              rows={8}
              maxLength={INQUIRY_MESSAGE_MAX_LENGTH + 1}
              disabled={isSubmitting}
              aria-invalid={Boolean(fieldErrors.message)}
              aria-describedby={
                fieldErrors.message
                  ? "inquiry-message-error inquiry-message-count"
                  : "inquiry-message-count"
              }
              className={cn(
                "min-h-[180px] resize-y rounded-xl border-[var(--border)] bg-white text-base leading-relaxed",
                fieldErrors.message && "border-red-500 focus-visible:ring-red-500",
              )}
              placeholder="例：性格や健康状態について教えてください。"
            />
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              {fieldErrors.message ? (
                <p id="inquiry-message-error" className="text-sm text-red-600" role="alert">
                  {fieldErrors.message}
                </p>
              ) : (
                <span className="sr-only" id="inquiry-message-error" />
              )}
              <p
                id="inquiry-message-count"
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
              onClick={() => router.push(getPublicPetDetailPath(petId))}
            >
              キャンセル
            </Button>
            <Button
              type="submit"
              className="h-11 rounded-xl bg-[var(--primary)] text-[var(--primary-foreground)] hover:bg-[var(--primary)]/90"
              disabled={isSubmitting}
              aria-busy={isSubmitting}
            >
              {isSubmitting ? "送信中..." : "問い合わせを送信する"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
