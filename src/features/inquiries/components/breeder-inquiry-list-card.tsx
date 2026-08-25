import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import type { BreederInquiryListItem } from "../types";

type BreederInquiryListCardProps = {
  item: BreederInquiryListItem;
};

export function BreederInquiryListCard({ item }: BreederInquiryListCardProps) {
  const hasUnread = item.unreadBuyerCount > 0;

  return (
    <Card className="overflow-hidden border-[var(--border)] bg-white shadow-sm transition hover:border-[var(--primary)]/30">
      <CardContent className="space-y-3 p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 space-y-1">
            <h2 className="truncate text-lg font-semibold text-neutral-900">{item.petName}</h2>
            <p className="text-sm text-neutral-600">{item.buyerDisplayName} さん</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary" className="rounded-full bg-neutral-100 text-neutral-700">
              {item.statusLabel}
            </Badge>
            {hasUnread ? (
              <Badge className="rounded-full bg-[var(--primary)] text-[var(--primary-foreground)]">
                未読 {item.unreadBuyerCount}件
              </Badge>
            ) : null}
          </div>
        </div>

        <p className="text-xs text-neutral-500">最新: {item.lastActivityAtLabel}</p>

        <Button asChild className="h-10 w-full rounded-xl sm:w-auto">
          <Link href={item.detailHref}>詳細を見る</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
