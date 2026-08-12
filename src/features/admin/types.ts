import type { PetReviewLogAction } from "./constants";

export type AdminPetReviewListItem = {
  id: string;
  publicDisplayName: string | null;
  breed: string;
  breederDisplayName: string;
  submittedAt: string | null;
  mainPhotoSignedUrl: string | null;
};

export type AdminPetReviewListPageData = {
  items: AdminPetReviewListItem[];
};

export type AdminPetReviewDetailPet = {
  id: string;
  managementName: string;
  publicDisplayName: string | null;
  speciesLabel: string;
  breed: string;
  sexLabel: string;
  birthdayLabel: string;
  color: string | null;
  temperament: string | null;
  description: string | null;
  priceLabel: string;
  priceComment: string | null;
  statusLabel: string;
};

export type AdminPetReviewDetailPhoto = {
  id: string;
  signedUrl: string | null;
  isMain: boolean;
  altText: string | null;
  displayOrder: number;
};

export type AdminPetReviewDetailBreeder = {
  displayName: string;
  representativeName: string | null;
  locationLabel: string;
  publicEmail: string | null;
  profileText: string | null;
  breedingPolicy: string | null;
  healthPolicy: string | null;
  breedingEnvironment: string | null;
  businessRegistrationType: string | null;
  businessRegistrationNumber: string | null;
  registrationAuthority: string | null;
  registrationExpiresAtLabel: string;
  reviewStatusLabel: string;
  identityVerificationStatusLabel: string;
  businessVerificationStatusLabel: string;
};

export type AdminPetReviewDetailLogItem = {
  id: string;
  createdAtLabel: string;
  action: PetReviewLogAction;
  actionLabel: string;
  comment: string | null;
  actorUserId: string;
};

export type AdminPetReviewDetailPageData = {
  pet: AdminPetReviewDetailPet;
  photos: AdminPetReviewDetailPhoto[];
  breeder: AdminPetReviewDetailBreeder | null;
  reviewLogs: AdminPetReviewDetailLogItem[];
};
