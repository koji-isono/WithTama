import { LegalPageShell } from "@/features/legal/components/legal-page-shell";
import { LegalNoticeContent } from "@/features/legal/components/legal-notice-content";

export const metadata = {
  title: "特定商取引法に基づく表記",
  description: "WithTama 特定商取引法に基づく表記",
};

export default function LegalNoticePage() {
  return (
    <LegalPageShell
      title="特定商取引法に基づく表記"
      description="WithTama ブリーダー月額会員サービスに関する表記です。犬猫販売は対象外です。"
    >
      <LegalNoticeContent />
    </LegalPageShell>
  );
}
