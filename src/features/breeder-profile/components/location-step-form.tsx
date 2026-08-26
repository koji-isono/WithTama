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
import { JAPAN_PREFECTURES } from "../prefectures";
import { saveLocationProfile } from "../service";
import {
  INITIAL_LOCATION_PROFILE_INPUT,
  type LocationProfileFieldErrors,
  type LocationProfileInput,
} from "../types";
import { hasValidationErrors, validateLocationProfile } from "../validation";
import { ProfileFormField } from "./profile-form-field";

const inputClassName = "h-11 rounded-xl border-[var(--border)] bg-white";
const basicPath = getBreederProfileStepBySlug("basic").path;
const licensePath = getBreederProfileStepBySlug("license").path;

type LocationStepFormProps = {
  initialInput?: LocationProfileInput;
};

export function LocationStepForm({
  initialInput = INITIAL_LOCATION_PROFILE_INPUT,
}: LocationStepFormProps) {
  const router = useRouter();
  const [form, setForm] = useState<LocationProfileInput>(initialInput);
  const [fieldErrors, setFieldErrors] = useState<LocationProfileFieldErrors>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function updateField<K extends keyof LocationProfileInput>(
    key: K,
    value: LocationProfileInput[K],
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

    const errors = validateLocationProfile(form);
    setFieldErrors(errors);
    setSaveError(null);

    if (hasValidationErrors(errors)) {
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await saveLocationProfile(form);

      if (!result.success) {
        if (result.fieldErrors) {
          setFieldErrors(result.fieldErrors);
        }

        if (result.error) {
          setSaveError(result.error);
        }

        return;
      }

      router.push(licensePath);
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleBack() {
    router.push(basicPath);
  }

  return (
    <Card className="border-[var(--border)] bg-white shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">所在地</CardTitle>
      </CardHeader>
      <CardContent>
        <form className="space-y-6" onSubmit={handleSubmit} noValidate>
          <ProfileFormField
            id="postal_code"
            label="郵便番号"
            required
            description="次回以降、郵便番号から住所を自動入力する予定です。"
            error={fieldErrors.postalCode}
          >
            <Input
              id="postal_code"
              name="postal_code"
              value={form.postalCode}
              onChange={(event) => updateField("postalCode", event.target.value)}
              placeholder="860-0000"
              inputMode="numeric"
              autoComplete="postal-code"
              disabled={isSubmitting}
              aria-invalid={Boolean(fieldErrors.postalCode)}
              className={cn(inputClassName, fieldErrors.postalCode && "border-red-400")}
            />
          </ProfileFormField>

          <ProfileFormField
            id="prefecture"
            label="都道府県"
            required
            error={fieldErrors.prefecture}
          >
            <Select
              value={form.prefecture || undefined}
              onValueChange={(value) => updateField("prefecture", value)}
              disabled={isSubmitting}
            >
              <SelectTrigger id="prefecture" error={Boolean(fieldErrors.prefecture)}>
                <SelectValue placeholder="都道府県を選択" />
              </SelectTrigger>
              <SelectContent>
                {JAPAN_PREFECTURES.map((prefecture) => (
                  <SelectItem key={prefecture} value={prefecture}>
                    {prefecture}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </ProfileFormField>

          <ProfileFormField id="city" label="市区町村" required error={fieldErrors.city}>
            <Input
              id="city"
              name="city"
              value={form.city}
              onChange={(event) => updateField("city", event.target.value)}
              placeholder="例）熊本市中央区"
              autoComplete="address-level2"
              disabled={isSubmitting}
              aria-invalid={Boolean(fieldErrors.city)}
              className={cn(inputClassName, fieldErrors.city && "border-red-400")}
            />
          </ProfileFormField>

          <ProfileFormField id="address_line" label="住所" required error={fieldErrors.addressLine}>
            <Input
              id="address_line"
              name="address_line"
              value={form.addressLine}
              onChange={(event) => updateField("addressLine", event.target.value)}
              placeholder="例）上通町丁目1-1"
              autoComplete="street-address"
              disabled={isSubmitting}
              aria-invalid={Boolean(fieldErrors.addressLine)}
              className={cn(inputClassName, fieldErrors.addressLine && "border-red-400")}
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
