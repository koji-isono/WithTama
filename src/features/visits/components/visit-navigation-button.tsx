import Link from "next/link";

import { Button } from "@/components/ui/button";

import type { InquiryVisitNavigation } from "../types";

type VisitNavigationButtonProps = {
  navigation: Exclude<InquiryVisitNavigation, { kind: "none" }>;
};

export function VisitNavigationButton({ navigation }: VisitNavigationButtonProps) {
  return (
    <Button
      asChild
      variant={navigation.kind === "detail" ? "default" : "outline"}
      className={
        navigation.kind === "detail"
          ? "h-11 w-full rounded-xl sm:w-auto"
          : "h-11 w-full rounded-xl border-[var(--primary)] text-[var(--primary)] hover:bg-[var(--primary)]/5 sm:w-auto"
      }
    >
      <Link href={navigation.href}>{navigation.label}</Link>
    </Button>
  );
}
