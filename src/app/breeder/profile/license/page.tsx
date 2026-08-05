import { LicenseStepForm, loadLicenseProfile } from "@/features/breeder-profile";

export default async function BreederProfileLicensePage() {
  const initialInput = await loadLicenseProfile();

  return <LicenseStepForm initialInput={initialInput} />;
}
