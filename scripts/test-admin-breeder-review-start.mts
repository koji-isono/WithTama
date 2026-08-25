/**
 * AD-02 admin breeder review start action static verification.
 *
 * Usage:
 *   npm run test:admin-breeder-review-start
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

  const startAction = read("src/features/admin/components/admin-breeder-review-start-action.tsx");
  const detailView = read("src/features/admin/components/admin-breeder-review-detail.tsx");
  const service = read("src/features/admin/service.ts");
  const repository = read("src/features/admin/repository.ts");
  const constants = read("src/features/admin/constants.ts");
  const errors = read("src/features/admin/errors.ts");
  const validation = read("src/features/admin/validation.ts");

  const startableBlock =
    constants.match(
      /export const BREEDER_REVIEW_STARTABLE_STATUSES = \[([\s\S]*?)\] as const;/,
    )?.[1] ?? "";

  record(
    checks,
    "1. submitted shows start button",
    startableBlock.includes('"submitted"') &&
      startAction.includes("canStartBreederReview") &&
      startAction.includes("審査を開始する"),
  );
  record(
    checks,
    "2. under_review hides start button",
    startAction.includes("if (!canStartBreederReview(reviewStatus))") &&
      !startableBlock.includes("under_review"),
  );
  record(checks, "3. approved hides start button", !startableBlock.includes("approved"));
  record(checks, "4. rejected hides start button", !startableBlock.includes("rejected"));
  record(
    checks,
    "5. non-admin blocked in Server Action",
    service.match(/export async function startBreederReviewAction[\s\S]*requireAdmin\(\)/) != null,
  );
  record(
    checks,
    "6. start_breeder_review RPC call",
    repository.includes('rpc("start_breeder_review"') &&
      repository.includes("p_breeder_id: breederId"),
  );
  record(
    checks,
    "7. success revalidates AD-02 detail path",
    service.includes("revalidateAdminBreederReviewPaths") &&
      service.includes("revalidatePath(`${ADMIN_BREEDER_REVIEWS_PATH}/${breederId}`)"),
  );
  record(
    checks,
    "8. review_started label defined for history",
    constants.includes('review_started: "審査開始"') &&
      detailView.includes("AdminBreederReviewHistory"),
  );
  record(
    checks,
    "9. RPC error safe message",
    errors.includes("mapAdminBreederReviewRpcError") &&
      constants.includes("審査を開始できませんでした。状態を確認してもう一度お試しください。"),
  );
  record(
    checks,
    "10. double submit prevention",
    startAction.includes("isSubmitting") && startAction.includes("disabled={isSubmitting}"),
  );
  record(
    checks,
    "resubmission_required also startable per AD-02 design",
    startableBlock.includes('"resubmission_required"') &&
      constants.includes("canStartBreederReview"),
  );
  record(
    checks,
    "breederId validated server-side",
    service.includes("validateBreederIdForAdminReview") &&
      validation.includes("validateBreederIdForAdminReview"),
  );
  record(
    checks,
    "start action separate from approve/return/reject",
    startAction.includes("canStartBreederReview") &&
      !startAction.includes("approve_breeder_review") &&
      !startAction.includes("return_breeder_review") &&
      !startAction.includes("reject_breeder_review"),
  );
  record(
    checks,
    "no service role",
    !service.includes("createServiceRoleClient") && !repository.includes("createServiceRoleClient"),
  );

  const failed = checks.filter((check) => !check.passed);

  console.log("");
  console.log(`Result: ${checks.length - failed.length} passed / ${failed.length} failed`);

  if (failed.length > 0) {
    process.exit(1);
  }
}

main();
