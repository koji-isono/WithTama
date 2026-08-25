import { PET_STATUS_LABELS } from "@/features/pets/constants";
import type { PetSex, PetSpecies, PetStatus } from "@/features/pets/types";
import { formatPetAge } from "@/types/pet";

import {
  BREEDER_REVIEW_LOG_ACTION_LABELS,
  BREEDER_REVIEW_STATUS_LABELS,
  MEMBERSHIP_STATUS_LABELS,
  SUBSCRIPTION_STATUS_LABELS,
  type BreederReviewLogAction,
  PET_REVIEW_LOG_ACTION_LABELS,
  type PetReviewLogAction,
} from "./constants";

export function formatBreederDisplayName(
  businessName: string | null,
  representativeName: string | null,
): string {
  const trimmedBusiness = businessName?.trim();
  if (trimmedBusiness) {
    return trimmedBusiness;
  }

  const trimmedRepresentative = representativeName?.trim();
  if (trimmedRepresentative) {
    return trimmedRepresentative;
  }

  return "（名称未設定）";
}

export function formatAdminPetReviewSubmittedAt(isoString: string): string {
  const date = new Date(isoString);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

const PET_SPECIES_LABELS: Record<PetSpecies, string> = {
  dog: "犬",
  cat: "猫",
};

const PET_SEX_LABELS: Record<PetSex, string> = {
  male: "オス",
  female: "メス",
};

const REVIEW_STATUS_LABELS: Record<string, string> = {
  draft: "下書き",
  submitted: "審査申請中",
  approved: "承認済み",
  rejected: "却下",
};

const VERIFICATION_STATUS_LABELS: Record<string, string> = {
  unverified: "未確認",
  submitted: "提出済み",
  verified: "確認済み",
  rejected: "却下",
};

export function formatAdminPetSpecies(species: PetSpecies): string {
  return PET_SPECIES_LABELS[species] ?? species;
}

export function formatAdminPetSex(sex: PetSex): string {
  return PET_SEX_LABELS[sex] ?? sex;
}

export function formatAdminPetStatus(status: PetStatus): string {
  return PET_STATUS_LABELS[status] ?? status;
}

export function formatAdminPetBirthday(birthday: string | null): string {
  if (!birthday) {
    return "—";
  }

  const date = new Date(birthday);

  if (Number.isNaN(date.getTime())) {
    return birthday;
  }

  const formatted = new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);

  const age = formatPetAge(birthday);

  return age === "—" ? formatted : `${formatted}（${age}）`;
}

export function formatAdminPetPrice(price: number | null): string {
  if (price === null) {
    return "—";
  }

  return `${price.toLocaleString("ja-JP")} 円`;
}

export function formatAdminDateOnly(isoDate: string | null): string {
  if (!isoDate) {
    return "—";
  }

  const date = new Date(isoDate);

  if (Number.isNaN(date.getTime())) {
    return isoDate;
  }

  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function formatAdminReviewLogAction(action: string): string {
  if (action in PET_REVIEW_LOG_ACTION_LABELS) {
    return PET_REVIEW_LOG_ACTION_LABELS[action as PetReviewLogAction];
  }

  return action;
}

export function formatAdminReviewStatus(status: string): string {
  return REVIEW_STATUS_LABELS[status] ?? status;
}

export function formatAdminVerificationStatus(status: string): string {
  return VERIFICATION_STATUS_LABELS[status] ?? status;
}

export function formatAdminBreederReviewStatus(status: string): string {
  return BREEDER_REVIEW_STATUS_LABELS[status] ?? status;
}

export function formatAdminBreederReviewLogAction(action: string): string {
  if (action in BREEDER_REVIEW_LOG_ACTION_LABELS) {
    return BREEDER_REVIEW_LOG_ACTION_LABELS[action as BreederReviewLogAction];
  }

  return action;
}

export function formatAdminMembershipStatus(status: string): string {
  return MEMBERSHIP_STATUS_LABELS[status] ?? status;
}

export function formatAdminSubscriptionStatus(status: string | null): string {
  if (!status) {
    return "—";
  }

  return SUBSCRIPTION_STATUS_LABELS[status] ?? status;
}

export type BreederDocumentPreviewKind = "image" | "pdf" | null;

export function getBreederDocumentPreviewKind(
  storagePath: string | null,
): BreederDocumentPreviewKind {
  if (!storagePath) {
    return null;
  }

  const extension = storagePath.split(".").pop()?.toLowerCase();

  if (extension === "pdf") {
    return "pdf";
  }

  if (extension === "jpg" || extension === "jpeg" || extension === "png") {
    return "image";
  }

  return null;
}

export type RegistrationExpiryWarning = "expired" | "soon" | null;

export function getRegistrationExpiryWarning(expiresAt: string | null): RegistrationExpiryWarning {
  if (!expiresAt) {
    return null;
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const expiry = new Date(expiresAt);

  if (Number.isNaN(expiry.getTime())) {
    return null;
  }

  expiry.setHours(0, 0, 0, 0);

  const diffDays = Math.floor((expiry.getTime() - today.getTime()) / 86_400_000);

  if (diffDays < 0) {
    return "expired";
  }

  if (diffDays <= 30) {
    return "soon";
  }

  return null;
}

export function formatAdminBreederLocation(prefecture: string | null, city: string | null): string {
  const parts = [prefecture?.trim(), city?.trim()].filter(Boolean);

  if (parts.length === 0) {
    return "—";
  }

  return parts.join(" ");
}

export function formatAdminNullableText(value: string | null): string {
  const trimmed = value?.trim();

  if (!trimmed) {
    return "—";
  }

  return trimmed;
}
