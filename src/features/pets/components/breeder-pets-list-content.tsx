"use client";

import Link from "next/link";
import { AlertCircle, CheckCircle2, ImageOff, Loader2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import {
  BREEDER_PETS_NEW_PATH,
  getPetEditPath,
  PET_LIST_SCREEN_ID,
  PET_STATUS_LABELS,
} from "../constants";
import {
  formatPetBirthday,
  formatPetPrice,
  formatPetUpdatedAt,
  getSexLabel,
  getSpeciesLabel,
} from "../list-format";
import {
  submitPetForReviewAction,
  pausePetListingAction,
  resumePetListingAction,
} from "../service";
import type { BreederPetListItem, PetStatus } from "../types";
import { PetPauseListingDialog } from "./pet-pause-listing-dialog";
import { PetResumeListingDialog } from "./pet-resume-listing-dialog";
import { PetSubmitReviewDialog } from "./pet-submit-review-dialog";

type BreederPetsListContentProps = {
  pets: BreederPetListItem[];
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

function PetListCard({
  pet,
  onSubmitSuccess,
  onPauseSuccess,
  onResumeSuccess,
}: {
  pet: BreederPetListItem;
  onSubmitSuccess: () => void;
  onPauseSuccess: () => void;
  onResumeSuccess: () => void;
}) {
  const router = useRouter();
  const [submitDialogOpen, setSubmitDialogOpen] = useState(false);
  const [pauseDialogOpen, setPauseDialogOpen] = useState(false);
  const [resumeDialogOpen, setResumeDialogOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isPausing, setIsPausing] = useState(false);
  const [isResuming, setIsResuming] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pauseError, setPauseError] = useState<string | null>(null);
  const [resumeError, setResumeError] = useState<string | null>(null);

  const updatedLabel = formatPetUpdatedAt(pet.updatedAt);
  const displayName = pet.publicDisplayName || "（公開表示名未設定）";
  const hasDescriptionRevisionInReview = pet.descriptionReviewStatus === "under_review";

  async function handleConfirmSubmit() {
    setSubmitError(null);
    setIsSubmitting(true);

    try {
      const result = await submitPetForReviewAction(pet.id);

      if (!result.success) {
        setSubmitError(result.error);
        return;
      }

      setSubmitDialogOpen(false);
      onSubmitSuccess();
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleConfirmPause() {
    setPauseError(null);
    setIsPausing(true);

    try {
      const result = await pausePetListingAction(pet.id);

      if (!result.success) {
        setPauseError(result.error);
        return;
      }

      setPauseDialogOpen(false);
      onPauseSuccess();
      router.refresh();
    } finally {
      setIsPausing(false);
    }
  }

  async function handleConfirmResume() {
    setResumeError(null);
    setIsResuming(true);

    try {
      const result = await resumePetListingAction(pet.id);

      if (!result.success) {
        setResumeError(result.error);
        return;
      }

      setResumeDialogOpen(false);
      onResumeSuccess();
      router.refresh();
    } finally {
      setIsResuming(false);
    }
  }

  function handleOpenSubmitDialog() {
    setSubmitError(null);
    setSubmitDialogOpen(true);
  }

  function handleCloseSubmitDialog() {
    if (!isSubmitting) {
      setSubmitDialogOpen(false);
      setSubmitError(null);
    }
  }

  function handleOpenPauseDialog() {
    setPauseError(null);
    setPauseDialogOpen(true);
  }

  function handleClosePauseDialog() {
    if (!isPausing) {
      setPauseDialogOpen(false);
      setPauseError(null);
    }
  }

  function handleOpenResumeDialog() {
    setResumeError(null);
    setResumeDialogOpen(true);
  }

  function handleCloseResumeDialog() {
    if (!isResuming) {
      setResumeDialogOpen(false);
      setResumeError(null);
    }
  }

  return (
    <>
      <Card className="overflow-hidden border-[var(--border)] bg-white shadow-sm">
        <div className="aspect-[4/3] bg-neutral-100">
          {pet.mainPhotoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={pet.mainPhotoUrl}
              alt={pet.publicDisplayName || pet.managementName}
              className="size-full object-cover"
            />
          ) : (
            <div className="flex size-full flex-col items-center justify-center gap-2 text-neutral-400">
              <ImageOff className="size-10" aria-hidden />
              <span className="text-xs">写真未登録</span>
            </div>
          )}
        </div>
        <CardContent className="space-y-3 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 space-y-1">
              <h2 className="truncate text-lg font-semibold text-neutral-900">{displayName}</h2>
              <p className="text-xs text-neutral-500">管理名：{pet.managementName}</p>
            </div>
            <Badge className={statusBadgeClassName(pet.status)}>
              {PET_STATUS_LABELS[pet.status]}
            </Badge>
          </div>

          <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm text-neutral-700">
            <div>
              <dt className="text-xs text-neutral-500">犬猫種別</dt>
              <dd>{getSpeciesLabel(pet.species)}</dd>
            </div>
            <div>
              <dt className="text-xs text-neutral-500">性別</dt>
              <dd>{getSexLabel(pet.sex)}</dd>
            </div>
            <div className="col-span-2">
              <dt className="text-xs text-neutral-500">品種</dt>
              <dd>{pet.breed}</dd>
            </div>
            <div>
              <dt className="text-xs text-neutral-500">誕生日</dt>
              <dd>{formatPetBirthday(pet.birthday)}</dd>
            </div>
            <div>
              <dt className="text-xs text-neutral-500">価格</dt>
              <dd>{formatPetPrice(pet.price)}</dd>
            </div>
          </dl>

          {updatedLabel ? <p className="text-xs text-neutral-500">更新：{updatedLabel}</p> : null}

          {submitError && !submitDialogOpen ? (
            <Alert variant="destructive" className="border-red-200 bg-red-50 text-red-800">
              <AlertCircle className="size-4 text-red-600" />
              <AlertDescription>{submitError}</AlertDescription>
            </Alert>
          ) : null}

          {pauseError && !pauseDialogOpen ? (
            <Alert variant="destructive" className="border-red-200 bg-red-50 text-red-800">
              <AlertCircle className="size-4 text-red-600" />
              <AlertDescription>{pauseError}</AlertDescription>
            </Alert>
          ) : null}

          {resumeError && !resumeDialogOpen ? (
            <Alert variant="destructive" className="border-red-200 bg-red-50 text-red-800">
              <AlertCircle className="size-4 text-red-600" />
              <AlertDescription>{resumeError}</AlertDescription>
            </Alert>
          ) : null}

          <div className="flex flex-col gap-2">
            {pet.status === "draft" ? (
              <Button
                type="button"
                className="h-10 w-full rounded-full bg-[var(--primary)] hover:bg-[var(--primary)]/90"
                onClick={handleOpenSubmitDialog}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    申請中...
                  </>
                ) : (
                  "公開申請"
                )}
              </Button>
            ) : null}
            {pet.status === "published" ? (
              <Button
                type="button"
                variant="outline"
                className="h-10 w-full rounded-full border-red-200 text-red-700 hover:bg-red-50"
                onClick={handleOpenPauseDialog}
                disabled={isPausing}
              >
                {isPausing ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    停止中...
                  </>
                ) : (
                  "公開を停止"
                )}
              </Button>
            ) : null}
            {pet.status === "paused" ? (
              <Button
                type="button"
                className="h-10 w-full rounded-full bg-[var(--primary)] hover:bg-[var(--primary)]/90"
                onClick={handleOpenResumeDialog}
                disabled={isResuming}
              >
                {isResuming ? (
                  <>
                    <Loader2 className="mr-2 size-4 animate-spin" />
                    再公開中...
                  </>
                ) : (
                  "再公開する"
                )}
              </Button>
            ) : null}
            <Button
              asChild
              variant="outline"
              className="h-10 w-full rounded-full border-[var(--border)]"
            >
              <Link href={getPetEditPath(pet.id)}>編集</Link>
            </Button>
          </div>
        </CardContent>
      </Card>

      <PetSubmitReviewDialog
        open={submitDialogOpen}
        petName={displayName}
        isSubmitting={isSubmitting}
        error={submitError}
        onCancel={handleCloseSubmitDialog}
        onConfirm={handleConfirmSubmit}
      />

      <PetPauseListingDialog
        open={pauseDialogOpen}
        petName={displayName}
        hasDescriptionRevisionInReview={hasDescriptionRevisionInReview}
        isSubmitting={isPausing}
        error={pauseError}
        onCancel={handleClosePauseDialog}
        onConfirm={handleConfirmPause}
      />

      <PetResumeListingDialog
        open={resumeDialogOpen}
        petName={displayName}
        isSubmitting={isResuming}
        error={resumeError}
        onCancel={handleCloseResumeDialog}
        onConfirm={handleConfirmResume}
      />
    </>
  );
}

