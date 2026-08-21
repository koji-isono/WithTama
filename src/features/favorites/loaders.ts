import "server-only";

import { getCurrentBuyer, requireBuyer } from "@/features/auth/buyer-auth";
import { getBuyerProfileByUserId } from "@/features/buyers/repository";
import { getPublicPetDetailPath } from "@/features/pets/constants";
import { listPublishedPetsForPublicByIds } from "@/features/pets/public-repository";

import { getFavoriteByBuyerAndPet, listFavoritesByBuyerId } from "./repository";
import type { BuyerFavoritesPageData, PetFavoriteUiState } from "./types";

export async function loadPetFavoriteUiState(petId: string): Promise<PetFavoriteUiState> {
  const buyerUser = await getCurrentBuyer();

  if (!buyerUser) {
    const loginHref = `/login?next=${encodeURIComponent(getPublicPetDetailPath(petId))}`;

    return { status: "guest", loginHref };
  }

  const buyer = await getBuyerProfileByUserId(buyerUser.id);

  if (!buyer) {
    return { status: "hidden" };
  }

  const favorite = await getFavoriteByBuyerAndPet(buyer.id, petId);

  return {
    status: "buyer",
    isFavorited: favorite != null,
  };
}

export async function loadBuyerFavoritesPageData(): Promise<BuyerFavoritesPageData> {
  const user = await requireBuyer();
  const buyer = await getBuyerProfileByUserId(user.id);

  if (!buyer) {
    return { pets: [] };
  }

  const favorites = await listFavoritesByBuyerId(buyer.id);
  const petIds = favorites.map((favorite) => favorite.pet_id);

  if (petIds.length === 0) {
    return { pets: [] };
  }

  const pets = await listPublishedPetsForPublicByIds(petIds);

  return { pets };
}
