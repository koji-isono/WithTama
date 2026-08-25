/**
 * PU-02 / BY-06 visit navigation static verification (no browser / no DB writes).
 *
 * Usage:
 *   npm run test:visit-navigation
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

  const petPage = read("src/app/(public)/pets/[petId]/page.tsx");
  const petDetailView = read("src/features/pets/components/public-pet-detail-view.tsx");
  const visitLoaders = read("src/features/visits/loaders.ts");
  const visitConstants = read("src/features/visits/constants.ts");
  const visitStartButton = read("src/features/visits/components/visit-start-button.tsx");
  const inquiryLoaders = read("src/features/inquiries/loaders.ts");
  const inquiryDetailView = read("src/features/inquiries/components/inquiry-detail-view.tsx");
  const visitNavButton = read("src/features/visits/components/visit-navigation-button.tsx");

  record(
    checks,
    "1. PU-02 loads visit start state",
    petPage.includes("loadVisitStartUiState") && petDetailView.includes("VisitStartButton"),
  );
  record(
    checks,
    "2. PU-02 guest redirects to login with next",
    visitLoaders.includes("/login?next=") && visitLoaders.includes("getPublicPetDetailPath"),
  );
  record(
    checks,
    "3. PU-02 profile incomplete to BY-01",
    visitLoaders.includes('status: "profile_incomplete"') &&
      visitLoaders.includes('href: "/buyer/profile"'),
  );
  record(
    checks,
    "4. PU-02 no active inquiry to BY-04",
    visitLoaders.includes("getBuyerInquiryNewPath") &&
      visitLoaders.includes("findActiveInquiryByBuyerAndPet"),
  );
  record(
    checks,
    "5. PU-02 inquiry without visit uses resolveInquiryVisitNavigation",
    visitLoaders.includes("resolveInquiryVisitNavigation") &&
      visitLoaders.includes("getVisitIdByInquiryId"),
  );
  record(
    checks,
    "6. PU-02 visit exists routes to BY-09",
    visitConstants.includes("getBuyerVisitDetailPath") &&
      visitConstants.match(/if \(input\.visitId\)[\s\S]*kind: "detail"/) != null,
  );
  record(
    checks,
    "7. PU-02 non-buyer hidden",
    visitLoaders.includes('status: "hidden"') && visitLoaders.includes("parseMemberUserRole"),
  );
  record(
    checks,
    "8. BY-06 loader resolves visit navigation",
    inquiryLoaders.includes("getVisitIdByInquiryId") &&
      inquiryLoaders.includes("visitNavigation") &&
      inquiryLoaders.includes("resolveInquiryVisitNavigation"),
  );
  record(
    checks,
    "9. BY-06 shows request button for open/replied",
    visitConstants.includes('["open", "replied"]') &&
      visitNavButton.includes("navigation.label") &&
      visitConstants.includes('label: "見学を希望する"'),
  );
  record(
    checks,
    "10. BY-06 shows detail button when visit exists",
    inquiryDetailView.includes("VisitNavigationButton") &&
      visitConstants.match(/if \(input\.visitId\)[\s\S]*見学詳細を見る/) != null,
  );
  record(
    checks,
    "11. visit_requested not eligible for new request",
    visitConstants.includes("isVisitRequestEligibleInquiryStatus") &&
      !visitConstants.match(/visit_requested.*isVisitRequestEligible/s),
  );
  record(
    checks,
    "12. completed/closed return none without visit",
    visitConstants.match(/isVisitRequestEligibleInquiryStatus[\s\S]*return \{ kind: "none" \}/) !=
      null,
  );
  record(
    checks,
    "13. BY-06 ownership via getInquiryByIdForBuyer",
    inquiryLoaders.match(
      /loadInquiryDetailPage[\s\S]*getInquiryByIdForBuyer[\s\S]*visitNavigation/,
    ) != null,
  );
  record(
    checks,
    "14. uses getBuyerVisitNewPath (no hardcoded BY-07 URL)",
    visitConstants.includes("getBuyerVisitNewPath") &&
      !visitStartButton.includes("/buyer/visits/new?") &&
      !inquiryDetailView.includes("/buyer/visits/new?"),
  );
  record(
    checks,
    "15. no Service Role in navigation loaders",
    !visitLoaders.includes("SERVICE_ROLE") && !inquiryLoaders.includes("SERVICE_ROLE"),
  );
  record(
    checks,
    "16. no new RPC for visit existence check",
    !visitLoaders.match(/loadVisitStartUiState[\s\S]*supabase\.rpc/) &&
      !inquiryLoaders.match(/loadInquiryDetailPage[\s\S]*supabase\.rpc/),
  );

  const failed = checks.filter((check) => !check.passed);

  console.log("");
  console.log(`Result: ${checks.length - failed.length} passed / ${failed.length} failed`);

  if (failed.length > 0) {
    process.exit(1);
  }
}

main();
