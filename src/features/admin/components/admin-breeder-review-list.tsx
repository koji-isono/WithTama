import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import {
  ADMIN_BREEDER_REVIEW_EMPTY_MESSAGE,
  ADMIN_BREEDER_REVIEW_LIST_SCREEN_ID,
  getAdminBreederReviewDetailPath,
} from "../constants";
import type { AdminBreederReviewListItem } from "../types";

type AdminBreederReviewListProps = {
  items: AdminBreederReviewListItem[];
};

function ReviewStatusBadge({ status, label }: { status: string; label: string }) {
  const variant =
    status === "under_review"
      ? "default"
      : status === "resubmission_required"
        ? "destructive"
        : status === "submitted"
          ? "secondary"
          : "outline";

  return <Badge variant={variant}>{label}</Badge>;
}

function RegistrationExpiryDisplay({
  label,
  warning,
}: {
  label: string;
  warning: AdminBreederReviewListItem["registrationExpiryWarning"];
}) {
  if (warning === "expired") {
    return (
      <span className="inline-flex flex-wrap items-center gap-2">
        <span>{label}</span>
        <Badge variant="destructive">期限切れ</Badge>
      </span>
    );
  }

  if (warning === "soon") {
    return (
      <span className="inline-flex flex-wrap items-center gap-2">
        <span>{label}</span>
        <Badge className="border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-50">
          30日以内
        </Badge>
      </span>
    );
  }

  return <span>{label}</span>;
}

function AdminBreederReviewListItemCard({ item }: { item: AdminBreederReviewListItem }) {
  return (
    <Card className="overflow-hidden border-[var(--border)] bg-white shadow-sm">
      <CardContent className="space-y-4 p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg font-semibold text-neutral-900">{item.displayName}</h2>
              <ReviewStatusBadge status={item.reviewStatus} label={item.reviewStatusLabel} />
            </div>
            <p className="text-sm text-neutral-600">代表者: {item.representativeNameLabel}</p>
          </div>
          <Button asChild variant="outline" className="w-full shrink-0 rounded-full sm:w-auto">
            <Link href={getAdminBreederReviewDetailPath(item.id)}>詳細を見る</Link>
          </Button>
        </div>

        <dl className="grid gap-3 text-sm sm:grid-cols-2">
          <div className="space-y-1">
            <dt className="font-medium text-neutral-700">都道府県</dt>
            <dd className="text-neutral-600">{item.prefectureLabel}</dd>
          </div>
          <div className="space-y-1">
            <dt className="font-medium text-neutral-700">申請日時</dt>
            <dd className="text-neutral-600">{item.submittedAtLabel}</dd>
          </div>
          <div className="space-y-1">
            <dt className="font-medium text-neutral-700">本人確認状態</dt>
            <dd className="text-neutral-600">{item.identityVerificationStatusLabel}</dd>
          </div>
          <div className="space-y-1">
            <dt className="font-medium text-neutral-700">登録証確認状態</dt>
            <dd className="text-neutral-600">{item.businessVerificationStatusLabel}</dd>
          </div>
          <div className={cn("space-y-1 sm:col-span-2")}>
            <dt className="font-medium text-neutral-700">登録有効期限</dt>
            <dd className="text-neutral-600">
              <RegistrationExpiryDisplay
                label={item.registrationExpiresAtLabel}
                warning={item.registrationExpiryWarning}
              />
            </dd>
          </div>
        </dl>
      </CardContent>
    </Card>
  );
}

export function AdminBreederReviewList({ items }: AdminBreederReviewListProps) {
  return (
    <main className="mx-auto max-w-6xl px-4 py-12">
      <p className="text-xs font-semibold tracking-widest text-[var(--primary)]">
        {ADMIN_BREEDER_REVIEW_LIST_SCREEN_ID}
      </p>
      <h1 className="mt-2 text-3xl font-bold">ブリーダー審査一覧</h1>
      <p className="mt-3 text-neutral-600">
        審査待ち（申請済み・審査中・差戻し）のブリーダー申請を確認できます。
      </p>

      {items.length === 0 ? (
        <p className="mt-10 rounded-xl border border-dashed border-[var(--border)] bg-neutral-50/80 px-6 py-10 text-center text-neutral-600">
          {ADMIN_BREEDER_REVIEW_EMPTY_MESSAGE}
        </p>
      ) : (
        <ul className="mt-10 space-y-4">
          {items.map((item) => (
            <li key={item.id}>
              <AdminBreederReviewListItemCard item={item} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
