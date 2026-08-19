"use client";

import { AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { ProfileFormField } from "@/features/breeder-profile/components/profile-form-field";
import { JAPAN_PREFECTURES } from "@/features/breeder-profile/prefectures";
import { cn } from "@/lib/utils";

import { saveBuyerProfileAction } from "../service";
import {
  BUYER_PREFERRED_SPECIES_OPTIONS,
  type BuyerProfileFieldErrors,
  type BuyerProfileInput,
  type BuyerProfilePageData,
} from "../types";
import { hasValidationErrors, validateBuyerProfile } from "../validation";

const inputClassName = "h-11 rounded-xl border-[var(--border)] bg-white";
const selectTriggerClassName = "h-11 rounded-xl border-[var(--border)] bg-white";
const PREFECTURE_PLACEHOLDER = "__prefecture_unselected__";
const SPECIES_PLACEHOLDER = "__species_unselected__";

type BuyerProfileFormProps = BuyerProfilePageData;

function buildFormData(input: BuyerProfileInput): FormData {
  const formData = new FormData();

  formData.set("full_name", input.fullName);
  formData.set("display_name", input.displayName);
  formData.set("phone", input.phone);
  formData.set("prefecture", input.prefecture);
  formData.set("city", input.city);
  formData.set("profile_text", input.profileText);
  formData.set("preferred_species", input.preferredSpecies);
  formData.set("preferred_breed", input.preferredBreed);

  if (input.notificationEnabled) {
    formData.set("notification_enabled", "true");
  }

  return formData;
}

export function BuyerProfileForm({ email, profileCompleted, initialInput }: BuyerProfileFormProps) {
  const router = useRouter();
  const [form, setForm] = useState<BuyerProfileInput>(initialInput);
  const [fieldErrors, setFieldErrors] = useState<BuyerProfileFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const pageTitle = profileCompleted ? "プロフィール" : "プロフィール登録";
  const description = profileCompleted
    ? "登録内容を確認・更新できます。変更は保存ボタンで反映されます。"
    : "大切な家族との出会いのために、あなたの基本情報を登録してください。ブリーダーとのやりとりや見学のご連絡に使用します。";

  function updateField<K extends keyof BuyerProfileInput>(key: K, value: BuyerProfileInput[K]) {
    setForm((current) => ({ ...current, [key]: value }));
    setFieldErrors((current) => {
      if (!current[key]) {
        return current;
      }

      const next = { ...current };
      delete next[key];
      return next;
    });
    setFormError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const errors = validateBuyerProfile(form);
    setFieldErrors(errors);
    setFormError(null);

    if (hasValidationErrors(errors)) {
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await saveBuyerProfileAction(buildFormData(form));

      if (!result.success) {
        if (result.fieldErrors) {
          setFieldErrors(result.fieldErrors);
        }

        if (result.error) {
          setFormError(result.error);
        }

        return;
      }

      router.push("/buyer/dashboard");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="space-y-6">
      <header className="space-y-2">
        <p className="text-xs font-semibold tracking-widest text-[var(--primary)]">BY-01</p>
        <h1 className="text-2xl font-bold sm:text-3xl">{pageTitle}</h1>
        <p className="text-sm text-neutral-600 sm:text-base">{description}</p>
      </header>

      {formError ? (
        <Alert variant="destructive" className="border-red-200 bg-red-50 text-red-800">
          <AlertCircle className="size-4 text-red-600" />
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      ) : null}

      <form className="space-y-6" onSubmit={handleSubmit} noValidate>
        <Card className="border-[var(--border)] bg-white shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">基本情報</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <ProfileFormField id="full_name" label="氏名" required error={fieldErrors.fullName}>
              <Input
                id="full_name"
                name="full_name"
                value={form.fullName}
                onChange={(event) => updateField("fullName", event.target.value)}
                autoComplete="name"
                disabled={isSubmitting}
                className={cn(inputClassName, fieldErrors.fullName && "border-red-400")}
              />
            </ProfileFormField>

            <ProfileFormField
              id="display_name"
              label="表示名"
              required
              description="ブリーダーとのやりとりで表示される名前です。"
              error={fieldErrors.displayName}
            >
              <Input
                id="display_name"
                name="display_name"
                value={form.displayName}
                onChange={(event) => updateField("displayName", event.target.value)}
                autoComplete="nickname"
                disabled={isSubmitting}
                className={cn(inputClassName, fieldErrors.displayName && "border-red-400")}
              />
            </ProfileFormField>

            <ProfileFormField id="email" label="メールアドレス">
              <Input
                id="email"
                name="email"
                type="email"
                value={email}
                readOnly
                disabled
                tabIndex={-1}
                aria-readonly="true"
                className={cn(inputClassName, "bg-neutral-50 text-neutral-600")}
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
                autoComplete="tel"
                disabled={isSubmitting}
                className={cn(inputClassName, fieldErrors.phone && "border-red-400")}
              />
            </ProfileFormField>

            <ProfileFormField
              id="prefecture"
              label="都道府県"
              required
              error={fieldErrors.prefecture}
            >
              <Select
                value={form.prefecture || PREFECTURE_PLACEHOLDER}
                onValueChange={(value) =>
                  updateField("prefecture", value === PREFECTURE_PLACEHOLDER ? "" : value)
                }
                disabled={isSubmitting}
              >
                <SelectTrigger
                  id="prefecture"
                  className={cn(selectTriggerClassName, fieldErrors.prefecture && "border-red-400")}
                >
                  <SelectValue placeholder="都道府県を選択" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={PREFECTURE_PLACEHOLDER} disabled>
                    都道府県を選択
                  </SelectItem>
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
                autoComplete="address-level2"
                disabled={isSubmitting}
                className={cn(inputClassName, fieldErrors.city && "border-red-400")}
              />
            </ProfileFormField>
          </CardContent>
        </Card>

        <Card className="border-[var(--border)] bg-white shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">希望・自己紹介</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <ProfileFormField
              id="profile_text"
              label="自己紹介"
              optional
              error={fieldErrors.profileText}
            >
              <Textarea
                id="profile_text"
                name="profile_text"
                value={form.profileText}
                onChange={(event) => updateField("profileText", event.target.value)}
                rows={5}
                disabled={isSubmitting}
                placeholder="ご家族の想いや、迎え入れの希望などがあればご記入ください。"
                className={cn(
                  "rounded-xl border-[var(--border)] bg-white",
                  fieldErrors.profileText && "border-red-400",
                )}
              />
            </ProfileFormField>

            <ProfileFormField
              id="preferred_species"
              label="希望する種類"
              optional
              error={fieldErrors.preferredSpecies}
            >
              <Select
                value={form.preferredSpecies || SPECIES_PLACEHOLDER}
                onValueChange={(value) =>
                  updateField("preferredSpecies", value === SPECIES_PLACEHOLDER ? "" : value)
                }
                disabled={isSubmitting}
              >
                <SelectTrigger id="preferred_species" className={selectTriggerClassName}>
                  <SelectValue placeholder="選択しない" />
                </SelectTrigger>
                <SelectContent>
                  {BUYER_PREFERRED_SPECIES_OPTIONS.map((option) => (
                    <SelectItem
                      key={option.label}
                      value={option.value === "" ? SPECIES_PLACEHOLDER : option.value}
                    >
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </ProfileFormField>

            <ProfileFormField
              id="preferred_breed"
              label="希望する犬種・猫種"
              optional
              error={fieldErrors.preferredBreed}
            >
              <Input
                id="preferred_breed"
                name="preferred_breed"
                value={form.preferredBreed}
                onChange={(event) => updateField("preferredBreed", event.target.value)}
                disabled={isSubmitting}
                placeholder="例）トイプードル"
                className={cn(inputClassName, fieldErrors.preferredBreed && "border-red-400")}
              />
            </ProfileFormField>
          </CardContent>
        </Card>

        <Card className="border-[var(--border)] bg-white shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg">通知設定</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-start gap-3">
              <input
                id="notification_enabled"
                name="notification_enabled"
                type="checkbox"
                checked={form.notificationEnabled}
                onChange={(event) => updateField("notificationEnabled", event.target.checked)}
                disabled={isSubmitting}
                className="mt-1 size-4 rounded border-[var(--border)]"
              />
              <div className="space-y-1">
                <Label htmlFor="notification_enabled" className="font-medium">
                  メール通知
                </Label>
                <p className="text-sm text-neutral-600">
                  問い合わせや見学に関するお知らせをメールで受け取ります。
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Button type="submit" className="h-11 w-full rounded-xl" disabled={isSubmitting}>
          {isSubmitting ? "保存中..." : "保存する"}
        </Button>
      </form>
    </div>
  );
}
