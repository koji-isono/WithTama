import { loadPublicPetsPage, PublicPetsList } from "@/features/pets";

export const metadata = {
  title: "犬猫を探す",
};

export const dynamic = "force-dynamic";

export default async function PetsPage() {
  const result = await loadPublicPetsPage();

  return <PublicPetsList result={result} />;
}
