import { AlertCircle } from "lucide-react";

import { Alert, AlertDescription } from "@/components/ui/alert";

import { PET_LIST_SCREEN_ID } from "../constants";
import type { LoadBreederPetsResult } from "../types";
import { BreederPetsListContent } from "./breeder-pets-list-content";

type BreederPetsListProps = {
  result: LoadBreederPetsResult;
};

export function BreederPetsList({ result }: BreederPetsListProps) {
  if (!result.success) {
    return (
      <div className="mx-auto max-w-5xl px-4 py-6 pb-28 sm:py-10 sm:pb-10">
        <header className="mb-8 space-y-2">
          <p className="text-xs font-semibold tracking-widest text-[var(--primary)]">
            {PET_LIST_SCREEN_ID}
          </p>
          <h1 className="text-2xl font-bold sm:text-3xl">犬猫一覧</h1>
        </header>
        <Alert variant="destructive" className="border-red-200 bg-red-50 text-red-800">
          <AlertCircle className="size-4 text-red-600" />
          <AlertDescription>{result.error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return <BreederPetsListContent pets={result.pets} />;
}
