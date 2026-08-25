import { Card, CardContent } from "@/components/ui/card";

import type { VisitDetailPageSummary } from "../types";

type VisitDetailSummaryProps = {
  summary: VisitDetailPageSummary;
};

function DetailRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) {
    return null;
  }

  return (
    <p className="text-sm text-neutral-700">
      <span className="font-medium text-neutral-800">{label}</span>
      <span className="ml-2 break-words">{value}</span>
    </p>
  );
}

export function VisitDetailSummary({ summary }: VisitDetailSummaryProps) {
  return (
    <Card className="border-[var(--border)] bg-white shadow-sm">
      <CardContent className="flex flex-col gap-5 p-5 sm:flex-row sm:items-start">
        <div className="mx-auto aspect-square w-full max-w-[160px] shrink-0 overflow-hidden rounded-xl bg-neutral-100 sm:mx-0">
          {summary.mainPhotoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element -- signed URL from Supabase Storage
            <img
              src={summary.mainPhotoUrl}
              alt={summary.mainPhotoAlt}
              className="size-full object-cover"
            />
          ) : (
            <div className="flex size-full items-center justify-center text-sm text-neutral-500">
              写真なし
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-3">
          <div className="space-y-1">
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
          </div>

          <div className="inline-flex rounded-full bg-[var(--primary)]/10 px-3 py-1 text-sm font-medium text-[var(--primary)]">
            {summary.statusLabel}
          </div>

          <div className="space-y-2 border-t border-[var(--border)] pt-3">
            <DetailRow label="問い合わせ状態" value={summary.inquiryStatusLabel} />
            <DetailRow label="第一希望" value={summary.requestedAtLabel} />
            <DetailRow label="第二希望" value={summary.requestedAtSecondLabel} />
            <DetailRow label="第三希望" value={summary.requestedAtThirdLabel} />
            <DetailRow label="確定日時" value={summary.scheduledAtLabel} />
            <DetailRow label="申込日時" value={summary.createdAtLabel} />
            <DetailRow label="見学結果" value={summary.resultLabel} />
            <DetailRow label="現物確認" value={summary.animalConfirmedLabel} />
            <DetailRow label="対面説明" value={summary.explanationCompletedLabel} />
            <DetailRow label="完了日時" value={summary.completedAtLabel} />
            <DetailRow label="キャンセル日時" value={summary.canceledAtLabel} />
            <DetailRow label="キャンセル理由" value={summary.cancellationReason} />
          </div>

          {summary.requestMessage ? (
            <div className="space-y-1 border-t border-[var(--border)] pt-3">
              <p className="text-sm font-medium text-neutral-800">見学希望時のメッセージ</p>
              <p className="whitespace-pre-wrap break-words text-sm leading-relaxed text-neutral-700">
                {summary.requestMessage}
              </p>
            </div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
