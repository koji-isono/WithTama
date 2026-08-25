/**
 * BR-15 breeder visit detail page static verification (no browser / no DB writes).
 *
 * Usage:
 *   npm run test:breeder-visit-detail-page
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

  const visitPage = read("src/app/breeder/visits/[visitId]/page.tsx");
  const detailView = read("src/features/visits/components/breeder-visit-detail-view.tsx");
  const detailSummary = read("src/features/visits/components/breeder-visit-detail-summary.tsx");
  const scheduleForm = read("src/features/visits/components/breeder-visit-schedule-form.tsx");
  const completeForm = read("src/features/visits/components/breeder-visit-complete-form.tsx");
  const visitService = read("src/features/visits/service.ts");
  const visitRepository = read("src/features/visits/repository.ts");
  const visitLoaders = read("src/features/visits/loaders.ts");
  const visitConstants = read("src/features/visits/constants.ts");
  const breederAuth = read("src/features/auth/breeder-auth.ts");

  record(
    checks,
    "1. BR-15 page uses loadBreederVisitDetailPage",
    visitPage.includes("loadBreederVisitDetailPage") &&
      visitPage.includes("BreederVisitDetailView"),
  );
  record(
    checks,
    "2. URL /breeder/visits/[visitId]",
    visitPage.includes("visitId") &&
      visitConstants.includes("getBreederVisitDetailPath") &&
      visitConstants.includes('BREEDER_VISIT_LIST_PATH = "/breeder/visits"'),
  );
  record(
    checks,
    "3. loader uses getVisitByIdForBreeder with breeder_id",
    visitLoaders.includes("loadBreederVisitDetailPage") &&
      visitLoaders.includes("getVisitByIdForBreeder") &&
      visitRepository.match(/getVisitByIdForBreeder[\s\S]*?\.eq\("breeder_id", breederId\)/) !=
        null,
  );
  record(
    checks,
    "4. unauthenticated redirects with next param",
    visitLoaders.includes("getCurrentBreeder") &&
      visitLoaders.includes("/login?next=") &&
      visitLoaders.includes("getBreederVisitDetailPath"),
  );
  record(
    checks,
    "5. buyer/admin blocked via breeder-auth",
    breederAuth.includes('redirect("/buyer")') && breederAuth.includes('redirect("/admin")'),
  );
  record(
    checks,
    "6. schedule uses schedule_visit RPC only",
    visitRepository.includes('supabase.rpc("schedule_visit"') &&
      visitService.includes("scheduleVisitAction") &&
      scheduleForm.includes("見学日時を確定する") &&
      !visitService.match(/scheduleVisitAction[\s\S]*?\.from\("visits"\)\.update/),
  );
  record(
    checks,
    "7. complete uses complete_visit RPC only",
    visitRepository.includes('supabase.rpc("complete_visit"') &&
      visitService.includes("completeVisitAction") &&
      completeForm.includes("見学を完了する") &&
      completeForm.includes("animal_confirmed") === false &&
      completeForm.includes("animalConfirmed"),
  );
  record(
    checks,
    "8. cancel uses cancel_visit RPC for breeder",
    visitService.includes("cancelVisitActionForBreeder") &&
      visitRepository.includes('supabase.rpc("cancel_visit"') &&
      detailView.includes("cancelVisitActionForBreeder"),
  );
  record(
    checks,
    "9. schedule only when requested",
    visitConstants.includes('status === "requested"') &&
      visitLoaders.includes("canBreederScheduleVisit"),
  );
  record(
    checks,
    "10. complete only when scheduled",
    visitConstants.includes('status === "scheduled"') &&
      visitLoaders.includes("canBreederCompleteVisit"),
  );
  record(
    checks,
    "11. cancel when requested or scheduled",
    visitLoaders.includes("canBreederCancelVisit") &&
      visitConstants.includes('["requested", "scheduled"]'),
  );
  record(
    checks,
    "12. buyer display name via RPC only",
    visitLoaders.includes("getInquiryBuyerDisplayNamesByIds") &&
      !detailSummary.includes("email") &&
      !detailSummary.includes("phone"),
  );
  record(
    checks,
    "13. summary shows preferred datetimes and inquiry created_at",
    detailSummary.includes("第一希望") &&
      detailSummary.includes("問い合わせ開始日") &&
      detailSummary.includes("buyerDisplayName"),
  );
  record(
    checks,
    "14. complete form result options contracted/declined/considering",
    completeForm.includes("VISIT_COMPLETE_RESULT_OPTIONS") &&
      visitConstants.includes('value: "contracted"') &&
      visitConstants.includes('value: "declined"') &&
      visitConstants.includes('value: "considering"') &&
      visitConstants.includes("VISIT_COMPLETE_CONTRACTED_HINT"),
  );
  record(
    checks,
    "15. complete form disables submit before scheduled datetime",
    completeForm.includes("canCompleteNow") &&
      completeForm.includes("VISIT_COMPLETE_FUTURE_HINT") &&
      visitLoaders.includes("canCompleteNow") &&
      visitLoaders.includes("isVisitCompleteAllowedNow") &&
      visitConstants.includes("VISIT_COMPLETE_BEFORE_SCHEDULED_MESSAGE"),
  );
  record(
    checks,
    "16. complete form keeps hints above select via SelectField",
    completeForm.includes("SelectField") &&
      completeForm.includes("hints={resultHints}") &&
      completeForm.includes("VISIT_COMPLETE_CONTRACTED_HINT"),
  );
  record(
    checks,
    "17. navigation to BR-14 and BR-12",
    detailView.includes("BREEDER_VISIT_LIST_PATH") &&
      detailView.includes("getBreederInquiryDetailPath") &&
      detailView.includes("見学管理一覧へ戻る"),
  );
  record(
    checks,
    "18. RPC errors mapped to Japanese",
    visitService.includes("mapScheduleVisitRpcError") &&
      visitService.includes("mapCompleteVisitRpcError") &&
      !detailView.includes("error.message"),
  );
  record(
    checks,
    "19. no Service Role",
    !visitRepository.includes("SERVICE_ROLE") && !visitService.includes("SERVICE_ROLE"),
  );
  record(
    checks,
    "20. notFound for missing visit",
    visitPage.includes("notFound()") && visitLoaders.includes("if (!visit)"),
  );
  record(
    checks,
    "21. BR-15 screen id",
    detailView.includes("BREEDER_VISIT_DETAIL_SCREEN_ID") && detailView.includes("見学詳細"),
  );
  record(
    checks,
    "22. no direct visits UPDATE in service",
    !visitService.includes('.from("visits").update'),
  );

  const failed = checks.filter((check) => !check.passed);

  console.log("");
  console.log(`Result: ${checks.length - failed.length} passed / ${failed.length} failed`);

  if (failed.length > 0) {
    process.exit(1);
  }
}

main();
