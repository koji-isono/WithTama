export default async function PetDetailPage({ params }: { params: Promise<{ petId: string }> }) {
  const { petId } = await params;
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="text-3xl font-bold">犬猫詳細</h1>
      <p className="mt-3">ID: {petId}</p>
    </div>
  );
}
