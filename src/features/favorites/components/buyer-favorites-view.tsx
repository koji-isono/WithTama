import Link from "next/link";

import { Button } from "@/components/ui/button";
import { PUBLIC_PETS_PATH } from "@/features/pets/constants";
import type { PublicPetListItem } from "@/features/pets/types";

import { BUYER_FAVORITES_SCREEN_ID } from "../constants";
import { BuyerFavoritePetCard } from "./buyer-favorite-pet-card";

type BuyerFavoritesViewProps = {
  pets: PublicPetListItem[];
};

export function BuyerFavoritesView({ pets }: BuyerFavoritesViewProps) {
  return (
    <div className="space-y-8">
      <header className="space-y-2">
        <p className="text-xs font-semibold tracking-widest text-[var(--primary)]">
          {BUYER_FAVORITES_SCREEN_ID}
        </p>
        <h1 className="text-2xl font-bold sm:text-3xl">お気に入り</h1>
        <p className="text-sm text-neutral-600 sm:text-base">
          気になる犬猫をまとめて確認できます。
        </p>
      </header>

      {pets.length === 0 ? (
        <div className="rounded-2xl border border-[var(--border)] bg-white p-6 text-center shadow-sm sm:p-8">
          <p className="text-base font-medium text-neutral-900">お気に入りはまだありません。</p>
          <p className="mt-2 text-sm text-neutral-600">
            気になる犬猫を見つけて、お気に入りに追加してみましょう。
          </p>
          <Button asChild className="mt-6 h-11 rounded-xl">
            <Link href={PUBLIC_PETS_PATH}>犬猫を探す</Link>
          </Button>
        </div>
      ) : (
        <section className="grid gap-4 sm:grid-cols-2">
          {pets.map((pet) => (
            <BuyerFavoritePetCard key={pet.id} pet={pet} />
          ))}
        </section>
      )}
    </div>
  );
}
