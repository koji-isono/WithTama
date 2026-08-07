import type { User } from "@supabase/supabase-js";

/** 一般会員サインアップで選択可能なロール（Decision No.102） */
export type PublicSignupRole = "buyer" | "breeder";

/** buyer / breeder 会員向けロール（user_metadata.role） */
export type MemberUserRole = PublicSignupRole;

/** @deprecated MemberUserRole を使用してください */
export type UserRole = MemberUserRole;

/** ログイン済みユーザーのロール（admin は app_metadata のみ） */
export type AuthenticatedUserRole = MemberUserRole | "admin";

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
  role: MemberUserRole;
  profileCompleted: boolean;
};

export function isAdminUser(user: User): boolean {
  return user.app_metadata?.role === "admin";
}

export function parseMemberUserRole(user: User): MemberUserRole | null {
  const role = user.user_metadata?.role;

  if (role === "buyer" || role === "breeder") {
    return role;
  }

  return null;
}

/** @deprecated parseMemberUserRole を使用してください */
export function parseUserRole(user: User): MemberUserRole | null {
  return parseMemberUserRole(user);
}

export function emailLocalPart(email: string | undefined): string {
  if (!email) {
    return "";
  }

  const atIndex = email.indexOf("@");
  return atIndex > 0 ? email.slice(0, atIndex) : email;
}

export function getMemberHomePath(role: MemberUserRole): string {
  return role === "buyer" ? "/buyer" : "/breeder";
}

/** @deprecated getMemberHomePath を使用してください */
export function getPostLoginPath(role: MemberUserRole): string {
  return getMemberHomePath(role);
}

export class InvalidUserRoleError extends Error {
  constructor() {
    super("会員種別が不正です。サポートにお問い合わせください。");
    this.name = "InvalidUserRoleError";
  }
}
