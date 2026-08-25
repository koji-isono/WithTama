/**
 * BY-09 buyer visit detail page static verification (no browser / no DB writes).
 *
 * Usage:
 *   npm run test:buyer-visit-detail-page
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

  const visitPage = read("src/app/(buyer)/buyer/visits/[visitId]/page.tsx");
  const visitDetailView = read("src/features/visits/components/visit-detail-view.tsx");
  const visitService = read("src/features/visits/service.ts");
  const visitRepository = read("src/features/visits/repository.ts");
  const visitLoaders = read("src/features/visits/loaders.ts");
  const visitFormat = read("src/features/visits/format.ts");
  const visitConstants = read("src/features/visits/constants.ts");
  const buyerLayout = read("src/app/(buyer)/buyer/layout.tsx");

  record(
    checks,
    "1. BY-09 page uses loadVisitDetailPage",
    visitPage.includes("loadVisitDetailPage") && visitPage.includes("VisitDetailView"),
  );
  record(checks, "2. buyer layout uses requireBuyer", buyerLayout.includes("requireBuyer"));
  record(
    checks,
    "3. URL /buyer/visits/[visitId]",
    visitPage.includes("visitId") &&
      visitConstants.includes("getBuyerVisitDetailPath") &&
      visitConstants.includes("/buyer/visits/"),
  );
  record(
    checks,
    "4. loader uses getVisitByIdForBuyer with buyer_id",
    visitLoaders.includes("getVisitByIdForBuyer") &&
      visitRepository.includes('.eq("buyer_id", buyerId)'),
  );
  record(
    checks,
    "5. loader redirects unauthenticated with next param",
    visitLoaders.includes("getCurrentBuyer") &&
      visitLoaders.includes("/login?next=") &&
      visitLoaders.includes("getBuyerVisitDetailPath"),
  );
  record(
    checks,
    "6. invalid UUID returns notFound",
    visitLoaders.includes("notFound: true") && visitLoaders.includes("isValidInquiryId"),
  );
  record(
    checks,
    "7. cancel uses cancel_visit RPC (no direct UPDATE)",
    visitRepository.includes('supabase.rpc("cancel_visit"') &&
      !visitService.includes('.from("visits").update'),
  );
  record(
    checks,
    "8. cancel eligible statuses requested/scheduled",
    visitConstants.includes('["requested", "scheduled"]') &&
      visitConstants.includes("canBuyerCancelVisit"),
  );
  record(
    checks,
    "9. visit status labels from visits.md",
    visitFormat.includes('requested: "見学希望受付"') &&
      visitFormat.includes('scheduled: "見学日時確定"') &&
      visitFormat.includes('completed: "見学完了"') &&
      visitFormat.includes('canceled: "キャンセル"'),
  );
  record(
    checks,
    "10. datetime uses formatInquiryDateTime",
    visitFormat.includes("formatInquiryDateTime"),
  );
  record(
    checks,
    "11. cancel dialog confirmation UI",
    visitDetailView.includes("VisitCancelDialog") &&
      visitDetailView.includes("見学をキャンセルする"),
  );
  record(
    checks,
    "12. double submit disabled while cancel pending",
    visitDetailView.includes("isSubmitting") &&
      read("src/features/visits/components/visit-cancel-dialog.tsx").includes("キャンセル中…"),
  );
  record(
    checks,
    "13. inquiry detail link",
    visitDetailView.includes("getBuyerInquiryDetailPath") &&
      visitDetailView.includes("問い合わせ詳細を見る"),
  );
  record(
    checks,
    "14. RPC errors mapped to Japanese",
    visitService.includes("mapCancelVisitRpcError") && !visitDetailView.includes("error.message"),
  );
  record(
    checks,
    "15. no Service Role in visits feature",
    !visitRepository.includes("SERVICE_ROLE") && !visitService.includes("SERVICE_ROLE"),
  );
  record(
    checks,
    "16. BY-09 screen id and heading",
    visitDetailView.includes("BUYER_VISIT_DETAIL_SCREEN_ID") &&
      visitDetailView.includes("見学詳細"),
  );
  record(
    checks,
    "17. displays preferred datetimes and scheduled_at",
    read("src/features/visits/components/visit-detail-summary.tsx").includes("第一希望") &&
      read("src/features/visits/components/visit-detail-summary.tsx").includes("確定日時"),
  );
  record(
    checks,
    "18. notFound for missing/unauthorized visit",
    visitPage.includes("notFound()") && visitLoaders.includes("if (!visit)"),
  );

  const failed = checks.filter((check) => !check.passed);

  console.log("");
  console.log(`Result: ${checks.length - failed.length} passed / ${failed.length} failed`);

  if (failed.length > 0) {
    process.exit(1);
  }
}

main();
