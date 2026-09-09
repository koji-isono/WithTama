/** Legal page paths (Decision No.154). */
export const LEGAL_TERMS_PATH = "/terms";
export const LEGAL_PRIVACY_PATH = "/privacy";
export const LEGAL_TOKUSHO_PATH = "/legal";
export const LEGAL_COMPANY_PATH = "/company";

export const LEGAL_DOCUMENT_LAST_UPDATED = "2026-09-09";

export const COMPANY_INFO = {
  serviceName: "WithTama",
  legalName: "株式会社システムサイエンス",
  representative: "磯野 幸治",
  postalCode: "860-0016",
  address: "熊本県熊本市中央区山崎町66番地",
  phone: "096-322-6311",
  businessHours: "9:00～17:30",
  email: "withtama@ssci.co.jp",
  website: "http://www.ssci.co.jp/",
  tagline: "出会ったその日から、命は家族になる。",
} as const;

/** Re-export billing label — single source of truth for breeder monthly fee display. */
export { BILLING_PLAN_PRICE_LABEL as BREEDER_MONTHLY_FEE_TAX_INCLUSIVE_LABEL } from "@/features/billing/billing-display";
