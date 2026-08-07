import Link from "next/link";

import { Button } from "@/components/ui/button";

import { BREEDER_PETS_NEW_PATH } from "../constants";

export function PetsListPlaceholder() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-6 pb-28 sm:py-10 sm:pb-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold sm:text-3xl">犬猫一覧</h1>
        <Button
          asChild
          className="h-11 rounded-full bg-[var(--primary)] px-6 hover:bg-[var(--primary)]/90"
        >
          <Link href={BREEDER_PETS_NEW_PATH}>犬猫を登録</Link>
        </Button>
      </div>

      <p className="mt-8 text-sm text-neutral-600 sm:text-base">
        登録した犬猫の一覧はここに表示されます。Phase 7 で順次実装予定です。
      </p>
    </div>
  );
}
