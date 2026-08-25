import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { getPublicPetDetailPath } from "@/features/pets/constants";

import { VisitNavigationButton } from "@/features/visits/components/visit-navigation-button";

import { BUYER_INQUIRY_DETAIL_SCREEN_ID, BUYER_INQUIRY_LIST_PATH } from "../constants";
import type { InquiryDetailPageData } from "../types";
import { InquiryDetailSummary } from "./inquiry-detail-summary";
import { InquiryMessageList } from "./inquiry-message-list";
import { InquiryReplyForm } from "./inquiry-reply-form";

type InquiryDetailViewProps = InquiryDetailPageData;

export function InquiryDetailView({
  summary,
  messages,
  canSendMessage,
  closedNotice,
  visitNavigation,
}: InquiryDetailViewProps) {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-3xl flex-col px-4 py-8 pb-12 sm:py-10">
      <nav className="mb-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:gap-4">
        <Link
          href={BUYER_INQUIRY_LIST_PATH}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--primary)] transition hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2"
        >
          <ArrowLeft className="size-4" aria-hidden />
          問い合わせ履歴へ戻る
        </Link>
        {summary.isPetPubliclyVisible ? (
          <Link
            href={getPublicPetDetailPath(summary.petId)}
            className="inline-flex items-center gap-1.5 text-sm font-medium text-neutral-600 transition hover:text-[var(--primary)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2"
          >
            犬猫詳細へ戻る
          </Link>
        ) : (
          <p className="text-sm text-neutral-500">対象の犬猫は現在公開されていません。</p>
        )}
      </nav>

      <header className="mb-6 space-y-2">
        <p className="text-xs font-semibold tracking-widest text-[var(--primary)]">
          {BUYER_INQUIRY_DETAIL_SCREEN_ID}
        </p>
        <h1 className="text-2xl font-bold text-neutral-900">問い合わせ詳細</h1>
        <p className="text-sm leading-relaxed text-neutral-600">
          ブリーダーとのメッセージのやり取りを確認できます。
        </p>
      </header>

      <div className="space-y-6">
        <InquiryDetailSummary summary={summary} />

        {visitNavigation.kind !== "none" ? (
          <div className="flex flex-col gap-3 sm:flex-row">
            <VisitNavigationButton navigation={visitNavigation} />
          </div>
        ) : null}

        <section className="space-y-4" aria-labelledby="inquiry-message-history-heading">
          <h2
            id="inquiry-message-history-heading"
            className="text-lg font-semibold text-neutral-900"
          >
            メッセージ履歴
          </h2>
          <InquiryMessageList messages={messages} />
        </section>

        <section
          className="border-t border-[var(--border)] pt-6"
          aria-labelledby="inquiry-reply-heading"
        >
          <h2 id="inquiry-reply-heading" className="mb-4 text-lg font-semibold text-neutral-900">
            {canSendMessage ? "追加メッセージ" : "返信"}
          </h2>
          <InquiryReplyForm
            inquiryId={summary.inquiryId}
            canSendMessage={canSendMessage}
            closedNotice={closedNotice}
          />
        </section>
      </div>
    </div>
  );
}
