import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import type { InquiryListItem } from "../types";

type BuyerInquiryListCardProps = {
  item: InquiryListItem;
};

export function BuyerInquiryListCard({ item }: BuyerInquiryListCardProps) {
  const hasUnread = item.unreadBreederCount > 0;

  return (
    <Card className="overflow-hidden border-[var(--border)] bg-white shadow-sm transition hover:border-[var(--primary)]/30">
      <CardContent className="p-0">
        <div className="flex flex-col sm:flex-row">
          <div className="aspect-[16/10] w-full shrink-0 bg-neutral-100 sm:aspect-auto sm:w-36 sm:self-stretch">
            {item.mainPhotoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element -- signed URL from Supabase Storage
              <img
                src={item.mainPhotoUrl}
                alt={item.mainPhotoAlt}
                className="size-full object-cover"
              />
            ) : (
              <div className="flex size-full min-h-[120px] items-center justify-center text-sm text-neutral-400">
                写真なし
              </div>
            )}
          </div>

          <div className="flex min-w-0 flex-1 flex-col gap-3 p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0 space-y-1">
                <h2 className="truncate text-lg font-semibold text-neutral-900">
                  {item.publicDisplayName}
                </h2>
                {item.breederBusinessName ? (
                  <p className="text-sm text-neutral-600">{item.breederBusinessName}</p>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="rounded-full bg-neutral-100 text-neutral-700">
                  {item.statusLabel}
                </Badge>
                {hasUnread ? (
                  <Badge className="rounded-full bg-[var(--primary)] text-[var(--primary-foreground)]">
                    未読 {item.unreadBreederCount}件
                  </Badge>
                ) : null}
              </div>
            </div>

            <p className="text-xs text-neutral-500">最新: {item.lastActivityAtLabel}</p>

            <p
              className={cn(
                "line-clamp-2 text-sm leading-relaxed text-neutral-700",
                item.latestMessagePreview === "メッセージはありません" && "text-neutral-500",
              )}
            >
              {item.latestMessagePreview}
            </p>

            <div className="pt-1">
              <Button asChild className="h-10 w-full rounded-xl sm:w-auto">
                <Link href={item.detailHref}>詳細を見る</Link>
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
