import type { User } from "@supabase/supabase-js";

import { createBreeder, createBuyer, getBreederByUserId, getBuyerByUserId } from "./repository";
import {
  InvalidUserRoleError,
  parseUserRole,
  type BreederRow,
  type BuyerRow,
  type EnsureUserProfileResult,
} from "./types";

async function ensureBuyerProfile(user: User): Promise<BuyerRow> {
  const existing = await getBuyerByUserId(user.id);

  if (existing) {
    return existing;
  }

  return createBuyer(user);
}

async function ensureBreederProfile(user: User): Promise<BreederRow> {
  const existing = await getBreederByUserId(user.id);

  if (existing) {
    return existing;
  }

  return createBreeder(user);
}

export async function ensureUserProfile(user: User): Promise<EnsureUserProfileResult> {
  const role = parseUserRole(user);

  if (!role) {
    throw new InvalidUserRoleError();
  }

  if (role === "buyer") {
    const profile = await ensureBuyerProfile(user);

    return {
      role: "buyer",
      profileCompleted: profile.profile_completed,
    };
  }

  const profile = await ensureBreederProfile(user);

  return {
    role: "breeder",
    profileCompleted: profile.profile_completed,
  };
}

export { InvalidUserRoleError, getPostLoginPath } from "./types";
