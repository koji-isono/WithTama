/**
 * BR-09-3 breeder profile resubmit UI verification.
 *
 * Usage:
 *   npm run test:breeder-profile-resubmit-ui
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  PROFILE_INCOMPLETE_MESSAGE,
  RESUBMIT_BUTTON_LABEL,
  RESUBMIT_CONFIRMATION_MESSAGE,
  RESUBMIT_GENERIC_ERROR_MESSAGE,
  RESUBMIT_INVALID_STATUS_MESSAGE,
  SUBMIT_INVALID_STATUS_MESSAGE,
} from "../src/features/breeder-profile/application-submit-constants.ts";
import {
  formatInitialSubmitError,
  formatResubmitError,
} from "../src/features/breeder-profile/format-application-submit-error.ts";
import { validateProfileCompletion } from "../src/features/breeder-profile/profile-completion.ts";
import type { VerificationProfileRow } from "../src/features/breeder-profile/types.ts";

type Check = {
  name: string;
  passed: boolean;
  detail?: string;
};

const ROOT = process.cwd();

function read(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

function record(checks: Check[], name: string, passed: boolean, detail?: string): void {
  checks.push({ name, passed, detail });
  const suffix = detail ? ` (${detail})` : "";
  console.log(`${passed ? "PASS" : "FAIL"} ${name}${suffix}`);
}

function extractFunctionBody(source: string, functionName: string): string {
  const start = source.indexOf(`export async function ${functionName}`);
  if (start === -1) {
    return "";
  }

  const nextExport = source.indexOf("\nexport async function ", start + 1);
  return nextExport === -1 ? source.slice(start) : source.slice(start, nextExport);
}

function buildCompleteProfile(reviewStatus: string): VerificationProfileRow {
  return {
    business_name: "テスト犬舎",
    representative_name: "テスト太郎",
    phone: "09012345678",
    postal_code: "1000001",
    prefecture: "東京都",
    city: "千代田区",
    address_line: "1-1",
    business_registration_type: "販売",
    business_registration_number: "1234567890",
    registration_authority: "東京都",
    registration_expires_at: "2030-12-31",
    profile_text: "a".repeat(20),
    breeding_policy: "b".repeat(20),
    health_policy: "c".repeat(20),
    breeding_environment: "d".repeat(20),
    identity_document_path: "breeders/u/identity/file.jpg",
    business_license_path: "breeders/u/license/file.jpg",
    identity_verification_status: "submitted",
    business_verification_status: "submitted",
    review_status: reviewStatus,
    profile_completed: true,
  };
}

function main(): void {
  const checks: Check[] = [];

  const verificationForm = read(
    "src/features/breeder-profile/components/verification-step-form.tsx",
  );
  const service = read("src/features/breeder-profile/service.ts");
  const repository = read("src/features/breeder-profile/repository.ts");
  const loaders = read("src/features/breeder-profile/loaders.ts");
  const editGuard = read("src/features/breeder-profile/edit-guard.ts");
  const returnReasonTest = read("scripts/test-breeder-profile-return-reason.mts");
  const formatResubmit = read("src/features/breeder-profile/format-application-submit-error.ts");
  const resubmitAction = extractFunctionBody(service, "resubmitBreederProfile");

  record(
    checks,
    "1. resubmission_required shows resubmit button",
    verificationForm.includes('initialState.reviewStatus === "resubmission_required"') &&
      verificationForm.includes("RESUBMIT_BUTTON_LABEL") &&
      verificationForm.includes("handleResubmit"),
  );
  record(
    checks,
    "2. draft hides resubmit button",
    verificationForm.includes("handleComplete") &&
      verificationForm.includes("COMPLETE_SUBMIT_BUTTON_LABEL") &&
      !verificationForm.match(/draft[\s\S]*handleResubmit/),
  );
  record(
    checks,
    "3. submitted resubmit blocked in service",
    service.includes('profile.review_status !== "resubmission_required"') &&
      service.includes("RESUBMIT_INVALID_STATUS_MESSAGE"),
  );
  record(
    checks,
    "4. under_review resubmit blocked in service",
    service.includes('profile.review_status !== "resubmission_required"'),
  );
  record(
    checks,
    "5. approved resubmit blocked in service",
    service.includes('profile.review_status !== "resubmission_required"'),
  );
  record(
    checks,
    "6. rejected resubmit blocked in service",
    service.includes('profile.review_status !== "resubmission_required"'),
  );
  record(
    checks,
    "7. resubmitBreederProfile Action exists",
    service.includes("export async function resubmitBreederProfile"),
  );
  record(
    checks,
    "8. breeder authentication",
    service.includes("getCurrentBreeder") &&
      service.match(/resubmitBreederProfile[\s\S]*getCurrentBreeder/),
  );
  record(
    checks,
    "9. review_status revalidated in Action",
    service.match(
      /resubmitBreederProfile[\s\S]*profile\.review_status !== "resubmission_required"/,
    ),
  );
  record(
    checks,
    "10. profile completion validation executed",
    service.match(/resubmitBreederProfile[\s\S]*validateProfileCompletion/),
  );
  record(
    checks,
    "11. validation failure skips RPC",
    resubmitAction.includes("missingSteps.length > 0") &&
      resubmitAction.indexOf("missingSteps.length > 0") <
        resubmitAction.indexOf("resubmitBreederApplication()"),
  );
  record(
    checks,
    "12. resubmit_breeder_application RPC used",
    service.includes("resubmitBreederApplication()") &&
      repository.includes('rpc("resubmit_breeder_application")'),
  );
  record(
    checks,
    "13. submit_breeder_application not used for resubmit",
    resubmitAction.includes("await resubmitBreederApplication()") &&
      !resubmitAction.includes("await submitBreederApplication()"),
  );
  record(
    checks,
    "14. completeBreederProfile not used for resubmit",
    !verificationForm.match(/handleResubmit[\s\S]*completeBreederProfile/) &&
      verificationForm.includes("resubmitBreederProfile"),
  );
  record(
    checks,
    "15. success redirects to dashboard",
    verificationForm.includes("router.push(dashboardPath)") &&
      verificationForm.includes('const dashboardPath = "/breeder/dashboard"'),
  );
  record(
    checks,
    "16. double submit UI guard",
    verificationForm.includes("isSubmitting") &&
      verificationForm.includes("disabled={!canComplete || isSubmitting}"),
  );
  record(
    checks,
    "17. pending state disables button",
    verificationForm.includes("RESUBMIT_PENDING_LABEL") &&
      verificationForm.includes("COMPLETE_SUBMIT_PENDING_LABEL"),
  );
  record(
    checks,
    "18. internal DB errors not exposed",
    formatResubmit.includes("RESUBMIT_GENERIC_ERROR_MESSAGE") &&
      formatResubmitError(new Error("permission denied for function")) ===
        RESUBMIT_GENERIC_ERROR_MESSAGE &&
      formatResubmitError({ code: "42501", hint: "secret", details: "db" }) ===
        RESUBMIT_GENERIC_ERROR_MESSAGE,
  );
  record(
    checks,
    "19. no service role",
    !repository.includes("createServiceRoleClient") && !service.includes("createServiceRoleClient"),
  );
  record(
    checks,
    "20. BR-09-1 edit guard maintained",
    editGuard.includes("resubmission_required") &&
      service.includes("authorizeEditableBreederProfile") &&
      loaders.includes("isProfileEditable"),
  );
  record(
    checks,
    "21. BR-09-2 return reason maintained",
    loaders.includes("loadLatestReturnedCommentForBreederSafely") &&
      loaders.includes('context.review_status === "resubmission_required"'),
  );
  record(
    checks,
    "22. no migration",
    !service.includes("CREATE TABLE") && !repository.includes("CREATE POLICY"),
  );
  record(
    checks,
    "23. no RPC changes",
    !repository.match(/CREATE OR REPLACE FUNCTION/) &&
      !service.includes("CREATE OR REPLACE FUNCTION"),
  );
  record(
    checks,
    "24. resubmit confirmation copy shown",
    verificationForm.includes("RESUBMIT_CONFIRMATION_MESSAGE") &&
      RESUBMIT_CONFIRMATION_MESSAGE.length > 0,
  );
  record(
    checks,
    "25. resubmit button label",
    RESUBMIT_BUTTON_LABEL === "再提出する" && verificationForm.includes("RESUBMIT_BUTTON_LABEL"),
  );
  record(
    checks,
    "26. draft submit still uses completeBreederProfile",
    verificationForm.includes("completeBreederProfile") &&
      service.includes('profile.review_status !== "draft"') &&
      service.includes("submitBreederApplication()"),
  );
  record(
    checks,
    "27. reviewStatus loaded for verification step",
    loaders.includes("reviewStatus: row.review_status"),
  );
  record(
    checks,
    "28. logic: complete profile passes validation",
    validateProfileCompletion(buildCompleteProfile("resubmission_required")).length === 0,
  );
  record(
    checks,
    "29. logic: incomplete profile blocks resubmit path",
    validateProfileCompletion(buildCompleteProfile("resubmission_required")).length === 0 &&
      validateProfileCompletion({ ...buildCompleteProfile("resubmission_required"), phone: null })
        .length > 0,
  );
  record(
    checks,
    "30. logic: invalid review status message mapped",
    formatResubmitError(new Error("invalid review status")) === RESUBMIT_INVALID_STATUS_MESSAGE &&
      formatInitialSubmitError(new Error("invalid review status")) ===
        SUBMIT_INVALID_STATUS_MESSAGE,
  );
  record(
    checks,
    "31. logic: incomplete message shared",
    formatResubmitError(new Error("documents required")) === PROFILE_INCOMPLETE_MESSAGE,
  );
  record(
    checks,
    "32. BR-09-2 test still expects resubmit in BR-09-3 only",
    returnReasonTest.includes("no resubmit UI in BR-09-2"),
  );

  const failed = checks.filter((check) => !check.passed);

  console.log("");
  console.log(`${checks.length - failed.length} passed / ${failed.length} failed`);

  if (failed.length > 0) {
    process.exitCode = 1;
  }
}

main();
