/**
 * BR-09-1 breeder profile edit guard verification.
 *
 * Usage:
 *   npm run test:breeder-profile-edit-guard
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import {
  assertProfileEditable,
  isProfileEditable,
  PROFILE_EDITABLE_REVIEW_STATUSES,
  PROFILE_NOT_EDITABLE_MESSAGE,
} from "../src/features/breeder-profile/edit-guard.ts";

type Check = {
  name: string;
  passed: boolean;
  detail?: string;
};

const ROOT = process.cwd();

function read(relativePath: string): string {
  return readFileSync(join(ROOT, relativePath), "utf8");
}

function extractFunctionBody(source: string, functionName: string): string {
  const start = source.indexOf(`export async function ${functionName}`);
  if (start === -1) {
    return "";
  }

  const nextExport = source.indexOf("\nexport async function ", start + 1);
  return nextExport === -1 ? source.slice(start) : source.slice(start, nextExport);
}

function record(checks: Check[], name: string, passed: boolean, detail?: string): void {
  checks.push({ name, passed, detail });
  const suffix = detail ? ` (${detail})` : "";
  console.log(`${passed ? "PASS" : "FAIL"} ${name}${suffix}`);
}

function expectThrows(fn: () => void, message: string): boolean {
  try {
    fn();
    return false;
  } catch (error) {
    return error instanceof Error && error.message === message;
  }
}

function main(): void {
  const checks: Check[] = [];

  record(checks, "1. draft editable", isProfileEditable("draft"));
  record(checks, "2. resubmission_required editable", isProfileEditable("resubmission_required"));
  record(checks, "3. submitted not editable", !isProfileEditable("submitted"));
  record(checks, "4. under_review not editable", !isProfileEditable("under_review"));
  record(checks, "5. approved not editable", !isProfileEditable("approved"));
  record(checks, "6. rejected not editable", !isProfileEditable("rejected"));
  record(
    checks,
    "7. assertProfileEditable allows draft",
    (() => {
      assertProfileEditable("draft");
      return true;
    })(),
  );
  record(
    checks,
    "8. assertProfileEditable rejects submitted",
    expectThrows(() => assertProfileEditable("submitted"), PROFILE_NOT_EDITABLE_MESSAGE),
  );
  record(
    checks,
    "9. editable statuses constant",
    PROFILE_EDITABLE_REVIEW_STATUSES.length === 2 &&
      PROFILE_EDITABLE_REVIEW_STATUSES.includes("draft") &&
      PROFILE_EDITABLE_REVIEW_STATUSES.includes("resubmission_required"),
  );

  const loaders = read("src/features/breeder-profile/loaders.ts");
  const layout = read("src/app/breeder/profile/layout.tsx");
  const service = read("src/features/breeder-profile/service.ts");
  const serviceAuth = read("src/features/breeder-profile/service-auth.ts");
  const repository = read("src/features/breeder-profile/repository.ts");
  const editGuard = read("src/features/breeder-profile/edit-guard.ts");

  record(
    checks,
    "10. requireBreeder in page context loader",
    loaders.includes("requireBreeder") && loaders.includes("loadBreederProfilePageContext"),
  );
  record(
    checks,
    "11. non-editable redirects to dashboard",
    loaders.includes("redirect(BREEDER_DASHBOARD_PATH)") && loaders.includes("isProfileEditable"),
  );
  record(
    checks,
    "12. layout uses loadBreederProfilePageContext",
    layout.includes("loadBreederProfilePageContext") &&
      layout.includes("resubmissionNotice={pageContext.resubmissionNotice}"),
  );
  record(
    checks,
    "13. basic step under profile layout",
    read("src/app/breeder/profile/basic/page.tsx").includes("BasicInfoStepForm") &&
      layout.includes("ProfileWizardShell"),
  );
  record(
    checks,
    "14. location step under profile layout",
    read("src/app/breeder/profile/location/page.tsx").includes("LocationStepForm"),
  );
  record(
    checks,
    "15. license step under profile layout",
    read("src/app/breeder/profile/license/page.tsx").includes("loadLicenseProfile"),
  );
  record(
    checks,
    "16. introduction step under profile layout",
    read("src/app/breeder/profile/introduction/page.tsx").includes("loadIntroductionProfile"),
  );
  record(
    checks,
    "17. verification step under profile layout",
    read("src/app/breeder/profile/verification/page.tsx").includes("loadVerificationStepState"),
  );
  record(
    checks,
    "18. saveBasicProfile uses authorizeEditableBreederProfile",
    service.includes("saveBasicProfile") && service.includes("authorizeEditableBreederProfile"),
  );
  record(
    checks,
    "19. saveLocationProfile guarded",
    service.match(/saveLocationProfile[\s\S]*authorizeEditableBreederProfile/) != null,
  );
  record(
    checks,
    "20. saveLicenseProfile guarded",
    service.match(/saveLicenseProfile[\s\S]*authorizeEditableBreederProfile/) != null,
  );
  record(
    checks,
    "21. saveIntroductionProfile guarded",
    service.match(/saveIntroductionProfile[\s\S]*authorizeEditableBreederProfile/) != null,
  );
  record(
    checks,
    "22. uploadBreederDocument guarded",
    service.match(/uploadBreederDocument[\s\S]*authorizeEditableBreederProfile/) != null,
  );
  record(
    checks,
    "23. completeBreederProfile draft only",
    service.includes('profile.review_status !== "draft"') &&
      !service.match(/completeBreederProfile[\s\S]*authorizeEditableBreederProfile/),
  );
  record(
    checks,
    "24. service-auth uses isProfileEditable",
    serviceAuth.includes("isProfileEditable") && serviceAuth.includes("getCurrentBreeder"),
  );
  record(
    checks,
    "25. safe not-editable message",
    editGuard.includes("現在の申請状態ではプロフィールを変更できません。") &&
      serviceAuth.includes("PROFILE_NOT_EDITABLE_MESSAGE"),
  );
  record(
    checks,
    "26. server client only (no service role)",
    repository.includes("@/lib/supabase/server") &&
      !repository.includes("service_role") &&
      !serviceAuth.includes("service_role"),
  );
  record(
    checks,
    "27. no migration changes in feature",
    !editGuard.includes("migration") && !service.includes("CREATE POLICY"),
  );
  const completeAction = extractFunctionBody(service, "completeBreederProfile");
  const resubmitActionForGuard = extractFunctionBody(service, "resubmitBreederProfile");
  record(
    checks,
    "28. resubmit RPC wired only in resubmitBreederProfile",
    completeAction.includes("await submitBreederApplication()") &&
      !completeAction.includes("await resubmitBreederApplication()") &&
      resubmitActionForGuard.includes("await resubmitBreederApplication()") &&
      !resubmitActionForGuard.includes("await submitBreederApplication()"),
  );

  const passed = checks.filter((check) => check.passed).length;
  const failed = checks.length - passed;

  console.log("");
  console.log(`${passed} passed / ${failed} failed`);

  if (failed > 0) {
    process.exitCode = 1;
  }
}

main();
