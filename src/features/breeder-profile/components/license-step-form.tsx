"use client";

import { AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

import { getBreederProfileStepBySlug } from "../constants";
import { BUSINESS_REGISTRATION_TYPES, REGISTRATION_TYPE_GUIDANCE } from "../registration-types";
import { saveLicenseProfile } from "../service";
import {
  INITIAL_LICENSE_PROFILE_INPUT,
  type LicenseProfileErrors,
  type LicenseProfileInput,
} from "../types";
import { hasValidationErrors, validateLicenseProfile } from "../validation";
import { ProfileFormField } from "./profile-form-field";

const inputClassName = "h-11 rounded-xl border-[var(--border)] bg-white";
const locationPath = getBreederProfileStepBySlug("location").path;
const introductionPath = getBreederProfileStepBySlug("introduction").path;

type LicenseStepFormProps = {
  initialInput?: LicenseProfileInput;
};

export function LicenseStepForm({
  initialInput = INITIAL_LICENSE_PROFILE_INPUT,
}: LicenseStepFormProps) {
  const router = useRouter();
  const [form, setForm] = useState<LicenseProfileInput>(initialInput);
  const [fieldErrors, setFieldErrors] = useState<LicenseProfileErrors>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function updateField<K extends keyof LicenseProfileInput>(key: K, value: LicenseProfileInput[K]) {
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

    const errors = validateLicenseProfile(form);
    setFieldErrors(errors);
    setSaveError(null);

    if (hasValidationErrors(errors)) {
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await saveLicenseProfile(form);

      if (!result.success) {
        if (result.fieldErrors) {
          setFieldErrors(result.fieldErrors);
        }

        if (result.error) {
          setSaveError(result.error);
        }

        return;
      }

      router.push(introductionPath);
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleBack() {
    router.push(locationPath);
  }

  return (
    <Card className="border-[var(--border)] bg-white shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">第一種動物取扱業情報</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-6 space-y-2 text-sm text-neutral-600">
          <p>登録証に記載されている内容を正確に入力してください。</p>
          <p className="text-neutral-500">
            入力内容は、Step5で提出する登録証画像と管理者が照合します。
          </p>
        </div>

        <form className="space-y-6" onSubmit={handleSubmit} noValidate>
          <ProfileFormField
            id="business_registration_type"
            label="登録種別"
            required
            description={REGISTRATION_TYPE_GUIDANCE}
            error={fieldErrors.businessRegistrationType}
          >
            <Select
              value={form.businessRegistrationType || undefined}
              onValueChange={(value) => updateField("businessRegistrationType", value)}
              disabled={isSubmitting}
            >
              <SelectTrigger
                id="business_registration_type"
                error={Boolean(fieldErrors.businessRegistrationType)}
                aria-invalid={Boolean(fieldErrors.businessRegistrationType)}
              >
                <SelectValue placeholder="登録種別を選択" />
              </SelectTrigger>
              <SelectContent>
                {BUSINESS_REGISTRATION_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </ProfileFormField>

          <ProfileFormField
            id="business_registration_number"
            label="登録番号"
            required
            error={fieldErrors.businessRegistrationNumber}
          >
            <Input
              id="business_registration_number"
              name="business_registration_number"
              value={form.businessRegistrationNumber}
              onChange={(event) => updateField("businessRegistrationNumber", event.target.value)}
              placeholder="例）熊市販第123号"
              disabled={isSubmitting}
              aria-invalid={Boolean(fieldErrors.businessRegistrationNumber)}
              className={cn(
                inputClassName,
                fieldErrors.businessRegistrationNumber && "border-red-400",
              )}
            />
          </ProfileFormField>

          <ProfileFormField
            id="registration_authority"
            label="登録自治体"
            required
            error={fieldErrors.registrationAuthority}
          >
            <Input
              id="registration_authority"
              name="registration_authority"
              value={form.registrationAuthority}
              onChange={(event) => updateField("registrationAuthority", event.target.value)}
              placeholder="例）熊本市"
              disabled={isSubmitting}
              aria-invalid={Boolean(fieldErrors.registrationAuthority)}
              className={cn(inputClassName, fieldErrors.registrationAuthority && "border-red-400")}
            />
          </ProfileFormField>

          <ProfileFormField
            id="registration_expires_at"
            label="有効期限"
            required
            error={fieldErrors.registrationExpiresAt}
          >
            <Input
              id="registration_expires_at"
              name="registration_expires_at"
              type="date"
              value={form.registrationExpiresAt}
              onChange={(event) => updateField("registrationExpiresAt", event.target.value)}
              disabled={isSubmitting}
              aria-invalid={Boolean(fieldErrors.registrationExpiresAt)}
              className={cn(inputClassName, fieldErrors.registrationExpiresAt && "border-red-400")}
            />
          </ProfileFormField>

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
