import type { BuyerProfileInput } from "./types";

const PROFILE_FORM_FIELD_NAMES = {
  fullName: "full_name",
  displayName: "display_name",
  phone: "phone",
  prefecture: "prefecture",
  city: "city",
  profileText: "profile_text",
  preferredSpecies: "preferred_species",
  preferredBreed: "preferred_breed",
} as const;

function readString(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value : "";
}

function readNotificationEnabled(formData: FormData): boolean {
  const value = formData.get("notification_enabled");

  if (value === null) {
    return false;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    return normalized === "true" || normalized === "on" || normalized === "1";
  }

  return false;
}

/** FormData から BY-01 入力を取得。profile_completed / user_id / buyer_id 等は無視する。 */
export function parseBuyerProfileFormData(formData: FormData): BuyerProfileInput {
  return {
    fullName: readString(formData, "full_name"),
    displayName: readString(formData, "display_name"),
    phone: readString(formData, "phone"),
    prefecture: readString(formData, "prefecture"),
    city: readString(formData, "city"),
    profileText: readString(formData, "profile_text"),
    preferredSpecies: readString(formData, "preferred_species"),
    preferredBreed: readString(formData, "preferred_breed"),
    notificationEnabled: readNotificationEnabled(formData),
  };
}

/** テスト用。許可フィールドのみ BuyerProfileInput に変換する。 */
export function parseBuyerProfileInputFromRecord(raw: Record<string, unknown>): BuyerProfileInput {
  const read = (key: keyof typeof PROFILE_FORM_FIELD_NAMES): string => {
    const value = raw[PROFILE_FORM_FIELD_NAMES[key]];
    return typeof value === "string" ? value : "";
  };

  const notificationRaw = raw.notification_enabled;
  let notificationEnabled = false;

  if (typeof notificationRaw === "boolean") {
    notificationEnabled = notificationRaw;
  } else if (typeof notificationRaw === "string") {
    const normalized = notificationRaw.trim().toLowerCase();
    notificationEnabled = normalized === "true" || normalized === "on" || normalized === "1";
  }

  return {
    fullName: read("fullName"),
    displayName: read("displayName"),
    phone: read("phone"),
    prefecture: read("prefecture"),
    city: read("city"),
    profileText: read("profileText"),
    preferredSpecies: read("preferredSpecies"),
    preferredBreed: read("preferredBreed"),
    notificationEnabled,
  };
}
