import { ProfileWizardShell, loadBreederProfilePageContext } from "@/features/breeder-profile";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "ブリーダープロフィール",
};

export default async function BreederProfileLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const pageContext = await loadBreederProfilePageContext();

  return (
    <ProfileWizardShell resubmissionNotice={pageContext.resubmissionNotice}>
      {children}
    </ProfileWizardShell>
  );
}
