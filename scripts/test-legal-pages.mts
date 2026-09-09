/**
 * Legal pages and signup consent static checks.
 *
 * Usage: npx tsx scripts/test-legal-pages.mts
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

type Check = { name: string; passed: boolean; detail?: string };

const root = join(import.meta.dirname, "..");
const checks: Check[] = [];

function read(relativePath: string): string {
  return readFileSync(join(root, relativePath), "utf8");
}

function record(name: string, passed: boolean, detail?: string): void {
  checks.push({ name, passed, detail });
  console.log(`${passed ? "PASS" : "FAIL"} ${name}${detail ? ` (${detail})` : ""}`);
}

const pages = [
  "src/app/(public)/terms/page.tsx",
  "src/app/(public)/privacy/page.tsx",
  "src/app/(public)/legal/page.tsx",
  "src/app/(public)/company/page.tsx",
];

for (const page of pages) {
  record(`${page} exists`, read(page).includes("LegalPageShell"));
}

const publicLayout = read("src/app/(public)/layout.tsx");
record("public layout includes SiteFooter", publicLayout.includes("SiteFooter"));

const authLayout = read("src/app/(auth)/layout.tsx");
record("auth layout includes SiteFooter", authLayout.includes("SiteFooter"));

const footer = read("src/components/layout/site-footer.tsx");
record(
  "footer links /terms",
  footer.includes("href={LEGAL_TERMS_PATH}") || footer.includes('"/terms"'),
);
record(
  "footer links /privacy",
  footer.includes("LEGAL_PRIVACY_PATH") || footer.includes('"/privacy"'),
);
record("footer links /legal", footer.includes("LEGAL_TOKUSHO_PATH") || footer.includes('"/legal"'));
record(
  "footer links /company",
  footer.includes("LEGAL_COMPANY_PATH") || footer.includes('"/company"'),
);
record(
  "footer company copyright",
  footer.includes("COMPANY_INFO.legalName") || footer.includes("株式会社システムサイエンス"),
);

const signup = read("src/app/(auth)/signup/page.tsx");
record("signup TermsConsentField", signup.includes("TermsConsentField"));
record(
  "signup consent required",
  signup.includes("termsAccepted") && signup.includes("!termsAccepted"),
);
record("signup links terms/privacy via component", signup.includes("@/features/legal"));

const billing = read("src/features/billing/components/breeder-billing-view.tsx");
record("billing BillingSubscriptionNotice", billing.includes("BillingSubscriptionNotice"));

const billingDisplay = read("src/features/billing/billing-display.ts");
record(
  "billing price label tax inclusive",
  billingDisplay.includes('BILLING_PLAN_PRICE_LABEL = "月額 5,000円（税込）"') &&
    !billingDisplay.includes("（税別）"),
);
record(
  "legal constants re-export billing price label",
  read("src/features/legal/constants.ts").includes(
    "BILLING_PLAN_PRICE_LABEL as BREEDER_MONTHLY_FEE_TAX_INCLUSIVE_LABEL",
  ),
);

const terms = read("src/features/legal/components/terms-content.tsx");
record("terms: not sales entity", terms.includes("販売主体ではありません"));
record("terms: no pet payment", terms.includes("犬猫代金を受領せず"));

const legalNotice = read("src/features/legal/components/legal-notice-content.tsx");
record(
  "legal: monthly fee tax inclusive",
  legalNotice.includes("BREEDER_MONTHLY_FEE_TAX_INCLUSIVE_LABEL") ||
    legalNotice.includes("5,000円（税込）"),
);
record("legal: pet sales separated", legalNotice.includes("犬猫の販売主体ではありません"));

const privacy = read("src/features/legal/components/privacy-content.tsx");
record("privacy: Supabase listed", privacy.includes("Supabase"));
record("privacy: Stripe listed", privacy.includes("Stripe"));
record(
  "privacy: Resend future not current",
  privacy.includes("現時点の本番コードでは個人情報送信に利用していません"),
);

const inquiry = read("src/features/inquiries/components/inquiry-new-form.tsx");
record("inquiry PrivacyPolicyNotice", inquiry.includes("PrivacyPolicyNotice"));

const visit = read("src/features/visits/components/visit-request-form.tsx");
record("visit PrivacyPolicyNotice", visit.includes("PrivacyPolicyNotice"));

const petPrice = read("src/features/pets/list-format.ts");
record("pet price still tax-exclusive", petPrice.includes("円（税抜）"));

const failed = checks.filter((c) => !c.passed).length;
console.log("");
console.log(`${checks.length - failed} passed / ${failed} failed`);
if (failed > 0) process.exitCode = 1;
