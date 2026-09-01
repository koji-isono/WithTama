import "server-only";

import { redirect } from "next/navigation";

import { requireBreeder } from "@/features/auth/breeder-auth";
import { loadLatestReturnedCommentForBreederSafely } from "@/features/breeder-review";
import { formatBreederDisplayName } from "@/lib/breeder/format";

import { isProfileEditable } from "./edit-guard";
import {
  getBreederProfileContextByUserId,
  getBasicProfileByUserId,
  getIntroductionProfileByUserId,
  getLicenseProfileByUserId,
  getLocationProfileByUserId,
  getVerificationProfile,
} from "./repository";
import { mapBasicProfileRowOrEmpty, mapLocationProfileRowOrEmpty } from "./profile-input-mappers";
import { getMissingProfileSteps } from "./profile-completion";
import {
  INITIAL_INTRODUCTION_PROFILE_INPUT,
  INITIAL_LICENSE_PROFILE_INPUT,
  type BasicProfileInput,
  type BreederProfilePageContext,
  type IntroductionProfileInput,
  type LicenseProfileInput,
  type LocationProfileInput,
  type VerificationStepInitialState,
} from "./types";

const BREEDER_DASHBOARD_PATH = "/breeder/dashboard";

function mapRowToLicenseProfileInput(
  row: NonNullable<Awaited<ReturnType<typeof getLicenseProfileByUserId>>>,
): LicenseProfileInput {
  return {
    businessRegistrationType: row.business_registration_type ?? "",
    businessRegistrationNumber: row.business_registration_number ?? "",
    registrationAuthority: row.registration_authority ?? "",
    registrationExpiresAt: row.registration_expires_at ?? "",
  };
}

function mapRowToIntroductionProfileInput(
  row: NonNullable<Awaited<ReturnType<typeof getIntroductionProfileByUserId>>>,
): IntroductionProfileInput {
  return {
    profileText: row.profile_text ?? "",
    breedingPolicy: row.breeding_policy ?? "",
    healthPolicy: row.health_policy ?? "",
    breedingEnvironment: row.breeding_environment ?? "",
  };
}

export async function loadBreederProfilePageContext(): Promise<BreederProfilePageContext> {
  const user = await requireBreeder();

  const context = await getBreederProfileContextByUserId(user.id);

  if (!context || !isProfileEditable(context.review_status)) {
    redirect(BREEDER_DASHBOARD_PATH);
  }

  let resubmissionNotice = null;

  if (context.review_status === "resubmission_required") {
    const comment = await loadLatestReturnedCommentForBreederSafely(context.id);
    resubmissionNotice = { comment };
  }

  return {
    breederId: context.id,
    reviewStatus: context.review_status,
    isEditable: true,
    resubmissionNotice,
  };
}

export async function loadBasicProfile(): Promise<BasicProfileInput> {
  const user = await requireBreeder();
  const row = await getBasicProfileByUserId(user.id);

  return mapBasicProfileRowOrEmpty(row);
}

export async function loadLocationProfile(): Promise<LocationProfileInput> {
  const user = await requireBreeder();
  const row = await getLocationProfileByUserId(user.id);

  return mapLocationProfileRowOrEmpty(row);
}

export async function loadLicenseProfile(): Promise<LicenseProfileInput> {
  const user = await requireBreeder();
  const row = await getLicenseProfileByUserId(user.id);

  if (!row) {
    return INITIAL_LICENSE_PROFILE_INPUT;
  }

  return mapRowToLicenseProfileInput(row);
}

export async function loadIntroductionProfile(): Promise<IntroductionProfileInput> {
  const user = await requireBreeder();
  const row = await getIntroductionProfileByUserId(user.id);

  if (!row) {
    return INITIAL_INTRODUCTION_PROFILE_INPUT;
  }

  return mapRowToIntroductionProfileInput(row);
}

export async function loadVerificationStepState(): Promise<VerificationStepInitialState> {
  const user = await requireBreeder();
  const row = await getVerificationProfile(user.id);

  if (!row) {
    return {
      reviewStatus: "draft",
      identityDocumentSubmitted: false,
      businessLicenseSubmitted: false,
      missingSteps: [],
    };
  }

  return {
    reviewStatus: row.review_status,
    identityDocumentSubmitted: Boolean(row.identity_document_path?.trim()),
    businessLicenseSubmitted: Boolean(row.business_license_path?.trim()),
    missingSteps: getMissingProfileSteps(row),
  };
}

/** Breeder layout header: session user → breeders row → display name only. */
export async function loadBreederHeaderDisplayName(): Promise<string> {
  const user = await requireBreeder();
  const row = await getBasicProfileByUserId(user.id);

  return formatBreederDisplayName(row?.business_name ?? null, row?.representative_name ?? null);
}
