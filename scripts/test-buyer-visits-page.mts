/**
 * BY-08 buyer visits list page static verification (no browser / no DB writes).
 *
 * Usage:
 *   npm run test:buyer-visits-page
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

  const listPage = read("src/app/(buyer)/buyer/visits/page.tsx");
  const listView = read("src/features/visits/components/visit-list-view.tsx");
  const listCard = read("src/features/visits/components/visit-list-card.tsx");
  const loaders = read("src/features/visits/loaders.ts");
  const repository = read("src/features/visits/repository.ts");
  const format = read("src/features/visits/format.ts");
  const constants = read("src/features/visits/constants.ts");
  const dashboardMenu = read("src/features/buyers/dashboard-menu.ts");
  const buyerLayout = read("src/app/(buyer)/buyer/layout.tsx");
  const inquiriesRepository = read("src/features/inquiries/repository.ts");

  record(
    checks,
    "1. BY-08 page uses loadBuyerVisitsPageData",
    listPage.includes("loadBuyerVisitsPageData") && listPage.includes("VisitListView"),
  );
  record(checks, "2. buyer layout uses requireBuyer", buyerLayout.includes("requireBuyer"));
  record(
    checks,
    "3. URL /buyer/visits",
    constants.includes('BUYER_VISIT_LIST_PATH = "/buyer/visits"') &&
      listPage.includes("loadBuyerVisitsPageData"),
  );
  record(
    checks,
    "4. loader uses requireBuyer and listVisitsForBuyer(buyer.id)",
    loaders.includes("requireBuyer()") &&
      loaders.includes("listVisitsForBuyer(buyer.id)") &&
      loaders.includes("getBuyerProfileByUserId(user.id)"),
  );
  record(
    checks,
    "5. visits filtered by buyer_id and deleted_at IS NULL",
    repository.includes('.eq("buyer_id", buyerId)') &&
      repository.includes('.is("deleted_at", null)') &&
      repository.includes("listVisitsForBuyer"),
  );
  record(
    checks,
    "6. sort order scheduled_at NULLS LAST, requested_at, created_at",
    repository.includes('order("scheduled_at"') &&
      repository.includes("nullsFirst: false") &&
      repository.includes('order("requested_at"') &&
      repository.includes('order("created_at"'),
  );
  record(
    checks,
    "7. inquiries batch loaded by buyer_id",
    loaders.includes("listInquiriesByIdsForBuyer") &&
      inquiriesRepository.includes("listInquiriesByIdsForBuyer") &&
      inquiriesRepository.includes('.eq("buyer_id", buyerId)'),
  );
  record(
    checks,
    "8. visit status labels shared with BY-09",
    format.includes('requested: "見学希望受付"') &&
      format.includes('scheduled: "見学日時確定"') &&
      listCard.includes("statusLabel"),
  );
  record(
    checks,
    "9. datetime by status (scheduled_at / requested_at / completed / canceled)",
    format.includes("formatVisitListPrimaryDateTime") &&
      format.includes('case "scheduled"') &&
      format.includes('case "requested"'),
  );
  record(
    checks,
    "10. empty state from BY-08 design",
    listView.includes("VISIT_LIST_EMPTY_TITLE") &&
      listView.includes("VISIT_LIST_EMPTY_DESCRIPTION") &&
      listView.includes("犬猫を探す") &&
      constants.includes("見学予定はまだありません"),
  );
  record(
    checks,
    "11. detail link uses getBuyerVisitDetailPath",
    listCard.includes("詳細を見る") &&
      loaders.includes("getBuyerVisitDetailPath(visit.id)") &&
      constants.includes("getBuyerVisitDetailPath"),
  );
  record(
    checks,
    "12. pet photo name breeder on card",
    listCard.includes("mainPhotoUrl") &&
      listCard.includes("publicDisplayName") &&
      listCard.includes("breederBusinessName") &&
      listCard.includes("attributeLine"),
  );
  record(
    checks,
    "13. inquiry status label on card",
    listCard.includes("inquiryStatusLabel") && loaders.includes("getInquiryStatusLabel"),
  );
  record(
    checks,
    "14. status hints for requested/scheduled/completed/canceled",
    format.includes("VISIT_LIST_STATUS_HINTS") &&
      format.includes("ブリーダーからの日程確定をお待ちください"),
  );
  record(
    checks,
    "15. dashboard visits menu enabled",
    (() => {
      const block = dashboardMenu.match(/id: "visits"[\s\S]*?\n  },/)?.[0] ?? "";
      return (
        block.includes('href: "/buyer/visits"') &&
        block.includes("見学予定を見る") &&
        !block.includes("comingSoon")
      );
    })(),
  );
  record(
    checks,
    "16. no Service Role in visits feature",
    !repository.includes("SERVICE_ROLE") && !loaders.includes("SERVICE_ROLE"),
  );
  record(
    checks,
    "17. no new RPC for list",
    !repository.match(/listVisitsForBuyer[\s\S]*supabase\.rpc/) &&
      repository.includes('.from("visits")'),
  );
  record(
    checks,
    "18. BY-08 screen id and heading",
    listView.includes("BUYER_VISIT_LIST_SCREEN_ID") &&
      listView.includes("見学予定一覧") &&
      constants.includes('BUYER_VISIT_LIST_SCREEN_ID = "BY-08"'),
  );

  const failed = checks.filter((check) => !check.passed);

  console.log("");
  console.log(`Result: ${checks.length - failed.length} passed / ${failed.length} failed`);

  if (failed.length > 0) {
    process.exit(1);
  }
}

main();
