import { BreederPetsList, loadBreederPets } from "@/features/pets";

export const metadata = {
  title: "犬猫一覧",
};

export default async function BreederPetsPage() {
  const result = await loadBreederPets();

  return <BreederPetsList result={result} />;
}
