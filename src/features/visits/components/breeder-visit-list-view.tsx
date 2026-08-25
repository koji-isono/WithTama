import {
  BREEDER_VISIT_LIST_EMPTY_DESCRIPTION,
  BREEDER_VISIT_LIST_EMPTY_TITLE,
  BREEDER_VISIT_LIST_SCREEN_ID,
} from "../constants";
import type { BreederVisitsPageData } from "../types";
import { BreederVisitListCard } from "./breeder-visit-list-card";

type BreederVisitListViewProps = BreederVisitsPageData;

export function BreederVisitListView({ items }: BreederVisitListViewProps) {
  return (
    <div className="mx-auto max-w-4xl space-y-8 px-4 py-6 sm:py-10">
      <header className="space-y-2">
        <p className="text-xs font-semibold tracking-widest text-[var(--primary)]">
          {BREEDER_VISIT_LIST_SCREEN_ID}
        </p>
        <h1 className="text-2xl font-bold text-neutral-900 sm:text-3xl">見学管理</h1>
        <p className="text-sm leading-relaxed text-neutral-600 sm:text-base">
          購入希望者からの見学希望や確定した見学予定、完了・キャンセル済みの見学を確認できます。
        </p>
      </header>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-[var(--border)] bg-white p-6 text-center shadow-sm sm:p-8">
          <p className="text-base font-medium text-neutral-900">{BREEDER_VISIT_LIST_EMPTY_TITLE}</p>
          <p className="mt-2 text-sm leading-relaxed text-neutral-600">
            {BREEDER_VISIT_LIST_EMPTY_DESCRIPTION}
          </p>
        </div>
      ) : (
        <section className="grid gap-4" aria-label="見学管理一覧">
          {items.map((item) => (
            <BreederVisitListCard key={item.visitId} item={item} />
          ))}
        </section>
      )}
    </div>
  );
}
