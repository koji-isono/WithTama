import {
  PET_PHOTO_ALLOWED_MIME_TYPES,
  PET_PHOTO_MAX_BYTES,
  type PetPhotoAllowedExtension,
  type PetPhotoAllowedMimeType,
} from "./photo-constants";

const MIME_BY_EXTENSION: Record<PetPhotoAllowedExtension, PetPhotoAllowedMimeType> = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
};

export function formatPetPhotoFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function getExtensionFromFilename(filename: string): string | null {
  const parts = filename.split(".");

  if (parts.length < 2) {
    return null;
  }

  return parts.at(-1)?.toLowerCase() ?? null;
}

function normalizeExtension(extension: string): PetPhotoAllowedExtension | null {
  if (extension === "jpg" || extension === "jpeg" || extension === "png") {
    return extension;
  }

  return null;
}

export function validatePetPhotoFile(file: File): string | null {
  if (!(file instanceof File) || file.size === 0) {
    return "ファイルを選択してください。";
  }

  if (file.size > PET_PHOTO_MAX_BYTES) {
    return "ファイルサイズは10MB以内にしてください。";
  }

  if (!PET_PHOTO_ALLOWED_MIME_TYPES.includes(file.type as PetPhotoAllowedMimeType)) {
    return "対応していないファイル形式です。jpg、jpeg、png のみアップロードできます。";
  }

  const extension = getExtensionFromFilename(file.name);

  if (!extension) {
    return "ファイルの拡張子を確認できません。";
  }

  const normalizedExtension = normalizeExtension(extension);

  if (!normalizedExtension) {
    return "対応していないファイル形式です。jpg、jpeg、png のみアップロードできます。";
  }

  const expectedMime = MIME_BY_EXTENSION[normalizedExtension];

  if (file.type !== expectedMime) {
    return "ファイル形式と内容が一致しません。";
  }

  return null;
}

export function buildPetPhotoAltText(publicDisplayName: string): string {
  const trimmed = publicDisplayName.trim();

  if (!trimmed) {
    return "犬猫の写真";
  }

  return `${trimmed}の写真`;
}
