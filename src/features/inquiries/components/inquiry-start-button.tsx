import Link from "next/link";

import { Button } from "@/components/ui/button";

import type { InquiryStartUiState } from "../types";

type InquiryStartButtonProps = {
  state: Exclude<InquiryStartUiState, { status: "hidden" }>;
};

export function InquiryStartButton({ state }: InquiryStartButtonProps) {
  return (
    <Button
      asChild
      className="h-11 w-full rounded-xl bg-[var(--primary)] text-[var(--primary-foreground)] hover:bg-[var(--primary)]/90 sm:w-auto"
    >
      <Link href={state.href}>ブリーダーに問い合わせる</Link>
    </Button>
  );
}
