import { notFound } from "next/navigation";

import { loadPublicPetDetailPage, PublicPetDetailView } from "@/features/pets";

export const dynamic = "force-dynamic";

type PetDetailPageProps = {
  params: Promise<{ petId: string }>;
};

export async function generateMetadata({ params }: PetDetailPageProps) {
  const { petId } = await params;
  const result = await loadPublicPetDetailPage(petId);

  if (!result.success) {
    return { title: "犬猫詳細" };
  }

  return {
    title: result.detail.publicDisplayName,
  };
}

export default async function PetDetailPage({ params }: PetDetailPageProps) {
  const { petId } = await params;
  const result = await loadPublicPetDetailPage(petId);

  if (!result.success && "notFound" in result && result.notFound) {
    notFound();
  }

  return <PublicPetDetailView result={result} />;
}
