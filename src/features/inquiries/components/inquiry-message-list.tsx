import { cn } from "@/lib/utils";

import type { InquiryDetailMessage } from "../types";

type InquiryMessageListProps = {
  messages: InquiryDetailMessage[];
};

export function InquiryMessageList({ messages }: InquiryMessageListProps) {
  if (messages.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-[var(--border)] bg-white px-4 py-8 text-center text-sm text-neutral-600">
        メッセージはまだありません。
      </div>
    );
  }

  return (
    <ol className="space-y-4" aria-label="メッセージ履歴">
      {messages.map((item) => (
        <li
          key={item.id}
          className={cn("flex", item.isOwnMessage ? "justify-end" : "justify-start")}
        >
          <article
            className={cn(
              "max-w-[92%] rounded-2xl px-4 py-3 shadow-sm sm:max-w-[75%]",
              item.isOwnMessage
                ? "rounded-br-md bg-[var(--primary)] text-[var(--primary-foreground)]"
                : "rounded-bl-md border border-[var(--border)] bg-white text-neutral-800",
            )}
          >
            <header
              className={cn(
                "mb-1 flex flex-wrap items-baseline gap-x-2 gap-y-0.5 text-xs",
                item.isOwnMessage ? "text-[var(--primary-foreground)]/85" : "text-neutral-500",
              )}
            >
              <span className="font-semibold">{item.senderLabel}</span>
              <time dateTime={item.createdAt}>{item.createdAtLabel}</time>
            </header>
            <p className="whitespace-pre-wrap text-sm leading-relaxed">{item.message}</p>
          </article>
        </li>
      ))}
    </ol>
  );
}
