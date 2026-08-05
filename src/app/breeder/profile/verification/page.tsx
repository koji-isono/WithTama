import { loadVerificationStepState, VerificationStepForm } from "@/features/breeder-profile";

export default async function BreederProfileVerificationPage() {
  const initialState = await loadVerificationStepState();

  return <VerificationStepForm initialState={initialState} />;
}
