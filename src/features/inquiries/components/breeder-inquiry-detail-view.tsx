import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { BREEDER_INQUIRY_LIST_PATH, BREEDER_INQUIRY_LIST_SCREEN_ID } from "../constants";
import type { BreederInquiryDetailPageData } from "../types";
import { BreederInquiryDetailSummary } from "./breeder-inquiry-detail-summary";
import { InquiryMessageList } from "./inquiry-message-list";
import { InquiryReplyForm } from "./inquiry-reply-form";

type BreederInquiryDetailViewProps = BreederInquiryDetailPageData;

export function BreederInquiryDetailView({
  summary,
  messages,
  canSendMessage,
  closedNotice,
}: BreederInquiryDetailViewProps) {
  return (
    <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-3xl flex-col px-4 py-8 pb-12 sm:py-10">
      <nav className="mb-6">
        <Link
          href={BREEDER_INQUIRY_LIST_PATH}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--primary)] transition hover:opacity-80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2"
        >
          <ArrowLeft className="size-4" aria-hidden />
          問い合わせ一覧へ戻る
        </Link>
      </nav>

      <header className="mb-6 space-y-2">
        <p className="text-xs font-semibold tracking-widest text-[var(--primary)]">
          {BREEDER_INQUIRY_LIST_SCREEN_ID}
        </p>
        <h1 className="text-2xl font-bold text-neutral-900">問い合わせ詳細</h1>
        <p className="text-sm leading-relaxed text-neutral-600">
          購入希望者とのメッセージのやり取りを確認し、返信できます。
        </p>
      </header>

      <div className="space-y-6">
        <BreederInquiryDetailSummary summary={summary} />

        <section className="space-y-4" aria-labelledby="breeder-inquiry-message-history-heading">
          <h2
            id="breeder-inquiry-message-history-heading"
            className="text-lg font-semibold text-neutral-900"
          >
            メッセージ履歴
          </h2>
          <InquiryMessageList messages={messages} />
        </section>

        <section
          className="border-t border-[var(--border)] pt-6"
          aria-labelledby="breeder-inquiry-reply-heading"
        >
          <h2
            id="breeder-inquiry-reply-heading"
            className="mb-4 text-lg font-semibold text-neutral-900"
          >
            {canSendMessage ? "返信" : "返信"}
          </h2>
          <InquiryReplyForm
            inquiryId={summary.inquiryId}
            canSendMessage={canSendMessage}
            closedNotice={closedNotice}
            role="breeder"
          />
        </section>
      </div>
    </div>
  );
}
