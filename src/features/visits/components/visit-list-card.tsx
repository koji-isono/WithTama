import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import type { VisitListItem } from "../types";

type VisitListCardProps = {
  item: VisitListItem;
};

function getStatusBadgeClassName(status: string): string {
  switch (status) {
    case "scheduled":
      return "bg-[var(--primary)]/10 text-[var(--primary)]";
    case "completed":
      return "bg-emerald-50 text-emerald-800";
    case "canceled":
      return "bg-neutral-100 text-neutral-600";
    case "requested":
    default:
      return "bg-amber-50 text-amber-800";
  }
}

export function VisitListCard({ item }: VisitListCardProps) {
  const isScheduled = item.status === "scheduled";

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
                {item.attributeLine ? (
                  <p className="text-sm text-neutral-600">{item.attributeLine}</p>
                ) : null}
                {item.breederBusinessName ? (
                  <p className="text-sm text-neutral-600">{item.breederBusinessName}</p>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge
                  variant="secondary"
                  className={cn("rounded-full", getStatusBadgeClassName(item.status))}
                >
                  {item.statusLabel}
                </Badge>
                <Badge variant="secondary" className="rounded-full bg-neutral-100 text-neutral-700">
                  {item.inquiryStatusLabel}
                </Badge>
              </div>
            </div>

            <p className="text-sm text-neutral-600">{item.statusHint}</p>

            <p
              className={cn(
                "text-sm text-neutral-700",
                isScheduled && "rounded-lg bg-[var(--primary)]/5 px-3 py-2 font-medium",
              )}
            >
              <span className="text-neutral-500">{item.dateTimeFieldLabel}: </span>
              <span className={cn(isScheduled && "text-[var(--primary)]")}>
                {item.dateTimeLabel}
              </span>
            </p>

            <div className="flex flex-col gap-2 pt-1 sm:flex-row sm:flex-wrap">
              <Button asChild className="h-10 w-full rounded-xl sm:w-auto">
                <Link href={item.detailHref}>詳細を見る</Link>
              </Button>
              <Button asChild variant="outline" className="h-10 w-full rounded-xl sm:w-auto">
                <Link href={item.inquiryDetailHref}>問い合わせを見る</Link>
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
