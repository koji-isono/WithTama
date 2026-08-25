/**
 * AD-01 admin breeder review list page static verification (no browser / no DB writes).
 *
 * Usage:
 *   npm run test:admin-breeder-reviews-page
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

  const listPage = read("src/app/(admin)/admin/breeders/reviews/page.tsx");
  const adminLayout = read("src/app/(admin)/admin/layout.tsx");
  const listView = read("src/features/admin/components/admin-breeder-review-list.tsx");
  const loaders = read("src/features/admin/loaders.ts");
  const repository = read("src/features/admin/repository.ts");
  const constants = read("src/features/admin/constants.ts");
  const format = read("src/features/admin/format.ts");
  const adminAuth = read("src/features/auth/admin-auth.ts");

  record(
    checks,
    "1. admin can access AD-01 via loader + page",
    listPage.includes("loadAdminBreederReviewListPageData") &&
      listPage.includes("AdminBreederReviewList"),
  );
  record(
    checks,
    "2. non-admin rejected via requireAdmin in layout",
    adminLayout.includes("requireAdmin()") && adminAuth.includes("redirect"),
  );
  record(
    checks,
    "3. submitted status in pending query",
    repository.includes('"submitted"') &&
      constants.includes('submitted: "申請済み"') &&
      listView.includes("reviewStatusLabel"),
  );
  record(
    checks,
    "4. under_review status in pending query",
    repository.includes('"under_review"') && constants.includes('under_review: "審査中"'),
  );
  record(
    checks,
    "5. resubmission_required status in pending query",
    repository.includes('"resubmission_required"') &&
      constants.includes('resubmission_required: "差戻し"'),
  );
  record(
    checks,
    "6. approved label defined (not in default list per AD-01)",
    constants.includes('approved: "承認済み"') &&
      !repository.match(/\.in\("review_status"[\s\S]*"approved"/),
  );
  record(
    checks,
    "7. rejected label defined (not in default list per AD-01)",
    constants.includes('rejected: "却下"') &&
      !repository.match(/\.in\("review_status"[\s\S]*"rejected"/),
  );
  record(
    checks,
    "8. Japanese status labels via BREEDER_REVIEW_STATUS_LABELS",
    constants.includes("BREEDER_REVIEW_STATUS_LABELS") &&
      listView.includes("ReviewStatusBadge") &&
      format.includes("formatAdminBreederReviewStatus"),
  );
  record(
    checks,
    "9. detail URL /admin/breeders/reviews/[breederId]",
    constants.includes('"/admin/breeders/reviews"') &&
      listView.includes("getAdminBreederReviewDetailPath"),
  );
  const pendingListBlock =
    repository.match(
      /export async function listPendingBreederReviewsForAdmin[\s\S]*?(?=export async function getLatestSubmittedAtByBreederIds)/,
    )?.[0] ?? "";

  record(
    checks,
    "10. no sensitive fields in repository select",
    !pendingListBlock.includes("phone") &&
      !pendingListBlock.includes("user_id") &&
      !pendingListBlock.includes("identity_document_path") &&
      !pendingListBlock.includes("business_license_path") &&
      !pendingListBlock.includes("address_line") &&
      !pendingListBlock.includes("public_email") &&
      !listView.includes("SignedUrl") &&
      !loaders.match(/loadAdminBreederReviewListPageData[\s\S]*createSigned/),
  );
  record(
    checks,
    "11. empty state message",
    listView.includes("ADMIN_BREEDER_REVIEW_EMPTY_MESSAGE") &&
      constants.includes("審査待ちのブリーダー申請はありません"),
  );
  record(
    checks,
    "12. registration_expires_at expiry warning display",
    format.includes("getRegistrationExpiryWarning") &&
      listView.includes("期限切れ") &&
      listView.includes("30日以内"),
  );
  record(
    checks,
    "13. no Select filter (AD-01 design has no filter)",
    !listView.includes("SelectTrigger") &&
      !listPage.includes("searchParams") &&
      loaders.match(/loadAdminBreederReviewListPageData[\s\S]*requireAdmin\(\)/) != null,
  );
  record(
    checks,
    "loader uses requireAdmin server-side",
    loaders.match(
      /export async function loadAdminBreederReviewListPageData[\s\S]*requireAdmin\(\)/,
    ) != null,
  );
  record(
    checks,
    "no service role in admin breeder review flow",
    !repository.includes("createServiceRoleClient") && !loaders.includes("createServiceRoleClient"),
  );

  const failed = checks.filter((check) => !check.passed);

  console.log("");
  console.log(`Result: ${checks.length - failed.length} passed / ${failed.length} failed`);

  if (failed.length > 0) {
    process.exit(1);
  }
}

main();
