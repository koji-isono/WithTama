/**
 * BR-09-2 breeder profile return reason display verification.
 *
 * Usage:
 *   npm run test:breeder-profile-return-reason
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { normalizeReturnedComment } from "../src/features/breeder-review/normalize-returned-comment.ts";

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

function main(): void {
  const checks: Check[] = [];

  const reviewRepository = read("src/features/breeder-review/repository.ts");
  const reviewReturnedComment = read("src/features/breeder-review/returned-comment.ts");
  const profileLoaders = read("src/features/breeder-profile/loaders.ts");
  const profileLayout = read("src/app/breeder/profile/layout.tsx");
  const wizardShell = read("src/features/breeder-profile/components/profile-wizard-shell.tsx");
  const notice = read("src/features/breeder-profile/components/profile-resubmission-notice.tsx");
  const dashboardLoaders = read("src/features/breeder-dashboard/loaders.ts");
  const dashboardRepository = read("src/features/breeder-dashboard/repository.ts");
  const editGuardTest = read("scripts/test-breeder-profile-edit-guard.mts");

  record(
    checks,
    "1. resubmission_required loads notice in page context",
    profileLoaders.includes('context.review_status === "resubmission_required"') &&
      profileLoaders.includes("resubmissionNotice"),
  );
  record(
    checks,
    "2. draft does not load returned comment query",
    profileLoaders.includes("resubmissionNotice = null") &&
      !profileLoaders.match(/draft[\s\S]*loadLatestReturnedCommentForBreederSafely/),
  );
  record(
    checks,
    "3. submitted path redirects before notice (edit guard)",
    profileLoaders.includes("isProfileEditable") && profileLoaders.includes("redirect("),
  );
  record(
    checks,
    "4. shared query uses action=returned",
    reviewRepository.includes('.eq("action", "returned")'),
  );
  record(
    checks,
    "5. shared query uses created_at DESC",
    reviewRepository.includes('order("created_at", { ascending: false })'),
  );
  record(checks, "6. shared query uses limit 1", reviewRepository.includes(".limit(1)"));
  record(
    checks,
    "7. shared query scopes breeder_id",
    reviewRepository.includes('.eq("breeder_id", breederId)'),
  );
  record(
    checks,
    "8. latest comment normalized",
    reviewReturnedComment.includes("normalizeReturnedComment") &&
      normalizeReturnedComment("  hello  ") === "hello",
  );
  record(
    checks,
    "9. multiline comment preserved in UI",
    notice.includes("whitespace-pre-wrap") && notice.includes("{comment}"),
  );
  record(
    checks,
    "10. fallback message reused from BR-06 constants",
    notice.includes("RESUBMISSION_BANNER_FALLBACK_MESSAGE") &&
      notice.includes("@/features/breeder-review/constants"),
  );
  record(checks, "11. no console.log of comment in notice", !notice.includes("console.log"));
  record(
    checks,
    "12. server client only (no service role)",
    reviewRepository.includes("@/lib/supabase/server") &&
      !reviewRepository.includes("service_role"),
  );
  record(
    checks,
    "13. all steps share wizard shell notice",
    profileLayout.includes("resubmissionNotice={pageContext.resubmissionNotice}") &&
      wizardShell.includes("resubmissionNotice ?") &&
      wizardShell.includes("<ProfileResubmissionNotice"),
  );
  record(
    checks,
    "14. BR-06 uses shared returned comment loader",
    dashboardLoaders.includes("loadLatestReturnedCommentForBreederSafely") &&
      !dashboardRepository.includes("getLatestReturnedComment"),
  );
  record(
    checks,
    "15. no duplicate query in breeder-dashboard repository",
    !dashboardRepository.includes("breeder_review_logs"),
  );
  record(
    checks,
    "16. reason label shown when comment exists",
    notice.includes("RESUBMISSION_REASON_LABEL") && notice.includes("RESUBMISSION_BANNER_HEADLINE"),
  );
  record(
    checks,
    "17. empty comment uses fallback",
    normalizeReturnedComment("   ") === null && normalizeReturnedComment(null) === null,
  );
  record(
    checks,
    "18. BR-09-1 edit guard maintained",
    editGuardTest.includes("loadBreederProfilePageContext") &&
      profileLoaders.includes("requireBreeder") &&
      profileLoaders.includes("isProfileEditable"),
  );
  record(
    checks,
    "19. no migration or RPC changes",
    !reviewRepository.includes("CREATE POLICY") && !notice.includes("resubmit_breeder_application"),
  );
  record(
    checks,
    "20. no resubmit UI in BR-09-2",
    !notice.includes("再提出する") &&
      !wizardShell.includes("resubmitBreederProfile") &&
      !profileLayout.includes("resubmitBreederApplication"),
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
