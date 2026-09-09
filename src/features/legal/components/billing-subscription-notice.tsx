import Link from "next/link";

import { BREEDER_MONTHLY_FEE_TAX_INCLUSIVE_LABEL } from "../constants";

export function BillingSubscriptionNotice() {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-neutral-50/80 p-4 text-sm leading-relaxed text-neutral-700">
      <p className="font-medium text-neutral-900">お支払いについて</p>
      <ul className="mt-2 space-y-1">
        <li>{BREEDER_MONTHLY_FEE_TAX_INCLUSIVE_LABEL}</li>
        <li>毎月自動更新（解約まで継続）</li>
        <li>通常解約後も、支払済み期間終了までは原則利用可能</li>
        <li>通常解約は原則日割り返金なし</li>
      </ul>
      <p className="mt-3">
        <Link href="/terms" className="text-[var(--primary)] underline-offset-4 hover:underline">
          利用規約
        </Link>
        {" · "}
        <Link href="/legal" className="text-[var(--primary)] underline-offset-4 hover:underline">
          特定商取引法に基づく表記
        </Link>
      </p>
    </div>
  );
}
