/**
 * BR-12 breeder inquiries page static verification (no browser / no DB writes).
 *
 * Usage:
 *   npm run test:breeder-inquiries-page
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

  const listPage = read("src/app/breeder/inquiries/page.tsx");
  const detailPage = read("src/app/breeder/inquiries/[inquiryId]/page.tsx");
  const listView = read("src/features/inquiries/components/breeder-inquiries-view.tsx");
  const listCard = read("src/features/inquiries/components/breeder-inquiry-list-card.tsx");
  const detailView = read("src/features/inquiries/components/breeder-inquiry-detail-view.tsx");
  const replyForm = read("src/features/inquiries/components/inquiry-reply-form.tsx");
  const loaders = read("src/features/inquiries/loaders.ts");
  const repository = read("src/features/inquiries/repository.ts");
  const service = read("src/features/inquiries/service.ts");
  const breederAuth = read("src/features/auth/breeder-auth.ts");

  record(
    checks,
    "1. list page uses loadBreederInquiriesPageData",
    listPage.includes("loadBreederInquiriesPageData") && listPage.includes("BreederInquiriesView"),
  );
  record(
    checks,
    "2. detail page uses loadBreederInquiryDetailPage",
    detailPage.includes("loadBreederInquiryDetailPage") &&
      detailPage.includes("BreederInquiryDetailView"),
  );
  record(checks, "3. breeder-auth requireBreeder exists", breederAuth.includes("requireBreeder"));
  record(
    checks,
    "4. loader uses requireBreeder and breeder_id filter",
    loaders.includes("requireBreeder()") &&
      repository.includes("listInquiriesForBreeder") &&
      repository.includes('.eq("breeder_id", breederId)'),
  );
  record(
    checks,
    "5. deleted_at filter on breeder list",
    repository.match(/listInquiriesForBreeder[\s\S]*?\.is\("deleted_at", null\)/) != null,
  );
  record(
    checks,
    "6. sort by last_message_at and created_at",
    repository.match(/listInquiriesForBreeder[\s\S]*?order\("last_message_at"/) != null,
  );
  record(
    checks,
    "7. buyer display name via RPC only",
    repository.includes('rpc("get_inquiry_buyer_display_name"') &&
      !repository.includes("buyers") &&
      !service.includes('from("buyers")'),
  );
  record(
    checks,
    "8. no service role client",
    !repository.includes("createServiceRoleClient") &&
      !service.includes("createServiceRoleClient") &&
      !loaders.includes("createServiceRoleClient"),
  );
  record(
    checks,
    "9. unread buyer messages badge",
    repository.includes('eq("sender_type", "buyer")') &&
      listCard.includes("未読") &&
      repository.includes("countUnreadBuyerMessagesByInquiry"),
  );
  record(
    checks,
    "10. mark buyer unread read on detail open",
    loaders.match(
      /export async function loadBreederInquiryDetailPage[\s\S]*markBuyerMessagesAsReadForBreeder/,
    ) != null,
  );
  const listLoaderBlock =
    loaders.match(
      /export async function loadBreederInquiriesPageData[\s\S]*?(?=export async function loadBreederInquiryDetailPage)/,
    )?.[0] ?? "";

  record(
    checks,
    "11. list page does not mark read",
    !listLoaderBlock.includes("markBuyerMessagesAsReadForBreeder"),
  );
  record(
    checks,
    "12. sendBreederInquiryMessageAction exists",
    service.includes("sendBreederInquiryMessageAction") &&
      replyForm.includes("sendBreederInquiryMessageAction"),
  );
  record(
    checks,
    "13. breeder reply sets status replied on open",
    service.includes('inquiry.status === "open"') &&
      service.includes("updateInquiryStatusToReplied"),
  );
  record(
    checks,
    "14. closed/completed blocks breeder reply",
    service.includes("canBreederSendInquiryMessage") && replyForm.includes('role === "breeder"'),
  );
  record(
    checks,
    "15. double submit prevention",
    replyForm.includes("isSubmitting") && replyForm.includes("disabled={isSubmitting}"),
  );
  record(
    checks,
    "16. 2000 char limit",
    replyForm.includes("INQUIRY_MESSAGE_MAX_LENGTH") && service.includes("validateInquiryMessage"),
  );
  record(
    checks,
    "17. pet name from breeder pets table",
    repository.includes("listPetDisplayNamesForBreeder") &&
      repository.match(/from\("pets"\)/) != null,
  );
  record(checks, "18. empty state", listView.includes("問い合わせはまだありません"));
  record(
    checks,
    "19. back link to list",
    detailView.includes("問い合わせ一覧へ戻る") && detailView.includes("BREEDER_INQUIRY_LIST_PATH"),
  );
  record(
    checks,
    "20. message list chronological + role distinction",
    repository.includes('order("created_at", { ascending: true })') &&
      detailView.includes("InquiryMessageList"),
  );
  record(
    checks,
    "21. BR-12 buyer message labels use breeder viewerRole + display_name",
    loaders.match(
      /loadBreederInquiryDetailPage[\s\S]*getInquiryMessageSenderLabel\(row\.sender_type, \{[\s\S]*viewerRole: "breeder"[\s\S]*buyerDisplayName/,
    ) != null,
  );

  const failed = checks.filter((check) => !check.passed);

  console.log("");
  console.log(`Result: ${checks.length - failed.length} passed / ${failed.length} failed`);

  if (failed.length > 0) {
    process.exit(1);
  }
}

main();
