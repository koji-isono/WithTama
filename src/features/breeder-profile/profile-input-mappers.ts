import {
  INITIAL_BASIC_PROFILE_INPUT,
  INITIAL_LOCATION_PROFILE_INPUT,
  type BasicProfileInput,
  type BasicProfileRow,
  type LocationProfileInput,
  type LocationProfileRow,
} from "./types";

export function mapRowToBasicProfileInput(row: BasicProfileRow): BasicProfileInput {
  return {
    businessName: row.business_name ?? "",
    representativeName: row.representative_name ?? "",
    phone: row.phone ?? "",
    publicEmail: row.public_email ?? "",
    websiteUrl: row.website_url ?? "",
  };
}

export function mapRowToLocationProfileInput(row: LocationProfileRow): LocationProfileInput {
  return {
    postalCode: row.postal_code ?? "",
    prefecture: row.prefecture ?? "",
    city: row.city ?? "",
    addressLine: row.address_line ?? "",
  };
}

export function mapBasicProfileRowOrEmpty(row: BasicProfileRow | null): BasicProfileInput {
  if (!row) {
    return INITIAL_BASIC_PROFILE_INPUT;
  }

  return mapRowToBasicProfileInput(row);
}

export function mapLocationProfileRowOrEmpty(row: LocationProfileRow | null): LocationProfileInput {
  if (!row) {
    return INITIAL_LOCATION_PROFILE_INPUT;
  }

  return mapRowToLocationProfileInput(row);
}
