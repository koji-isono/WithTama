import { Card, CardContent } from "@/components/ui/card";

import type { BreederInquiryDetailPageSummary } from "../types";

type BreederInquiryDetailSummaryProps = {
  summary: BreederInquiryDetailPageSummary;
};

export function BreederInquiryDetailSummary({ summary }: BreederInquiryDetailSummaryProps) {
  return (
    <Card className="border-[var(--border)] bg-white shadow-sm">
      <CardContent className="space-y-3 p-5">
        <div className="space-y-1">
          <h2 className="text-xl font-bold text-neutral-900">{summary.petName}</h2>
          {summary.attributeLine ? (
            <p className="text-sm text-neutral-600">{summary.attributeLine}</p>
          ) : null}
        </div>

        <p className="text-sm text-neutral-700">
          <span className="font-medium text-neutral-800">購入希望者</span>
          <span className="ml-2">{summary.buyerDisplayName} さん</span>
        </p>

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
      </CardContent>
    </Card>
  );
}
