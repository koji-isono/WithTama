import Link from "next/link";

import { BREEDER_MONTHLY_FEE_TAX_INCLUSIVE_LABEL, COMPANY_INFO } from "../constants";
import { LegalList, LegalParagraph, LegalSection } from "./legal-page-shell";

export function LegalNoticeContent() {
  return (
    <>
      <LegalSection title="販売事業者">
        <LegalParagraph>{COMPANY_INFO.legalName}</LegalParagraph>
        <LegalParagraph>代表者: {COMPANY_INFO.representative}</LegalParagraph>
        <LegalParagraph>
          〒{COMPANY_INFO.postalCode}
          <br />
          {COMPANY_INFO.address}
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="お問い合わせ">
        <LegalParagraph>
          電話: {COMPANY_INFO.phone}（{COMPANY_INFO.businessHours}）
          <br />
          メール: {COMPANY_INFO.email}
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="販売価格（対象サービス）">
        <LegalParagraph>
          本ページが対象とするのは、当社がブリーダー会員に提供する「{COMPANY_INFO.serviceName}
          」の月額会員サービスです。
        </LegalParagraph>
        <LegalParagraph>{BREEDER_MONTHLY_FEE_TAX_INCLUSIVE_LABEL}</LegalParagraph>
        <LegalParagraph>第1期における無料お試し期間はありません。</LegalParagraph>
      </LegalSection>

      <LegalSection title="商品代金以外の必要料金">
        <LegalParagraph>
          インターネット接続に必要な通信料等は、会員の負担となります。
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="支払方法">
        <LegalParagraph>第1期は、クレジットカード決済（Stripe）を基本とします。</LegalParagraph>
      </LegalSection>

      <LegalSection title="支払時期">
        <LegalParagraph>
          初回は Stripe Checkout
          における申込み・決済成功時。以降は毎月自動更新（サブスクリプション）により課金されます。
        </LegalParagraph>
        <LegalParagraph>
          課金開始は、ブリーダー審査承認後、ブリーダー本人が Stripe
          で申込みを行い、決済が成功した時点からです。
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="サービス提供時期">
        <LegalParagraph>
          決済成功後、当社システムへの反映完了後、ブリーダー会員機能（掲載等）が利用可能になります。反映に時間がかかる場合があります。
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="解約・返金">
        <LegalParagraph>
          通常解約は、次回更新の停止により行います。解約後も、既に支払済みの期間終了までは原則利用可能です。
        </LegalParagraph>
        <LegalParagraph>通常解約による日割り返金は、原則行いません。</LegalParagraph>
      </LegalSection>

      <LegalSection title="領収書・請求関連">
        <LegalParagraph>
          第1期では、Stripe が提供する請求・領収関連機能を基本として利用します。
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="動作環境">
        <LegalParagraph>
          本サービスは Web ブラウザ上で動作します。推奨環境は、各 OS
          の最新版ブラウザ（Chrome、Safari、Edge 等）です。
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="犬猫販売について（重要）">
        <LegalParagraph>
          当社は、犬猫の販売主体ではありません。犬猫の売買契約は、ブリーダーと購入希望者の間で直接成立します。
        </LegalParagraph>
        <LegalList
          items={[
            "当社は犬猫代金を受領しません",
            "当社は予約金を預かりません",
            "当社は犬猫代金の Stripe 決済を行いません",
            "当社は犬猫の配送手配を行いません",
          ]}
        />
        <LegalParagraph>
          本サービス上に表示される犬猫の参考価格は、ブリーダーが設定する税抜価格です。詳細は
          <Link href="/terms" className="text-[var(--primary)] underline-offset-4 hover:underline">
            利用規約
          </Link>
          をご確認ください。
        </LegalParagraph>
      </LegalSection>
    </>
  );
}
