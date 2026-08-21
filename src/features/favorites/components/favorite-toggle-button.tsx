"use client";

import { Heart } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import { addFavoriteAction, removeFavoriteAction } from "../service";
import type { PetFavoriteUiState } from "../types";

type FavoriteToggleButtonProps = {
  petId: string;
  initialState: PetFavoriteUiState;
};

export function FavoriteToggleButton({ petId, initialState }: FavoriteToggleButtonProps) {
  const router = useRouter();
  const [state, setState] = useState(initialState);
  const [isPending, setIsPending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (state.status === "hidden") {
    return null;
  }

  if (state.status === "guest") {
    return (
      <Button
        asChild
        variant="outline"
        className="h-11 rounded-xl border-[var(--border)] bg-white text-neutral-800 hover:bg-neutral-50"
      >
        <Link href={state.loginHref}>
          <Heart className="mr-2 size-4" aria-hidden />
          お気に入りに追加
        </Link>
      </Button>
    );
  }

  async function handleToggle() {
    if (state.status !== "buyer") {
      return;
    }

    setIsPending(true);
    setErrorMessage(null);

    try {
      const result = state.isFavorited
        ? await removeFavoriteAction(petId)
        : await addFavoriteAction(petId);

      if (!result.success) {
        setErrorMessage(result.error);
        return;
      }

      setState({ status: "buyer", isFavorited: result.isFavorited });
      router.refresh();
    } finally {
      setIsPending(false);
    }
  }

  const isFavorited = state.status === "buyer" && state.isFavorited;
  const label = isFavorited ? "お気に入り済み" : "お気に入りに追加";

  return (
    <div className="space-y-2">
      <Button
        type="button"
        variant="outline"
        className={cn(
          "h-11 w-full rounded-xl border font-medium sm:w-auto",
          isFavorited
            ? "border-transparent bg-[var(--primary)] text-[var(--primary-foreground)] shadow-sm hover:bg-[var(--primary)]/90"
            : "border-[var(--border)] bg-white text-neutral-800 hover:bg-neutral-50",
        )}
        onClick={handleToggle}
        disabled={isPending}
        aria-pressed={isFavorited}
      >
        <Heart className={cn("mr-2 size-4", isFavorited && "fill-current")} aria-hidden />
        {isPending ? "処理中..." : label}
      </Button>
      {errorMessage ? <p className="text-sm text-red-600">{errorMessage}</p> : null}
    </div>
  );
}
