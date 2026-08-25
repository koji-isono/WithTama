import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft, ExternalLink, FileWarning } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

import { ADMIN_BREEDER_REVIEW_DETAIL_SCREEN_ID, ADMIN_BREEDER_REVIEWS_PATH } from "../constants";
import { formatAdminNullableText } from "../format";
import type { AdminBreederReviewDetailPageData, AdminBreederReviewDocumentPreview } from "../types";
import { AdminBreederReviewStartAction } from "./admin-breeder-review-start-action";
import { AdminBreederReviewActions } from "./admin-breeder-review-actions";

type AdminBreederReviewDetailProps = {
  data: AdminBreederReviewDetailPageData;
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

function RegistrationExpiryDisplay({
  label,
  warning,
}: {
  label: string;
  warning: AdminBreederReviewDetailPageData["registrationExpiryWarning"];
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

  if (!label || label === "—") {
    return (
      <span className="inline-flex flex-wrap items-center gap-2">
        <span>{label}</span>
        <Badge variant="destructive">未設定</Badge>
      </span>
    );
  }

  return <span>{label}</span>;
}

function AdminBreederDocumentPreviewPanel({
  title,
  description,
  document,
}: {
  title: string;
  description: string;
  document: AdminBreederReviewDocumentPreview;
}) {
  return (
    <DetailSection title={title}>
      <DetailField label="確認状態" value={document.statusLabel} />
      <div className="grid gap-1 sm:grid-cols-[10rem_1fr] sm:gap-4">
        <dt className="text-sm font-medium text-neutral-700">書類プレビュー</dt>
        <dd className="space-y-3">
          <p className="text-xs text-neutral-500">{description}</p>
          {document.signedUrl && document.previewKind === "image" ? (
            <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-neutral-50">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={document.signedUrl}
                alt={title}
                className="max-h-[480px] w-full object-contain"
              />
            </div>
          ) : null}
          {document.signedUrl && document.previewKind === "pdf" ? (
            <iframe
              src={document.signedUrl}
              title={title}
              className="h-[480px] w-full rounded-xl border border-[var(--border)] bg-white"
            />
          ) : null}
          {document.message ? (
            <div className="flex items-start gap-2 rounded-xl border border-dashed border-[var(--border)] bg-neutral-50/80 px-4 py-3 text-sm text-neutral-600">
              <FileWarning className="mt-0.5 size-4 shrink-0 text-neutral-400" aria-hidden />
              <span>{document.message}</span>
            </div>
          ) : null}
          {document.signedUrl ? (
            <Button asChild variant="outline" size="sm" className="rounded-full">
              <a href={document.signedUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-1 size-4" aria-hidden />
                新しいタブで開く
              </a>
            </Button>
          ) : null}
        </dd>
      </div>
    </DetailSection>
  );
}

function AdminBreederReviewHistory({
  reviewLogs,
}: {
  reviewLogs: AdminBreederReviewDetailPageData["reviewLogs"];
}) {
  if (reviewLogs.length === 0) {
    return <p className="text-sm text-neutral-600">審査履歴はまだありません。</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[480px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-[var(--border)] text-left text-neutral-700">
            <th className="px-3 py-2 font-medium">日時</th>
            <th className="px-3 py-2 font-medium">操作</th>
            <th className="px-3 py-2 font-medium">コメント</th>
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
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function AdminBreederReviewDetail({ data }: AdminBreederReviewDetailProps) {
  return (
    <main className="mx-auto max-w-6xl px-4 py-12">
      <div className="mb-8">
        <Button asChild variant="ghost" size="sm" className="-ml-2 mb-4 rounded-full">
          <Link href={ADMIN_BREEDER_REVIEWS_PATH}>
            <ArrowLeft className="mr-1 size-4" aria-hidden />
            ブリーダー審査一覧へ戻る
          </Link>
        </Button>
        <p className="text-xs font-semibold tracking-widest text-[var(--primary)]">
          {ADMIN_BREEDER_REVIEW_DETAIL_SCREEN_ID}
        </p>
        <h1 className="mt-2 text-3xl font-bold">ブリーダー審査詳細</h1>
        <p className="mt-3 text-neutral-600">{data.displayName}</p>
      </div>

      <div className="space-y-6">
        <DetailSection title="基本情報">
          <DetailField label="屋号・事業所名" value={data.businessNameLabel} />
          <DetailField label="代表者名" value={data.representativeNameLabel} />
          <DetailField label="電話番号" value={data.phoneLabel} />
          <DetailField label="公開用メール" value={data.publicEmailLabel} />
          <div className="grid gap-1 sm:grid-cols-[10rem_1fr] sm:gap-4">
            <dt className="text-sm font-medium text-neutral-700">Webサイト</dt>
            <dd className="text-sm text-neutral-600">
              {data.websiteUrl ? (
                <a
                  href={data.websiteUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[var(--primary)] underline-offset-2 hover:underline"
                >
                  {data.websiteUrlLabel}
                </a>
              ) : (
                data.websiteUrlLabel
              )}
            </dd>
          </div>
          <DetailField label="審査状態" value={data.reviewStatusLabel} />
          <DetailField label="本人確認状態" value={data.identityVerificationStatusLabel} />
          <DetailField label="登録証確認状態" value={data.businessVerificationStatusLabel} />
          <DetailField label="利用状態" value={data.membershipStatusLabel} />
          <DetailField label="承認日時" value={data.approvedAtLabel} />
          <DetailField label="Stripe 課金状態" value={data.subscriptionStatusLabel} />
        </DetailSection>

        <DetailSection title="所在地">
          <DetailField label="郵便番号" value={data.postalCodeLabel} />
          <DetailField label="都道府県" value={data.prefectureLabel} />
          <DetailField label="市区町村" value={data.cityLabel} />
          <DetailField label="番地・建物名" value={data.addressLineLabel} />
        </DetailSection>

        <DetailSection title="第一種動物取扱業登録情報">
          <DetailField label="登録種別" value={data.businessRegistrationTypeLabel} />
          <DetailField label="登録番号" value={data.businessRegistrationNumberLabel} />
          <DetailField label="登録自治体" value={data.registrationAuthorityLabel} />
          <div className="grid gap-1 sm:grid-cols-[10rem_1fr] sm:gap-4">
            <dt className="text-sm font-medium text-neutral-700">有効期限</dt>
            <dd className={cn("text-sm text-neutral-600")}>
              <RegistrationExpiryDisplay
                label={data.registrationExpiresAtLabel}
                warning={data.registrationExpiryWarning}
              />
            </dd>
          </div>
        </DetailSection>

        <DetailSection title="プロフィール・方針">
          <DetailField label="ブリーダー紹介" value={data.profileTextLabel} multiline />
          <DetailField label="繁殖方針" value={data.breedingPolicyLabel} multiline />
          <DetailField label="健康管理方針" value={data.healthPolicyLabel} multiline />
          <DetailField label="飼育環境" value={data.breedingEnvironmentLabel} multiline />
        </DetailSection>

        <AdminBreederDocumentPreviewPanel
          title="本人確認書類"
          description="運転免許証、マイナンバーカード等を想定。利用可能書類の正式な範囲については、弁護士または運営責任者への確認が必要です。"
          document={data.identityDocument}
        />

        <AdminBreederDocumentPreviewPanel
          title="第一種動物取扱業登録証"
          description="Step3で入力した登録番号、有効期限等と管理者が照合してください。"
          document={data.businessLicense}
        />

        <AdminBreederReviewStartAction breederId={data.id} reviewStatus={data.reviewStatus} />

        <AdminBreederReviewActions
          breederId={data.id}
          breederDisplayName={data.businessNameLabel}
          reviewStatus={data.reviewStatus}
        />

        <Card className="border-[var(--border)] bg-white shadow-sm">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">審査履歴</CardTitle>
          </CardHeader>
          <CardContent>
            <AdminBreederReviewHistory reviewLogs={data.reviewLogs} />
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
