import Link from "next/link";
import { ChevronRight, ClipboardList, Users } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import {
  ADMIN_BREEDER_REVIEW_LIST_SCREEN_ID,
  ADMIN_BREEDER_REVIEWS_PATH,
  ADMIN_PET_REVIEW_LIST_SCREEN_ID,
  ADMIN_PET_REVIEWS_PATH,
} from "@/features/admin";

export const metadata = {
  title: "管理者ダッシュボード",
};

const FUTURE_SECTIONS = ["問い合わせ管理", "会員管理"] as const;

export default function AdminDashboardPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-12">
      <p className="text-xs font-semibold tracking-widest text-[var(--primary)]">AD-00</p>
      <h1 className="mt-2 text-3xl font-bold">管理者ダッシュボード</h1>
      <p className="mt-3 text-neutral-600">管理者としてログインしています。</p>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">運用メニュー</h2>
        <ul className="mt-4 grid gap-4 sm:grid-cols-2">
          <li>
            <Link href={ADMIN_PET_REVIEWS_PATH} className="group block h-full">
              <Card className="h-full border-[var(--border)] bg-white shadow-sm transition-colors hover:border-[var(--primary)]/30 hover:bg-[var(--primary)]/5">
                <CardContent className="flex items-center gap-4 p-5">
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-[var(--primary)]/10 text-[var(--primary)]">
                    <ClipboardList className="size-5" aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="text-xs font-semibold tracking-widest text-[var(--primary)]">
                      {ADMIN_PET_REVIEW_LIST_SCREEN_ID}
                    </p>
                    <p className="font-semibold text-neutral-900">犬猫掲載審査</p>
                    <p className="text-sm text-neutral-600">公開申請中の犬猫を確認・承認・差戻し</p>
                  </div>
                  <ChevronRight
                    className="size-5 shrink-0 text-neutral-400 transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--primary)]"
                    aria-hidden
                  />
                </CardContent>
              </Card>
            </Link>
          </li>
          <li>
            <Link href={ADMIN_BREEDER_REVIEWS_PATH} className="group block h-full">
              <Card className="h-full border-[var(--border)] bg-white shadow-sm transition-colors hover:border-[var(--primary)]/30 hover:bg-[var(--primary)]/5">
                <CardContent className="flex items-center gap-4 p-5">
                  <div className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-[var(--primary)]/10 text-[var(--primary)]">
                    <Users className="size-5" aria-hidden />
                  </div>
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="text-xs font-semibold tracking-widest text-[var(--primary)]">
                      {ADMIN_BREEDER_REVIEW_LIST_SCREEN_ID}
                    </p>
                    <p className="font-semibold text-neutral-900">ブリーダー審査</p>
                    <p className="text-sm text-neutral-600">ブリーダー登録申請の確認・審査</p>
                  </div>
                  <ChevronRight
                    className="size-5 shrink-0 text-neutral-400 transition-transform group-hover:translate-x-0.5 group-hover:text-[var(--primary)]"
                    aria-hidden
                  />
                </CardContent>
              </Card>
            </Link>
          </li>
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">今後追加予定</h2>
        <ul className="mt-3 list-inside list-disc space-y-1 text-neutral-600">
          {FUTURE_SECTIONS.map((section) => (
            <li key={section}>{section}</li>
          ))}
        </ul>
      </section>
    </main>
  );
}
