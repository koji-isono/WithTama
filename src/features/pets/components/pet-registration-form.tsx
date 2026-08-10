"use client";

import { AlertCircle } from "lucide-react";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { BREEDER_PETS_PATH, PET_REGISTRATION_SCREEN_ID, getPetEditPath } from "../constants";
import { createPetDraft } from "../service";
import {
  INITIAL_CREATE_PET_DRAFT_INPUT,
  type CreatePetDraftFieldErrors,
  type CreatePetDraftInput,
} from "../types";
import { hasPetValidationErrors, validateCreatePetDraftInput } from "../validation";
import { PetDraftFormFields } from "./pet-draft-form-fields";

export function PetRegistrationForm() {
  const router = useRouter();
  const [form, setForm] = useState<CreatePetDraftInput>(INITIAL_CREATE_PET_DRAFT_INPUT);
  const [fieldErrors, setFieldErrors] = useState<CreatePetDraftFieldErrors>({});
  const [saveError, setSaveError] = useState<string | null>(null);
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
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const errors = validateCreatePetDraftInput(form);
    setFieldErrors(errors);
    setSaveError(null);

    if (hasPetValidationErrors(errors)) {
      return;
    }

    setIsSubmitting(true);

    try {
      const result = await createPetDraft(form);

      if (!result.success) {
        if (result.fieldErrors) {
          setFieldErrors(result.fieldErrors);
        }

        if (result.error) {
          setSaveError(result.error);
        }

        return;
      }

      router.push(getPetEditPath(result.petId));
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleBack() {
    router.push(BREEDER_PETS_PATH);
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 pb-28 sm:py-10 sm:pb-10">
      <header className="mb-8 space-y-2">
        <p className="text-xs font-semibold tracking-widest text-[var(--primary)]">
          {PET_REGISTRATION_SCREEN_ID}
        </p>
        <h1 className="text-2xl font-bold sm:text-3xl">犬猫登録</h1>
        <p className="text-sm text-neutral-600 sm:text-base">
          公開前に管理者の審査があります。まずは基本情報を登録してください。
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
                {isSubmitting ? "保存中..." : "下書き保存"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
