"use client";

import { AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

import { getBreederProfileStepBySlug } from "../constants";
import { INTRODUCTION_FIELDS } from "../introduction-fields";
import { saveIntroductionProfile } from "../service";
import {
  INITIAL_INTRODUCTION_PROFILE_INPUT,
  INTRODUCTION_PROFILE_MAX_LENGTH,
  type IntroductionProfileErrors,
  type IntroductionProfileInput,
} from "../types";
import { hasValidationErrors, validateIntroductionProfile } from "../validation";
import { ProfileFormField } from "./profile-form-field";

const textareaClassName = "min-h-[120px] rounded-xl border-[var(--border)] bg-white resize-y";
const licensePath = getBreederProfileStepBySlug("license").path;
const verificationPath = getBreederProfileStepBySlug("verification").path;

type IntroductionStepFormProps = {
  initialInput?: IntroductionProfileInput;
};

export function IntroductionStepForm({
  initialInput = INITIAL_INTRODUCTION_PROFILE_INPUT,
}: IntroductionStepFormProps) {
  const router = useRouter();
  const [form, setForm] = useState<IntroductionProfileInput>(initialInput);
  const [fieldErrors, setFieldErrors] = useState<IntroductionProfileErrors>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function updateField<K extends keyof IntroductionProfileInput>(
    key: K,
    value: IntroductionProfileInput[K],
  ) {
    setForm((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => {
      if (!current[key]) {
        return current;
      }

      const next = { ...current };
      delete next[key];
      return next;
    });
    setSaveError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const errors = validateIntroductionProfile(form);
    setFieldErrors(errors);
    setSaveError(null);

    if (hasValidationErrors(errors)) {
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await saveIntroductionProfile(form);

      if (!result.success) {
        if (result.fieldErrors) {
          setFieldErrors(result.fieldErrors);
        }

        if (result.error) {
          setSaveError(result.error);
        }

        return;
      }

      router.push(verificationPath);
    } catch (error) {
      console.error(error);
      setSaveError("保存に失敗しました。時間をおいて再度お試しください。");
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleBack() {
    router.push(licensePath);
  }

  return (
    <Card className="border-[var(--border)] bg-white shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">ブリーダー紹介</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-6 text-sm text-neutral-600">
          価格や見た目だけでなく、育った環境やブリーダーの想いが伝わるようにご記入ください。
        </p>

        <form className="space-y-6" onSubmit={handleSubmit} noValidate>
          {INTRODUCTION_FIELDS.map((field) => (
            <ProfileFormField
              key={field.key}
              id={field.id}
              label={field.label}
              required
              description={field.description}
              error={fieldErrors[field.key]}
            >
              <div className="space-y-1">
                <Textarea
                  id={field.id}
                  name={field.id}
                  value={form[field.key]}
                  onChange={(event) => updateField(field.key, event.target.value)}
                  placeholder={field.placeholder}
                  disabled={isSubmitting}
                  maxLength={INTRODUCTION_PROFILE_MAX_LENGTH}
                  rows={5}
                  aria-invalid={Boolean(fieldErrors[field.key])}
                  className={cn(
                    textareaClassName,
                    fieldErrors[field.key] && "border-red-400 focus-visible:ring-red-400",
                  )}
                />
                <p className="text-right text-xs text-neutral-500">
                  {form[field.key].length} / {INTRODUCTION_PROFILE_MAX_LENGTH}
                </p>
              </div>
            </ProfileFormField>
          ))}

          {saveError ? (
            <Alert variant="destructive" className="border-red-200 bg-red-50 text-red-800">
              <AlertCircle className="size-4 text-red-600" />
              <AlertDescription>{saveError}</AlertDescription>
            </Alert>
          ) : null}

          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-between">
            <Button
              type="button"
              variant="outline"
              className="h-11 rounded-full border-[var(--border)] px-6"
              onClick={handleBack}
              disabled={isSubmitting}
            >
              戻る
            </Button>
            <Button
              type="submit"
              className="h-11 rounded-full bg-[var(--primary)] px-6 hover:bg-[var(--primary)]/90 sm:ml-auto"
              disabled={isSubmitting}
            >
              {isSubmitting ? "保存中..." : "保存して次へ"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
