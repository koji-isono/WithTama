import { LegalPageShell } from "@/features/legal/components/legal-page-shell";
import { PrivacyContent } from "@/features/legal/components/privacy-content";

export const metadata = {
  title: "プライバシーポリシー",
  description: "WithTama プライバシーポリシー",
};

export default function PrivacyPage() {
  return (
    <LegalPageShell
      title="プライバシーポリシー"
      description="WithTama における個人情報の取扱いについて"
    >
      <PrivacyContent />
    </LegalPageShell>
  );
}
