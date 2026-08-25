import Link from "next/link";

import { Button } from "@/components/ui/button";

import type { VisitStartUiState } from "../types";

type VisitStartButtonProps = {
  state: Exclude<VisitStartUiState, { status: "hidden" }>;
};

export function VisitStartButton({ state }: VisitStartButtonProps) {
  const href = state.href;
  const label = state.status === "link" ? state.label : "見学を希望する";

  return (
    <Button
      asChild
      variant="outline"
      className="h-11 w-full rounded-xl border-[var(--primary)] text-[var(--primary)] hover:bg-[var(--primary)]/5 sm:w-auto"
    >
      <Link href={href}>{label}</Link>
    </Button>
  );
}
