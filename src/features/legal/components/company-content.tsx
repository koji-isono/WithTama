import Link from "next/link";

import { COMPANY_INFO } from "../constants";
import { LegalList, LegalParagraph, LegalSection } from "./legal-page-shell";

export function CompanyContent() {
  return (
    <>
      <LegalSection title="WithTamaについて">
        <LegalParagraph>
          {COMPANY_INFO.serviceName}は、{COMPANY_INFO.legalName}
          が運営する、犬猫とご家族の出会いを支援する Web サービスです。
        </LegalParagraph>
        <p className="text-base font-medium text-neutral-900">{COMPANY_INFO.tagline}</p>
        <LegalParagraph>
          性格、健康状態、育った環境、ブリーダーの想いまで。大切な家族との誠実な出会いを支えます。
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="運営会社情報">
        <LegalList
          items={[
            `商号: ${COMPANY_INFO.legalName}`,
            `代表者: ${COMPANY_INFO.representative}`,
            `所在地: 〒${COMPANY_INFO.postalCode} ${COMPANY_INFO.address}`,
            `電話: ${COMPANY_INFO.phone}（${COMPANY_INFO.businessHours}）`,
            `メール: ${COMPANY_INFO.email}`,
            `Web: ${COMPANY_INFO.website}`,
          ]}
        />
      </LegalSection>

      <LegalSection title="WithTamaの役割">
        <LegalParagraph>
          当社は、犬猫の販売主体ではありません。ブリーダーと購入希望者が、情報を通じて出会い、現地での確認を経て、売買契約を直接結ぶことを支援します。
        </LegalParagraph>
        <LegalParagraph>
          犬猫代金の決済・預かり・分配、配送手配、成約手数料の自動徴収は行いません。
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="ブリーダー確認について">
        <LegalParagraph>
          ブリーダーは、プロフィール情報、第一種動物取扱業に関する情報、本人確認書類等を提出し、当社の審査を受けます。
        </LegalParagraph>
        <LegalParagraph>
          当社は運用上の確認・審査を行いますが、すべての情報の真正性・適法性を保証するものではありません。
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="犬猫を迎えるまで">
        <LegalParagraph>
          本サービスは、インターネットだけで売買を完結させません。問い合わせ、見学、現物確認、対面説明を通じて、ご家族に合うかどうかを慎重に判断してください。
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="犬猫の生命・安全について">
        <LegalParagraph>
          犬猫の生命・安全を最優先に考え、虚偽掲載、不適切な販売、虐待の疑い等については、通報・調査・掲載停止・利用制限等の対応を行います。
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="AI利用について">
        <LegalParagraph>
          第1期の現行 UI では、AI
          による掲載文自動生成機能は提供していません。将来提供する場合、ブリーダーによる内容確認を前提とします。
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="問い合わせ窓口">
        <LegalParagraph>
          メール: {COMPANY_INFO.email}
          <br />
          電話: {COMPANY_INFO.phone}（{COMPANY_INFO.businessHours}）
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="関連ページ">
        <LegalList
          items={[
            "利用規約 → /terms",
            "プライバシーポリシー → /privacy",
            "特定商取引法に基づく表記 → /legal",
          ]}
        />
        <p className="flex flex-wrap gap-3 pt-2 text-sm">
          <Link href="/terms" className="text-[var(--primary)] underline-offset-4 hover:underline">
            利用規約
          </Link>
          <Link
            href="/privacy"
            className="text-[var(--primary)] underline-offset-4 hover:underline"
          >
            プライバシーポリシー
          </Link>
          <Link href="/legal" className="text-[var(--primary)] underline-offset-4 hover:underline">
            特定商取引法に基づく表記
          </Link>
        </p>
      </LegalSection>
    </>
  );
}
