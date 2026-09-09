import { LegalPageShell } from "@/features/legal/components/legal-page-shell";
import { TermsContent } from "@/features/legal/components/terms-content";

export const metadata = {
  title: "利用規約",
  description: "WithTama 利用規約",
};

export default function TermsPage() {
  return (
    <LegalPageShell
      title="利用規約"
      description="WithTama サービス利用規約（購入希望者・ブリーダー共通、および各ロールに関する条項を含みます）。"
    >
      <TermsContent />
    </LegalPageShell>
  );
}
