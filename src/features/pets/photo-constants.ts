export const PET_PHOTOS_BUCKET = "pet-photos";

export const PET_PHOTO_MAX_BYTES = 10 * 1024 * 1024;

export const PET_PHOTO_MAX_COUNT = 10;

export const PET_PHOTO_SIGNED_URL_EXPIRES_SECONDS = 300;

export const PET_PHOTO_ALLOWED_EXTENSIONS = ["jpg", "jpeg", "png"] as const;

export const PET_PHOTO_ALLOWED_MIME_TYPES = ["image/jpeg", "image/png"] as const;

export type PetPhotoAllowedExtension = (typeof PET_PHOTO_ALLOWED_EXTENSIONS)[number];

export type PetPhotoAllowedMimeType = (typeof PET_PHOTO_ALLOWED_MIME_TYPES)[number];

export const PET_PHOTO_FORM_FIELD = "file";
