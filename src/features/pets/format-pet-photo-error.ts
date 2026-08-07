const PRODUCTION_UPLOAD_MESSAGE = "写真のアップロードに失敗しました。";
const PRODUCTION_DELETE_MESSAGE = "写真の削除に失敗しました。";

type PetPhotoOperationContext = {
  petId: string;
  photoId?: string;
  storagePath?: string;
  operation: "upload" | "delete" | "set_main";
};

export function logPetPhotoOperationFailure(
  error: unknown,
  context: PetPhotoOperationContext & { bucket?: string; fileType?: string; fileSize?: number },
): void {
  console.error("Pet photo operation failed", {
    operation: context.operation,
    petId: context.petId,
    photoId: context.photoId,
    storagePath: context.storagePath,
    bucket: context.bucket,
    fileType: context.fileType,
    fileSize: context.fileSize,
    error,
  });
}

export function formatPetPhotoUploadError(error: unknown, storagePath?: string): string {
  if (process.env.NODE_ENV === "production") {
    return PRODUCTION_UPLOAD_MESSAGE;
  }

  const message =
    error instanceof Error
      ? error.message
      : typeof error === "object" &&
          error !== null &&
          typeof (error as { message?: unknown }).message === "string"
        ? (error as { message: string }).message
        : PRODUCTION_UPLOAD_MESSAGE;

  return [PRODUCTION_UPLOAD_MESSAGE, `message: ${message}`, storagePath ? `path: ${storagePath}` : null]
    .filter((line): line is string => Boolean(line))
    .join("\n");
}

export function formatPetPhotoDeleteError(error: unknown): string {
  if (process.env.NODE_ENV === "production") {
    return PRODUCTION_DELETE_MESSAGE;
  }

  const message = error instanceof Error ? error.message : PRODUCTION_DELETE_MESSAGE;

  return `${PRODUCTION_DELETE_MESSAGE}\nmessage: ${message}`;
}
