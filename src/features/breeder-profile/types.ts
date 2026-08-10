export type BasicProfileInput = {
  businessName: string;
  representativeName: string;
  phone: string;
  publicEmail: string;
  websiteUrl: string;
};

/** @deprecated Use BasicProfileInput */
export type BasicInfoFormState = BasicProfileInput;

export type BasicProfileFieldKey = keyof BasicProfileInput;

/** @deprecated Use BasicProfileFieldKey */
export type BasicInfoFieldKey = BasicProfileFieldKey;

/** @deprecated Use BasicProfileFieldErrors */
export type BasicInfoFieldErrors = BasicProfileFieldErrors;

export type BasicProfileFieldErrors = Partial<Record<BasicProfileFieldKey, string>>;

export const INITIAL_BASIC_PROFILE_INPUT: BasicProfileInput = {
  businessName: "",
  representativeName: "",
  phone: "",
  publicEmail: "",
  websiteUrl: "",
};

/** @deprecated Use INITIAL_BASIC_PROFILE_INPUT */
export const INITIAL_BASIC_INFO_FORM_STATE = INITIAL_BASIC_PROFILE_INPUT;

export type UpdateBasicProfileData = {
  business_name: string;
  representative_name: string;
  phone: string;
  public_email: string | null;
  website_url: string | null;
};

export type SaveBasicProfileResult =
  { success: true } | { success: false; fieldErrors?: BasicProfileFieldErrors; error?: string };

export type LocationProfileInput = {
  postalCode: string;
  prefecture: string;
  city: string;
  addressLine: string;
};

export type LocationProfileFieldKey = keyof LocationProfileInput;

export type LocationProfileFieldErrors = Partial<Record<LocationProfileFieldKey, string>>;

export const INITIAL_LOCATION_PROFILE_INPUT: LocationProfileInput = {
  postalCode: "",
  prefecture: "",
  city: "",
  addressLine: "",
};

export type UpdateLocationProfileData = {
  postal_code: string;
  prefecture: string;
  city: string;
  address_line: string;
};

export type SaveLocationProfileResult =
  { success: true } | { success: false; fieldErrors?: LocationProfileFieldErrors; error?: string };

export type LicenseProfileInput = {
  businessRegistrationType: string;
  businessRegistrationNumber: string;
  registrationAuthority: string;
  registrationExpiresAt: string;
};

export type LicenseProfileErrors = Partial<Record<keyof LicenseProfileInput, string>>;

/** @deprecated Use LicenseProfileErrors */
export type LicenseProfileFieldErrors = LicenseProfileErrors;

export const INITIAL_LICENSE_PROFILE_INPUT: LicenseProfileInput = {
  businessRegistrationType: "",
  businessRegistrationNumber: "",
  registrationAuthority: "",
  registrationExpiresAt: "",
};

export type LicenseProfileRow = {
  business_registration_type: string | null;
  business_registration_number: string | null;
  registration_authority: string | null;
  registration_expires_at: string | null;
};

export type UpdateLicenseProfileData = {
  business_registration_type: string;
  business_registration_number: string;
  registration_authority: string;
  registration_expires_at: string;
};

export type SaveLicenseProfileResult =
  { success: true } | { success: false; fieldErrors?: LicenseProfileErrors; error?: string };

export const INTRODUCTION_PROFILE_MIN_LENGTH = 20;
export const INTRODUCTION_PROFILE_MAX_LENGTH = 1000;

export type IntroductionProfileInput = {
  profileText: string;
  breedingPolicy: string;
  healthPolicy: string;
  breedingEnvironment: string;
};

export type IntroductionProfileErrors = Partial<Record<keyof IntroductionProfileInput, string>>;

export const INITIAL_INTRODUCTION_PROFILE_INPUT: IntroductionProfileInput = {
  profileText: "",
  breedingPolicy: "",
  healthPolicy: "",
  breedingEnvironment: "",
};

export type IntroductionProfileRow = {
  profile_text: string | null;
  breeding_policy: string | null;
  health_policy: string | null;
  breeding_environment: string | null;
};

export type UpdateIntroductionProfileData = {
  profile_text: string;
  breeding_policy: string;
  health_policy: string;
  breeding_environment: string;
};

export type SaveIntroductionProfileResult =
  { success: true } | { success: false; fieldErrors?: IntroductionProfileErrors; error?: string };

export type BreederDocumentType = "identity" | "license";

export type ProfileMissingStep = {
  step: number;
  label: string;
  path: string;
};

export type VerificationProfileRow = {
  business_name: string | null;
  representative_name: string | null;
  phone: string | null;
  postal_code: string | null;
  prefecture: string | null;
  city: string | null;
  address_line: string | null;
  business_registration_type: string | null;
  business_registration_number: string | null;
  registration_authority: string | null;
  registration_expires_at: string | null;
  profile_text: string | null;
  breeding_policy: string | null;
  health_policy: string | null;
  breeding_environment: string | null;
  identity_document_path: string | null;
  business_license_path: string | null;
  identity_verification_status: string;
  business_verification_status: string;
  review_status: string;
  profile_completed: boolean;
};

export type VerificationStepInitialState = {
  identityDocumentSubmitted: boolean;
  businessLicenseSubmitted: boolean;
  missingSteps: ProfileMissingStep[];
};

export type UpdateVerificationProfileData = {
  identity_document_path?: string;
  business_license_path?: string;
  identity_verification_status?: "submitted";
  business_verification_status?: "submitted";
  review_status?: "submitted";
  profile_completed?: boolean;
};

export type CompleteBreederProfileInput = Record<string, never>;

export type UploadBreederDocumentResult =
  { success: true; documentType: BreederDocumentType } | { success: false; error: string };

export type CompleteBreederProfileResult =
  { success: true } | { success: false; error?: string; missingSteps?: ProfileMissingStep[] };
