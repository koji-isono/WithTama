/**
 * パスワード再設定メールの redirectTo（Supabase Auth 許可 URL に登録すること）
 */
export function getPasswordRecoveryRedirectUrl(): string {
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  return `${appUrl}/auth/callback?next=/reset-password`;
}
