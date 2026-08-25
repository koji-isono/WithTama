import { CalendarClock } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

import type { VisitRequestPagePetSummary } from "../types";

type VisitRequestSummaryCardProps = {
  pet: VisitRequestPagePetSummary;
};

export function VisitRequestSummaryCard({ pet }: VisitRequestSummaryCardProps) {
  return (
    <Card className="border-[var(--border)] bg-white shadow-sm">
      <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start">
        <div className="mx-auto aspect-square w-full max-w-[160px] shrink-0 overflow-hidden rounded-xl bg-neutral-100 sm:mx-0">
          {pet.mainPhotoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- signed URL from Supabase Storage
            <img src={pet.mainPhotoUrl} alt={pet.mainPhotoAlt} className="size-full object-cover" />
          ) : (
            <div className="flex size-full items-center justify-center text-sm text-neutral-500">
              写真なし
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-2 text-center sm:text-left">
          <p className="inline-flex items-center justify-center gap-1.5 text-sm font-medium text-[var(--primary)] sm:justify-start">
            <CalendarClock className="size-4" aria-hidden />
            見学希望の対象
          </p>
          <h2 className="text-xl font-bold text-neutral-900">{pet.publicDisplayName}</h2>
          {pet.attributeLine ? (
            <p className="text-sm text-neutral-600">{pet.attributeLine}</p>
          ) : null}
          {pet.breederBusinessName ? (
            <p className="text-sm text-neutral-700">
              <span className="font-medium text-neutral-800">ブリーダー</span>
              <span className="ml-2">{pet.breederBusinessName}</span>
            </p>
          ) : null}
          <p className="text-sm text-neutral-700">
            <span className="font-medium text-neutral-800">問い合わせ状態</span>
            <span className="ml-2">{pet.inquiryStatusLabel}</span>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
