"use client";

import { AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

import { INQUIRY_MESSAGE_MAX_LENGTH } from "../constants";
import { sendBreederInquiryMessageAction, sendInquiryMessageAction } from "../service";
import type { InquiryMessageFieldErrors } from "../types";
import { hasInquiryMessageValidationErrors, validateInquiryMessage } from "../validation";

type InquiryReplyFormProps = {
  inquiryId: string;
  canSendMessage: boolean;
  closedNotice: string | null;
  role?: "buyer" | "breeder";
};

export function InquiryReplyForm({
  inquiryId,
  canSendMessage,
  closedNotice,
  role = "buyer",
}: InquiryReplyFormProps) {
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [fieldErrors, setFieldErrors] = useState<InquiryMessageFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!canSendMessage) {
    return closedNotice ? (
      <p className="rounded-xl border border-[var(--border)] bg-neutral-50 px-4 py-3 text-sm text-neutral-700">
        {closedNotice}
      </p>
    ) : null;
  }

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
      const result =
        role === "breeder"
          ? await sendBreederInquiryMessageAction(inquiryId, message)
          : await sendInquiryMessageAction(inquiryId, message);

      if (!result.success) {
        if (result.fieldErrors) {
          setFieldErrors(result.fieldErrors);
        }

        setFormError(result.error);
        return;
      }

      setMessage("");
      router.refresh();
    } catch {
      setFormError("送信に失敗しました。時間をおいて再度お試しください。");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      {formError ? (
        <Alert variant="destructive" className="border-red-200 bg-red-50 text-red-800">
          <AlertCircle className="size-4 text-red-600" aria-hidden />
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="inquiry-reply-message" className="text-sm font-medium text-neutral-800">
          {role === "breeder" ? "返信内容" : "お問い合わせ内容"}
          <span className="ml-1 text-red-600" aria-hidden>
            *
          </span>
        </Label>
        <Textarea
          id="inquiry-reply-message"
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
          rows={5}
          maxLength={INQUIRY_MESSAGE_MAX_LENGTH + 1}
          disabled={isSubmitting}
          aria-invalid={Boolean(fieldErrors.message)}
          aria-describedby={
            fieldErrors.message
              ? "inquiry-reply-message-error inquiry-reply-message-count"
              : "inquiry-reply-message-count"
          }
          className={cn(
            "min-h-[120px] resize-y rounded-xl border-[var(--border)] bg-white text-base leading-relaxed",
            fieldErrors.message && "border-red-500 focus-visible:ring-red-500",
          )}
          placeholder={
            role === "breeder"
              ? "購入希望者への返信を入力してください。"
              : "追加の質問や返信を入力してください。"
          }
        />
        <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
          {fieldErrors.message ? (
            <p id="inquiry-reply-message-error" className="text-sm text-red-600" role="alert">
              {fieldErrors.message}
            </p>
          ) : (
            <span className="sr-only" id="inquiry-reply-message-error" />
          )}
          <p
            id="inquiry-reply-message-count"
            className="text-xs text-neutral-500 sm:ml-auto"
            aria-live="polite"
          >
            {message.length} / {INQUIRY_MESSAGE_MAX_LENGTH}
          </p>
        </div>
      </div>

      <div className="flex justify-end">
        <Button
          type="submit"
          className="h-11 w-full rounded-xl bg-[var(--primary)] text-[var(--primary-foreground)] hover:bg-[var(--primary)]/90 sm:w-auto"
          disabled={isSubmitting}
          aria-busy={isSubmitting}
        >
          {isSubmitting ? "送信中..." : role === "breeder" ? "返信する" : "送信する"}
        </Button>
      </div>
    </form>
  );
}
