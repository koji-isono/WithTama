import { BasicInfoStepForm, loadBasicProfile } from "@/features/breeder-profile";

export default async function BreederProfileBasicPage() {
  const initialInput = await loadBasicProfile();

  return <BasicInfoStepForm initialInput={initialInput} />;
}
