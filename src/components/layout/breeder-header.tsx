"use client";

import { usePathname } from "next/navigation";

import { LogoutButton } from "@/components/auth/logout-button";
import { getBreederPageTitle } from "@/components/layout/breeder-nav-items";

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
          <span className="hidden max-w-[8rem] truncate text-sm text-neutral-600 sm:inline">
            {displayName}
          </span>

          <LogoutButton className="rounded-full px-3" />
        </div>
      </div>
    </header>
  );
}
