import { IntroductionStepForm, loadIntroductionProfile } from "@/features/breeder-profile";

export default async function BreederProfileIntroductionPage() {
  const initialInput = await loadIntroductionProfile();

  return <IntroductionStepForm initialInput={initialInput} />;
}
