import { randomUUID } from "crypto";

import type { PetPhotoAllowedExtension, PetPhotoAllowedMimeType } from "./photo-constants";
import { validatePetPhotoFile } from "./photo-validation";

const EXTENSION_BY_MIME: Record<PetPhotoAllowedMimeType, PetPhotoAllowedExtension> = {
  "image/jpeg": "jpg",
  "image/png": "png",
};

export function buildPetPhotoStoragePath(userId: string, petId: string, file: File): string {
  const validationError = validatePetPhotoFile(file);

  if (validationError) {
    throw new Error(validationError);
  }

  const mimeType = file.type as PetPhotoAllowedMimeType;
  const extension = EXTENSION_BY_MIME[mimeType];
  const safeFileName = `${randomUUID()}.${extension}`;

  return `breeders/${userId}/pets/${petId}/${safeFileName}`;
}

export function isValidPetPhotoStoragePath(
  userId: string,
  petId: string,
  storagePath: string,
): boolean {
  const expectedPrefix = `breeders/${userId}/pets/${petId}/`;

  return storagePath.startsWith(expectedPrefix);
}
