import Link from "next/link";

import { Button } from "@/components/ui/button";
import { PUBLIC_PETS_PATH } from "@/features/pets/constants";

import {
  BUYER_VISIT_LIST_SCREEN_ID,
  VISIT_LIST_EMPTY_DESCRIPTION,
  VISIT_LIST_EMPTY_TITLE,
} from "../constants";
import type { BuyerVisitsPageData } from "../types";
import { VisitListCard } from "./visit-list-card";

type VisitListViewProps = BuyerVisitsPageData;

export function VisitListView({ items }: VisitListViewProps) {
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="text-xs font-semibold tracking-widest text-[var(--primary)]">
          {BUYER_VISIT_LIST_SCREEN_ID}
        </p>
        <h1 className="text-2xl font-bold text-neutral-900 sm:text-3xl">見学予定一覧</h1>
        <p className="text-sm leading-relaxed text-neutral-600 sm:text-base">
          見学希望や確定した見学予定、完了・キャンセル済みの見学を確認できます。
        </p>
      </header>

      {items.length === 0 ? (
        <div className="rounded-2xl border border-[var(--border)] bg-white p-6 text-center shadow-sm sm:p-8">
          <p className="text-base font-medium text-neutral-900">{VISIT_LIST_EMPTY_TITLE}</p>
          <p className="mt-2 text-sm leading-relaxed text-neutral-600">
            {VISIT_LIST_EMPTY_DESCRIPTION}
          </p>
          <Button asChild className="mt-6 h-11 rounded-xl">
            <Link href={PUBLIC_PETS_PATH}>犬猫を探す</Link>
          </Button>
        </div>
      ) : (
        <section className="grid max-w-4xl gap-4" aria-label="見学予定一覧">
          {items.map((item) => (
            <VisitListCard key={item.visitId} item={item} />
          ))}
        </section>
      )}
    </div>
  );
}
