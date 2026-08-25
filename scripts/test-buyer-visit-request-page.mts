/**
 * BY-07 buyer visit request page static verification (no browser / no DB writes).
 *
 * Usage:
 *   npm run test:buyer-visit-request-page
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

  const visitPage = read("src/app/(buyer)/buyer/visits/new/page.tsx");
  const visitForm = read("src/features/visits/components/visit-request-form.tsx");
  const visitService = read("src/features/visits/service.ts");
  const visitRepository = read("src/features/visits/repository.ts");
  const visitLoaders = read("src/features/visits/loaders.ts");
  const buyerLayout = read("src/app/(buyer)/buyer/layout.tsx");

  record(
    checks,
    "1. BY-07 page uses loadVisitRequestPage",
    visitPage.includes("loadVisitRequestPage") && visitPage.includes("VisitRequestForm"),
  );
  record(checks, "2. buyer layout uses requireBuyer", buyerLayout.includes("requireBuyer"));
  const visitConstants = read("src/features/visits/constants.ts");

  record(
    checks,
    "3. URL matches design /buyer/visits/new?inquiryId=",
    visitConstants.includes('BUYER_VISIT_NEW_PATH = "/buyer/visits/new"') &&
      visitLoaders.includes("getBuyerVisitNewPath") &&
      visitPage.includes("inquiryId"),
  );
  record(
    checks,
    "4. service resolves buyer from auth (not client buyer_id)",
    visitService.includes("getBuyerProfileByUserId(user.id)") &&
      visitService.includes("resolveBuyerContextForVisit") &&
      !visitService.includes("formData.get"),
  );
  record(
    checks,
    "5. service checks profile_completed",
    visitService.includes("profileCompleted") && visitLoaders.includes("profile_completed"),
  );
  record(
    checks,
    "6. service uses request_visit RPC (no direct visits INSERT)",
    visitRepository.includes('supabase.rpc("request_visit"') &&
      !visitService.includes('.from("visits").insert'),
  );
  record(
    checks,
    "7. loader redirects unauthenticated with next param",
    visitLoaders.includes("getCurrentBuyer") &&
      visitLoaders.includes("/login?next=") &&
      visitLoaders.includes("getBuyerVisitNewPath"),
  );
  record(
    checks,
    "8. loader redirects existing visit to BY-09 path",
    visitLoaders.includes("getBuyerVisitDetailPath") &&
      visitLoaders.includes("getVisitIdByInquiryId"),
  );
  record(
    checks,
    "9. loader validates inquiry ownership via getInquiryByIdForBuyer",
    visitLoaders.includes("getInquiryByIdForBuyer") &&
      visitService.includes("getInquiryByIdForBuyer"),
  );
  record(
    checks,
    "10. double submit disabled while pending",
    visitForm.includes("isSubmitting") && visitForm.includes("送信中…"),
  );
  record(
    checks,
    "11. success redirect to BY-09 path",
    visitForm.includes("getBuyerVisitDetailPath") &&
      visitForm.includes("VISIT_REQUEST_SUCCESS_MESSAGE"),
  );
  record(
    checks,
    "12. datetime-local inputs for preferred times",
    visitForm.includes('type="datetime-local"') && visitForm.includes("第一希望日時"),
  );
  record(
    checks,
    "13. RPC errors mapped to Japanese (not raw Supabase messages in UI path)",
    visitService.includes("mapRequestVisitRpcError") &&
      !visitForm.includes("error.message") &&
      visitForm.includes("formError"),
  );
  record(
    checks,
    "14. eligible inquiry statuses open/replied only",
    visitService.includes('["open", "replied"]') ||
      visitService.includes("isVisitRequestEligibleInquiryStatus"),
  );
  record(
    checks,
    "15. BY-07 screen id and heading",
    visitForm.includes("BY-07") && visitForm.includes("見学希望"),
  );
  record(
    checks,
    "16. pet summary card shows breeder and inquiry status",
    visitForm.includes("VisitRequestSummaryCard") &&
      read("src/features/visits/components/visit-request-summary-card.tsx").includes(
        "問い合わせ状態",
      ),
  );
  record(
    checks,
    "17. datetime conversion helper documented",
    read("src/features/visits/datetime.ts").includes("local timezone"),
  );
  record(
    checks,
    "18. no Service Role in visits feature",
    !visitRepository.includes("SERVICE_ROLE") && !visitService.includes("SERVICE_ROLE"),
  );

  const failed = checks.filter((check) => !check.passed);

  console.log("");
  console.log(`Result: ${checks.length - failed.length} passed / ${failed.length} failed`);

  if (failed.length > 0) {
    process.exit(1);
  }
}

main();
