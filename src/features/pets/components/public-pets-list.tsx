import { AlertCircle } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";

import { PUBLIC_PET_LIST_SCREEN_ID } from "../constants";
import type { LoadPublicPetsPageResult } from "../types";
import { PublicPetCard } from "./public-pet-card";

type PublicPetsListProps = {
  result: LoadPublicPetsPageResult;
};

export function PublicPetsList({ result }: PublicPetsListProps) {
  if (!result.success) {
    return (
      <div className="mx-auto max-w-6xl px-4 py-10 sm:py-12">
        <Alert variant="destructive" className="border-red-200 bg-red-50 text-red-800">
          <AlertCircle className="size-4 text-red-600" />
          <AlertDescription>{result.error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  const { pets } = result;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 pb-12 sm:py-10">
      <header className="mb-8 space-y-2">
        <p className="text-xs font-semibold tracking-widest text-[var(--primary)]">
          {PUBLIC_PET_LIST_SCREEN_ID}
        </p>
        <h1 className="text-2xl font-bold sm:text-3xl">犬猫を探す</h1>
        <p className="text-sm text-neutral-600 sm:text-base">
          公開中の犬猫一覧です。気になる子の詳細ページへ進めます。
        </p>
      </header>

      {pets.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--border)] bg-neutral-50/80 px-6 py-12 text-center">
          <p className="text-base font-medium text-neutral-800">現在公開中の犬猫はありません。</p>
          <p className="mt-2 text-sm text-neutral-600">公開が開始されるとここに表示されます。</p>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {pets.map((pet) => (
            <li key={pet.id}>
              <PublicPetCard pet={pet} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
