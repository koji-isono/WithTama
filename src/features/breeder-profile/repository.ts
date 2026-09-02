import "server-only";

import { createClient } from "@/lib/supabase/server";

import type {
  BasicProfileRow,
  BreederDocumentType,
  BreederProfileContextRow,
  IntroductionProfileRow,
  LicenseProfileRow,
  LocationProfileRow,
  UpdateBasicProfileData,
  UpdateIntroductionProfileData,
  UpdateLicenseProfileData,
  UpdateLocationProfileData,
  UpdateVerificationProfileData,
  VerificationProfileRow,
} from "./types";
import { BREEDER_DOCUMENTS_BUCKET } from "./document-constants";
import { isValidBreederDocumentStoragePath } from "./document-utils";
import { logBreederDocumentUploadFailure } from "./format-document-upload-error";

const breederProfileContextSelect = "id, review_status, profile_completed";

const basicProfileSelect = "business_name, representative_name, phone, public_email, website_url";

const locationProfileSelect = "postal_code, prefecture, city, address_line";

const licenseProfileSelect =
  "business_registration_type, business_registration_number, registration_authority, registration_expires_at";

export async function getBreederProfileContextByUserId(
  userId: string,
): Promise<BreederProfileContextRow | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("breeders")
    .select(breederProfileContextSelect)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("[getBreederProfileContextByUserId]", error);
    }
    return null;
  }

  return data as BreederProfileContextRow | null;
}

/** Creates a draft breeders row when missing (post-login / email-confirmed new breeders). */
export async function ensureBreederProfileContextByUserId(
  userId: string,
): Promise<BreederProfileContextRow | null> {
  const existing = await getBreederProfileContextByUserId(userId);
  if (existing) {
    return existing;
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("breeders")
    .insert({ user_id: userId })
    .select(breederProfileContextSelect)
    .single();

  if (error) {
    if (error.code === "23505") {
      return getBreederProfileContextByUserId(userId);
    }

    if (process.env.NODE_ENV === "development") {
      console.error("[ensureBreederProfileContextByUserId]", error);
    }
    return null;
  }

  return data as BreederProfileContextRow;
}

const introductionProfileSelect =
  "profile_text, breeding_policy, health_policy, breeding_environment";

const verificationProfileSelect = [
  "business_name",
  "representative_name",
  "phone",
  "postal_code",
  "prefecture",
  "city",
  "address_line",
  "business_registration_type",
  "business_registration_number",
  "registration_authority",
  "registration_expires_at",
  "profile_text",
  "breeding_policy",
  "health_policy",
  "breeding_environment",
  "identity_document_path",
  "business_license_path",
  "identity_verification_status",
  "business_verification_status",
  "review_status",
  "profile_completed",
].join(", ");

export async function updateBasicProfile(
  userId: string,
  data: UpdateBasicProfileData,
): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("breeders")
    .update({
      business_name: data.business_name,
      representative_name: data.representative_name,
      phone: data.phone,
      public_email: data.public_email,
      website_url: data.website_url,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  if (error) {
    throw error;
  }
}

export async function updateLocationProfile(
  userId: string,
  data: UpdateLocationProfileData,
): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("breeders")
    .update({
      postal_code: data.postal_code,
      prefecture: data.prefecture,
      city: data.city,
      address_line: data.address_line,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  if (error) {
    throw error;
  }
}

export async function getBasicProfileByUserId(userId: string): Promise<BasicProfileRow | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("breeders")
    .select(basicProfileSelect)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    if (process.env.NODE_ENV === "development") {
      console.error("[getBasicProfileByUserId]", error);
    }
    return null;
  }

  return data as BasicProfileRow | null;
}

export async function getLocationProfileByUserId(
  userId: string,
): Promise<LocationProfileRow | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("breeders")
    .select(locationProfileSelect)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as LocationProfileRow | null;
}

export async function getLicenseProfileByUserId(userId: string): Promise<LicenseProfileRow | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("breeders")
    .select(licenseProfileSelect)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export async function updateLicenseProfile(
  userId: string,
  data: UpdateLicenseProfileData,
): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("breeders")
    .update({
      business_registration_type: data.business_registration_type,
      business_registration_number: data.business_registration_number,
      registration_authority: data.registration_authority,
      registration_expires_at: data.registration_expires_at,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  if (error) {
    throw error;
  }
}

export async function getIntroductionProfileByUserId(
  userId: string,
): Promise<IntroductionProfileRow | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("breeders")
    .select(introductionProfileSelect)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data;
}

export async function updateIntroductionProfile(
  userId: string,
  data: UpdateIntroductionProfileData,
): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase
    .from("breeders")
    .update({
      profile_text: data.profile_text,
      breeding_policy: data.breeding_policy,
      health_policy: data.health_policy,
      breeding_environment: data.breeding_environment,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);

  if (error) {
    throw error;
  }
}

export async function getVerificationProfile(
  userId: string,
): Promise<VerificationProfileRow | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from("breeders")
    .select(verificationProfileSelect)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as VerificationProfileRow | null;
}

export async function uploadBreederDocument(
  userId: string,
  documentType: BreederDocumentType,
  file: File,
  storagePath: string,
): Promise<string> {
  if (!isValidBreederDocumentStoragePath(userId, documentType, storagePath)) {
    throw new Error(`Invalid breeder document storage path: ${storagePath}`);
  }

  const supabase = await createClient();
  const arrayBuffer = await file.arrayBuffer();

  const { error } = await supabase.storage
    .from(BREEDER_DOCUMENTS_BUCKET)
    .upload(storagePath, arrayBuffer, {
      contentType: file.type,
      upsert: false,
    });

  if (error) {
    logBreederDocumentUploadFailure(error, {
      documentType,
      bucket: BREEDER_DOCUMENTS_BUCKET,
      storagePath,
      fileName: file.name,
      fileType: file.type,
      fileSize: file.size,
    });
    throw error;
  }

  return storagePath;
}

export async function updateVerificationProfile(
  userId: string,
  data: UpdateVerificationProfileData,
): Promise<void> {
  const supabase = await createClient();

  const payload: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (data.identity_document_path !== undefined) {
    payload.identity_document_path = data.identity_document_path;
  }

  if (data.business_license_path !== undefined) {
    payload.business_license_path = data.business_license_path;
  }

  if (data.identity_verification_status !== undefined) {
    payload.identity_verification_status = data.identity_verification_status;
  }

  if (data.business_verification_status !== undefined) {
    payload.business_verification_status = data.business_verification_status;
  }

  if (data.review_status !== undefined) {
    payload.review_status = data.review_status;
  }

  if (data.profile_completed !== undefined) {
    payload.profile_completed = data.profile_completed;
  }

  const { error } = await supabase.from("breeders").update(payload).eq("user_id", userId);

  if (error) {
    throw error;
  }
}

export async function saveBreederDocumentPath(
  userId: string,
  documentType: BreederDocumentType,
  storagePath: string,
): Promise<void> {
  if (documentType === "identity") {
    await updateVerificationProfile(userId, {
      identity_document_path: storagePath,
    });
    return;
  }

  await updateVerificationProfile(userId, {
    business_license_path: storagePath,
  });
}

export async function submitBreederApplication(): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase.rpc("submit_breeder_application");

  if (error) {
    throw error;
  }
}

export async function resubmitBreederApplication(): Promise<void> {
  const supabase = await createClient();

  const { error } = await supabase.rpc("resubmit_breeder_application");

  if (error) {
    throw error;
  }
}
