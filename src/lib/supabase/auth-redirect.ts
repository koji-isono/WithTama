function getAppBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

/**
 * 新規登録確認メールの emailRedirectTo（Supabase Auth 許可 URL に登録すること）
 */
export function getSignupEmailRedirectUrl(): string {
  return `${getAppBaseUrl()}/auth/callback?next=/login`;
}

/**
 * パスワード再設定メールの redirectTo（Supabase Auth 許可 URL に登録すること）
 */
export function getPasswordRecoveryRedirectUrl(): string {
  return `${getAppBaseUrl()}/auth/callback?next=/reset-password`;
}
