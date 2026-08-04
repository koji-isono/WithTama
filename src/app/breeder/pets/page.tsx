import { fetchPets } from "@/lib/supabase/pets";

import { PetFetchAlert } from "./pet-fetch-alert";
import { PetManagementList } from "./pet-management-list";

export const metadata = {
  title: "犬猫管理",
};

export const dynamic = "force-dynamic";

export default async function BreederPetsPage() {
  const result = await fetchPets();

  return (
    <>
      {!result.ok && <PetFetchAlert message={result.error} />}
      <PetManagementList pets={result.ok ? result.pets : []} />
    </>
  );
}
