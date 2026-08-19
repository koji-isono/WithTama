import "server-only";

import { requireBuyer } from "@/features/auth/buyer-auth";

import { getBuyerProfileByUserId } from "./repository";
import type { BuyerProfileInput, BuyerProfilePageData } from "./types";

export function mapBuyerProfileRowToInput(
  row: NonNullable<Awaited<ReturnType<typeof getBuyerProfileByUserId>>>,
): BuyerProfileInput {
  return {
    fullName: row.full_name ?? "",
    displayName: row.display_name ?? "",
    phone: row.phone ?? "",
    prefecture: row.prefecture ?? "",
    city: row.city ?? "",
    profileText: row.profile_text ?? "",
    preferredSpecies: row.preferred_species ?? "",
    preferredBreed: row.preferred_breed ?? "",
    notificationEnabled: row.notification_enabled,
  };
}

export async function loadBuyerProfilePageData(): Promise<BuyerProfilePageData> {
  const user = await requireBuyer();

  const profile = await getBuyerProfileByUserId(user.id);

  if (!profile) {
    throw new Error("Buyer profile row not found for the authenticated user.");
  }

  return {
    email: user.email ?? "",
    profileCompleted: profile.profile_completed,
    initialInput: mapBuyerProfileRowToInput(profile),
  };
}
