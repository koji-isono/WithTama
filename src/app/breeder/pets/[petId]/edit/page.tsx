import { notFound } from "next/navigation";

import { loadPetEditPageData, PetEditForm } from "@/features/pets";

type BreederPetEditPageProps = {
  params: Promise<{ petId: string }>;
};

export async function generateMetadata({ params }: BreederPetEditPageProps) {
  const { petId } = await params;

  return {
    title: `犬猫情報編集 (${petId.slice(0, 8)}…)`,
  };
}

export default async function BreederPetEditPage({ params }: BreederPetEditPageProps) {
  const { petId } = await params;
  const initialData = await loadPetEditPageData(petId);

  if (!initialData) {
    notFound();
  }

  return <PetEditForm initialData={initialData} />;
}
