import Link from "next/link";
import { Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import type { BreederDashboardPageData } from "../types";
import { ResubmissionRequiredBanner } from "./resubmission-required-banner";

type BreederDashboardViewProps = BreederDashboardPageData;

const KPI_ITEMS = [
  { label: "掲載中", value: 12, accent: "bg-[var(--primary)]/10 text-[var(--primary)]" },
  { label: "審査中", value: 2, accent: "bg-amber-50 text-amber-700" },
  { label: "家族決定", value: 18, accent: "bg-emerald-50 text-emerald-700" },
  { label: "お問い合わせ", value: 5, accent: "bg-sky-50 text-sky-700" },
] as const;

const RECENT_INQUIRIES = [
  {
    id: "1",
    name: "山田 花子 さん",
    petName: "タマちゃん",
    message: "来週末に見学させていただけますか？",
    date: "2026-08-04",
    status: "未対応",
  },
  {
    id: "2",
    name: "佐藤 太郎 さん",
    petName: "モカちゃん",
    message: "性格についてもう少し教えていただけますか。",
    date: "2026-08-03",
    status: "返信済み",
  },
  {
    id: "3",
    name: "鈴木 美咲 さん",
    petName: "ソラくん",
    message: "ご縁の流れについて確認したいです。",
    date: "2026-08-02",
    status: "未対応",
  },
] as const;

const RECENT_PETS = [
  {
    id: "1",
    managementName: "タマちゃん",
    breed: "ラグドール",
    sexLabel: "女の子",
    age: "3か月",
    status: "掲載中",
  },
  {
    id: "2",
    managementName: "モカちゃん",
    breed: "スコティッシュフォールド",
    sexLabel: "男の子",
    age: "5か月",
    status: "審査中",
  },
] as const;

function inquiryBadgeVariant(status: string) {
  return status === "未対応" ? "default" : "secondary";
}

function petBadgeVariant(status: string) {
  if (status === "掲載中") return "default";
  if (status === "審査中") return "secondary";
  return "outline";
}

export function BreederDashboardView({ resubmissionBanner }: BreederDashboardViewProps) {
  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:py-10">
      <header className="space-y-2">
        <p className="text-xs font-semibold tracking-widest text-[var(--primary)]">BR-06</p>
        <h1 className="text-2xl font-bold sm:text-3xl">ブリーダーダッシュボード</h1>
        <p className="text-base text-neutral-600 sm:text-lg">こんにちは、ブリーダーさん</p>
      </header>

      {resubmissionBanner ? (
        <div className="mt-6">
          <ResubmissionRequiredBanner {...resubmissionBanner} />
        </div>
      ) : null}

      <section className="mt-8 grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        {KPI_ITEMS.map((item) => (
          <Card key={item.label} className="border-[var(--border)] bg-white shadow-sm">
            <CardContent className="p-4 sm:p-5">
              <p
                className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium ${item.accent}`}
              >
                {item.label}
              </p>
              <p className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">{item.value}</p>
            </CardContent>
          </Card>
        ))}
      </section>

      <section className="mt-10 space-y-4">
        <h2 className="text-lg font-bold sm:text-xl">最近のお問い合わせ</h2>
        <div className="grid gap-3 sm:gap-4">
          {RECENT_INQUIRIES.map((inquiry) => (
            <Card key={inquiry.id} className="border-[var(--border)] bg-white shadow-sm">
              <CardHeader className="flex-row items-start justify-between space-y-0 p-4 pb-2 sm:p-5 sm:pb-3">
                <div className="space-y-1">
                  <CardTitle className="text-base font-bold">{inquiry.name}</CardTitle>
                  <p className="text-sm text-neutral-500">
                    対象: {inquiry.petName}
                    <span className="mx-2 text-neutral-300">·</span>
                    {inquiry.date}
                  </p>
                </div>
                <Badge
                  variant={inquiryBadgeVariant(inquiry.status)}
                  className={
                    inquiry.status === "未対応"
                      ? "shrink-0 border-transparent bg-[var(--primary)]"
                      : "shrink-0"
                  }
                >
                  {inquiry.status}
                </Badge>
              </CardHeader>
              <CardContent className="p-4 pt-0 sm:p-5 sm:pt-0">
                <p className="text-sm leading-relaxed text-neutral-700">{inquiry.message}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      <section className="mt-10 space-y-4">
        <h2 className="text-lg font-bold sm:text-xl">最近登録した犬猫</h2>
        <div className="grid gap-3 sm:grid-cols-2 sm:gap-4">
          {RECENT_PETS.map((pet) => (
            <Card key={pet.id} className="border-[var(--border)] bg-white shadow-sm">
              <CardHeader className="flex-row items-start justify-between space-y-0 p-4 pb-2 sm:p-5 sm:pb-3">
                <div className="space-y-1">
                  <CardTitle className="text-base font-bold">{pet.managementName}</CardTitle>
                  <p className="text-sm text-neutral-600">
                    {pet.breed}
                    <span className="mx-2 text-neutral-300">·</span>
                    {pet.sexLabel}
                    <span className="mx-2 text-neutral-300">·</span>
                    {pet.age}
                  </p>
                </div>
                <Badge
                  variant={petBadgeVariant(pet.status)}
                  className={
                    pet.status === "掲載中"
                      ? "shrink-0 border-transparent bg-[var(--primary)]"
                      : "shrink-0"
                  }
                >
                  {pet.status}
                </Badge>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      <div className="mt-10 pb-6">
        <Button
          asChild
          className="h-11 w-full rounded-full bg-[var(--primary)] px-6 hover:bg-[var(--primary)]/90 sm:w-auto"
        >
          <Link href="/breeder/pets/new">
            <Plus className="size-4" />
            新しい犬猫を登録
          </Link>
        </Button>
      </div>
    </div>
  );
}
