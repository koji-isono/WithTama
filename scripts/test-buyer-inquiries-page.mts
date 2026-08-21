/**
 * BY-05 buyer inquiries list page static verification (no browser / no DB writes).
 *
 * Usage:
 *   npm run test:buyer-inquiries-page
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

  const listPage = read("src/app/(buyer)/buyer/inquiries/page.tsx");
  const listView = read("src/features/inquiries/components/buyer-inquiries-view.tsx");
  const listCard = read("src/features/inquiries/components/buyer-inquiry-list-card.tsx");
  const loaders = read("src/features/inquiries/loaders.ts");
  const repository = read("src/features/inquiries/repository.ts");
  const dashboardMenu = read("src/features/buyers/dashboard-menu.ts");
  const detailView = read("src/features/inquiries/components/inquiry-detail-view.tsx");
  const buyerLayout = read("src/app/(buyer)/buyer/layout.tsx");

  record(
    checks,
    "1. BY-05 page uses loadBuyerInquiriesPageData",
    listPage.includes("loadBuyerInquiriesPageData") && listPage.includes("BuyerInquiriesView"),
  );
  record(checks, "2. buyer layout uses requireBuyer", buyerLayout.includes("requireBuyer"));
  record(
    checks,
    "3. loader uses requireBuyer and getBuyerProfileByUserId",
    loaders.includes("requireBuyer()") &&
      loaders.includes("getBuyerProfileByUserId(user.id)") &&
      loaders.includes("listInquiriesForBuyer(buyer.id)"),
  );
  record(
    checks,
    "4. inquiries filtered by buyer_id server-side",
    repository.includes('.eq("buyer_id", buyerId)') &&
      repository.includes('.is("deleted_at", null)'),
  );
  record(
    checks,
    "5. sort by last_message_at and created_at",
    repository.includes('order("last_message_at"') && repository.includes('order("created_at"'),
  );
  record(
    checks,
    "6. list query does not filter by status",
    repository.includes("listInquiriesForBuyer") &&
      !repository.match(/async function listInquiriesForBuyer[\s\S]*?\.in\("status"/),
  );
  record(
    checks,
    "7. batch latest messages (no per-inquiry loop query in loader)",
    loaders.includes("listLatestMessagesForInquiries") &&
      repository.includes("listLatestMessagesForInquiries"),
  );
  record(
    checks,
    "8. unread counts breeder only",
    repository.includes('eq("sender_type", "breeder")') &&
      repository.includes('eq("is_read", false)') &&
      listCard.includes("未読"),
  );
  record(
    checks,
    "9. BY-05 does not mark read on load",
    !loaders.match(
      /export async function loadBuyerInquiriesPageData[\s\S]*markBreederMessagesAsReadForBuyer/,
    ),
  );
  record(
    checks,
    "10. empty state with pets CTA",
    listView.includes("問い合わせはまだありません") && listView.includes("犬猫を探す"),
  );
  record(
    checks,
    "11. detail link to BY-06",
    listCard.includes("詳細を見る") && listCard.includes("detailHref"),
  );
  const inquiriesMenuBlock = dashboardMenu.match(/id: "inquiries"[\s\S]*?\n  },/)?.[0] ?? "";

  record(
    checks,
    "12. dashboard inquiries menu enabled",
    inquiriesMenuBlock.includes('href: "/buyer/inquiries"') &&
      inquiriesMenuBlock.includes('buttonLabel: "問い合わせ履歴を見る"') &&
      !inquiriesMenuBlock.includes("comingSoon"),
  );
  record(
    checks,
    "13. BY-06 back link to BY-05",
    detailView.includes("問い合わせ履歴へ戻る") && detailView.includes("BUYER_INQUIRY_LIST_PATH"),
  );
  record(
    checks,
    "14. message preview truncation",
    loaders.includes("truncateInquiryMessagePreview") &&
      loaders.includes("INQUIRY_MESSAGE_PREVIEW_MAX_LENGTH"),
  );
  record(
    checks,
    "15. list limit constant",
    repository.includes("INQUIRY_LIST_MAX_ITEMS") || loaders.includes("INQUIRY_LIST_MAX_ITEMS"),
  );
  record(
    checks,
    "16. status labels reused",
    listCard.includes("statusLabel") && loaders.includes("getInquiryStatusLabel"),
  );
  record(
    checks,
    "17. unpublished pet fallback via subject",
    loaders.includes("extractPetNameFromInquirySubject") &&
      loaders.includes("listPublishedPetsForPublicByIds"),
  );
  record(checks, "18. no message safe fallback", loaders.includes("メッセージはありません"));

  const failed = checks.filter((check) => !check.passed);

  console.log("");
  console.log(`Result: ${checks.length - failed.length} passed / ${failed.length} failed`);

  if (failed.length > 0) {
    process.exit(1);
  }
}

main();
