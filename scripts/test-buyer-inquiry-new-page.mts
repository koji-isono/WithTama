/**
 * BY-04 buyer inquiry new page static verification (no browser / no DB writes).
 *
 * Usage:
 *   npm run test:buyer-inquiry-new-page
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

  const inquiryPage = read("src/app/(buyer)/buyer/inquiries/new/page.tsx");
  const inquiryForm = read("src/features/inquiries/components/inquiry-new-form.tsx");
  const inquiryService = read("src/features/inquiries/service.ts");
  const inquiryRepository = read("src/features/inquiries/repository.ts");
  const inquiryLoaders = read("src/features/inquiries/loaders.ts");
  const inquiryStartButton = read("src/features/inquiries/components/inquiry-start-button.tsx");
  const petDetailPage = read("src/app/(public)/pets/[petId]/page.tsx");
  const petDetailView = read("src/features/pets/components/public-pet-detail-view.tsx");
  const buyerLayout = read("src/app/(buyer)/buyer/layout.tsx");

  record(
    checks,
    "1. BY-04 page uses loadInquiryNewPage",
    inquiryPage.includes("loadInquiryNewPage") && inquiryPage.includes("InquiryNewForm"),
  );
  record(checks, "2. buyer layout uses requireBuyer", buyerLayout.includes("requireBuyer"));
  record(
    checks,
    "3. service resolves buyer from auth (not client buyer_id)",
    inquiryService.includes("getBuyerProfileByUserId(user.id)") &&
      inquiryService.includes("resolveBuyerContextForInquiry") &&
      !inquiryService.includes("formData.get"),
  );
  record(
    checks,
    "4. service checks profile_completed",
    inquiryService.includes("profileCompleted") && inquiryLoaders.includes("profile_completed"),
  );
  record(
    checks,
    "5. service checks published pet",
    inquiryService.includes("getPublishedPetInquiryContext") &&
      inquiryService.includes("isPublishedPetListable") &&
      inquiryRepository.includes("published_pet_detail_public"),
  );
  record(
    checks,
    "6. service re-checks active inquiry before insert",
    inquiryService.includes("findActiveInquiryByBuyerAndPet") &&
      inquiryRepository.includes("ACTIVE_INQUIRY_STATUSES"),
  );
  record(
    checks,
    "7. server generates subject",
    inquiryService.includes("buildInquirySubject") &&
      !inquiryForm.includes('name="subject"') &&
      inquiryRepository.includes('status: "open"'),
  );
  record(
    checks,
    "8. creates inquiry + message + last_message_at",
    inquiryService.includes("insertInquiry") &&
      inquiryService.includes("insertInquiryMessage") &&
      inquiryService.includes("updateInquiryLastMessageAt"),
  );
  record(
    checks,
    "9. message failure soft-deletes inquiry",
    inquiryService.includes("softDeleteInquiry"),
  );
  record(
    checks,
    "10. forbids non-buyer roles in service",
    inquiryService.includes("INQUIRY_FORBIDDEN_ROLE_MESSAGE") &&
      inquiryService.includes('role !== "buyer"'),
  );
  record(
    checks,
    "11. PU-02 loads inquiry start state",
    petDetailPage.includes("loadInquiryStartUiState") &&
      petDetailView.includes("InquiryStartButton"),
  );
  record(checks, "12. guest inquiry CTA links to login", inquiryLoaders.includes('href: "/login"'));
  record(
    checks,
    "13. breeder/admin hidden on PU-02",
    inquiryLoaders.includes('status: "hidden"') && inquiryLoaders.includes("parseMemberUserRole"),
  );
  record(
    checks,
    "14. existing inquiry redirects to detail path",
    inquiryLoaders.includes("getBuyerInquiryDetailPath") &&
      inquiryForm.includes("getBuyerInquiryDetailPath"),
  );
  record(
    checks,
    "15. double submit disabled while pending",
    inquiryForm.includes("isSubmitting") && inquiryForm.includes("送信中..."),
  );
  record(
    checks,
    "16. inquiry start button label",
    inquiryStartButton.includes("ブリーダーに問い合わせる"),
  );
  record(
    checks,
    "17. textarea label and counter",
    inquiryForm.includes("お問い合わせ内容") && inquiryForm.includes("INQUIRY_MESSAGE_MAX_LENGTH"),
  );
  record(
    checks,
    "18. back link to pet detail",
    inquiryForm.includes("犬猫詳細へ戻る") && inquiryForm.includes("getPublicPetDetailPath"),
  );
  record(
    checks,
    "19. petId uuid validation in loader",
    inquiryLoaders.includes("isValidInquiryPetId"),
  );

  const failed = checks.filter((check) => !check.passed);

  console.log("");
  console.log(`Result: ${checks.length - failed.length} passed / ${failed.length} failed`);

  if (failed.length > 0) {
    process.exit(1);
  }
}

main();
