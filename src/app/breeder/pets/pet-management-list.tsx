"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Camera, Heart, ImageIcon, Pencil, Plus, Search, Sparkles } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import type { BreederPetListItem, PetStatus } from "@/types/pet";

const STATUS_FILTERS = [
  { value: "all", label: "すべて" },
  { value: "published", label: "掲載中" },
  { value: "draft", label: "下書き" },
  { value: "under_review", label: "審査中" },
  { value: "paused", label: "一時停止" },
  { value: "family_decided", label: "家族決定" },
  { value: "closed", label: "クローズ" },
] as const;

function statusBadgeVariant(status: PetStatus) {
  if (status === "published") return "default";
  if (status === "draft" || status === "under_review") return "secondary";
  return "outline";
}

type PetManagementListProps = {
  pets: BreederPetListItem[];
};

export function PetManagementList({ pets }: PetManagementListProps) {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<(typeof STATUS_FILTERS)[number]["value"]>("all");

  const filteredPets = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return pets.filter((pet) => {
      const matchesStatus = statusFilter === "all" || pet.status === statusFilter;
      const matchesQuery =
        normalizedQuery.length === 0 ||
        pet.managementName.toLowerCase().includes(normalizedQuery) ||
        pet.breed.toLowerCase().includes(normalizedQuery);

      return matchesStatus && matchesQuery;
    });
  }, [pets, query, statusFilter]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 sm:py-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs font-semibold tracking-widest text-[var(--primary)]">BR-07</p>
          <h1 className="mt-1 text-2xl font-bold sm:text-3xl">犬猫管理</h1>
        </div>
        <Button
          asChild
          className="h-10 w-full rounded-full bg-[var(--primary)] px-5 hover:bg-[var(--primary)]/90 sm:w-auto"
        >
          <Link href="/breeder/pets/new">
            <Plus className="size-4" />
            新しい犬猫を登録
          </Link>
        </Button>
      </div>

      <div className="mt-6 space-y-4 sm:mt-8">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-neutral-400" />
          <Input
            className="h-11 rounded-xl border-[var(--border)] bg-white pl-10 shadow-sm"
            placeholder="管理名・犬種・猫種で検索"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>

        <div className="flex flex-wrap gap-2">
          {STATUS_FILTERS.map((filter) => {
            const active = statusFilter === filter.value;

            return (
              <Button
                key={filter.value}
                type="button"
                size="sm"
                variant={active ? "default" : "outline"}
                className={cn(
                  "rounded-full px-4",
                  active && "bg-[var(--primary)] hover:bg-[var(--primary)]/90",
                )}
                onClick={() => setStatusFilter(filter.value)}
              >
                {filter.label}
              </Button>
            );
          })}
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:mt-8 sm:grid-cols-2 lg:grid-cols-3">
        {filteredPets.map((pet) => (
          <Card key={pet.id} className="overflow-hidden border-[var(--border)] bg-white shadow-sm">
            <div className={cn("relative aspect-[4/3] bg-gradient-to-br", pet.imageGradient)}>
              <div className="absolute inset-0 flex items-center justify-center">
                <ImageIcon className="size-12 text-neutral-300" strokeWidth={1.5} />
              </div>
              <Badge
                variant={statusBadgeVariant(pet.status)}
                className={cn(
                  "absolute right-3 top-3 rounded-full px-2.5",
                  pet.status === "published" && "border-transparent bg-[var(--primary)]",
                )}
              >
                {pet.statusLabel}
              </Badge>
            </div>

            <CardContent className="space-y-4 p-4 sm:p-5">
              <div className="space-y-2">
                <p className="text-xs font-medium text-neutral-500">管理名</p>
                <h2 className="text-lg font-bold leading-tight">{pet.managementName}</h2>
                <p className="text-sm text-neutral-600">
                  {pet.breed}
                  <span className="mx-2 text-neutral-300">·</span>
                  {pet.sexLabel}
                  <span className="mx-2 text-neutral-300">·</span>
                  {pet.age}
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <Badge variant="outline" className="rounded-full bg-[var(--muted)] font-normal">
                  <Camera className="mr-1 size-3" />
                  写真{pet.photoCount}枚
                </Badge>
                <Badge variant="outline" className="rounded-full bg-[var(--muted)] font-normal">
                  <Heart className="mr-1 size-3" />
                  ご縁{pet.matchCount}件
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm" className="rounded-lg">
                  <Pencil className="size-3.5" />
                  編集
                </Button>
                <Button variant="outline" size="sm" className="rounded-lg">
                  <Camera className="size-3.5" />
                  写真
                </Button>
                <Button variant="outline" size="sm" className="rounded-lg">
                  <Sparkles className="size-3.5" />
                  AI紹介文
                </Button>
                <Button variant="outline" size="sm" className="rounded-lg">
                  <Heart className="size-3.5" />
                  ご縁
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredPets.length === 0 && (
        <div className="mt-10 rounded-xl border border-dashed border-[var(--border)] bg-white px-6 py-12 text-center">
          <p className="text-sm font-medium text-neutral-700">
            {pets.length === 0 ? "まだ登録されていません" : "該当する犬猫が見つかりません"}
          </p>
          {pets.length === 0 ? null : (
            <p className="mt-1 text-sm text-neutral-500">
              検索条件や掲載状態フィルターを変更してください
            </p>
          )}
        </div>
      )}
    </div>
  );
}
