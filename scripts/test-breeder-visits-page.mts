/**
 * BR-14 breeder visits list page static verification (no browser / no DB writes).
 *
 * Usage:
 *   npm run test:breeder-visits-page
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

  const listPage = read("src/app/breeder/visits/page.tsx");
  const listView = read("src/features/visits/components/breeder-visit-list-view.tsx");
  const listCard = read("src/features/visits/components/breeder-visit-list-card.tsx");
  const loaders = read("src/features/visits/loaders.ts");
  const repository = read("src/features/visits/repository.ts");
  const format = read("src/features/visits/format.ts");
  const constants = read("src/features/visits/constants.ts");
  const breederAuth = read("src/features/auth/breeder-auth.ts");
  const inquiriesRepository = read("src/features/inquiries/repository.ts");
  const petsRepository = read("src/features/pets/repository.ts");
  const breederNav = read("src/components/layout/breeder-nav-items.ts");

  record(
    checks,
    "1. unauthenticated uses requireBreeder redirect",
    breederAuth.includes('redirect("/login")') && loaders.includes("requireBreeder()"),
  );
  record(
    checks,
    "2. BR-14 page uses loadBreederVisitsPageData",
    listPage.includes("loadBreederVisitsPageData") && listPage.includes("BreederVisitListView"),
  );
  record(
    checks,
    "3. URL /breeder/visits",
    constants.includes('BREEDER_VISIT_LIST_PATH = "/breeder/visits"') &&
      listPage.includes("loadBreederVisitsPageData"),
  );
  record(
    checks,
    "4. breeder visits filtered by breeder_id and deleted_at IS NULL",
    repository.includes("listVisitsForBreeder") &&
      repository.match(/listVisitsForBreeder[\s\S]*?\.eq\("breeder_id", breederId\)/) != null &&
      repository.match(/listVisitsForBreeder[\s\S]*?\.is\("deleted_at", null\)/) != null,
  );
  record(
    checks,
    "5. other breeder visits excluded via breeder_id on inquiries batch",
    inquiriesRepository.includes("listInquiriesByIdsForBreeder") &&
      inquiriesRepository.match(
        /listInquiriesByIdsForBreeder[\s\S]*?\.eq\("breeder_id", breederId\)/,
      ) != null,
  );
  record(
    checks,
    "6. buyer cannot use BR-14 loader",
    breederAuth.includes('memberRole === "buyer"') && breederAuth.includes('redirect("/buyer")'),
  );
  record(
    checks,
    "7. admin redirected away from breeder routes",
    breederAuth.includes('redirect("/admin")'),
  );
  record(
    checks,
    "8. empty state from BR-14 design",
    listView.includes("BREEDER_VISIT_LIST_EMPTY_TITLE") &&
      listView.includes("BREEDER_VISIT_LIST_EMPTY_DESCRIPTION") &&
      constants.includes("見学希望はまだありません"),
  );
  record(
    checks,
    "9. requested status label for breeder",
    format.includes('requested: "見学希望（要対応）"') && listCard.includes("statusLabel"),
  );
  record(checks, "10. scheduled status label", format.includes('scheduled: "見学予定"'));
  record(checks, "11. completed status label", format.includes('completed: "見学完了"'));
  record(checks, "12. canceled status label", format.includes('canceled: "キャンセル"'));
  record(
    checks,
    "13. pet info on card (photo, name, attribute)",
    listCard.includes("mainPhotoUrl") &&
      listCard.includes("publicDisplayName") &&
      listCard.includes("attributeLine"),
  );
  record(
    checks,
    "14. buyer display name only (no email/phone)",
    listCard.includes("buyerDisplayName") &&
      !listCard.includes("email") &&
      !listCard.includes("phone") &&
      !listCard.includes("address"),
  );
  record(
    checks,
    "15. buyer display name via RPC",
    loaders.includes("getInquiryBuyerDisplayNamesByIds") &&
      inquiriesRepository.includes('rpc("get_inquiry_buyer_display_name"'),
  );
  record(
    checks,
    "16. datetime labels for breeder list",
    format.includes('requested: "見学希望日時"') &&
      format.includes('scheduled: "確定日時"') &&
      format.includes("formatVisitListPrimaryDateTime"),
  );
  record(
    checks,
    "17. BR-15 link uses getBreederVisitDetailPath",
    listCard.includes("詳細を見る") &&
      loaders.includes("getBreederVisitDetailPath(visit.id)") &&
      constants.includes("getBreederVisitDetailPath"),
  );
  record(
    checks,
    "18. sort requested first then scheduled_at ASC",
    format.includes("sortBreederVisitsForList") &&
      loaders.includes("sortBreederVisitsForList(await listVisitsForBreeder"),
  );
  record(
    checks,
    "19. no Service Role in breeder visits loader",
    !loaders.includes("createAdminClient") && !loaders.includes("service_role"),
  );
  record(
    checks,
    "20. no new list RPC for visits",
    repository.match(/listVisitsForBreeder[\s\S]*?\.rpc\(/) == null &&
      repository.match(/listVisitsForBreeder[\s\S]*?\.from\("visits"\)/) != null,
  );
  record(
    checks,
    "21. pet summaries batch for breeder pets",
    loaders.includes("listPetCardSummariesForBreeder") &&
      petsRepository.includes("listPetCardSummariesForBreeder"),
  );
  record(
    checks,
    "22. dashboard/nav link to /breeder/visits",
    breederNav.includes('href: "/breeder/visits"') && breederNav.includes("見学"),
  );
  record(
    checks,
    "23. no schedule_visit / complete_visit UI on list",
    !listView.includes("schedule_visit") &&
      !listView.includes("complete_visit") &&
      !listCard.includes("schedule_visit") &&
      !listCard.includes("見学日時を確定"),
  );

  const failed = checks.filter((c) => !c.passed).length;
  console.log("");
  console.log(`Result: ${checks.length - failed} passed / ${failed} failed`);

  if (failed > 0) {
    process.exitCode = 1;
  }
}

main();
