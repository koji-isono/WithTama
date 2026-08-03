import { PetManagementList } from "./pet-management-list";

export const metadata = {
  title: "犬猫管理",
};

export default function BreederPetsPage() {
  return (
    <main className="min-h-screen bg-[var(--background)]">
      <PetManagementList />
    </main>
  );
}
