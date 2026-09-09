import Link from "next/link";

import { COMPANY_INFO, LEGAL_PRIVACY_PATH } from "../constants";
import { LegalList, LegalParagraph, LegalSection } from "./legal-page-shell";

export function TermsContent() {
  return (
    <>
      <LegalSection id="purpose" title="1. 目的">
        <LegalParagraph>
          本利用規約（以下「本規約」）は、{COMPANY_INFO.legalName}
          （以下「当社」）が提供する犬猫マッチングサービス「
          {COMPANY_INFO.serviceName}」（以下「本サービス」）の利用条件を定めるものです。
        </LegalParagraph>
        <LegalParagraph>
          本サービスは、ブリーダーと購入希望者が、犬猫の情報を通じて誠実な出会いを支援することを目的とします。
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="definitions" title="2. 定義">
        <LegalList
          items={[
            "「会員」とは、本規約に同意のうえ本サービスに登録した利用者をいいます。",
            "「購入希望者」とは、犬猫を家族として迎えたい目的で本サービスを利用する会員をいいます。",
            "「ブリーダー」とは、犬猫の掲載・ご縁対応等のために本サービスを利用する会員をいいます。",
            "「掲載情報」とは、犬猫、ブリーダー、問い合わせ、見学等に関する本サービス上の情報をいいます。",
            "「月額会費」とは、ブリーダー会員が本サービスの掲載機能等を利用するために支払う月額料金をいいます。",
          ]}
        />
      </LegalSection>

      <LegalSection id="platform-role" title="3. WithTamaの立場">
        <LegalParagraph>
          当社は、犬猫の販売主体ではありません。犬猫の売買契約は、ブリーダーと購入希望者の間で直接成立します。
        </LegalParagraph>
        <LegalParagraph>
          当社は、犬猫代金を受領せず、預からず、ブリーダーへの分配も行いません。犬猫代金のオンライン決済、予約金の預かり、配送手配、成約手数料の自動徴収は行いません。
        </LegalParagraph>
        <LegalParagraph>
          当社は、掲載・問い合わせ・見学等の機能を提供するプラットフォーム事業者です。
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="registration" title="4. 会員登録">
        <LegalParagraph>
          会員登録には、本規約および
          <Link
            href={LEGAL_PRIVACY_PATH}
            className="text-[var(--primary)] underline-offset-4 hover:underline"
          >
            プライバシーポリシー
          </Link>
          への同意が必要です。
        </LegalParagraph>
        <LegalParagraph>
          会員は、登録情報を正確かつ最新の状態に保つものとします。虚偽の登録、なりすまし、第三者のアカウント利用は禁止します。
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="buyer-responsibility" title="5. 購入希望者の責任">
        <LegalParagraph>
          購入希望者は、問い合わせ・見学・購入判断を自己の責任において行うものとします。
        </LegalParagraph>
        <LegalParagraph>
          犬猫の飼育環境、家族構成、経済的条件、アレルギー等を踏まえた上で、無理のない判断を行ってください。
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="visit-purchase" title="6. 見学・購入判断">
        <LegalParagraph>
          購入希望者は、可能な限り現地での見学を通じて犬猫の状態、性格、飼育環境等を確認したうえで購入を判断してください。
        </LegalParagraph>
        <LegalParagraph>
          当社は、購入希望者とブリーダー間の売買契約の成立、内容、履行について保証しません。
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="inspection" title="7. 現物確認・対面説明">
        <LegalParagraph>
          本サービスは、インターネットだけで犬猫の売買を完結させない設計です。ブリーダーは、見学等において現物確認および対面説明を行うものとします。
        </LegalParagraph>
        <LegalParagraph>
          ブリーダーは、本サービス上で見学完了時に現物確認・対面説明の実施有無を記録します。
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="breeder-review" title="8. ブリーダー登録・審査">
        <LegalParagraph>
          ブリーダーは、当社所定のプロフィール情報、第一種動物取扱業に関する情報、本人確認書類等を提出し、当社の審査を受けるものとします。
        </LegalParagraph>
        <LegalParagraph>
          当社は、提出情報の形式確認および運用上の審査を行いますが、書類の真正性・適法性について最終保証するものではありません。
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="listing" title="9. 犬猫掲載情報">
        <LegalParagraph>
          ブリーダーは、掲載する犬猫情報（写真、説明、価格、健康に関する記載等）を正確かつ最新の状態に保つものとします。
        </LegalParagraph>
        <LegalParagraph>
          虚偽、誇大、第三者の権利を侵害する掲載、法令に反する掲載は禁止します。当社は、掲載内容の事前確認を行う場合がありますが、すべての情報の正確性を保証するものではありません。
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="pet-price" title="10. 犬猫販売価格・追加費用">
        <LegalParagraph>
          本サービス上に表示される犬猫の参考価格は、原則として税抜表示です（例:
          250,000円（税抜））。価格未設定の場合はその旨を表示します。
        </LegalParagraph>
        <LegalParagraph>
          犬猫代金、ワクチン代、送迎費、その他ブリーダーが個別に提示する費用は、ブリーダーと購入希望者の間で直接取り決めます。当社はこれらの決済を行いません。
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="deposit" title="11. 予約金等">
        <LegalParagraph>
          予約金、内金その他の金銭の授受がある場合、それはブリーダーと購入希望者の間で直接行われるものとします。当社は予約金を預かりません。
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="external-listing" title="12. 他サイトへの掲載">
        <LegalParagraph>
          ブリーダーが他の媒体にも同一犬猫を掲載する場合、掲載情報の整合性および各媒体の規約遵守は、ブリーダーの責任において行ってください。
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="family-decided" title="13. 家族が決まった場合">
        <LegalParagraph>
          犬猫のご縁が決まった場合、ブリーダーは本サービス上の掲載状態を適切に更新するものとします（成約、公開停止等）。
        </LegalParagraph>
        <LegalParagraph>
          成約の記録は、サイト外で成立した売買に関する情報整理のため、本サービス上で行う場合があります。
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="health" title="14. 健康情報・健康保証">
        <LegalParagraph>
          ブリーダーは、健康状態に関する掲載および対面説明において、可能な範囲で正確な情報を提供するものとします。
        </LegalParagraph>
        <LegalParagraph>
          健康保証の有無、内容、期間等は、ブリーダーと購入希望者の間で直接取り決めます。当社は健康保証の当事者ではありません。
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="ai" title="15. AI文章作成支援">
        <LegalParagraph>
          当社は、将来、掲載文作成支援のために AI 機能を提供する場合があります。現時点で AI
          自動生成機能が提供されていない場合でも、将来提供される可能性があります。
        </LegalParagraph>
        <LegalParagraph>
          ブリーダーは、AI
          支援により作成された文章をそのまま掲載せず、内容の確認・修正を行ったうえで掲載するものとします。最終的な掲載内容の責任はブリーダーに帰属します。
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="ip" title="16. 写真・文章等の権利">
        <LegalParagraph>
          ブリーダーは、掲載に使用する写真・文章について、必要な権利を有し、第三者の権利を侵害しないものとします。
        </LegalParagraph>
        <LegalParagraph>
          ブリーダーは、当社に対し、本サービスの提供・宣伝・改善に必要な範囲で、掲載情報を利用する非独占的な利用許諾を付与するものとします。
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="membership-fee" title="17. ブリーダー月額会費">
        <LegalParagraph>
          ブリーダー会員は、本サービスの掲載機能等を利用するため、月額会費（5,000円（税込））を支払うものとします。決済は
          Stripe を通じて行います。
        </LegalParagraph>
        <LegalParagraph>
          課金開始は、ブリーダー審査承認後、ブリーダー本人が Stripe
          上で申込みを行い、決済が成功した時点からとします。
        </LegalParagraph>
        <LegalParagraph>
          詳細は
          <Link href="/legal" className="text-[var(--primary)] underline-offset-4 hover:underline">
            特定商取引法に基づく表記
          </Link>
          および月額会費画面をご確認ください。
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="cancellation" title="18. 解約">
        <LegalParagraph>
          ブリーダーは、Stripe Customer Portal
          等、当社所定の方法により、次回更新の停止（通常解約）を行うことができます。
        </LegalParagraph>
        <LegalParagraph>
          通常解約後も、既に支払済みの期間終了までは、原則として会員機能を利用できます。
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="payment-failure" title="19. 支払い失敗">
        <LegalParagraph>
          月額会費の支払いが確認できない場合、当社は Stripe
          の決済状態に基づき、掲載停止・利用制限等の措置を行うことがあります。
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="price-change" title="20. 料金改定">
        <LegalParagraph>
          当社は、月額会費を改定する場合、事前に本サービス上またはメール等で告知します。改定後の料金は、Stripe
          上の新しい Price 等を通じて適用されます。
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="receipts" title="21. 領収書・請求関連">
        <LegalParagraph>
          月額会費に関する請求書・領収書等は、第1期では Stripe
          が提供する機能を基本として利用します。
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="prohibited" title="22. 禁止事項">
        <LegalList
          items={[
            "法令または公序良俗に反する行為",
            "虚偽の登録・掲載・申告",
            "他者の権利、プライバシー、名誉を侵害する行為",
            "当社または第三者になりすます行為",
            "本サービスの運営を妨害する行為、不正アクセス",
            "犬猫の生命・安全を害するおそれのある行為",
            "当社を介さずに本サービス上で取得した連絡先を用いた、本サービスの目的外利用",
            "転売目的のみの利用（当社が不適切と判断する場合）",
            "その他、当社が不適切と判断する行為",
          ]}
        />
      </LegalSection>

      <LegalSection id="suspension" title="23. 掲載停止・利用制限">
        <LegalParagraph>
          当社は、規約違反、虚偽掲載、支払停止、生命・安全上の懸念、その他運用上必要と判断した場合、事前通知の有無を問わず、掲載停止・利用制限・会員資格停止等の措置を行うことができます。
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="reporting" title="24. 通報・調査">
        <LegalParagraph>
          当社は、通報その他の情報提供を受けた場合、事実確認、関係者への照会、資料提出依頼、掲載停止、利用制限等の対応を行うことができます。
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="privacy-ref" title="25. 個人情報">
        <LegalParagraph>
          個人情報の取扱いについては、
          <Link
            href={LEGAL_PRIVACY_PATH}
            className="text-[var(--primary)] underline-offset-4 hover:underline"
          >
            プライバシーポリシー
          </Link>
          をご確認ください。
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="identity-docs" title="26. 本人確認書類等">
        <LegalParagraph>
          ブリーダーが提出する本人確認書類、第一種動物取扱業登録証等は、一般公開されず、当社による本人確認・登録内容確認のために利用します。
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="after-withdrawal" title="27. 退会後の情報・責任">
        <LegalParagraph>
          会員退会後も、法令上保存が必要な情報、紛争対応に必要な情報、決済・審査記録等は、プライバシーポリシーに従い一定期間保持する場合があります。
        </LegalParagraph>
        <LegalParagraph>
          退会前に開始された問い合わせ・見学・売買に関する責任は、当事者間で引き続き負うものとします。
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="off-platform" title="28. サービス外での連絡">
        <LegalParagraph>
          購入希望者とブリーダーは、見学・売買に関する具体的な連絡・契約・代金授受を、原則として当事者間で直接行います。
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="service-changes" title="29. サービス変更・中断">
        <LegalParagraph>
          当社は、メンテナンス、障害、法令対応等により、本サービスの全部または一部を一時中断・変更することがあります。
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="service-termination" title="30. サービス終了">
        <LegalParagraph>
          当社は、本サービスを終了する場合、合理的な期間をもって告知します。終了時のデータ取扱いは、プライバシーポリシーおよび当社所定の方法に従います。
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="disclaimer" title="31. 免責・責任">
        <LegalParagraph>
          当社は、本サービス上の掲載情報、ブリーダーと購入希望者間の売買契約、犬猫の健康状態、性格、適合性等について保証しません。
        </LegalParagraph>
        <LegalParagraph>当社の責任範囲は、法令上認められる範囲に限定されます。</LegalParagraph>
      </LegalSection>

      <LegalSection id="terms-change" title="32. 規約変更">
        <LegalParagraph>
          当社は、必要に応じて本規約を変更できます。変更後の規約は、本サービス上に掲示した時点から効力を生じます。重要な変更については、合理的な方法で告知します。
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="governing-law" title="33. 準拠法・裁判管轄">
        <LegalParagraph>本規約は、日本法を準拠法とします。</LegalParagraph>
        <LegalParagraph>
          本サービスに関する紛争については、当社本店所在地を管轄する裁判所を第一審の専属的合意管轄裁判所とします。
        </LegalParagraph>
      </LegalSection>

      <LegalSection id="consent" title="34. 規約への同意">
        <LegalParagraph>
          会員は、本規約の内容を理解し、同意したうえで本サービスを利用するものとします。ブリーダー会員は、本規約に定めるブリーダー関連条項にも同意したものとみなします。
        </LegalParagraph>
      </LegalSection>
    </>
  );
}
