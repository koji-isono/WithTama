import Link from "next/link";
import { ImageOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

import {
  ADMIN_PET_REVIEW_LIST_SCREEN_ID,
  ADMIN_PET_REVIEW_SUBMITTED_AT_UNKNOWN_LABEL,
  getAdminPetReviewDetailPath,
} from "../constants";
import { formatAdminPetReviewSubmittedAt } from "../format";
import type { AdminPetReviewListItem } from "../types";

type AdminPetReviewListProps = {
  items: AdminPetReviewListItem[];
};

function AdminPetReviewListItemCard({ item }: { item: AdminPetReviewListItem }) {
  const displayName = item.publicDisplayName?.trim() || "（公開表示名未設定）";
  const submittedLabel = item.submittedAt
    ? formatAdminPetReviewSubmittedAt(item.submittedAt)
    : ADMIN_PET_REVIEW_SUBMITTED_AT_UNKNOWN_LABEL;

  return (
    <Card className="overflow-hidden border-[var(--border)] bg-white shadow-sm">
      <div className="flex flex-col sm:flex-row">
        <div className="aspect-[4/3] w-full shrink-0 bg-neutral-100 sm:w-48">
          {item.mainPhotoSignedUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={item.mainPhotoSignedUrl}
              alt={displayName}
              className="size-full object-cover"
            />
          ) : (
            <div className="flex size-full flex-col items-center justify-center gap-2 text-neutral-400">
              <ImageOff className="size-8" aria-hidden />
              <span className="text-xs">写真なし</span>
            </div>
          )}
        </div>
        <CardContent className="flex flex-1 flex-col justify-between gap-4 p-4 sm:p-5">
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-neutral-900">{displayName}</h2>
            <dl className="grid gap-1 text-sm text-neutral-600">
              <div className="flex flex-wrap gap-x-2">
                <dt className="font-medium text-neutral-700">品種</dt>
                <dd>{item.breed}</dd>
              </div>
              <div className="flex flex-wrap gap-x-2">
                <dt className="font-medium text-neutral-700">ブリーダー</dt>
                <dd>{item.breederDisplayName}</dd>
              </div>
              <div className="flex flex-wrap gap-x-2">
                <dt className="font-medium text-neutral-700">申請日時</dt>
                <dd>{submittedLabel}</dd>
              </div>
            </dl>
          </div>
          <div className="flex justify-end">
            <Button asChild variant="outline" className="rounded-full">
              <Link href={getAdminPetReviewDetailPath(item.id)}>詳細を見る</Link>
            </Button>
          </div>
        </CardContent>
      </div>
    </Card>
  );
}

export function AdminPetReviewList({ items }: AdminPetReviewListProps) {
  return (
    <main className="mx-auto max-w-6xl px-4 py-12">
      <p className="text-xs font-semibold tracking-widest text-[var(--primary)]">
        {ADMIN_PET_REVIEW_LIST_SCREEN_ID}
      </p>
      <h1 className="mt-2 text-3xl font-bold">犬猫掲載審査一覧</h1>
      <p className="mt-3 text-neutral-600">
        審査待ち（under_review）の犬猫掲載申請を確認できます。
      </p>

      {items.length === 0 ? (
        <p className="mt-10 rounded-xl border border-dashed border-[var(--border)] bg-neutral-50/80 px-6 py-10 text-center text-neutral-600">
          審査待ちの犬猫はありません
        </p>
      ) : (
        <ul className="mt-10 space-y-4">
          {items.map((item) => (
            <li key={item.id}>
              <AdminPetReviewListItemCard item={item} />
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
