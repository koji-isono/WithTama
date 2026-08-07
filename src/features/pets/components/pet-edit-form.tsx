"use client";

import { AlertCircle, CheckCircle2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { BREEDER_PETS_PATH, PET_EDIT_SCREEN_ID, PET_STATUS_LABELS } from "../constants";
import { updatePetDraftAction } from "../service";
import type {
  CreatePetDraftFieldErrors,
  CreatePetDraftInput,
  PetEditPageData,
  PetStatus,
} from "../types";
import { hasPetValidationErrors, validateCreatePetDraftInput } from "../validation";
import { PetDraftFormFields } from "./pet-draft-form-fields";
import { PetPhotoManager } from "./pet-photo-manager";

type PetEditFormProps = {
  initialData: PetEditPageData;
};

function statusBadgeClassName(status: PetStatus): string {
  if (status === "published") {
    return "border-transparent bg-emerald-100 text-emerald-800 hover:bg-emerald-100";
  }

  if (status === "draft" || status === "under_review") {
    return "border-transparent bg-[var(--primary)]/10 text-[var(--primary)] hover:bg-[var(--primary)]/10";
  }

  return "border-transparent bg-neutral-100 text-neutral-700 hover:bg-neutral-100";
}

export function PetEditForm({ initialData }: PetEditFormProps) {
  const router = useRouter();
  const [form, setForm] = useState<CreatePetDraftInput>(initialData.input);
  const [fieldErrors, setFieldErrors] = useState<CreatePetDraftFieldErrors>({});
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  function updateField<K extends keyof CreatePetDraftInput>(
    key: K,
    value: CreatePetDraftInput[K],
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
    setSaveSuccess(false);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const errors = validateCreatePetDraftInput(form);
    setFieldErrors(errors);
    setSaveError(null);
    setSaveSuccess(false);

    if (hasPetValidationErrors(errors)) {
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await updatePetDraftAction(initialData.petId, form);

      if (!result.success) {
        if (result.fieldErrors) {
          setFieldErrors(result.fieldErrors);
        }

        if (result.error) {
          setSaveError(result.error);
        }

        return;
      }

      setSaveSuccess(true);
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleBack() {
    router.push(BREEDER_PETS_PATH);
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 pb-28 sm:py-10 sm:pb-10">
      <header className="mb-8 space-y-3">
        <div className="flex flex-wrap items-center gap-3">
          <p className="text-xs font-semibold tracking-widest text-[var(--primary)]">
            {PET_EDIT_SCREEN_ID}
          </p>
          <Badge className={statusBadgeClassName(initialData.status)}>
            {PET_STATUS_LABELS[initialData.status]}
          </Badge>
        </div>
        <h1 className="text-2xl font-bold sm:text-3xl">犬猫情報編集</h1>
        <p className="text-sm text-neutral-600 sm:text-base">
          登録内容を確認・修正できます。公開申請は別の操作で行います。
        </p>
      </header>

      <Card className="border-[var(--border)] bg-white shadow-sm">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">基本情報</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-6" onSubmit={handleSubmit} noValidate>
            <PetDraftFormFields
              form={form}
              fieldErrors={fieldErrors}
              isSubmitting={isSubmitting}
              onFieldChange={updateField}
            />

            {saveSuccess ? (
              <Alert className="border-emerald-200 bg-emerald-50 text-emerald-900">
                <CheckCircle2 className="size-4 text-emerald-600" />
                <AlertDescription>保存しました</AlertDescription>
              </Alert>
            ) : null}

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
                一覧へ戻る
              </Button>
              <Button
                type="submit"
                className="h-11 rounded-full bg-[var(--primary)] px-6 hover:bg-[var(--primary)]/90 sm:ml-auto"
                disabled={isSubmitting}
              >
                {isSubmitting ? "保存中..." : "変更を保存"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <PetPhotoManager petId={initialData.petId} initialPhotos={initialData.photos} />
    </div>
  );
}
