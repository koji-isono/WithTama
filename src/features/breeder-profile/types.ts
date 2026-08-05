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
  | { success: true }
  | { success: false; fieldErrors?: BasicProfileFieldErrors; error?: string };

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
  | { success: true }
  | { success: false; fieldErrors?: LocationProfileFieldErrors; error?: string };
