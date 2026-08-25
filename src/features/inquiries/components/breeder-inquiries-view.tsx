import { BREEDER_INQUIRY_LIST_SCREEN_ID } from "../constants";
import type { BreederInquiriesPageData } from "../types";
import { BreederInquiryListCard } from "./breeder-inquiry-list-card";

type BreederInquiriesViewProps = BreederInquiriesPageData;

export function BreederInquiriesView({ items }: BreederInquiriesViewProps) {
  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-6 sm:py-10">
      <header className="space-y-2">
        <p className="text-xs font-semibold tracking-widest text-[var(--primary)]">
          {BREEDER_INQUIRY_LIST_SCREEN_ID}
        </p>
        <h1 className="text-2xl font-bold text-neutral-900 sm:text-3xl">問い合わせ</h1>
        <p className="text-sm leading-relaxed text-neutral-600 sm:text-base">
          購入希望者からの問い合わせを確認し、返信できます。
        </p>
      </header>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-[var(--border)] bg-white p-6 text-center shadow-sm sm:p-8">
          <p className="text-base font-medium text-neutral-900">問い合わせはまだありません。</p>
          <p className="mt-2 text-sm leading-relaxed text-neutral-600">
            購入希望者からの問い合わせが届くと、ここに表示されます。
          </p>
        </div>
      ) : (
        <section className="grid gap-4 sm:grid-cols-2" aria-label="問い合わせ一覧">
          {items.map((item) => (
            <BreederInquiryListCard key={item.inquiryId} item={item} />
          ))}
        </section>
      )}
    </div>
  );
}
