import Link from "next/link";

import {
  COMPANY_INFO,
  LEGAL_COMPANY_PATH,
  LEGAL_PRIVACY_PATH,
  LEGAL_TERMS_PATH,
  LEGAL_TOKUSHO_PATH,
} from "@/features/legal/constants";

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-[var(--border)] bg-neutral-50">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:py-10">
        <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <Link href="/" className="text-lg font-bold text-neutral-900">
              {COMPANY_INFO.serviceName}
            </Link>
            <p className="max-w-sm text-sm leading-relaxed text-neutral-600">
              {COMPANY_INFO.tagline}
            </p>
          </div>
          <nav
            aria-label="法務・運営情報"
            className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm sm:grid-cols-1"
          >
            <Link
              href={LEGAL_TERMS_PATH}
              className="text-neutral-700 underline-offset-4 hover:text-[var(--primary)] hover:underline"
            >
              利用規約
            </Link>
            <Link
              href={LEGAL_PRIVACY_PATH}
              className="text-neutral-700 underline-offset-4 hover:text-[var(--primary)] hover:underline"
            >
              プライバシーポリシー
            </Link>
            <Link
              href={LEGAL_TOKUSHO_PATH}
              className="text-neutral-700 underline-offset-4 hover:text-[var(--primary)] hover:underline"
            >
              特定商取引法に基づく表記
            </Link>
            <Link
              href={LEGAL_COMPANY_PATH}
              className="text-neutral-700 underline-offset-4 hover:text-[var(--primary)] hover:underline"
            >
              運営会社
            </Link>
          </nav>
        </div>
        <p className="mt-8 text-xs text-neutral-500">
          © {year} {COMPANY_INFO.legalName}
        </p>
      </div>
    </footer>
  );
}
