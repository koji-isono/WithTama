import type { BreederDocumentType } from "./document-constants";

export type BreederDocumentUploadErrorDetails = {
  message: string;
  statusCode?: string | number;
  error?: string;
  storagePath?: string;
};

const PRODUCTION_UPLOAD_MESSAGE = "アップロードに失敗しました。";

type BreederDocumentUploadErrorContext = {
  documentType: BreederDocumentType;
  storagePath: string;
  fileName: string;
  fileType: string;
  fileSize: number;
};

function readStorageErrorField(error: unknown, field: "message" | "statusCode" | "error"): unknown {
  if (!error || typeof error !== "object") {
    return undefined;
  }

  return (error as Record<string, unknown>)[field];
}

export function extractBreederDocumentUploadErrorDetails(
  error: unknown,
  storagePath?: string,
): BreederDocumentUploadErrorDetails {
  const message =
    typeof readStorageErrorField(error, "message") === "string"
      ? (readStorageErrorField(error, "message") as string)
      : error instanceof Error
        ? error.message
        : PRODUCTION_UPLOAD_MESSAGE;

  const statusCode = readStorageErrorField(error, "statusCode") as string | number | undefined;
  const storageError = readStorageErrorField(error, "error");

  return {
    message,
    statusCode,
    error: typeof storageError === "string" ? storageError : undefined,
    storagePath,
  };
}

export function logBreederDocumentUploadFailure(
  error: unknown,
  context: BreederDocumentUploadErrorContext & { bucket: string },
): void {
  console.error("Breeder document upload failed", {
    documentType: context.documentType,
    bucket: context.bucket,
    path: context.storagePath,
    fileName: context.fileName,
    fileType: context.fileType,
    fileSize: context.fileSize,
    error,
  });
}

export function formatBreederDocumentUploadError(
  error: unknown,
  context: BreederDocumentUploadErrorContext,
): string {
  if (process.env.NODE_ENV === "production") {
    return PRODUCTION_UPLOAD_MESSAGE;
  }

  const details = extractBreederDocumentUploadErrorDetails(error, context.storagePath);
  const lines = [
    PRODUCTION_UPLOAD_MESSAGE,
    `message: ${details.message}`,
    details.statusCode !== undefined ? `statusCode: ${details.statusCode}` : null,
    details.error ? `error: ${details.error}` : null,
    `path: ${context.storagePath}`,
  ].filter((line): line is string => Boolean(line));

  return lines.join("\n");
}
