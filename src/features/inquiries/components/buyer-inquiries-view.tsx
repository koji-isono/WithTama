import Link from "next/link";

import { Button } from "@/components/ui/button";
import { PUBLIC_PETS_PATH } from "@/features/pets/constants";

import { BUYER_INQUIRY_LIST_SCREEN_ID } from "../constants";
import type { BuyerInquiriesPageData } from "../types";
import { BuyerInquiryListCard } from "./buyer-inquiry-list-card";

type BuyerInquiriesViewProps = BuyerInquiriesPageData;

export function BuyerInquiriesView({ items }: BuyerInquiriesViewProps) {
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="text-xs font-semibold tracking-widest text-[var(--primary)]">
          {BUYER_INQUIRY_LIST_SCREEN_ID}
        </p>
        <h1 className="text-2xl font-bold text-neutral-900 sm:text-3xl">問い合わせ履歴</h1>
        <p className="text-sm leading-relaxed text-neutral-600 sm:text-base">
          ブリーダーとの問い合わせや見学に関するやり取りを確認できます。
        </p>
      </header>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-[var(--border)] bg-white p-6 text-center shadow-sm sm:p-8">
          <p className="text-base font-medium text-neutral-900">問い合わせはまだありません。</p>
          <p className="mt-2 text-sm leading-relaxed text-neutral-600">
            気になる犬猫を見つけたら、詳細ページからブリーダーへ問い合わせてみましょう。
          </p>
          <Button asChild className="mt-6 h-11 rounded-xl">
            <Link href={PUBLIC_PETS_PATH}>犬猫を探す</Link>
          </Button>
        </div>
      ) : (
        <section className="grid max-w-4xl gap-4" aria-label="問い合わせ一覧">
          {items.map((item) => (
            <BuyerInquiryListCard key={item.inquiryId} item={item} />
          ))}
        </section>
      )}
    </div>
  );
}