function RegisterPetButton({ className }: { className?: string }) {
  return (
    <Button
      asChild
      className={`h-11 rounded-full bg-[var(--primary)] px-6 hover:bg-[var(--primary)]/90 ${className ?? ""}`}
    >
      <Link href={BREEDER_PETS_NEW_PATH}>犬猫を登録</Link>
    </Button>
  );
}

export function BreederPetsListContent({ pets }: BreederPetsListContentProps) {
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 pb-28 sm:py-10 sm:pb-10">
      <header className="mb-8 space-y-3">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <p className="text-xs font-semibold tracking-widest text-[var(--primary)]">
              {PET_LIST_SCREEN_ID}
            </p>
            <h1 className="text-2xl font-bold sm:text-3xl">犬猫一覧</h1>
            <p className="text-sm text-neutral-600 sm:text-base">
              登録した犬猫の情報・写真・掲載状況を管理できます。
            </p>
          </div>
          <RegisterPetButton className="shrink-0 self-start sm:self-auto" />
        </div>
      </header>

      {successMessage ? (
        <Alert className="mb-6 border-emerald-200 bg-emerald-50 text-emerald-900">
          <CheckCircle2 className="size-4 text-emerald-600" />
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      ) : null}

      {pets.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--border)] bg-neutral-50/80 px-6 py-12 text-center">
          <p className="text-base font-medium text-neutral-800">まだ犬猫が登録されていません。</p>
          <p className="mt-2 text-sm text-neutral-600">最初の犬猫を登録しましょう。</p>
          <RegisterPetButton className="mt-6" />
        </div>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {pets.map((pet) => (
            <li key={pet.id}>
              <PetListCard
                pet={pet}
                onSubmitSuccess={() => setSuccessMessage("公開申請を受け付けました。")}
                onPauseSuccess={() => setSuccessMessage("公開を停止しました。")}
                onResumeSuccess={() => setSuccessMessage("再公開しました。")}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
