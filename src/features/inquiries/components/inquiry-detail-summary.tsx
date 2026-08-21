import { Card, CardContent } from "@/components/ui/card";

import type { InquiryDetailPageSummary } from "../types";

type InquiryDetailSummaryProps = {
  summary: InquiryDetailPageSummary;
};

export function InquiryDetailSummary({ summary }: InquiryDetailSummaryProps) {
  return (
    <Card className="border-[var(--border)] bg-white shadow-sm">
      <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-start">
        <div className="mx-auto aspect-square w-full max-w-[120px] shrink-0 overflow-hidden rounded-xl bg-neutral-100 sm:mx-0">
          {summary.mainPhotoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- signed URL from Supabase Storage
            <img
              src={summary.mainPhotoUrl}
              alt={summary.mainPhotoAlt}
              className="size-full object-cover"
            />
          ) : (
            <div className="flex size-full items-center justify-center text-xs text-neutral-500">
              写真なし
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-2">
          <h2 className="text-xl font-bold text-neutral-900">{summary.publicDisplayName}</h2>
          {summary.attributeLine ? (
            <p className="text-sm text-neutral-600">{summary.attributeLine}</p>
          ) : null}
          {summary.breederBusinessName ? (
            <p className="text-sm text-neutral-700">
              <span className="font-medium text-neutral-800">ブリーダー</span>
              <span className="ml-2">{summary.breederBusinessName}</span>
            </p>
          ) : null}
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-neutral-600">
            <p>
              <span className="font-medium text-neutral-800">状態</span>
              <span className="ml-2">{summary.statusLabel}</span>
            </p>
            <p>
              <span className="font-medium text-neutral-800">開始</span>
              <span className="ml-2">{summary.createdAtLabel}</span>
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
