import { randomUUID } from "crypto";

import {
  BREEDER_DOCUMENT_ALLOWED_EXTENSIONS,
  BREEDER_DOCUMENT_ALLOWED_MIME_TYPES,
  BREEDER_DOCUMENT_MAX_BYTES,
  type BreederDocumentAllowedExtension,
  type BreederDocumentAllowedMimeType,
  type BreederDocumentType,
} from "./document-constants";

const EXTENSION_BY_MIME: Record<BreederDocumentAllowedMimeType, BreederDocumentAllowedExtension> =
  {
    "image/jpeg": "jpg",
    "image/png": "png",
    "application/pdf": "pdf",
  };

const MIME_BY_EXTENSION: Record<BreederDocumentAllowedExtension, BreederDocumentAllowedMimeType> =
  {
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    png: "image/png",
    pdf: "application/pdf",
  };

export function formatDocumentFileSize(bytes: number): string {
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

function normalizeExtension(extension: string): BreederDocumentAllowedExtension | null {
  if (extension === "jpg" || extension === "jpeg" || extension === "png" || extension === "pdf") {
    return extension;
  }

  return null;
}

export function validateBreederDocumentFile(file: File): string | null {
  if (!(file instanceof File) || file.size === 0) {
    return "ファイルを選択してください。";
  }

  if (file.size > BREEDER_DOCUMENT_MAX_BYTES) {
    return "ファイルサイズは10MB以内にしてください。";
  }

  if (
    !BREEDER_DOCUMENT_ALLOWED_MIME_TYPES.includes(
      file.type as BreederDocumentAllowedMimeType,
    )
  ) {
    return "対応していないファイル形式です。jpg、jpeg、png、pdf のみアップロードできます。";
  }

  const extension = getExtensionFromFilename(file.name);

  if (!extension) {
    return "ファイルの拡張子を確認できません。";
  }

  const normalizedExtension = normalizeExtension(extension);

  if (!normalizedExtension) {
    return "対応していないファイル形式です。jpg、jpeg、png、pdf のみアップロードできます。";
  }

  const expectedMime = MIME_BY_EXTENSION[normalizedExtension];

  if (file.type !== expectedMime) {
    return "ファイル形式と内容が一致しません。";
  }

  return null;
}

export function buildBreederDocumentStoragePath(
  userId: string,
  documentType: BreederDocumentType,
  file: File,
): string {
  const validationError = validateBreederDocumentFile(file);

  if (validationError) {
    throw new Error(validationError);
  }

  const mimeType = file.type as BreederDocumentAllowedMimeType;
  const extension = EXTENSION_BY_MIME[mimeType];
  const safeFileName = `${randomUUID()}.${extension}`;

  return `breeders/${userId}/${documentType}/${safeFileName}`;
}

export function isValidBreederDocumentStoragePath(
  userId: string,
  documentType: BreederDocumentType,
  storagePath: string,
): boolean {
  const expectedPrefix = `breeders/${userId}/${documentType}/`;

  return storagePath.startsWith(expectedPrefix);
}
