import type { User } from "@supabase/supabase-js";

export type UserRole = "buyer" | "breeder";

export type BuyerRow = {
  id: string;
  user_id: string;
  display_name: string | null;
  membership_status: string;
  notification_enabled: boolean;
  profile_completed: boolean;
};

export type BreederRow = {
  id: string;
  user_id: string;
  business_name: string | null;
  representative_name: string | null;
  review_status: string;
  membership_status: string;
  subscription_status: string | null;
  profile_completed: boolean;
};

export type EnsureUserProfileResult = {
  role: UserRole;
  profileCompleted: boolean;
};

export function parseUserRole(user: User): UserRole | null {
  const role = user.user_metadata?.role;

  if (role === "buyer" || role === "breeder") {
    return role;
  }

  return null;
}

export function emailLocalPart(email: string | undefined): string {
  if (!email) {
    return "";
  }

  const atIndex = email.indexOf("@");
  return atIndex > 0 ? email.slice(0, atIndex) : email;
}

export function getPostLoginPath(
  role: UserRole,
  profileCompleted: boolean,
): string {
  if (role === "buyer") {
    if (!profileCompleted) {
      // TODO: プロフィール入力画面実装後は /buyer/profile へ遷移する
      return "/buyer";
    }

    return "/buyer";
  }

  if (!profileCompleted) {
    // TODO: プロフィール入力画面実装後は /breeder/profile へ遷移する
    return "/breeder";
  }

  return "/breeder";
}

export class InvalidUserRoleError extends Error {
  constructor() {
    super("会員種別が不正です。サポートにお問い合わせください。");
    this.name = "InvalidUserRoleError";
  }
}
