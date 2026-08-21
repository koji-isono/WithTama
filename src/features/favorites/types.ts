import type { PublicPetListItem } from "@/features/pets/types";

export type FavoriteRow = {
  id: string;
  buyer_id: string;
  pet_id: string;
  created_at: string;
};

export type PetFavoriteUiState =
  | { status: "guest"; loginHref: string }
  | { status: "buyer"; isFavorited: boolean }
  | { status: "hidden" };

export type FavoriteActionResult =
  { success: true; isFavorited: boolean } | { success: false; error: string };

export type BuyerFavoritesPageData = {
  pets: PublicPetListItem[];
};
