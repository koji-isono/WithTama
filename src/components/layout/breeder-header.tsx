"use client";

import { Bell, LogOut } from "lucide-react";
import { usePathname } from "next/navigation";

import { getBreederPageTitle } from "@/components/layout/breeder-nav-items";
import { Button } from "@/components/ui/button";

type BreederHeaderProps = {
  displayName: string;
};

export function BreederHeader({ displayName }: BreederHeaderProps) {
  const pathname = usePathname();
  const pageTitle = getBreederPageTitle(pathname);

  return (
    <header className="sticky top-0 z-20 border-b border-[var(--border)] bg-white/95 backdrop-blur">
      <div className="flex items-center justify-between gap-3 px-4 py-3 sm:px-6 sm:py-4">
        <h1 className="truncate text-base font-bold sm:text-lg">{pageTitle}</h1>

        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <Button variant="ghost" size="icon" className="rounded-full" aria-label="通知">
            <Bell className="size-4" />
          </Button>

          <span className="hidden max-w-[8rem] truncate text-sm text-neutral-600 sm:inline">
            {displayName}
          </span>

          <Button variant="outline" size="sm" className="rounded-full px-3">
            <LogOut className="size-3.5 sm:mr-1" />
            <span className="hidden sm:inline">ログアウト</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
