import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft, ImageOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { ADMIN_PET_REVIEW_DETAIL_SCREEN_ID, ADMIN_PET_REVIEWS_PATH } from "../constants";
import { formatAdminNullableText } from "../format";
import type { AdminPetReviewDetailPageData } from "../types";
import { AdminPetReviewActions } from "./admin-pet-review-actions";

type AdminPetReviewDetailProps = {
  data: AdminPetReviewDetailPageData;
};

type DetailFieldProps = {
  label: string;
  value: string;
  multiline?: boolean;
};

function DetailField({ label, value, multiline = false }: DetailFieldProps) {
  return (
    <div className="grid gap-1 sm:grid-cols-[10rem_1fr] sm:gap-4">
      <dt className="text-sm font-medium text-neutral-700">{label}</dt>
      <dd
        className={
          multiline ? "whitespace-pre-wrap text-sm text-neutral-600" : "text-sm text-neutral-600"
        }
      >
        {value}
      </dd>
    </div>
  );
}

function DetailSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Card className="border-[var(--border)] bg-white shadow-sm">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="space-y-3">{children}</dl>
      </CardContent>
    </Card>
  );
}

function AdminPetReviewPhotos({ photos }: { photos: AdminPetReviewDetailPageData["photos"] }) {
  if (photos.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-[var(--border)] bg-neutral-50/80 px-6 py-10 text-neutral-500">
        <ImageOff className="size-8" aria-hidden />
        <p className="text-sm">登録されている写真はありません</p>
      </div>
    );
  }

  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {photos.map((photo) => (
        <li
          key={photo.id}
          className={
            photo.isMain
              ? "overflow-hidden rounded-xl border-2 border-[var(--primary)] bg-white shadow-sm sm:col-span-2 lg:col-span-1"
              : "overflow-hidden rounded-xl border border-[var(--border)] bg-white shadow-sm"
          }
        >
          <div className="aspect-[4/3] bg-neutral-100">
            {photo.signedUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={photo.signedUrl}
                alt={photo.altText?.trim() || "犬猫の写真"}
                className="size-full object-cover"
              />
            ) : (
              <div className="flex size-full flex-col items-center justify-center gap-2 text-neutral-400">
                <ImageOff className="size-8" aria-hidden />
                <span className="text-xs">表示不可</span>
              </div>
            )}
          </div>
          <div className="flex items-center justify-between px-3 py-2 text-xs text-neutral-600">
            <span>表示順 {photo.displayOrder + 1}</span>
            {photo.isMain ? (
              <span className="rounded-full bg-[var(--primary)] px-2 py-0.5 font-medium text-white">
                メイン写真
              </span>
            ) : null}
          </div>
        </li>
      ))}
    </ul>
  );
}

