import "server-only";

import { getCurrentBreeder } from "@/features/auth/breeder-auth";

import { isProfileEditable, PROFILE_NOT_EDITABLE_MESSAGE } from "./edit-guard";
import { getBreederProfileContextByUserId } from "./repository";

export type AuthorizeEditableBreederProfileResult =
  | {
      ok: true;
      userId: string;
      breederId: string;
      reviewStatus: string;
    }
  | { ok: false; error: string };

export async function authorizeEditableBreederProfile(): Promise<AuthorizeEditableBreederProfileResult> {
  const user = await getCurrentBreeder();

  if (!user) {
    return { ok: false, error: "ログインが必要です。" };
  }

  const context = await getBreederProfileContextByUserId(user.id);

  if (!context) {
    return { ok: false, error: "プロフィールが見つかりません。" };
  }

  if (!isProfileEditable(context.review_status)) {
    return { ok: false, error: PROFILE_NOT_EDITABLE_MESSAGE };
  }

  return {
    ok: true,
    userId: user.id,
    breederId: context.id,
    reviewStatus: context.review_status,
  };
}
