/**
 * BR-06 breeder dashboard page static verification (no browser / no DB writes).
 *
 * Usage:
 *   npm run test:breeder-dashboard-page
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

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

  const breederAuth = read("src/features/auth/breeder-auth.ts");
  const dashboardPage = read("src/app/breeder/dashboard/page.tsx");
  const dashboardView = read(
    "src/features/breeder-dashboard/components/breeder-dashboard-view.tsx",
  );
  const banner = read("src/features/breeder-dashboard/components/resubmission-required-banner.tsx");
  const loaders = read("src/features/breeder-dashboard/loaders.ts");
  const repository = read("src/features/breeder-dashboard/repository.ts");
  const constants = read("src/features/breeder-dashboard/constants.ts");

  record(
    checks,
    "1. loader uses requireBreeder",
    loaders.includes("requireBreeder") && loaders.includes("await requireBreeder()"),
  );
  record(
    checks,
    "2. resubmission_required only shows banner data",
    loaders.includes('summary.review_status !== "resubmission_required"') &&
      loaders.includes("resubmissionBanner: null"),
  );
  record(
    checks,
    "3. banner renders only when resubmissionBanner is set",
    dashboardView.includes("resubmissionBanner ?") &&
      dashboardView.includes("<ResubmissionRequiredBanner"),
  );
  record(
    checks,
    "4. latest returned comment query uses action=returned",
    repository.includes('.eq("action", "returned")'),
  );
  record(
    checks,
    "5. latest returned comment uses created_at DESC",
    repository.includes('order("created_at", { ascending: false })'),
  );
  record(checks, "6. latest returned comment uses LIMIT 1", repository.includes(".limit(1)"));
  record(
    checks,
    "7. submitted status does not fetch banner (loader guard)",
    loaders.includes('"resubmission_required"') && !loaders.includes('"submitted"'),
  );
  record(
    checks,
    "8. under_review / approved / rejected / draft hidden via status guard",
    loaders.includes('summary.review_status !== "resubmission_required"'),
  );
  record(
    checks,
    "9. comment fetch failure uses safe fallback path",
    loaders.includes("loadLatestReturnedCommentSafely") &&
      constants.includes("詳細は管理者へお問い合わせください") &&
      !banner.includes("error.message"),
  );
  record(
    checks,
    "10. CTA links to /breeder/profile/basic via constant",
    banner.includes("BREEDER_PROFILE_BASIC_PATH") && constants.includes("申請内容を修正する"),
  );
  record(
    checks,
    "11. server client only (no service role)",
    repository.includes("@/lib/supabase/server") &&
      !repository.includes("service_role") &&
      !repository.includes("SERVICE_ROLE"),
  );
  record(
    checks,
    "12. returned log query relies on RLS (no breeder_id filter in query)",
    repository.includes("breeder_review_logs") && !repository.includes('.eq("breeder_id"'),
  );
  record(
    checks,
    "13. buyer redirected away from breeder routes",
    breederAuth.includes('redirect("/buyer")') && breederAuth.includes('memberRole === "buyer"'),
  );
  record(
    checks,
    "14. unauthenticated users redirected to login",
    breederAuth.includes('redirect("/login")') && breederAuth.includes("if (!user)"),
  );
  record(
    checks,
    "15. dashboard page loads data via loader",
    dashboardPage.includes("loadBreederDashboardPageData") &&
      dashboardPage.includes("BreederDashboardView"),
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
