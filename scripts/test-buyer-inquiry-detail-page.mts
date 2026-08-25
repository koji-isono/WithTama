/**
 * BY-06 buyer inquiry detail page static verification (no browser / no DB writes).
 *
 * Usage:
 *   npm run test:buyer-inquiry-detail-page
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

  const detailPage = read("src/app/(buyer)/buyer/inquiries/[inquiryId]/page.tsx");
  const detailView = read("src/features/inquiries/components/inquiry-detail-view.tsx");
  const replyForm = read("src/features/inquiries/components/inquiry-reply-form.tsx");
  const messageList = read("src/features/inquiries/components/inquiry-message-list.tsx");
  const loaders = read("src/features/inquiries/loaders.ts");
  const service = read("src/features/inquiries/service.ts");
  const repository = read("src/features/inquiries/repository.ts");
  const constants = read("src/features/inquiries/constants.ts");
  const format = read("src/features/inquiries/format.ts");

  record(
    checks,
    "17. BY-06 page uses loadInquiryDetailPage",
    detailPage.includes("loadInquiryDetailPage") && detailPage.includes("InquiryDetailView"),
  );
  record(
    checks,
    "18. loader verifies buyer ownership",
    loaders.includes("getInquiryByIdForBuyer") && repository.includes('.eq("buyer_id", buyerId)'),
  );
  record(
    checks,
    "19. messages ordered chronologically",
    repository.includes('order("created_at", { ascending: true })') &&
      messageList.includes("メッセージ履歴"),
  );
  record(
    checks,
    "20. sendInquiryMessageAction exists",
    service.includes("sendInquiryMessageAction") && replyForm.includes("sendInquiryMessageAction"),
  );
  record(
    checks,
    "21. empty message validation",
    replyForm.includes("validateInquiryMessage") && service.includes("validateInquiryMessage"),
  );
  record(
    checks,
    "22. max length validation shared",
    replyForm.includes("INQUIRY_MESSAGE_MAX_LENGTH") &&
      constants.includes("INQUIRY_MESSAGE_MAX_LENGTH = 2000"),
  );
  record(
    checks,
    "23. closed status blocks send",
    constants.includes('status === "closed"') &&
      service.includes("canBuyerSendInquiryMessage") &&
      replyForm.includes("canSendMessage"),
  );
  record(
    checks,
    "24. mark breeder unread as read on load",
    loaders.includes("markBreederMessagesAsReadForBuyer") &&
      repository.includes('eq("sender_type", "breeder")') &&
      repository.includes("is_read"),
  );
  record(
    checks,
    "25. read update targets breeder unread only",
    repository.includes("markBreederMessagesAsReadForBuyer") &&
      repository.includes('.eq("sender_type", "breeder")') &&
      repository.includes('.eq("is_read", false)'),
  );
  record(
    checks,
    "26. status labels in Japanese",
    format.includes("問い合わせ中") &&
      format.includes("返信あり") &&
      loaders.includes("getInquiryStatusLabel"),
  );
  record(
    checks,
    "27. buyer/breeder message visual distinction",
    messageList.includes("isOwnMessage") &&
      messageList.includes("justify-end") &&
      messageList.includes("justify-start"),
  );
  record(
    checks,
    "27b. BY-06 buyer message labels use buyer viewerRole",
    loaders.match(
      /loadInquiryDetailPage[\s\S]*getInquiryMessageSenderLabel\(row\.sender_type, \{ viewerRole: "buyer" \}\)/,
    ) != null,
  );
  record(
    checks,
    "28. refresh after reply (no Realtime)",
    replyForm.includes("router.refresh()") && !detailView.includes("Realtime"),
  );
  record(
    checks,
    "29. completed also blocks send",
    constants.includes('status === "completed"') &&
      constants.includes("canBuyerSendInquiryMessage"),
  );
  record(
    checks,
    "30. invalid inquiry id returns notFound",
    loaders.includes("isValidInquiryId") && detailPage.includes("notFound()"),
  );

  const failed = checks.filter((check) => !check.passed);

  console.log("");
  console.log(`Result: ${checks.length - failed.length} passed / ${failed.length} failed`);

  if (failed.length > 0) {
    process.exit(1);
  }
}

main();
