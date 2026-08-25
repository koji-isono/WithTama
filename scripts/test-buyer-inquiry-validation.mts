/**
 * BY-04 inquiry message validation tests (no DB).
 *
 * Usage:
 *   npm run test:buyer-inquiry-validation
 */

import {
  INQUIRY_MESSAGE_MAX_LENGTH,
  buildInquirySubject,
} from "../src/features/inquiries/constants";
import { getInquiryMessageSenderLabel } from "../src/features/inquiries/format";
import {
  hasInquiryMessageValidationErrors,
  isValidInquiryId,
  normalizeInquiryMessage,
  validateInquiryMessage,
} from "../src/features/inquiries/validation";

type Check = {
  name: string;
  passed: boolean;
  detail?: string;
};

const checks: Check[] = [];

function record(name: string, passed: boolean, detail?: string): void {
  checks.push({ name, passed, detail });
  const suffix = detail ? ` (${detail})` : "";
  console.log(`${passed ? "PASS" : "FAIL"} ${name}${suffix}`);
}

function main(): void {
  record("1. empty message → error", Boolean(validateInquiryMessage("").message));
  record("2. whitespace only → error", Boolean(validateInquiryMessage("   \n\t  ").message));
  record(
    "3. 2000 chars valid",
    !hasInquiryMessageValidationErrors(validateInquiryMessage("あ".repeat(2000))),
  );
  record("4. 2001 chars → error", Boolean(validateInquiryMessage("あ".repeat(2001)).message));
  record("5. normalize trims", normalizeInquiryMessage("  hello  ") === "hello");
  record(
    "6. subject with pet name",
    buildInquirySubject("テストちゃん") === "テストちゃんについてのお問い合わせ",
  );
  record("7. subject fallback", buildInquirySubject(null) === "犬猫についてのお問い合わせ");
  record("8. max length constant", INQUIRY_MESSAGE_MAX_LENGTH === 2000);
  record("9. valid inquiry uuid", isValidInquiryId("550e8400-e29b-41d4-a716-446655440000"));
  record("10. invalid inquiry uuid", !isValidInquiryId("not-a-uuid"));
  record(
    "11. buyer view: own message label",
    getInquiryMessageSenderLabel("buyer", { viewerRole: "buyer" }) === "あなた",
  );
  record(
    "12. buyer view: breeder message label",
    getInquiryMessageSenderLabel("breeder", { viewerRole: "buyer" }) === "ブリーダー",
  );
  record(
    "13. breeder view: buyer message with display_name",
    getInquiryMessageSenderLabel("buyer", {
      viewerRole: "breeder",
      buyerDisplayName: "テスト太郎",
    }) === "テスト太郎",
  );
  record(
    "14. breeder view: buyer message fallback",
    getInquiryMessageSenderLabel("buyer", { viewerRole: "breeder" }) === "購入希望者",
  );
  record(
    "15. breeder view: own message label",
    getInquiryMessageSenderLabel("breeder", { viewerRole: "breeder" }) === "あなた",
  );

  const failed = checks.filter((check) => !check.passed);

  console.log("");
  console.log(`Result: ${checks.length - failed.length} passed / ${failed.length} failed`);

  if (failed.length > 0) {
    process.exit(1);
  }
}

main();