function AdminPetReviewHistory({
  reviewLogs,
}: {
  reviewLogs: AdminPetReviewDetailPageData["reviewLogs"];
}) {
  if (reviewLogs.length === 0) {
    return <p className="text-sm text-neutral-600">審査履歴はまだありません。</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[640px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-[var(--border)] text-left text-neutral-700">
            <th className="px-3 py-2 font-medium">日時</th>
            <th className="px-3 py-2 font-medium">操作</th>
            <th className="px-3 py-2 font-medium">コメント</th>
            <th className="px-3 py-2 font-medium">操作者 ID</th>
          </tr>
        </thead>
        <tbody>
          {reviewLogs.map((log) => (
            <tr key={log.id} className="border-b border-[var(--border)] last:border-b-0">
              <td className="px-3 py-3 align-top text-neutral-600">{log.createdAtLabel}</td>
              <td className="px-3 py-3 align-top text-neutral-900">{log.actionLabel}</td>
              <td className="px-3 py-3 align-top whitespace-pre-wrap text-neutral-600">
                {formatAdminNullableText(log.comment)}
              </td>
              <td className="px-3 py-3 align-top font-mono text-xs text-neutral-500">
                {log.actorUserId}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function AdminPetReviewDetail({ data }: AdminPetReviewDetailProps) {
  const displayName = data.pet.publicDisplayName?.trim() || "（公開表示名未設定）";

  return (
    <main className="mx-auto max-w-6xl px-4 py-12">
      <div className="mb-8">
        <Button asChild variant="ghost" size="sm" className="-ml-2 mb-4 rounded-full">
          <Link href={ADMIN_PET_REVIEWS_PATH}>
            <ArrowLeft className="mr-1 size-4" aria-hidden />
            審査一覧へ戻る
          </Link>
        </Button>
        <p className="text-xs font-semibold tracking-widest text-[var(--primary)]">
          {ADMIN_PET_REVIEW_DETAIL_SCREEN_ID}
        </p>
        <h1 className="mt-2 text-3xl font-bold">犬猫掲載審査詳細</h1>
        <p className="mt-3 text-neutral-600">{displayName}</p>
      </div>

      <div className="space-y-6">
        <DetailSection title="犬猫基本情報">
          <DetailField label="管理名" value={data.pet.managementName} />
          <DetailField label="公開表示名" value={displayName} />
          <DetailField label="種別" value={data.pet.speciesLabel} />
          <DetailField label="品種" value={data.pet.breed} />
          <DetailField label="性別" value={data.pet.sexLabel} />
          <DetailField label="誕生日" value={data.pet.birthdayLabel} />
          <DetailField label="毛色" value={formatAdminNullableText(data.pet.color)} />
          <DetailField
            label="性格"
            value={formatAdminNullableText(data.pet.temperament)}
            multiline
          />
          <DetailField
            label="紹介文"
            value={formatAdminNullableText(data.pet.description)}
            multiline
          />
          <DetailField label="価格" value={data.pet.priceLabel} />
          <DetailField
            label="価格補足"
            value={formatAdminNullableText(data.pet.priceComment)}
            multiline
          />
          <DetailField label="掲載状態" value={data.pet.statusLabel} />
        </DetailSection>

        <section>
          <h2 className="mb-3 text-lg font-semibold">写真</h2>
          <AdminPetReviewPhotos photos={data.photos} />
        </section>

        {data.breeder ? (
          <>
            <DetailSection title="ブリーダー情報">
              <DetailField label="屋号・事業所名" value={data.breeder.displayName} />
              <DetailField
                label="代表者名"
                value={formatAdminNullableText(data.breeder.representativeName)}
              />
              <DetailField label="所在地" value={data.breeder.locationLabel} />
              <DetailField
                label="公開用メール"
                value={formatAdminNullableText(data.breeder.publicEmail)}
              />
              <DetailField
                label="ブリーダー紹介"
                value={formatAdminNullableText(data.breeder.profileText)}
                multiline
              />
            </DetailSection>

            <DetailSection title="方針情報">
              <DetailField
                label="繁殖方針"
                value={formatAdminNullableText(data.breeder.breedingPolicy)}
                multiline
              />
              <DetailField
                label="健康管理方針"
                value={formatAdminNullableText(data.breeder.healthPolicy)}
                multiline
              />
              <DetailField
                label="飼育環境"
                value={formatAdminNullableText(data.breeder.breedingEnvironment)}
                multiline
              />
            </DetailSection>

            <DetailSection title="第一種動物取扱業登録情報">
              <DetailField
                label="登録種別"
                value={formatAdminNullableText(data.breeder.businessRegistrationType)}
              />
              <DetailField
                label="登録番号"
                value={formatAdminNullableText(data.breeder.businessRegistrationNumber)}
              />
              <DetailField
                label="登録自治体"
                value={formatAdminNullableText(data.breeder.registrationAuthority)}
              />
              <DetailField label="有効期限" value={data.breeder.registrationExpiresAtLabel} />
            </DetailSection>

            <DetailSection title="ブリーダー審査状態">
              <DetailField label="審査状態" value={data.breeder.reviewStatusLabel} />
              <DetailField
                label="本人確認状態"
                value={data.breeder.identityVerificationStatusLabel}
              />
              <DetailField
                label="登録証確認状態"
                value={data.breeder.businessVerificationStatusLabel}
              />
            </DetailSection>
          </>
        ) : (
          <Card className="border-[var(--border)] bg-white shadow-sm">
            <CardContent className="py-6 text-sm text-neutral-600">
              ブリーダー情報を取得できませんでした。
            </CardContent>
          </Card>
        )}

        <Card className="border-[var(--border)] bg-white shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">審査履歴</CardTitle>
          </CardHeader>
          <CardContent>
            <AdminPetReviewHistory reviewLogs={data.reviewLogs} />
          </CardContent>
        </Card>

        <AdminPetReviewActions petId={data.pet.id} petDisplayName={displayName} />
      </div>
    </main>
  );
}
