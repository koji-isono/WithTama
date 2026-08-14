import Link from "next/link";
import { ImageOff } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

import { getPublicPetDetailPath } from "../constants";
import {
  formatPetPrice,
  formatPublicBreederLocation,
  formatPublicPetAttributeLine,
} from "../list-format";
import type { PublicPetListItem } from "../types";

type PublicPetCardProps = {
  pet: PublicPetListItem;
};

export function PublicPetCard({ pet }: PublicPetCardProps) {
  const detailHref = getPublicPetDetailPath(pet.id);
  const attributeLine = formatPublicPetAttributeLine({
    species: pet.species,
    breed: pet.breed,
    sex: pet.sex,
    birthday: pet.birthday,
  });
  const breederLine = formatPublicBreederLocation(pet.breederBusinessName, pet.breederPrefecture);

  return (
    <Card className="overflow-hidden border-[var(--border)] bg-white shadow-sm transition-shadow hover:shadow-md">
      <Link
        href={detailHref}
        className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--primary)] focus-visible:ring-offset-2"
      >
        <div className="aspect-[16/9] bg-neutral-100">
          {pet.mainPhotoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={pet.mainPhotoUrl}
              alt={pet.publicDisplayName}
              className="size-full object-cover"
            />
          ) : (
            <div className="flex size-full flex-col items-center justify-center gap-2 text-neutral-400">
              <ImageOff className="size-10" aria-hidden />
              <span className="text-xs">写真未登録</span>
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

          <div className="flex h-10 w-full items-center justify-center rounded-full border border-[var(--border)] text-sm font-medium text-neutral-800">
            詳細を見る
          </div>
        </CardContent>
      </Link>
    </Card>
  );
}
