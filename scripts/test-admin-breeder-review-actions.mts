/**
 * AD-02 admin breeder review actions (approve / return / reject) static verification.
 *
 * Usage:
 *   npm run test:admin-breeder-review-actions
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

  const actions = read("src/features/admin/components/admin-breeder-review-actions.tsx");
  const detailView = read("src/features/admin/components/admin-breeder-review-detail.tsx");
  const service = read("src/features/admin/service.ts");
  const repository = read("src/features/admin/repository.ts");
  const constants = read("src/features/admin/constants.ts");
  const errors = read("src/features/admin/errors.ts");
  const validation = read("src/features/admin/validation.ts");
  const migration = read("supabase/migrations/20260825120000_create_breeder_review_admin_rpcs.sql");
  const format = read("src/features/admin/format.ts");

  record(
    checks,
    "1. under_review shows review actions UI",
    actions.includes("canPerformBreederReviewActions") &&
      constants.includes('BREEDER_REVIEW_ACTIONABLE_STATUS = "under_review"') &&
      detailView.includes("AdminBreederReviewActions"),
  );
  record(
    checks,
    "2. submitted hides review actions UI",
    actions.includes("if (!canPerformBreederReviewActions(reviewStatus))") &&
      constants.match(
        /export function canPerformBreederReviewActions[\s\S]*?return reviewStatus === BREEDER_REVIEW_ACTIONABLE_STATUS/,
      ) != null &&
      constants.includes('BREEDER_REVIEW_ACTIONABLE_STATUS = "under_review"'),
  );
  record(
    checks,
    "3. approved hides review actions UI",
    actions.includes("canPerformBreederReviewActions") &&
      !constants.includes(
        'canPerformBreederReviewActions(reviewStatus) {\n  return reviewStatus === "approved"',
      ),
  );
  record(
    checks,
    "4. rejected hides review actions UI",
    actions.includes("canPerformBreederReviewActions") &&
      constants.includes("reviewStatus === BREEDER_REVIEW_ACTIONABLE_STATUS"),
  );
  record(
    checks,
    "5. resubmission_required hides review actions UI",
    !constants.match(/BREEDER_REVIEW_ACTIONABLE_STATUSES/) &&
      constants.includes('BREEDER_REVIEW_ACTIONABLE_STATUS = "under_review"'),
  );
  record(
    checks,
    "6. approve RPC call",
    repository.includes('rpc("approve_breeder_review"') &&
      repository.includes("p_breeder_id: breederId"),
  );
  record(
    checks,
    "7. approved status label exists for post-approve display",
    constants.includes('approved: "承認済み"') && detailView.includes("reviewStatusLabel"),
  );
  record(
    checks,
    "8. verification verified labels for post-approve display",
    format.includes('verified: "確認済み"') &&
      detailView.includes("identityVerificationStatusLabel") &&
      detailView.includes("businessVerificationStatusLabel"),
  );
  record(
    checks,
    "9. approved_at displayed on detail",
    detailView.includes("承認日時") && detailView.includes("approvedAtLabel"),
  );
  record(
    checks,
    "10. approve does not change membership_status in service",
    !service.match(/approveBreederReviewAction[\s\S]*membership_status/) &&
      !repository.match(/approveBreederReviewViaRpc[\s\S]*membership/) &&
      !migration.match(/approve_breeder_review[\s\S]*membership_status\s*=/) &&
      migration.includes("membership_status"),
  );
  record(
    checks,
    "11. return blocked without comment (client)",
    actions.includes("canSubmitReturn") &&
      actions.includes("disabled={isBusy || !canSubmitReturn}") &&
      actions.includes("差戻し理由を入力してください。"),
  );
  record(
    checks,
    "12. return blocked with whitespace-only comment (client)",
    actions.includes("returnComment.trim().length > 0"),
  );
  record(
    checks,
    "13. return RPC call",
    repository.includes('rpc("return_breeder_review"') && repository.includes("p_comment: comment"),
  );
  record(
    checks,
    "14. resubmission_required label for post-return display",
    constants.includes('resubmission_required: "差戻し"') &&
      detailView.includes("reviewStatusLabel"),
  );
  record(
    checks,
    "15. returned log label + comment display",
    constants.includes('returned: "差戻し"') &&
      detailView.includes("log.comment") &&
      detailView.includes("コメント"),
  );
  record(
    checks,
    "16. reject blocked without comment (client)",
    actions.includes("canSubmitReject") &&
      actions.includes("disabled={isBusy || !canSubmitReject}") &&
      actions.includes("却下理由を入力してください。"),
  );
  record(
    checks,
    "17. reject RPC call",
    repository.includes('rpc("reject_breeder_review"') && repository.includes("p_comment: comment"),
  );
  record(
    checks,
    "18. rejected status label for post-reject display",
    constants.includes('rejected: "却下"') && detailView.includes("reviewStatusLabel"),
  );
  record(
    checks,
    "19. rejected log label + comment display",
    constants.includes('rejected: "却下"') &&
      detailView.includes("log.comment") &&
      constants.includes("BREEDER_REVIEW_LOG_ACTION_LABELS"),
  );
  record(
    checks,
    "20. non-admin blocked in Server Actions",
    service.match(/export async function approveBreederReviewAction[\s\S]*requireAdmin\(\)/) !=
      null &&
      service.match(/export async function returnBreederReviewAction[\s\S]*requireAdmin\(\)/) !=
        null &&
      service.match(/export async function rejectBreederReviewAction[\s\S]*requireAdmin\(\)/) !=
        null,
  );
  record(
    checks,
    "21. RPC internal errors not shown raw to user",
    errors.includes("mapAdminBreederReviewRpcError") &&
      constants.includes("承認できませんでした。申請内容と登録期限を確認してください。") &&
      constants.includes("差戻しできませんでした。状態を確認してもう一度お試しください。") &&
      constants.includes("却下できませんでした。状態を確認してもう一度お試しください。") &&
      !actions.includes("Postgres") &&
      !actions.includes("Supabase"),
  );
  record(
    checks,
    "22. double submit prevention",
    actions.includes("isApproving") &&
      actions.includes("isReturning") &&
      actions.includes("isRejecting") &&
      actions.includes("disabled={isBusy") &&
      actions.includes("処理中..."),
  );
  record(
    checks,
    "return comment validated server-side",
    service.includes('validateBreederReviewActionComment(comment, "差戻し理由")') &&
      validation.includes("validateBreederReviewActionComment"),
  );
  record(
    checks,
    "reject comment validated server-side",
    service.includes('validateBreederReviewActionComment(comment, "却下理由")'),
  );
  record(
    checks,
    "approve confirm dialog",
    actions.includes("ADMIN_BREEDER_REVIEW_APPROVE_CONFIRM_MESSAGE") &&
      actions.includes("ADMIN_BREEDER_REVIEW_APPROVE_CONFIRM_NOTE") &&
      actions.includes("承認する"),
  );
  record(
    checks,
    "reject uses destructive variant",
    actions.includes('variant="destructive"') && actions.includes("却下する"),
  );
  record(
    checks,
    "legal notice displayed",
    actions.includes("ADMIN_BREEDER_REVIEW_LEGAL_NOTICE") &&
      constants.includes("書類内容の最終判断については"),
  );
  record(
    checks,
    "revalidate AD-01 and AD-02 after actions",
    service.includes("revalidateAdminBreederReviewPaths") &&
      service.match(/approveBreederReviewAction[\s\S]*revalidateAdminBreederReviewPaths/) != null,
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
