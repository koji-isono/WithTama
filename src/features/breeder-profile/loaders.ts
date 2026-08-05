import "server-only";

import { createClient } from "@/lib/supabase/server";

import {
  getIntroductionProfileByUserId,
  getLicenseProfileByUserId,
  getVerificationProfile,
} from "./repository";
import { getMissingProfileSteps } from "./profile-completion";
import {
  INITIAL_INTRODUCTION_PROFILE_INPUT,
  INITIAL_LICENSE_PROFILE_INPUT,
  type IntroductionProfileInput,
  type LicenseProfileInput,
  type VerificationStepInitialState,
} from "./types";

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

export async function loadLicenseProfile(): Promise<LicenseProfileInput> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return INITIAL_LICENSE_PROFILE_INPUT;
  }

  const row = await getLicenseProfileByUserId(user.id);

  if (!row) {
    return INITIAL_LICENSE_PROFILE_INPUT;
  }

  return mapRowToLicenseProfileInput(row);
}

export async function loadIntroductionProfile(): Promise<IntroductionProfileInput> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return INITIAL_INTRODUCTION_PROFILE_INPUT;
  }

  const row = await getIntroductionProfileByUserId(user.id);

  if (!row) {
    return INITIAL_INTRODUCTION_PROFILE_INPUT;
  }

  return mapRowToIntroductionProfileInput(row);
}

export async function loadVerificationStepState(): Promise<VerificationStepInitialState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return {
      identityDocumentSubmitted: false,
      businessLicenseSubmitted: false,
      missingSteps: [],
    };
  }

  const row = await getVerificationProfile(user.id);

  if (!row) {
    return {
      identityDocumentSubmitted: false,
      businessLicenseSubmitted: false,
      missingSteps: [],
    };
  }

  return {
    identityDocumentSubmitted: Boolean(row.identity_document_path?.trim()),
    businessLicenseSubmitted: Boolean(row.business_license_path?.trim()),
    missingSteps: getMissingProfileSteps(row),
  };
}
