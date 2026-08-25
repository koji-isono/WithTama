/**
 * AD-02 admin breeder review detail page static verification (no browser / no DB writes).
 *
 * Usage:
 *   npm run test:admin-breeder-review-detail-page
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

  const detailPage = read("src/app/(admin)/admin/breeders/reviews/[breederId]/page.tsx");
  const adminLayout = read("src/app/(admin)/admin/layout.tsx");
  const detailView = read("src/features/admin/components/admin-breeder-review-detail.tsx");
  const loaders = read("src/features/admin/loaders.ts");
  const repository = read("src/features/admin/repository.ts");
  const constants = read("src/features/admin/constants.ts");
  const format = read("src/features/admin/format.ts");
  const adminAuth = read("src/features/auth/admin-auth.ts");

  record(
    checks,
    "1. admin can access AD-02 via loader + page",
    detailPage.includes("loadAdminBreederReviewDetailPageData") &&
      detailPage.includes("AdminBreederReviewDetail") &&
      detailPage.includes("notFound"),
  );
  record(
    checks,
    "2. non-admin rejected via requireAdmin",
    adminLayout.includes("requireAdmin()") &&
      adminAuth.includes("redirect") &&
      loaders.match(/loadAdminBreederReviewDetailPageData[\s\S]*requireAdmin\(\)/) != null,
  );
  record(
    checks,
    "3. breeder basic info displayed",
    detailView.includes("基本情報") &&
      detailView.includes("businessNameLabel") &&
      detailView.includes("representativeNameLabel") &&
      detailView.includes("phoneLabel"),
  );
  record(
    checks,
    "4. location displayed",
    detailView.includes("所在地") &&
      detailView.includes("postalCodeLabel") &&
      detailView.includes("addressLineLabel"),
  );
  record(
    checks,
    "5. animal handling registration info displayed",
    detailView.includes("第一種動物取扱業登録情報") &&
      detailView.includes("businessRegistrationNumberLabel"),
  );
  record(
    checks,
    "6. registration_expires_at displayed",
    detailView.includes("registrationExpiresAtLabel") &&
      loaders.includes("registrationExpiresAtLabel"),
  );
  record(
    checks,
    "7. expiry warning display",
    detailView.includes("期限切れ") &&
      detailView.includes("30日以内") &&
      format.includes("getRegistrationExpiryWarning"),
  );
  record(
    checks,
    "8. review_status Japanese labels",
    constants.includes('submitted: "申請済み"') && detailView.includes("reviewStatusLabel"),
  );
  record(
    checks,
    "9. verification status Japanese labels",
    detailView.includes("identityVerificationStatusLabel") &&
      format.includes("formatAdminVerificationStatus"),
  );
  record(
    checks,
    "10. membership_status displayed",
    detailView.includes("membershipStatusLabel") && format.includes("formatAdminMembershipStatus"),
  );
  record(
    checks,
    "11. identity document Signed URL generation",
    repository.includes("createBreederDocumentSignedUrlForAdmin") &&
      loaders.includes("buildBreederDocumentPreview") &&
      repository.includes("createSignedUrl"),
  );
  record(
    checks,
    "12. business license Signed URL generation",
    loaders.match(/buildBreederDocumentPreview[\s\S]*business_license_path/) != null,
  );
  record(
    checks,
    "13. storage path not shown in UI",
    !detailView.includes("identity_document_path") &&
      !detailView.includes("business_license_path") &&
      !detailView.includes("storagePath") &&
      !read("src/features/admin/types.ts").includes("identity_document_path") &&
      !read("src/features/admin/types.ts").includes("business_license_path"),
  );
  record(
    checks,
    "14. missing document path does not crash page",
    constants.includes("書類が未提出です") &&
      loaders.includes("ADMIN_BREEDER_DOCUMENT_MISSING_MESSAGE"),
  );
  record(
    checks,
    "15. Signed URL failure safe message",
    constants.includes("書類を表示できませんでした") && detailView.includes("document.message"),
  );
  record(
    checks,
    "16. breeder_review_logs displayed",
    detailView.includes("審査履歴") &&
      repository.includes("listBreederReviewLogsForAdmin") &&
      loaders.includes("reviewLogs"),
  );
  record(
    checks,
    "17. action Japanese labels",
    constants.includes('review_started: "審査開始"') &&
      format.includes("formatAdminBreederReviewLogAction"),
  );
  record(
    checks,
    "18. comment displayed",
    detailView.includes("log.comment") && detailView.includes("コメント"),
  );
  record(
    checks,
    "19. back link to AD-01",
    detailView.includes("ブリーダー審査一覧へ戻る") &&
      detailView.includes("ADMIN_BREEDER_REVIEWS_PATH"),
  );
  record(
    checks,
    "20. review actions wired on detail page",
    detailView.includes("AdminBreederReviewActions") &&
      detailView.includes("AdminBreederReviewStartAction") &&
      read("src/features/admin/components/admin-breeder-review-actions.tsx").includes("承認する") &&
      read("src/features/admin/components/admin-breeder-review-actions.tsx").includes("差戻す") &&
      read("src/features/admin/components/admin-breeder-review-actions.tsx").includes("却下する"),
  );
  record(
    checks,
    "no service role in AD-02 flow",
    !repository.includes("createServiceRoleClient") && !loaders.includes("createServiceRoleClient"),
  );
  record(
    checks,
    "Signed URL TTL is short-lived",
    constants.includes("BREEDER_DOCUMENT_SIGNED_URL_EXPIRES_SECONDS = 300"),
  );
  record(
    checks,
    "no actor_user_id UUID in UI",
    !detailView.includes("actorUserId") && !detailView.includes("actor_user_id"),
  );

  const failed = checks.filter((check) => !check.passed);

  console.log("");
  console.log(`Result: ${checks.length - failed.length} passed / ${failed.length} failed`);

  if (failed.length > 0) {
    process.exit(1);
  }
}

main();
