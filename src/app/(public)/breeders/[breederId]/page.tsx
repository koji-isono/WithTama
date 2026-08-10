export default async function BreederPage({ params }: { params: Promise<{ breederId: string }> }) {
  const { breederId } = await params;
  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      <h1 className="text-3xl font-bold">ブリーダー詳細</h1>
      <p className="mt-3">ID: {breederId}</p>
    </div>
  );
}
