"use client";

import { AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

import { getBreederProfileStepBySlug } from "../constants";
import { saveBasicProfile } from "../service";
import {
  INITIAL_BASIC_PROFILE_INPUT,
  type BasicProfileFieldErrors,
  type BasicProfileInput,
} from "../types";
import { hasValidationErrors, validateBasicProfile } from "../validation";
import { ProfileFormField } from "./profile-form-field";

const inputClassName = "h-11 rounded-xl border-[var(--border)] bg-white";
const locationPath = getBreederProfileStepBySlug("location").path;

type BasicInfoStepFormProps = {
  initialInput?: BasicProfileInput;
};

export function BasicInfoStepForm({
  initialInput = INITIAL_BASIC_PROFILE_INPUT,
}: BasicInfoStepFormProps) {
  const router = useRouter();
  const [form, setForm] = useState<BasicProfileInput>(initialInput);
  const [fieldErrors, setFieldErrors] = useState<BasicProfileFieldErrors>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function updateField<K extends keyof BasicProfileInput>(key: K, value: BasicProfileInput[K]) {
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

    const errors = validateBasicProfile(form);
    setFieldErrors(errors);
    setSaveError(null);

    if (hasValidationErrors(errors)) {
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await saveBasicProfile(form);

      if (!result.success) {
        if (result.fieldErrors) {
          setFieldErrors(result.fieldErrors);
        }

        if (result.error) {
          setSaveError(result.error);
        }

        return;
      }

      router.push(locationPath);
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleSkip() {
    router.push("/breeder/dashboard");
  }

  return (
    <Card className="border-[var(--border)] bg-white shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">基本情報</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-6" onSubmit={handleSubmit} noValidate>
          <ProfileFormField
            id="business_name"
            label="屋号・事業所名"
            required
            error={fieldErrors.businessName}
          >
            <Input
              id="business_name"
              name="business_name"
              value={form.businessName}
              onChange={(event) => updateField("businessName", event.target.value)}
              placeholder="例）WithTamaキャッテリー"
              autoComplete="organization"
              disabled={isSubmitting}
              aria-invalid={Boolean(fieldErrors.businessName)}
              className={cn(inputClassName, fieldErrors.businessName && "border-red-400")}
            />
          </ProfileFormField>

          <ProfileFormField
            id="representative_name"
            label="代表者氏名"
            required
            error={fieldErrors.representativeName}
          >
            <Input
              id="representative_name"
              name="representative_name"
              value={form.representativeName}
              onChange={(event) => updateField("representativeName", event.target.value)}
              placeholder="例）田中 太郎"
              autoComplete="name"
              disabled={isSubmitting}
              aria-invalid={Boolean(fieldErrors.representativeName)}
              className={cn(inputClassName, fieldErrors.representativeName && "border-red-400")}
            />
          </ProfileFormField>

          <ProfileFormField id="phone" label="電話番号" required error={fieldErrors.phone}>
            <Input
              id="phone"
              name="phone"
              type="tel"
              inputMode="tel"
              value={form.phone}
              onChange={(event) => updateField("phone", event.target.value)}
              placeholder="例）090-1234-5678"
              autoComplete="tel"
              disabled={isSubmitting}
              aria-invalid={Boolean(fieldErrors.phone)}
              className={cn(inputClassName, fieldErrors.phone && "border-red-400")}
            />
          </ProfileFormField>

          <ProfileFormField
            id="public_email"
            label="公開用メールアドレス"
            optional
            description="購入希望者へ公開する場合のみ入力してください。"
            error={fieldErrors.publicEmail}
          >
            <Input
              id="public_email"
              name="public_email"
              type="email"
              value={form.publicEmail}
              onChange={(event) => updateField("publicEmail", event.target.value)}
              placeholder="例）contact@example.com"
              autoComplete="email"
              disabled={isSubmitting}
              aria-invalid={Boolean(fieldErrors.publicEmail)}
              className={cn(inputClassName, fieldErrors.publicEmail && "border-red-400")}
            />
          </ProfileFormField>

          <ProfileFormField
            id="website_url"
            label="WebサイトURL"
            optional
            error={fieldErrors.websiteUrl}
          >
            <Input
              id="website_url"
              name="website_url"
              type="url"
              value={form.websiteUrl}
              onChange={(event) => updateField("websiteUrl", event.target.value)}
              placeholder="例）https://example.com"
              autoComplete="url"
              disabled={isSubmitting}
              aria-invalid={Boolean(fieldErrors.websiteUrl)}
              className={cn(inputClassName, fieldErrors.websiteUrl && "border-red-400")}
            />
          </ProfileFormField>

          {saveError ? (
            <Alert variant="destructive" className="border-red-200 bg-red-50 text-red-800">
              <AlertCircle className="size-4 text-red-600" />
              <AlertDescription>{saveError}</AlertDescription>
            </Alert>
          ) : null}

          <div className="flex flex-col-reverse gap-3 pt-2 sm:flex-row sm:justify-end">
            <Button
              type="button"
              variant="outline"
              className="h-11 rounded-full border-[var(--border)] px-6"
              onClick={handleSkip}
              disabled={isSubmitting}
            >
              あとで入力する
            </Button>
            <Button
              type="submit"
              className="h-11 rounded-full bg-[var(--primary)] px-6 hover:bg-[var(--primary)]/90"
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
