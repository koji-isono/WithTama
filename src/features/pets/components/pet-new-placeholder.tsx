import Link from "next/link";

import { Button } from "@/components/ui/button";

import { BREEDER_PETS_PATH } from "../constants";

export function PetNewPlaceholder() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-6 pb-28 sm:py-10 sm:pb-10">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-bold sm:text-3xl">犬猫登録</h1>
        <Button
          asChild
          variant="outline"
          className="h-11 rounded-full border-[var(--border)] px-6"
        >
          <Link href={BREEDER_PETS_PATH}>一覧へ戻る</Link>
        </Button>
      </div>

      <p className="mt-8 text-sm text-neutral-600 sm:text-base">
        入力フォームは次回実装予定です。
      </p>
    </div>
  );
}
