"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { BREEDER_MOBILE_ITEMS, isNavItemActive } from "@/components/layout/breeder-nav-items";
import { cn } from "@/lib/utils";

export function BreederMobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--border)] bg-white/95 backdrop-blur md:hidden">
      <div className="grid grid-cols-5">
        {BREEDER_MOBILE_ITEMS.map((item) => {
          const active = isNavItemActive(pathname, item);
          const Icon = item.icon;

          return (
            <Link
              key={item.label}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 px-1 py-2.5 text-[10px] font-medium no-underline sm:text-xs",
                active ? "text-[var(--primary)]" : "text-neutral-500",
              )}
            >
              <Icon className={cn("size-5", active && "stroke-[2.5px]")} />
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
