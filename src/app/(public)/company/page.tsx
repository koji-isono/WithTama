import { LegalPageShell } from "@/features/legal/components/legal-page-shell";
import { CompanyContent } from "@/features/legal/components/company-content";

export const metadata = {
  title: "運営会社",
  description: "WithTama 運営会社情報",
};

export default function CompanyPage() {
  return (
    <LegalPageShell
      title="運営会社"
      description="WithTama を運営する株式会社システムサイエンスの情報"
    >
      <CompanyContent />
    </LegalPageShell>
  );
}
