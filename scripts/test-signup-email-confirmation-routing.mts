/**
 * Signup email confirmation / auth routing verification.
 *
 * Usage:
 *   npm run test:signup-email-confirmation-routing
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  AUTH_CALLBACK_ALLOWED_NEXT_PATHS,
  buildAuthLandingRedirectPath,
  resolveAuthConfirmSuccessNext,
  resolveAuthNextFromEmailType,
  sanitizeAuthCallbackNext,
} from "@/lib/auth/auth-callback-next";
import {
  getPasswordRecoveryRedirectUrl,
  getSignupEmailRedirectUrl,
} from "@/lib/supabase/auth-redirect";

type Check = { name: string; passed: boolean; detail?: string };

const ROOT = process.cwd();

function read(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

function record(checks: Check[], name: string, passed: boolean, detail?: string): void {
  checks.push({ name, passed, detail });
  const suffix = detail ? ` (${detail})` : "";
  console.log(`${passed ? "PASS" : "FAIL"} ${name}${suffix}`);
}

function runRoutingHelperChecks(checks: Check[]): void {
  record(
    checks,
    "R1. code without type routes to login callback",
    buildAuthLandingRedirectPath({ code: "abc" }) === "/auth/callback?code=abc&next=%2Flogin",
  );

  record(
    checks,
    "R2. code with type=signup routes to login",
    buildAuthLandingRedirectPath({ code: "abc", type: "signup" }) ===
      "/auth/callback?code=abc&next=%2Flogin",
  );

  record(
    checks,
    "R3. code with type=recovery routes to reset-password",
    buildAuthLandingRedirectPath({ code: "abc", type: "recovery" }) ===
      "/auth/callback?code=abc&next=%2Freset-password",
  );

  record(
    checks,
    "R4. token_hash type=signup routes to login confirm",
    buildAuthLandingRedirectPath({ token_hash: "hash", type: "signup" }) ===
      "/auth/confirm?token_hash=hash&type=signup&next=%2Flogin",
  );

  record(
    checks,
    "R5. token_hash type=recovery routes to reset-password confirm",
    buildAuthLandingRedirectPath({ token_hash: "hash", type: "recovery" }) ===
      "/auth/confirm?token_hash=hash&type=recovery&next=%2Freset-password",
  );

  record(
    checks,
    "R6. resolveAuthNextFromEmailType: missing type → login",
    resolveAuthNextFromEmailType(null) === "/login" &&
      resolveAuthNextFromEmailType(undefined) === "/login",
  );

  record(
    checks,
    "R7. resolveAuthConfirmSuccessNext signup → login",
    resolveAuthConfirmSuccessNext("signup") === "/login",
  );

  record(
    checks,
    "R8. resolveAuthConfirmSuccessNext recovery → reset-password",
    resolveAuthConfirmSuccessNext("recovery") === "/reset-password",
  );

  record(
    checks,
    "R9. Open Redirect blocked: external next → login",
    sanitizeAuthCallbackNext("//evil.com") === "/login",
  );

  record(
    checks,
    "R10. Open Redirect blocked: arbitrary path → login",
    sanitizeAuthCallbackNext("/admin") === "/login",
  );

  record(
    checks,
    "R11. allowlist accepts /login and /reset-password only",
    AUTH_CALLBACK_ALLOWED_NEXT_PATHS.length === 2 &&
      sanitizeAuthCallbackNext("/login") === "/login" &&
      sanitizeAuthCallbackNext("/reset-password") === "/reset-password",
  );
}

function runStaticChecks(checks: Check[]): void {
  const signUp = read("src/lib/supabase/sign-up.ts");
  const authRedirect = read("src/lib/supabase/auth-redirect.ts");
  const callback = read("src/app/auth/callback/route.ts");
  const confirm = read("src/app/auth/confirm/route.ts");
  const home = read("src/app/(public)/page.tsx");
  const handler = read("src/components/auth/recovery-link-handler.tsx");
  const resetForm = read("src/app/(auth)/reset-password/reset-password-form.tsx");

  record(
    checks,
    "S1. signUp sets emailRedirectTo via getSignupEmailRedirectUrl",
    signUp.includes("emailRedirectTo: getSignupEmailRedirectUrl()") &&
      signUp.includes('from "@/lib/supabase/auth-redirect"'),
  );

  record(
    checks,
    "S2. getSignupEmailRedirectUrl uses NEXT_PUBLIC_APP_URL",
    authRedirect.includes("NEXT_PUBLIC_APP_URL") &&
      authRedirect.includes("/auth/callback?next=/login"),
  );

  record(
    checks,
    "S3. getSignupEmailRedirectUrl does not hardcode localhost only",
    !authRedirect.match(/return "http:\/\/localhost:3000/),
  );

  record(
    checks,
    "S4. home page uses shared buildAuthLandingRedirectPath",
    home.includes("buildAuthLandingRedirectPath") && !home.includes('type === "recovery" || !type'),
  );

  record(
    checks,
    "S5. RecoveryLinkHandler uses shared buildAuthLandingRedirectPath",
    handler.includes("buildAuthLandingRedirectPath") &&
      !handler.includes('type === "recovery" || !type'),
  );

  record(
    checks,
    "S6. callback uses sanitizeAuthCallbackNext allowlist",
    callback.includes("sanitizeAuthCallbackNext") &&
      !callback.includes('sanitizeNextPath(searchParams.get("next"))'),
  );

  record(
    checks,
    "S7. callback signup failure → login auth_callback_error",
    callback.includes("`${origin}/login?error=auth_callback_error`") &&
      callback.includes('next === "/reset-password"'),
  );

  record(
    checks,
    "S8. callback recovery failure → reset-password invalid_link",
    callback.includes("`${origin}/reset-password?error=invalid_link`"),
  );

  record(
    checks,
    "S9. confirm missing params → login auth_confirm_error (not reset-password)",
    confirm.includes("if (!tokenHash || !type)") &&
      confirm.includes("`${origin}/login?error=auth_confirm_error`"),
  );

  record(
    checks,
    "S10. confirm signup failure → login auth_confirm_error",
    confirm.includes('type === "recovery"') &&
      confirm.includes("`${origin}/login?error=auth_confirm_error`"),
  );

  record(
    checks,
    "S11. confirm recovery failure → reset-password invalid_link",
    confirm.includes("`${origin}/reset-password?error=invalid_link`"),
  );

  record(
    checks,
    "S12. confirm success uses resolveAuthConfirmSuccessNext",
    confirm.includes("resolveAuthConfirmSuccessNext"),
  );

  record(
    checks,
    "S13. reset-password invalid_link skips session check initially",
    resetForm.includes("useState(() => !invalidLinkError)"),
  );

  record(
    checks,
    "S14. reset-password invalid_link shows forgot-password link",
    resetForm.includes('href="/forgot-password"'),
  );

  record(
    checks,
    "S15. reset-password forwards token_hash only for recovery",
    resetForm.includes('type === "recovery"'),
  );

  record(
    checks,
    "S16. signUp role metadata preserved for buyer/breeder",
    signUp.includes('"buyer" | "breeder"') && signUp.includes("data: {") && signUp.includes("role"),
  );

  record(
    checks,
    "S17. no service_role in auth routes",
    !callback.includes("service_role") && !confirm.includes("service_role"),
  );
}

function main(): void {
  const checks: Check[] = [];

  runRoutingHelperChecks(checks);
  runStaticChecks(checks);

  const signupUrl = getSignupEmailRedirectUrl();
  const recoveryUrl = getPasswordRecoveryRedirectUrl();

  record(
    checks,
    "E1. signup redirect URL ends with /auth/callback?next=/login",
    signupUrl.endsWith("/auth/callback?next=/login"),
    "redacted — structure confirmed",
  );

  record(
    checks,
    "E2. recovery redirect URL ends with /auth/callback?next=/reset-password",
    recoveryUrl.endsWith("/auth/callback?next=/reset-password"),
    "redacted — structure confirmed",
  );

  record(checks, "E3. signup and recovery redirect URLs differ", signupUrl !== recoveryUrl);

  const passed = checks.filter((check) => check.passed).length;
  const failed = checks.length - passed;

  console.log("");
  console.log(`${passed} passed / ${failed} failed`);

  if (failed > 0) {
    process.exitCode = 1;
  }
}

main();
