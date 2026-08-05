import { ProfileWizardShell } from "@/features/breeder-profile";

export const metadata = {
  title: "ブリーダープロフィール",
};

export default function BreederProfileLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <ProfileWizardShell>{children}</ProfileWizardShell>;
}
