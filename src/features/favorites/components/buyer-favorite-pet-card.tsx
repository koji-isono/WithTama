"use client";

import { Heart } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getPublicPetDetailPath } from "@/features/pets/constants";
import {
  formatPetPrice,
  formatPublicBreederLocation,
  formatPublicPetAttributeLine,
} from "@/features/pets/list-format";
import type { PublicPetListItem } from "@/features/pets/types";

import { removeFavoriteFromListAction } from "../service";

type BuyerFavoritePetCardProps = {
  pet: PublicPetListItem;
};

export function BuyerFavoritePetCard({ pet }: BuyerFavoritePetCardProps) {
  const router = useRouter();
  const [isRemoving, setIsRemoving] = useState(false);
  const [isRemoved, setIsRemoved] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const detailHref = getPublicPetDetailPath(pet.id);
  const attributeLine = formatPublicPetAttributeLine({
    species: pet.species,
    breed: pet.breed,
    sex: pet.sex,
    birthday: pet.birthday,
  });
  const breederLine = formatPublicBreederLocation(pet.breederBusinessName, pet.breederPrefecture);

  if (isRemoved) {
    return null;
  }

  async function handleRemove() {
    setIsRemoving(true);
    setErrorMessage(null);

    try {
      const result = await removeFavoriteFromListAction(pet.id);

      if (!result.success) {
        setErrorMessage(result.error);
        return;
      }

      setIsRemoved(true);
      router.refresh();
    } finally {
      setIsRemoving(false);
    }
  }

  return (
    <Card className="overflow-hidden border-[var(--border)] bg-white shadow-sm">
      <div className="aspect-[16/9] bg-neutral-100">
        {pet.mainPhotoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={pet.mainPhotoUrl}
            alt={pet.publicDisplayName}
            className="size-full object-cover"
          />
        ) : (
          <div className="flex size-full items-center justify-center text-sm text-neutral-400">
            写真未登録
          </div>
        )}
      </div>
      <CardContent className="space-y-3 p-4">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold text-neutral-900">{pet.publicDisplayName}</h2>
          <p className="text-sm text-neutral-600">{attributeLine}</p>
        </div>

        <p className="text-base font-semibold text-neutral-900">{formatPetPrice(pet.price)}</p>
        <p className="text-sm text-neutral-600">{breederLine}</p>

        <div className="grid gap-2">
          <Button asChild className="h-11 w-full rounded-xl">
            <Link href={detailHref}>詳細を見る</Link>
          </Button>
          <Button
            type="button"
            variant="outline"
            className="h-11 w-full rounded-xl border-[var(--border)]"
            onClick={handleRemove}
            disabled={isRemoving}
          >
            <Heart className="mr-2 size-4 fill-current text-[var(--primary)]" aria-hidden />
            {isRemoving ? "解除中..." : "お気に入りから外す"}
          </Button>
        </div>

        {errorMessage ? <p className="text-sm text-red-600">{errorMessage}</p> : null}
      </CardContent>
    </Card>
  );
}
