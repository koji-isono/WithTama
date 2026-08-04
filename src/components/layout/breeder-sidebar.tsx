"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { BREEDER_SIDEBAR_ITEMS, isNavItemActive } from "@/components/layout/breeder-nav-items";
import { cn } from "@/lib/utils";

export function BreederSidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-[var(--border)] bg-white md:flex">
      <div className="border-b border-[var(--border)] px-5 py-5">
        <Link href="/breeder" className="text-lg font-bold text-[var(--foreground)] no-underline">
          WithTama
        </Link>
        <p className="mt-1 text-xs text-neutral-500">ブリーダー管理</p>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {BREEDER_SIDEBAR_ITEMS.map((item) => {
          const active = isNavItemActive(pathname, item);
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors no-underline",
                active
                  ? "bg-[var(--secondary)] text-[var(--primary)]"
                  : "text-neutral-600 hover:bg-[var(--muted)] hover:text-[var(--foreground)]",
              )}
            >
              <Icon className="size-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
