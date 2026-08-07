"use client";

import { AlertCircle, CheckCircle2, ImagePlus, Loader2, Star, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

import {
  deletePetPhotoAction,
  setMainPetPhotoAction,
  uploadPetPhotoAction,
} from "../service";
import { PET_PHOTO_FORM_FIELD, PET_PHOTO_MAX_COUNT } from "../photo-constants";
import { formatPetPhotoFileSize } from "../photo-validation";
import type { PetPhotoListItem } from "../types";
import { validatePetPhotoUpload } from "../validation";

type PetPhotoManagerProps = {
  petId: string;
  initialPhotos: PetPhotoListItem[];
};

function formatUploadedAt(isoString: string): string {
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(isoString));
}

export function PetPhotoManager({ petId, initialPhotos }: PetPhotoManagerProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [photos, setPhotos] = useState(initialPhotos);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFileLabel, setSelectedFileLabel] = useState<string | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingPhotoId, setPendingPhotoId] = useState<string | null>(null);

  const photoCount = photos.length;
  const canUploadMore = photoCount < PET_PHOTO_MAX_COUNT;

  useEffect(() => {
    setPhotos(initialPhotos);
  }, [initialPhotos]);

  function handleFileChange(file: File | null) {
    setUploadError(null);
    setUploadSuccess(false);
    setActionError(null);

    if (!file) {
      setSelectedFile(null);
      setSelectedFileLabel(null);
      return;
    }

    setSelectedFile(file);
    setSelectedFileLabel(`${file.name} (${formatPetPhotoFileSize(file.size)})`);

    const validationError = validatePetPhotoUpload(file, photoCount);

    if (validationError) {
      setUploadError(validationError);
    }
  }

  async function handleUpload() {
    setUploadError(null);
    setUploadSuccess(false);
    setActionError(null);

    const validationError = validatePetPhotoUpload(selectedFile, photoCount);

    if (validationError) {
      setUploadError(validationError);
      return;
    }

    setIsUploading(true);

    try {
      const formData = new FormData();
      formData.append(PET_PHOTO_FORM_FIELD, selectedFile!);

      const result = await uploadPetPhotoAction(petId, formData);

      if (!result.success) {
        setUploadError(result.error);
        return;
      }

      setUploadSuccess(true);
      setSelectedFile(null);
      setSelectedFileLabel(null);

      if (inputRef.current) {
        inputRef.current.value = "";
      }

      router.refresh();
    } finally {
      setIsUploading(false);
    }
  }

  async function handleSetMain(photoId: string) {
    setActionError(null);
    setUploadSuccess(false);
    setPendingPhotoId(photoId);

    try {
      const result = await setMainPetPhotoAction(petId, photoId);

      if (!result.success) {
        setActionError(result.error ?? "メイン写真の設定に失敗しました。");
        return;
      }

      setPhotos((current) =>
        current.map((photo) => ({
          ...photo,
          isMain: photo.id === photoId,
        })),
      );
      router.refresh();
    } finally {
      setPendingPhotoId(null);
    }
  }

  async function handleDelete(photoId: string) {
    setActionError(null);
    setUploadSuccess(false);
    setPendingPhotoId(photoId);

    try {
      const result = await deletePetPhotoAction(petId, photoId);

      if (!result.success) {
        setActionError(result.error ?? "写真の削除に失敗しました。");
        return;
      }

      router.refresh();
    } finally {
      setPendingPhotoId(null);
    }
  }

  return (
    <Card className="mt-6 border-[var(--border)] bg-white shadow-sm">
      <CardHeader className="pb-2">
        <CardTitle className="text-lg">写真</CardTitle>
        <CardDescription>
          犬猫の様子や育った環境が伝わる写真を登録してください。
        </CardDescription>
        <p className="text-sm font-medium text-neutral-700">
          現在 {photoCount} / {PET_PHOTO_MAX_COUNT} 枚
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3 rounded-xl border border-dashed border-[var(--border)] bg-neutral-50/80 p-4">
          <div className="space-y-2">
            <Label htmlFor="pet_photo_file">写真ファイル（jpg / jpeg / png、10MB以内）</Label>
            <input
              ref={inputRef}
              id="pet_photo_file"
              type="file"
              accept="image/jpeg,image/png,.jpg,.jpeg,.png"
              className="block w-full text-sm text-neutral-600 file:mr-4 file:rounded-full file:border-0 file:bg-[var(--primary)]/10 file:px-4 file:py-2 file:text-sm file:font-medium file:text-[var(--primary)] hover:file:bg-[var(--primary)]/15"
              disabled={!canUploadMore || isUploading}
              onChange={(event) => handleFileChange(event.target.files?.[0] ?? null)}
            />
            {selectedFileLabel ? (
              <p className="text-xs text-neutral-600">{selectedFileLabel}</p>
            ) : null}
          </div>

          <Button
            type="button"
            className="h-10 rounded-full bg-[var(--primary)] px-5 hover:bg-[var(--primary)]/90"
            disabled={!canUploadMore || !selectedFile || isUploading || Boolean(uploadError)}
            onClick={handleUpload}
          >
            {isUploading ? (
              <>
                <Loader2 className="mr-2 size-4 animate-spin" />
                アップロード中...
              </>
            ) : (
              <>
                <ImagePlus className="mr-2 size-4" />
                アップロード
              </>
            )}
          </Button>

          {!canUploadMore ? (
            <p className="text-sm text-neutral-600">
              写真は{PET_PHOTO_MAX_COUNT}枚まで登録できます。
            </p>
          ) : null}
        </div>

        {uploadSuccess ? (
          <Alert className="border-emerald-200 bg-emerald-50 text-emerald-900">
            <CheckCircle2 className="size-4 text-emerald-600" />
            <AlertDescription>写真をアップロードしました</AlertDescription>
          </Alert>
        ) : null}

        {uploadError ? (
          <Alert variant="destructive" className="border-red-200 bg-red-50 text-red-800">
            <AlertCircle className="size-4 text-red-600" />
            <AlertDescription>{uploadError}</AlertDescription>
          </Alert>
        ) : null}

        {actionError ? (
          <Alert variant="destructive" className="border-red-200 bg-red-50 text-red-800">
            <AlertCircle className="size-4 text-red-600" />
            <AlertDescription>{actionError}</AlertDescription>
          </Alert>
        ) : null}

        {photos.length === 0 ? (
          <p className="text-sm text-neutral-600">まだ写真が登録されていません。</p>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2">
            {photos.map((photo) => {
              const isPending = pendingPhotoId === photo.id;

              return (
                <li
                  key={photo.id}
                  className="overflow-hidden rounded-xl border border-[var(--border)] bg-white"
                >
                  <div className="relative aspect-[4/3] bg-neutral-100">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photo.signedUrl}
                      alt={photo.altText ?? "犬猫の写真"}
                      className="size-full object-cover"
                    />
                    {photo.isMain ? (
                      <Badge className="absolute left-3 top-3 border-transparent bg-[var(--primary)] text-white hover:bg-[var(--primary)]">
                        メイン写真
                      </Badge>
                    ) : null}
                  </div>
                  <div className="space-y-3 p-4">
                    <p className="text-xs text-neutral-500">
                      アップロード日時: {formatUploadedAt(photo.createdAt)}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {!photo.isMain ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="rounded-full"
                          disabled={isPending}
                          onClick={() => handleSetMain(photo.id)}
                        >
                          {isPending ? (
                            <Loader2 className="mr-1 size-3 animate-spin" />
                          ) : (
                            <Star className="mr-1 size-3" />
                          )}
                          メイン写真にする
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="rounded-full border-red-200 text-red-700 hover:bg-red-50"
                        disabled={isPending}
                        onClick={() => handleDelete(photo.id)}
                      >
                        {isPending ? (
                          <Loader2 className="mr-1 size-3 animate-spin" />
                        ) : (
                          <Trash2 className="mr-1 size-3" />
                        )}
                        削除
                      </Button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
