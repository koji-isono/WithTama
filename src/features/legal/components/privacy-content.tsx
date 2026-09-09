import Link from "next/link";

import { COMPANY_INFO } from "../constants";
import { LegalList, LegalParagraph, LegalSection } from "./legal-page-shell";

export function PrivacyContent() {
  return (
    <>
      <LegalSection title="基本方針">
        <LegalParagraph>
          {COMPANY_INFO.legalName}（以下「当社」）は、本サービス「{COMPANY_INFO.serviceName}
          」において取得する個人情報を、個人情報保護法その他関連法令を遵守し、適切に取り扱います。
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="取得する情報">
        <LegalParagraph>
          当社は、本サービスの提供にあたり、以下の情報を取得する場合があります。
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="購入希望者から取得する情報">
        <LegalList
          items={[
            "氏名、表示名",
            "メールアドレス",
            "電話番号",
            "住所（都道府県、市区町村等）",
            "プロフィール文、希望条件",
            "問い合わせ内容、見学希望内容",
            "通知設定",
          ]}
        />
      </LegalSection>

      <LegalSection title="ブリーダーから取得する情報">
        <LegalList
          items={[
            "屋号、代表者名",
            "メールアドレス",
            "電話番号、住所",
            "第一種動物取扱業登録情報（種別、番号、自治体、有効期限等）",
            "本人確認書類、動物取扱業登録証（画像）",
            "繁殖・健康・飼育方針等のプロフィール情報",
            "犬猫掲載情報、写真",
          ]}
        />
      </LegalSection>

      <LegalSection title="問い合わせ・見学情報">
        <LegalParagraph>
          購入希望者とブリーダー間の問い合わせメッセージ、見学希望日時、見学結果、現物確認・対面説明の記録等を取得・保存します。
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="決済関連情報">
        <LegalParagraph>
          ブリーダー月額会費の決済は Stripe を利用します。当社 DB には Stripe 顧客
          ID、サブスクリプション ID、課金状態等を保持します。カード番号等の詳細な決済情報は Stripe
          が管理し、当社は正本として保持しません。
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="利用目的">
        <LegalList
          items={[
            "会員登録、本人確認、ログイン認証",
            "ブリーダー審査、掲載審査",
            "問い合わせ・見学機能の提供",
            "月額会費の請求・管理",
            "サービス改善、不正防止、サポート対応",
            "法令に基づく対応",
            "重要なお知らせの送信",
          ]}
        />
      </LegalSection>

      <LegalSection title="ブリーダーへの情報提供">
        <LegalParagraph>
          問い合わせ・見学機能において、購入希望者の必要な連絡情報および問い合わせ内容を、当該ブリーダーに提供します。
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="本人確認書類等の取扱い">
        <LegalParagraph>
          本人確認書類、第一種動物取扱業登録証は一般公開されません。当社による本人確認・登録内容確認、審査、法令対応のために利用します。
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="第三者提供">
        <LegalParagraph>
          当社は、法令に基づく場合を除き、本人の同意なく個人情報を第三者に提供しません。
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="業務委託">
        <LegalParagraph>
          当社は、本サービス運営のため、以下の外部サービスを利用しています。
        </LegalParagraph>
        <LegalList
          items={[
            "Supabase — 認証、データベース、ファイルストレージ（ホスティングリージョンは Supabase プロジェクト設定に依存）",
            "Stripe — ブリーダー月額会費の決済、請求・領収関連機能",
          ]}
        />
        <LegalParagraph>
          以下は .env.example
          等に設定例がありますが、現時点の本番コードでは個人情報送信に利用していません。
        </LegalParagraph>
        <LegalList
          items={[
            "Resend — メール送信（将来利用予定。現行のパスワードリセット等は Supabase Auth を利用）",
            "Dify — AI 連携（将来利用予定。第1期 UI 未提供）",
            "n8n — ワークフロー連携（将来利用予定）",
          ]}
        />
      </LegalSection>

      <LegalSection title="国外における情報の取扱い">
        <LegalParagraph>
          委託先サービスのサーバーが国外に所在する場合、当該国において個人情報が取り扱われることがあります。委託先の選定および契約内容は、当社の安全管理基準に従います。
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="Cookie等">
        <LegalParagraph>
          本サービスは、ログイン状態の維持等のために Cookie および類似技術を使用します（Supabase
          Auth セッション等）。
        </LegalParagraph>
        <LegalParagraph>
          第1期では、マーケティング目的のアクセス解析 Cookie（Google Analytics
          等）は導入していません。Stripe Checkout 遷移時には、Stripe 側で Cookie
          が使用される場合があります。
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="管理者による情報閲覧">
        <LegalParagraph>
          当社の管理者は、審査、サポート、不正調査、法令対応のために、必要な範囲で会員情報・掲載情報・問い合わせ情報等にアクセスします。
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="安全管理措置">
        <LegalParagraph>
          当社は、アクセス制御、通信の暗号化、権限管理、委託先の監督等、個人情報の漏えい・滅失・毀損の防止に必要な措置を講じます。
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="保存期間">
        <LegalParagraph>
          個人情報は、利用目的の達成に必要な期間保存します。退会後も、法令上必要な期間、紛争対応、決済・審査記録の保持のために一定期間保存する場合があります。
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="退会・削除">
        <LegalParagraph>
          会員は、当社所定の方法により退会を申請できます。退会後の情報削除・匿名化については、法令および運用上の必要に応じて対応します。
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="開示・訂正・削除等">
        <LegalParagraph>
          本人から、個人情報の開示、訂正、利用停止、削除等の請求があった場合、本人確認のうえ、法令に従い対応します。
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="本人から直接取得する場合の案内">
        <LegalParagraph>
          問い合わせフォーム、見学申込み、プロフィール入力等を通じて、利用目的を明示したうえで情報を取得します。
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="ブリーダーによる個人情報管理">
        <LegalParagraph>
          ブリーダーは、購入希望者から提供された個人情報を、問い合わせ・見学・売買対応の目的の範囲でのみ利用し、適切に管理するものとします。
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="未成年者">
        <LegalParagraph>
          未成年者が本サービスを利用する場合、保護者の同意を得たうえで利用してください。
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="ポリシー変更">
        <LegalParagraph>
          当社は、必要に応じて本ポリシーを変更できます。変更後の内容は本ページに掲示します。
        </LegalParagraph>
      </LegalSection>

      <LegalSection title="問い合わせ窓口">
        <LegalParagraph>
          個人情報の取扱いに関するお問い合わせ: {COMPANY_INFO.email}
          <br />
          {COMPANY_INFO.legalName}
          <br />〒{COMPANY_INFO.postalCode} {COMPANY_INFO.address}
          <br />
          電話: {COMPANY_INFO.phone}（{COMPANY_INFO.businessHours}）
        </LegalParagraph>
        <LegalParagraph>
          <Link
            href="/company"
            className="text-[var(--primary)] underline-offset-4 hover:underline"
          >
            運営会社情報
          </Link>
          もあわせてご確認ください。
        </LegalParagraph>
      </LegalSection>
    </>
  );
}
