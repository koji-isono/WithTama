import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import { BUYER_DASHBOARD_MENU_ITEMS } from "../dashboard-menu";
import type { BuyerDashboardPageData } from "../types";

type BuyerDashboardViewProps = BuyerDashboardPageData;

export function BuyerDashboardView({ displayName }: BuyerDashboardViewProps) {
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="text-xs font-semibold tracking-widest text-[var(--primary)]">BY-02</p>
        <h1 className="text-2xl font-bold sm:text-3xl">購入希望者ダッシュボード</h1>
        <p className="text-base text-neutral-800 sm:text-lg">こんにちは、{displayName}さん</p>
        <p className="text-sm text-neutral-600 sm:text-base">
          大切な家族との出会いを探しましょう。
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2">
        {BUYER_DASHBOARD_MENU_ITEMS.map((item) => (
          <Card key={item.id} className="border-[var(--border)] bg-white shadow-sm">
            <CardHeader className="space-y-2 p-4 pb-2 sm:p-5 sm:pb-3">
              <div className="flex items-start justify-between gap-3">
                <CardTitle className="text-base font-bold sm:text-lg">{item.title}</CardTitle>
                {item.comingSoon ? (
                  <Badge variant="secondary" className="shrink-0">
                    準備中
                  </Badge>
                ) : null}
              </div>
              <p className="text-sm text-neutral-600">{item.description}</p>
            </CardHeader>
            {item.href && item.buttonLabel ? (
              <CardContent className="p-4 pt-0 sm:p-5 sm:pt-0">
                <Button asChild className="h-11 w-full rounded-xl">
                  <Link href={item.href}>{item.buttonLabel}</Link>
                </Button>
              </CardContent>
            ) : null}
          </Card>
        ))}
      </section>
    </div>
  );
}
