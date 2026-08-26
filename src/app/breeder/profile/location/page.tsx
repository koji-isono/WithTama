import { LocationStepForm, loadLocationProfile } from "@/features/breeder-profile";

export default async function BreederProfileLocationPage() {
  const initialInput = await loadLocationProfile();

  return <LocationStepForm initialInput={initialInput} />;
}
