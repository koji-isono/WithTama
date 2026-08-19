/**
 * BY-01 buyer profile page static verification (no browser / no DB writes).
 *
 * Usage:
 *   npm run test:buyer-profile-page
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

  const buyerAuth = read("src/features/auth/buyer-auth.ts");
  const buyerLayout = read("src/app/(buyer)/buyer/layout.tsx");
  const profilePage = read("src/app/(buyer)/buyer/profile/page.tsx");
  const profileForm = read("src/features/buyers/components/buyer-profile-form.tsx");
  const loaders = read("src/features/buyers/loaders.ts");
  const service = read("src/features/buyers/service.ts");

  record(checks, "1. unauthenticated → /login", buyerAuth.includes('redirect("/login")'));
  record(
    checks,
    "2. buyer guard exports requireBuyer",
    buyerAuth.includes("export async function requireBuyer"),
  );
  record(checks, "3. breeder → /breeder", buyerAuth.includes('redirect("/breeder")'));
  record(checks, "4. admin → /admin", buyerAuth.includes('redirect("/admin")'));
  record(checks, "5. /buyer layout uses requireBuyer", buyerLayout.includes("requireBuyer"));

  record(
    checks,
    "6. profile page loads buyer profile data",
    profilePage.includes("loadBuyerProfilePageData") && profilePage.includes("BuyerProfileForm"),
  );

  record(
    checks,
    "7. email field is readOnly/disabled",
    profileForm.includes("readOnly") && profileForm.includes('id="email"'),
  );

  record(checks, "8. no buyer_id in form", !profileForm.includes('name="buyer_id"'));
  record(checks, "9. no user_id in form", !profileForm.includes('name="user_id"'));
  record(
    checks,
    "10. no profile_completed input",
    !profileForm.includes('name="profile_completed"'),
  );

  const requiredFields = ["full_name", "display_name", "phone", "prefecture", "city"];
  for (const field of requiredFields) {
    record(
      checks,
      `11. required field present: ${field}`,
      profileForm.includes(`name="${field}"`) || profileForm.includes(`id="${field}"`),
    );
  }

  record(
    checks,
    "12. prefecture select uses JAPAN_PREFECTURES",
    profileForm.includes("JAPAN_PREFECTURES"),
  );
  record(
    checks,
    "13. preferred_species options present",
    profileForm.includes("BUYER_PREFERRED_SPECIES_OPTIONS"),
  );
  record(
    checks,
    "14. validation error display (fieldErrors / formError)",
    profileForm.includes("fieldErrors") &&
      profileForm.includes("formError") &&
      profileForm.includes("error={fieldErrors"),
  );
  record(
    checks,
    "15. submitting disabled state",
    profileForm.includes("isSubmitting") && profileForm.includes("disabled={isSubmitting}"),
  );
  record(
    checks,
    "16. save success navigates to /buyer/dashboard",
    profileForm.includes('router.push("/buyer/dashboard")'),
  );

  record(
    checks,
    "17. loader uses Auth email (not buyers table)",
    loaders.includes("user.email") && !loaders.includes("profile.email"),
  );
  record(
    checks,
    "18. saveBuyerProfileAction used (no duplicate save logic)",
    profileForm.includes("saveBuyerProfileAction"),
  );
  record(
    checks,
    "19. service ignores client profile_completed",
    service.includes("parseBuyerProfileFormData") &&
      service.includes("buildUpdateBuyerProfileData"),
  );

  const passed = checks.filter((check) => check.passed).length;
  const failed = checks.length - passed;

  console.log("");
  console.log(`${passed} passed / ${failed} failed`);

  if (failed > 0) {
    process.exitCode = 1;
  }
}

main();
