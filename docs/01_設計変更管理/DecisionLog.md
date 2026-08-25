# Decision Log（設計変更管理）

設計上の重要な判断を記録します。番号は欠番を許容し、時系列で追記します。

---

## Decision No.22

**犬猫管理画面はカード表示のみ**

- 一覧表示はテーブルではなくカード UI とする
- スマホ優先のレスポンシブ設計に適合させる
- 参照: [BR-07 犬猫管理一覧](../04_画面設計/BR-07_犬猫管理一覧.md)

---

## Decision No.23

**管理名と公開表示名を分ける**

- ブリーダー向け管理名（内部用）と、一般公開向け表示名を別フィールドで保持する
- 管理名は一覧・編集画面で使用し、公開名は購入者向け画面で使用する

---

## Decision No.24

**写真はドラッグ＆ドロップ対応**

- 犬猫写真のアップロード・並び替えはドラッグ＆ドロップ UI を採用する
- モバイルではタップ操作も併用可能とする

---

## Decision No.25

**犬猫登録は3ステップ**

- 新規登録フローは次の3ステップとする
  1. 基本情報
  2. 写真
  3. 確認・公開設定
- 参照: [BR-08 犬猫新規登録](../04_画面設計/BR-08_犬猫新規登録.md)

---

## Decision No.28

**デザインシステム採用**

- UI コンポーネントは shadcn/ui をベースとする
- スタイリングは Tailwind CSS で統一する
- 参照: [デザインシステム](../08_デザインシステム/README.md)

---

## Decision No.29

**コンポーネント命名規則**

- shadcn/ui 由来の汎用コンポーネント … `src/components/ui/` 配下、PascalCase（例: `Button`, `Card`）
- ドメイン固有コンポーネント … `src/components/{ドメイン}/` 配下、機能を表す PascalCase（例: `PetManagementList`）
- ページ専用コンポーネント … 該当 `app/` 配下に colocation 可能

---

## Decision No.30

**犬種・猫種は第1期では自由入力とする**

- **決定内容:** `pets.breed` は第1期ではマスターテーブルを設けず、自由入力 text とする。
- **理由:** 第1期は登録・掲載フローの実装を優先し、犬種マスター整備は後工程とする。
- **影響範囲:** BR-08 犬猫新規登録、BR-09 犬猫編集、`pets` テーブル、バリデーション
- **決定日:** 2026-08-04
- **参照:** [pets テーブル](../05_データベース設計/pets.md)

**犬猫の管理名と公開表示名を分離する**

- **決定内容:** `pets.management_name`（内部管理用）と `pets.public_display_name`（公開用）を別カラムで保持する。
- **理由:** ブリーダーの内部呼称と、購入希望者への表示名は用途が異なるため（Decision No.23 を DB 設計に反映）。
- **影響範囲:** `pets` テーブル、BR-07 / BR-08 / BR-09、公開画面（犬猫詳細）
- **決定日:** 2026-08-04
- **参照:** [pets テーブル](../05_データベース設計/pets.md)

---

## Decision No.32

**犬猫種別を species で保持し、dog / cat に限定する**

- **決定内容:** `pets.species` カラムを追加し、値は `dog` または `cat` のみ許可する。
- **理由:** 犬と猫で表示・検索・将来の絞り込み要件が異なるため、種別を明示的に保持する。
- **影響範囲:** `pets` テーブル、TypeScript 型、登録フォーム、公開一覧の絞り込み
- **決定日:** 2026-08-04
- **参照:** [pets テーブル](../05_データベース設計/pets.md)

---

## Decision No.33

**pets.status は 6 種類に固定する**

- **決定内容:** `pets.status` は `draft` / `under_review` / `published` / `paused` / `family_decided` / `closed` の 6 値のみ許可する。
- **理由:** 掲載ライフサイクル（下書き→審査→公開→停止/決定/クローズ）を明確に管理するため。
- **影響範囲:** `pets` テーブル、BR-07 掲載状態フィルター、審査・公開フロー、管理者画面（将来）
- **決定日:** 2026-08-04
- **参照:** [pets テーブル](../05_データベース設計/pets.md)

---

## Decision No.34

**販売価格は price、価格補足は price_comment で分離管理する**

- **決定内容:** 税込販売価格は `pets.price`（integer、円単位）、補足説明は `pets.price_comment`（text）に分離する。
- **理由:** 価格数値と「ワクチン費用込み」等の説明文は性質が異なり、表示・更新単位も分けるため。
- **影響範囲:** `pets` テーブル、公開画面の価格表示、BR-08 / BR-09 入力フォーム
- **決定日:** 2026-08-04
- **参照:** [pets テーブル](../05_データベース設計/pets.md)

---

## Decision No.35

**犬猫写真は pet_photos テーブルで複数管理する**

- **決定内容:** 写真メタデータは `pet_photos` テーブルで管理し、画像本体は Supabase Storage、DB には `storage_path` のみ保存する。
- **理由:** 1 匹につき複数枚の写真・表示順・メイン写真指定が必要なため（Decision No.24 と整合）。
- **影響範囲:** `pet_photos` テーブル、Storage 設計、BR-08 写真ステップ、BR-07 写真枚数表示
- **決定日:** 2026-08-04
- **参照:** [pet_photos テーブル](../05_データベース設計/pet_photos.md)

---

## Decision No.36

**犬猫データは物理削除せず、deleted_at による論理削除を採用する**

- **決定内容:** `pets.deleted_at` を設定して論理削除する。`deleted_at IS NULL` の行を通常表示対象とする。
- **理由:** 誤削除防止、監査・復旧のため。関連データ（`pet_photos` 等）との整合を保ちやすい。
- **影響範囲:** `pets` テーブル、Repository クエリ（`fetchPets` 等）、BR-07 一覧、将来の管理画面
- **決定日:** 2026-08-04
- **参照:** [pets テーブル](../05_データベース設計/pets.md)

---

## Decision No.37

**犬猫情報に temperament を追加し、紹介文とは別に性格を管理する**

- **決定内容:** `pets.temperament`（text, NULL 可）を追加。公開紹介文 `description` とは別フィールドとする。
- **理由:** 性格・気質は紹介文全体とは性質が異なり、検索・表示・入力単位を分離するため。
- **影響範囲:** `pets` テーブル、BR-08 / BR-09 入力フォーム、公開画面
- **決定日:** 2026-08-04
- **参照:** [pets テーブル](../05_データベース設計/pets.md)

---

## Decision No.38

**表示順管理のため display_order を追加する**

- **決定内容:** `pets.display_order`（integer, NOT NULL, default 0）を追加。0 以上。
- **理由:** ブリーダー向け一覧で犬猫の表示順を制御するため。
- **影響範囲:** `pets` テーブル、BR-07 一覧ソート、将来の並び替え UI
- **決定日:** 2026-08-04
- **参照:** [pets テーブル](../05_データベース設計/pets.md)

---

## Decision No.39

**作成者・更新者追跡のため created_by、updated_by を追加する**

- **決定内容:** `pets.created_by` / `pets.updated_by`（uuid, NULL 可）を追加。
- **理由:** 認証接続後の監査・責任追跡のため。
- **影響範囲:** `pets` テーブル、Server Actions、認証 middleware（将来）
- **決定日:** 2026-08-04
- **参照:** [pets テーブル](../05_データベース設計/pets.md)

---

## Decision No.40

**AI 文章生成日時を ai_generated_at で保持する**

- **決定内容:** `pets.ai_generated_at`（timestamptz, NULL 可）を追加。AI 下書き `ai_description` の生成日時を記録する。
- **理由:** AI 生成文の鮮度・再生成判断・監査のため。
- **影響範囲:** `pets` テーブル、AI 紹介文生成機能（BR-07 / BR-09）
- **決定日:** 2026-08-04
- **参照:** [pets テーブル](../05_データベース設計/pets.md)

---

## Decision No.41

**breeders.id と breeders.user_id を分離する**

- **決定内容:** ブリーダー事業者 ID（`breeders.id`）と認証ユーザー ID（`breeders.user_id` → `auth.users.id`）を別カラムで保持し、1 対 1 で紐付ける。
- **理由:** 認証基盤と事業者プロフィールの責務を分離し、`pets.breeder_id` 等の参照先を安定させるため。
- **影響範囲:** `breeders` テーブル、認証フロー、`pets.breeder_id` FK（将来）、RLS
- **決定日:** 2026-08-04
- **参照:** [breeders テーブル](../05_データベース設計/breeders.md)

---

## Decision No.42

**ブリーダー基本情報の標準項目を採用する**

- **決定内容:** 屋号・代表者名・プロフィール・繁殖/健康/飼育方針・連絡先・第一種動物取扱業登録情報等、標準カラムセットを `breeders` テーブルに定義する。
- **理由:** ブリーダー審査・公開プロフィール・法令対応に必要な情報を一覧管理するため。
- **影響範囲:** `breeders` テーブル、ブリーダー登録・プロフィール画面、管理者審査画面（将来）
- **決定日:** 2026-08-04
- **参照:** [breeders テーブル](../05_データベース設計/breeders.md)

---

## Decision No.43

**審査・登録証・課金状態を breeders テーブルで管理する**

- **決定内容:** 本人確認・登録証確認・審査状態・利用状態・Stripe 課金状態を `breeders` テーブルの status 系カラムで管理する。
- **理由:** ブリーダーの利用可否判定を一箇所に集約し、運用・画面表示を単純化するため。
- **影響範囲:** `breeders` テーブル、管理者審査フロー、Stripe Webhook 連携（将来）
- **決定日:** 2026-08-04
- **参照:** [breeders テーブル](../05_データベース設計/breeders.md)

---

## Decision No.44

**住所は都道府県・市区町村のみ一般公開し、番地は非公開とする**

- **決定内容:** 一般公開する住所は `prefecture` と `city` のみ。`postal_code`・`address_line`・`phone` は非公開。
- **理由:** ブリーダーのプライバシー保護と、公開プロフィールに必要な地域情報のバランスのため。
- **影響範囲:** 公開 API / View、ブリーダー詳細画面、見学フロー（詳細住所通知は別途定義）
- **決定日:** 2026-08-04
- **参照:** [breeders テーブル](../05_データベース設計/breeders.md)

---

## Decision No.45

**Stripe は顧客 ID、定期課金 ID、課金状態のみ保持し、請求情報の正本は Stripe とする**

- **決定内容:** WithTama DB には `stripe_customer_id` / `stripe_subscription_id` / `subscription_status` のみ保持。請求金額・履歴・支払い方法は Stripe を正本とする。
- **理由:** 請求データの二重管理を避け、PCI 関連リスクと同期コストを削減するため。
- **影響範囲:** `breeders` テーブル、Stripe 連携、課金管理画面（将来）
- **決定日:** 2026-08-04
- **参照:** [breeders テーブル](../05_データベース設計/breeders.md)

---

## Decision No.46

**メール認証後に breeders 仮レコードを作成し、review_status が draft の間は申請必須項目の未入力を許可する**

- **決定内容:** メール認証完了後に `public.breeders` へ仮レコードを自動作成する。`review_status = draft` の間は、審査申請に必要な基本情報・書類が未入力でも保存可能とする（該当カラムを NULL 許可）。
- **理由:** 会員登録直後の離脱を防ぎ、段階的にプロフィール・書類を入力してから審査申請（`submitted`）へ進める UX のため。
- **影響範囲:** `breeders` テーブル（Migration）、認証フロー、ブリーダー登録・プロフィール画面、審査申請 Server Action
- **決定日:** 2026-08-04
- **参照:** [breeders テーブル](../05_データベース設計/breeders.md)

---

## Decision No.52

**第1期のお気に入り対象は犬猫のみとする**

- **決定内容:** `public.favorites` は購入希望者（`buyers`）と犬猫（`pets`）の関係のみを管理する。第1期ではブリーダーをお気に入り対象にしない。
- **理由:** 第1期をシンプルに保つため。サービスの主目的は犬猫との出会いであるため。ブリーダーフォローは別概念のため分離した方が保守しやすい。
- **影響範囲:** `favorites` テーブル、購入希望者向けお気に入り画面、Repository（`src/lib/supabase/`）
- **将来方針:** ブリーダーフォロー機能は将来 `breeder_follows` テーブルとして分離する。
- **決定日:** 2026-08-04
- **参照:** [favorites テーブル](../05_データベース設計/favorites.md)

---

## Decision No.53

**問い合わせと見学を別テーブルで管理する**

- **決定内容:** 問い合わせ案件（`inquiries`）と見学（`visits`）を分離する。`inquiries` には `visit_id` を持たせず、`visits.inquiry_id` で関連付ける。
- **理由:** 問い合わせのみで完結するケースと、見学まで進むケースを同じモデルで扱うと状態管理が複雑になるため。
- **影響範囲:** `inquiries` / `visits` テーブル、問い合わせ画面、見学管理画面、Repository
- **将来方針:** 日程変更履歴は第2期以降に `visit_histories` テーブルとして検討する。
- **決定日:** 2026-08-04
- **参照:** [inquiries テーブル](../05_データベース設計/inquiries.md) / [visits テーブル](../05_データベース設計/visits.md)

---

## Decision No.54

**問い合わせ本体とメッセージ履歴を分離する**

- **決定内容:** 問い合わせ案件は `inquiries`、メッセージ本文は `inquiry_messages` で管理する。
- **理由:** 案件メタデータとメッセージ履歴のライフサイクル・RLS を分離し、一覧表示と履歴管理を単純化するため。
- **影響範囲:** `inquiries` / `inquiry_messages` テーブル、問い合わせ詳細画面、メッセージ送信 Server Action
- **将来方針:** リアルタイムチャット、添付ファイルは第2期以降に検討する。
- **決定日:** 2026-08-04
- **参照:** [inquiry_messages テーブル](../05_データベース設計/inquiry_messages.md)

---

## Decision No.55

**問い合わせメッセージは第1期ではテキストのみとする**

- **決定内容:** `inquiry_messages.message` はテキストのみ。画像、動画、添付ファイルは第1期対象外。送信済み本文の編集・削除も行わない。
- **理由:** 第1期をシンプルに保ち、Storage 連携やメディア管理の範囲を抑えるため。
- **影響範囲:** `inquiry_messages` テーブル、メッセージ入力 UI、RLS（UPDATE は既読のみ）
- **将来方針:** 添付ファイル対応は第2期以降に検討する。
- **決定日:** 2026-08-04
- **参照:** [inquiry_messages テーブル](../05_データベース設計/inquiry_messages.md)

---

## Decision No.56

**見学希望時に visits レコードを作成し、inquiry_id で関連付ける**

- **決定内容:** 購入希望者が見学希望した時点で `visits` を 1 件作成し、`inquiries.status` を `visit_requested` へ変更する。
- **理由:** 見学フロー（希望 → 確定 → 実施 → 結果）を独立した状態機械として管理するため。
- **影響範囲:** `visits` テーブル、見学希望 Server Action、問い合わせステータス更新
- **将来方針:** 複数回見学が必要になった場合は別途設計を見直す。
- **決定日:** 2026-08-04
- **参照:** [visits テーブル](../05_データベース設計/visits.md)

---

## Decision No.57

**1 問い合わせにつき 1 見学とし、日程変更は同一 visits レコードを更新する**

- **決定内容:** `visits.inquiry_id` に UNIQUE 制約を付け、1 問い合わせにつき 0 件または 1 件の見学とする。日程変更は同一レコードを UPDATE する。
- **理由:** 第1期の見学フローを単純化し、重複見学レコードによる不整合を防ぐため。
- **影響範囲:** `visits` テーブル、見学日程変更 Server Action
- **将来方針:** 日程変更履歴は第2期以降に `visit_histories` テーブルとして検討する。
- **決定日:** 2026-08-04
- **参照:** [visits テーブル](../05_データベース設計/visits.md)

---

## Decision No.58

**現物確認・対面説明は boolean で実施有無を管理する**

- **決定内容:** 見学時の現物確認は `animal_confirmed`、対面説明は `explanation_completed` で記録する。第1期では実施日時、担当者、電子署名は保持しない。
- **理由:** 第1期に必要な記録粒度を最小限に保ちつつ、見学結果の追跡を可能にするため。
- **影響範囲:** `visits` テーブル、ブリーダー見学記録画面
- **将来方針:** 詳細な記録（日時、担当者、電子署名等）は第2期以降に検討する。
- **決定日:** 2026-08-04
- **参照:** [visits テーブル](../05_データベース設計/visits.md)

---

## Decision No.61

**仮登録時はプロフィール項目の未入力を許可し、プロフィール入力完了状態を profile_completed で管理する**

- **決定内容:** 初回ログイン時に `buyers` / `breeders` へ仮レコードを作成する。プロフィール未入力項目は NULL 許可とし、完了状態は `profile_completed`（初期値 `false`）で管理する。完了時に `true` へ更新する。
- **理由:** 申請・プロフィール必須項目を NOT NULL のままにすると、仮レコードの INSERT が失敗するため。完了状態をフラグで持つことで、ログイン後の遷移制御を単純化する。
- **影響範囲:** `breeders` / `buyers` テーブル、初回ログイン処理（`src/features/auth/`）、プロフィール入力画面（将来）
- **初期値:** `profile_completed = false`
- **完了時:** アプリケーション側で `profile_completed = true` に更新
- **決定日:** 2026-08-05
- **参照:** [breeders テーブル](../05_データベース設計/breeders.md) / [buyers テーブル](../05_データベース設計/buyers.md)

---

## Decision No.62

**ロール別トップ URL は入口専用とし、profile_completed に応じてリダイレクトする**

- **決定内容:** `/breeder` および `/buyer` は画面を持たず、入口 URL のみとする。サーバー側で `profile_completed` を確認し、`false` の場合は `/breeder/profile` または `/buyer/profile` へ、`true` の場合は `/breeder/dashboard` または `/buyer/dashboard` へリダイレクトする。
- **理由:** ログイン後遷移と直接 URL アクセスの両方で、プロフィール未完了ユーザーを一貫してプロフィール入力へ誘導するため。ダッシュボード本体は `/dashboard` 配下に分離し、責務を明確化する。
- **影響範囲:** `src/app/breeder/page.tsx`、`src/app/(buyer)/buyer/page.tsx`、ダッシュボード・プロフィール各画面、ログイン後遷移（`getPostLoginPath`）、ブリーダーナビゲーション
- **決定日:** 2026-08-05
- **参照:** [画面設計 — 画面遷移](../04_画面設計/README.md#画面遷移)

---

## Decision No.64

**ブリーダープロフィールは 5 ステップのウィザード形式とする**

- **決定内容:** ブリーダープロフィール入力は次の 5 ステップで構成する。
  1. Step 1: 基本情報
  2. Step 2: 所在地
  3. Step 3: 第一種動物取扱業情報
  4. Step 4: ブリーダー紹介
  5. Step 5: 本人確認・登録証提出
- **理由:** 入力項目が多く一度に表示すると負担が大きいため。段階的に入力・確認できる UI とする。
- **影響範囲:** `/breeder/profile`、`src/features/breeder-profile/`、画面設計書 BR-09
- **決定日:** 2026-08-05
- **参照:** [BR-09 ブリーダープロフィール](../04_画面設計/BR-09_ブリーダープロフィール.md)

---

## Decision No.65

**プロフィール完成度は DB へ保存せず、入力状況から都度計算する**

- **決定内容:** プロフィール各ステップの入力率・完成度を専用カラムやテーブルに永続化しない。表示時に入力済みフィールドから都度算出する。完了判定の正本は引き続き `profile_completed`（Decision No.61）とする。
- **理由:** 完成度表示用の冗長データを持たず、入力内容そのものを正とするため。
- **決定日:** 2026-08-05
- **参照:** [BR-09 ブリーダープロフィール](../04_画面設計/BR-09_ブリーダープロフィール.md)

---

## Decision No.67

**プロフィールは URL 単位で 5 Step 管理する**

- **決定内容:** ブリーダープロフィールを 5 ページ構成とし、各 Step を独立した URL で管理する。`/breeder/profile` は入口のみとし、次のパスへ分割する。
  - `/breeder/profile/basic` — Step 1 基本情報
  - `/breeder/profile/location` — Step 2 所在地
  - `/breeder/profile/license` — Step 3 第一種動物取扱業情報
  - `/breeder/profile/introduction` — Step 4 ブリーダー紹介
  - `/breeder/profile/verification` — Step 5 本人確認・登録証提出
- **理由:** Step ごとに URL を持つことで、ブックマーク・直接アクセス・将来の保存・戻る操作を明確にするため。
- **影響範囲:** `src/app/breeder/profile/`、画面遷移、BR-09 設計書
- **決定日:** 2026-08-05
- **参照:** [画面設計 — ブリーダープロフィール遷移](../04_画面設計/README.md#ブリーダープロフィール遷移decision-no67)

---

## Decision No.68

**プロフィール共通 UI は layout.tsx へ集約する**

- **決定内容:** BR-09 ヘッダー（画面番号・タイトル・説明・Step 表示・プログレスバー）を `src/app/breeder/profile/layout.tsx` に集約する。各 Step ページは入力フォーム（またはプレースホルダー）のみを持つ。
- **理由:** 共通 UI の重複を避け、Step ページの責務をフォーム実装に限定するため。
- **影響範囲:** `src/app/breeder/profile/layout.tsx`、`src/features/breeder-profile/components/profile-wizard-shell.tsx`
- **決定日:** 2026-08-05
- **参照:** [BR-09 ブリーダープロフィール](../04_画面設計/BR-09_ブリーダープロフィール.md)

---

## Decision No.69

**プロフィール機能も Repository パターンを採用する**

- **決定内容:** ブリーダープロフィールの保存処理を `src/features/breeder-profile/` に集約し、Repository / Service / Validation に分離する。Repository は Supabase UPDATE のみ、Service はバリデーションと Repository 呼び出し、Validation は入力チェックを担当する。
- **理由:** 認証機能（`src/features/auth/`）と同様に、データアクセスとビジネスロジックを分離し、テスト・再利用を容易にするため。
- **影響範囲:** `src/features/breeder-profile/`、BR-09 Step 1、API 設計書
- **決定日:** 2026-08-05
- **参照:** [ブリーダープロフィール API](../06_API設計/breeder-profile.md)

---

## Decision No.70

**ブリーダー画面の最終構成を README へ反映する**

- **決定内容:** ブリーダー向け画面の URL 一覧、表示/編集の区分、App Router ディレクトリ構成、画面遷移図を [04_画面設計 README](../04_画面設計/README.md) に集約する。
- **理由:** 画面追加・実装時の参照先を一本化し、入口 URL・ダッシュボード・各編集 URL の関係を明確にするため。
- **影響範囲:** `docs/04_画面設計/`、`docs/README.md`
- **決定日:** 2026-08-05
- **参照:** [画面設計 — ブリーダー最終構成](../04_画面設計/README.md#ブリーダー画面--最終構成)

---

## Decision No.71

**ダッシュボードは表示専用とし、編集画面を持たない**

- **決定内容:** `/breeder/dashboard`（BR-06）はサマリー・アクティビティの表示と各機能への導線のみとする。プロフィール入力・犬猫編集・問い合わせ返信・設定変更のフォームはダッシュボード上に置かない。
- **理由:** 閲覧と編集の責務を分離し、URL・権限・実装の見通しを良くするため。
- **影響範囲:** BR-06、ダッシュボード UI、各機能へのリンク設計
- **決定日:** 2026-08-05
- **参照:** [BR-06 ブリーダーダッシュボード](../04_画面設計/BR-06_ブリーダーダッシュボード.md)

---

## Decision No.72

**編集画面はすべて URL 単位で管理する**

- **決定内容:** プロフィール・犬猫・問い合わせ・設定の編集 UI は、機能ごとに独立 URL を持つ。一覧やダッシュボード上のモーダル・インライン編集は採用しない。
  - プロフィール … `/breeder/profile/*`
  - 犬猫 … `/breeder/pets/new`, `/breeder/pets/[petId]/edit`
  - 問い合わせ … `/breeder/inquiries/[inquiryId]`
  - 設定 … `/breeder/settings/*`
- **理由:** ブックマーク、直接アクセス、戻る操作、Step 管理を URL で一貫させるため（プロフィールは Decision No.67 と整合）。
- **影響範囲:** ブリーダー全編集画面、`src/app/breeder/` ディレクトリ構成
- **決定日:** 2026-08-05
- **参照:** [画面設計 — 設計原則](../04_画面設計/README.md#設計原則)

---

## Decision No.73

**features 配下を機能単位に整理する**

- **決定内容:** ドメインロジックは `src/features/{機能名}/` に配置する。各 feature は README、`types`、`validation`（任意）、`repository`、`service`、`components` を基本構成とする。新規機能（犬猫・問い合わせ・設定）は同パターンで追加する。
- **理由:** `app/` を薄く保ち、認証・プロフィールと同様にテスト・再利用可能なモジュール境界を設けるため。
- **影響範囲:** `src/features/`、DB 設計 README のモジュール対応表、API 設計
- **決定日:** 2026-08-05
- **参照:** [src/features/README.md](../../src/features/README.md)

---

## Decision No.79

**郵便番号検索を前提とした UI を採用する**

- **決定内容:** ブリーダープロフィール Step 2「所在地」では、郵便番号入力欄を先頭に配置し、将来の郵便番号 API 連携で都道府県・市区町村を自動補完する UI を前提とする。第1期 Step 2 実装時点では API 連携は行わず手入力とする。
- **理由:** 住所入力の UX を早期に固定し、API 追加時にフォーム構成を変えずに拡張できるようにするため。
- **影響範囲:** `/breeder/profile/location`、BR-10 所在地、`validateLocationProfile`
- **決定日:** 2026-08-05
- **参照:** [BR-10 所在地](../04_画面設計/BR-10_所在地.md)

---

## Decision No.80

**所在地は事業所住所として管理する**

- **決定内容:** `breeders.postal_code` / `prefecture` / `city` / `address_line` はブリーダーの事業所所在地として管理する。代表者自宅など別用途の住所フィールドは持たない。
- **理由:** 第1期の掲載・審査・問い合わせフローで必要な住所は事業所住所に集約できるため。
- **影響範囲:** `breeders` テーブル、BR-10 所在地、`updateLocationProfile`
- **決定日:** 2026-08-05
- **参照:** [breeders テーブル](../05_データベース設計/breeders.md) / [BR-10 所在地](../04_画面設計/BR-10_所在地.md)

---

## Decision No.81

**犬猫管理機能を開始する**

- **決定内容:** Phase 7 としてブリーダー向け犬猫管理機能の実装を開始する。第1弾では `src/features/pets/` の Repository / Service / Validation 基盤と、`/breeder/pets`・`/breeder/pets/new` のプレースホルダー画面を整備する。
- **理由:** プロフィール入力完了後の主要業務フロー（犬猫登録・一覧管理）へ着手するため。
- **影響範囲:** `src/features/pets/`、`src/app/breeder/pets/*`、BR-07 / BR-08
- **決定日:** 2026-08-06
- **参照:** [BR-07 犬猫管理一覧](../04_画面設計/BR-07_犬猫管理一覧.md) / [src/features/pets/README.md](../../src/features/pets/README.md)

---

## Decision No.82

**犬猫管理も Repository パターンを採用する**

- **決定内容:** 犬猫管理機能もブリーダープロフィール（Decision No.69）と同様に、`features/pets/repository.ts`（Supabase 操作）→ `service.ts`（Server Actions・認証）→ `validation.ts`（入力チェック）の構成とする。
- **理由:** データアクセスとユースケースの責務分離をプロジェクト全体で統一するため。
- **影響範囲:** `src/features/pets/`、将来の BR-08 登録フォーム・BR-11 編集
- **決定日:** 2026-08-06
- **参照:** [Decision No.69](#decision-no69) / [src/features/pets/README.md](../../src/features/pets/README.md)

---

## Decision No.83

**犬猫の新規登録は必ず draft で作成する**

- **決定内容:** ブリーダーが犬猫を新規登録する際、`public.pets.status` は必ず `draft` で INSERT する。クライアントから `published` 等を直接指定できない。
- **理由:** 公開前に管理者審査を経るフローを担保するため。
- **影響範囲:** `createPet` / `createPetDraft`、`/breeder/pets/new`
- **決定日:** 2026-08-06
- **参照:** [BR-10 犬猫登録](../04_画面設計/BR-10_犬猫登録.md) / [pets テーブル](../05_データベース設計/pets.md)

---

## Decision No.84

**breeder_id はログインユーザーからサーバー側で解決する**

- **決定内容:** 犬猫登録時、`breeder_id` はクライアントから受け取らない。Server Action 内で `auth.getUser()` により取得した `user.id` から `public.breeders.user_id` を検索し、得られた `breeders.id` を保存する。
- **理由:** 他ブリーダーのデータへ書き込むリスクを防ぐため。
- **影響範囲:** `getBreederIdByUserId`、`createPetDraft`
- **決定日:** 2026-08-06
- **参照:** [BR-10 犬猫登録](../04_画面設計/BR-10_犬猫登録.md) / [src/features/pets/repository.ts](../../src/features/pets/repository.ts)

---

## Decision No.85

**犬猫編集では、ブリーダー本人が所有する犬猫だけを取得・更新できる**

- **決定内容:** `/breeder/pets/[petId]/edit` では、`getPetByIdForBreeder` / `updatePetDraft` により、ログインユーザーの `breeders.id` と一致する `pets.breeder_id` のレコードのみ取得・更新する。他ブリーダーの `petId` では `notFound()` とする。
- **理由:** データ漏洩と不正更新を防ぐため。
- **影響範囲:** `getPetByIdForBreeder`、`updatePetDraft`、`updatePetDraftAction`
- **決定日:** 2026-08-06
- **参照:** [BR-11 犬猫情報編集](../04_画面設計/BR-11_犬猫情報編集.md)

---

## Decision No.86

**犬猫の掲載ステータス変更は基本情報編集と分離する**

- **決定内容:** BR-11 犬猫情報編集画面では `status` を Badge 表示のみとし、フォームから更新しない。公開申請・ステータス変更は別操作で行う。
- **理由:** 基本情報の修正と掲載ライフサイクル管理の責務を分離するため。
- **影響範囲:** `/breeder/pets/[petId]/edit`、`updatePetDraft`
- **決定日:** 2026-08-06
- **参照:** [BR-11 犬猫情報編集](../04_画面設計/BR-11_犬猫情報編集.md)

---

## Decision No.87

**犬猫写真は非公開 Storage へ保存し、画面表示には Signed URL を使用する**

- **決定内容:** 犬猫写真は private バケット `pet-photos` に保存する。ブラウザ表示には `createSignedUrl`（有効期限 5 分以内）を使用し、公開 URL は発行しない。
- **理由:** ブリーダー管理画面専用の非公開アセットとして扱い、一般公開は犬猫公開画面実装時に別途設計するため。
- **影響範囲:** Storage Migration、`getPetPhotoSignedUrl`、`PetPhotoManager`
- **決定日:** 2026-08-06
- **参照:** [pet_photos テーブル](../05_データベース設計/pet_photos.md) / [BR-11](../04_画面設計/BR-11_犬猫情報編集.md)

---

## Decision No.88

**犬猫写真は1匹あたり最大10枚とし、メイン写真は1枚だけ設定できる**

- **決定内容:** アプリ側で 1 匹 10 枚上限を検証する。`is_main = true` は 1 件のみ。メイン変更時は PostgreSQL 関数 `set_main_pet_photo` で一括更新する。
- **理由:** 第1期の運用上限と一覧表示の整合を保つため。
- **影響範囲:** `validatePetPhotoUpload`、`setMainPetPhotoAction`、`set_main_pet_photo`
- **決定日:** 2026-08-06
- **参照:** [BR-11 犬猫情報編集](../04_画面設計/BR-11_犬猫情報編集.md)

---

## Decision No.89

**第1期では写真の並び替え、動画、画像編集を実装しない**

- **決定内容:** BR-11 写真セクションではアップロード・一覧・メイン設定・削除のみ。`display_order` の D&D 並び替え、動画、画像加工は将来対応とする。
- **理由:** 第1期スコープを基本 CRUD に限定するため。
- **影響範囲:** BR-11 写真 UI、`pet_photos.display_order`
- **決定日:** 2026-08-06
- **参照:** [BR-11 犬猫情報編集](../04_画面設計/BR-11_犬猫情報編集.md)

---

## Decision No.92

**犬猫一覧では、登録情報・メイン写真・掲載状態を一覧で確認できるようにする**

- **決定内容:** `/breeder/pets` で Card 形式の一覧を表示する。メイン写真（Signed URL）、公開表示名、管理名、基本属性、価格、status Badge、更新日時を確認できる。
- **理由:** ブリーダーが日常業務で登録犬猫を把握・管理するため。
- **影響範囲:** `loadBreederPets`、`BreederPetsList`、`listPetsWithMainPhotoByBreederUserId`
- **決定日:** 2026-08-07
- **参照:** [BR-10 犬猫一覧](../04_画面設計/BR-10_犬猫一覧.md)

---

## Decision No.93

**一覧画面から掲載ステータスを直接変更せず、公開申請等の業務操作は専用処理として分離する**

- **決定内容:** 犬猫一覧（BR-10）では status を Badge 表示とし、汎用的な status 変更 UI は設けない。公開申請は `submitPetForReviewAction` として専用実装する（Decision No.94）。公開停止・掲載終了は別操作とする。
- **理由:** 一覧表示と掲載ライフサイクル管理の責務を分離するため。
- **影響範囲:** `/breeder/pets`
- **決定日:** 2026-08-07
- **参照:** [BR-10 犬猫一覧](../04_画面設計/BR-10_犬猫一覧.md)

---

## Decision No.94

**犬猫公開申請は汎用 status 更新ではなく、draft → under_review の専用業務操作として実装する**

- **決定内容:** `updatePetStatus(status)` のような汎用 API は作らず、`submitPetForReview` / `submitPetForReviewAction` として `draft` → `under_review` のみをサーバー側で実行する。UPDATE 条件に `status = draft` を含め二重送信を防ぐ。
- **理由:** クライアントから status を自由指定させないため。掲載ライフサイクルを業務操作単位で管理するため。
- **影響範囲:** `submitPetForReview`、`submitPetForReviewAction`、BR-10 犬猫一覧
- **決定日:** 2026-08-07
- **参照:** [BR-10 犬猫一覧](../04_画面設計/BR-10_犬猫一覧.md)

---

## Decision No.95

**公開申請には最低1枚の犬猫写真を必須とする**

- **決定内容:** 公開申請時、`pet_photos` に対象 `pet_id` のレコードが 1 件以上必要。0 件の場合は申請不可とし、「公開申請には写真を1枚以上登録してください。」を表示する。
- **理由:** 掲載審査に必要な視覚情報を担保するため。
- **影響範囲:** `submitPetForReviewAction`、`validatePetForReviewSubmit` フロー
- **決定日:** 2026-08-07
- **参照:** [BR-10 犬猫一覧](../04_画面設計/BR-10_犬猫一覧.md)

---

## Decision No.96

**犬猫掲載審査の差戻し時は `under_review` → `draft` とする**

- **決定内容:** 管理者が犬猫掲載審査を差戻す場合、`pets.status` を `under_review` から `draft` へ戻す。差戻し理由を `pet_review_logs.comment` に保存する。ブリーダーは修正後、再度公開申請（`draft` → `under_review`）できる。
- **理由:** 差戻し後にブリーダーが内容を修正し再申請できるフローを明確にするため。
- **影響範囲:** `pets.status` 遷移、管理者審査画面（AD-11）、`pet_review_logs`
- **決定日:** 2026-08-07
- **参照:** [pets テーブル](../05_データベース設計/pets.md) / [AD-11 犬猫掲載審査詳細](../04_画面設計/AD-11_犬猫掲載審査詳細.md)

---

## Decision No.97

**犬猫掲載審査履歴は `public.pet_review_logs` で管理する**

- **決定内容:** 公開申請・差戻し・承認を時系列で `pet_review_logs` に追記保存する。`pets` は現在状態、`pet_review_logs` は履歴として責務を分離する。
- **理由:** 審査の監査性と再申請履歴を担保するため。
- **影響範囲:** `pet_review_logs` テーブル（設計）、`submitPetForReview`、管理者承認・差戻し Server Actions
- **決定日:** 2026-08-07
- **参照:** [pet_review_logs テーブル](../05_データベース設計/pet_review_logs.md)

---

## Decision No.98

**犬猫の申請日時・審査日時は `pet_review_logs.created_at` で管理する**

- **決定内容:** `pets` に `submitted_at` 等の専用カラムは追加しない。申請日時・承認日時・差戻し日時は、対応する `pet_review_logs` 行の `created_at` から取得する。
- **理由:** 現在状態（`pets`）と履歴（`pet_review_logs`）の責務分離を徹底するため。
- **影響範囲:** `pets` テーブル、AD-10 一覧の申請日時表示、Repository クエリ
- **決定日:** 2026-08-07
- **参照:** [pet_review_logs テーブル](../05_データベース設計/pet_review_logs.md) / [AD-10 犬猫掲載審査一覧](../04_画面設計/AD-10_犬猫掲載審査一覧.md)

---

## Decision No.99

_*管理者画面は AD-* で採番する_*

- **決定内容:** 管理者画面 ID を `AD-{連番}` 形式とする。第1期の犬猫掲載審査画面は AD-00（ダッシュボード）、AD-10（審査一覧）、AD-11（審査詳細）とする。
- **理由:** ブリーダー（BR-_）・購入希望者（BY-_）と同様に画面 ID を統一するため。
- **影響範囲:** `docs/04_画面設計/`、`src/app/(admin)/`
- **決定日:** 2026-08-07
- **参照:** [画面設計 README](../04_画面設計/README.md)

| 画面 ID | URL                           | 画面名               |
| ------- | ----------------------------- | -------------------- |
| AD-00   | `/admin`                      | 管理者ダッシュボード |
| AD-10   | `/admin/pets/reviews`         | 犬猫掲載審査一覧     |
| AD-11   | `/admin/pets/reviews/[petId]` | 犬猫掲載審査詳細     |

---

## Decision No.100

**AD-11 の審査対象から本人確認書類・登録証画像を除外する**

- **決定内容:** AD-11（犬猫掲載審査詳細）では、犬猫基本情報・価格・性格・写真・ブリーダー情報・飼育方針・繁殖方針・健康管理方針・第一種動物取扱業登録情報・ブリーダー審査状態を審査対象とする。本人確認書類および登録証の画像そのものは犬猫審査画面では表示しない。原本確認はブリーダー審査側で扱う。
- **理由:** 犬猫掲載審査とブリーダー本人確認審査の責務を分離するため。
- **影響範囲:** AD-11 UI、Storage Signed URL 発行範囲
- **決定日:** 2026-08-07
- **参照:** [AD-11 犬猫掲載審査詳細](../04_画面設計/AD-11_犬猫掲載審査詳細.md)

---

## Decision No.101

**犬猫公開承認はブリーダー承認済みかつ登録有効時のみ許可する**

- **決定内容:** 犬猫を `published` に変更できるのは、当該ブリーダーが管理者審査で承認済みであり、公開に必要な第一種動物取扱業登録が有効な場合に限る。公開承認時にサーバー側で再検証する。`review_status` の承認済みを表す実値、登録有効性判定の具体条件は実 DB 定義を確認してから実装する（推測しない）。
- **理由:** 未承認ブリーダーや登録無効の犬猫が公開されないよう、承認操作時に前提条件を再確認するため。
- **影響範囲:** 管理者承認 Server Action、`breeders.review_status`、`breeders.registration_expires_at` 等
- **決定日:** 2026-08-07
- **参照:** [AD-11 犬猫掲載審査詳細](../04_画面設計/AD-11_犬猫掲載審査詳細.md) / [breeders テーブル](../05_データベース設計/breeders.md)

---

## Decision No.102

**管理者権限の正本は Supabase Auth `app_metadata.role = "admin"` とする**

- **決定内容:** 管理者権限判定の正本は `app_metadata.role = "admin"` とする。`user_metadata.role` を管理者権限判定には使用しない。管理者アカウントは一般会員登録（`/signup`）から作成できず、運営側で発行・権限付与する。
- **理由:** クライアント改ざん可能な `user_metadata` を権限根拠にしないため。RLS の `public.is_admin()` と整合させるため。
- **影響範囲:** 認証フロー、`/admin/*` ルートガード、RLS、`src/features/auth/`
- **決定日:** 2026-08-07
- **参照:** [権限設計](../07_権限設計/README.md)

---

## Decision No.103

**`public.pets` の開発用 RLS を本番用へ移行する**

- **決定内容:** `pets_allow_all_for_development` を将来撤去し、本番用 RLS へ移行する。ブリーダーは本人所有の犬猫のみ操作可能。管理者は審査・運用に必要な範囲のみ操作可能。購入希望者向け閲覧は `published` 公開機能実装時に別途定義する。`status` 変更は汎用 UPDATE ではなく、専用業務操作として実装する（Decision No.94 準拠）。
- **理由:** 開発用全許可ポリシーを本番環境で使用しないため。掲載ライフサイクルを業務操作単位で制御するため。
- **影響範囲:** `supabase/migrations/`（将来）、`public.pets` RLS、管理者・ブリーダー Server Actions
- **決定日:** 2026-08-07
- **参照:** [権限設計](../07_権限設計/README.md) / [pets テーブル](../05_データベース設計/pets.md)

---

## Decision No.104

**管理者は `pet_photos` / Storage `pet-photos` の SELECT のみ許可する**

- **決定内容:** 管理者に `public.pet_photos` および Storage バケット `pet-photos` の SELECT 権限のみ付与する。管理者による犬猫写真の INSERT / UPDATE / DELETE は許可しない。写真表示は Server 側で管理者権限確認後、Signed URL を発行する。
- **理由:** 審査に必要な閲覧のみを許可し、管理者による写真改ざんを防ぐため。
- **影響範囲:** `pet_photos` RLS、Storage RLS、AD-10 / AD-11
- **決定日:** 2026-08-07
- **参照:** [権限設計](../07_権限設計/README.md) / [pet_photos テーブル](../05_データベース設計/pet_photos.md)

---

## Decision No.105

**`public.pet_review_logs` の第1期設計を確定する**

- **決定内容:** 第1期の `pet_review_logs` カラム・action 許可値・運用ルールを以下とする。

| カラム          | 型          | 制約                                            |
| --------------- | ----------- | ----------------------------------------------- |
| `id`            | uuid        | PRIMARY KEY                                     |
| `pet_id`        | uuid        | NOT NULL                                        |
| `action`        | text        | NOT NULL。`submitted` / `returned` / `approved` |
| `comment`       | text        | NULL 可（`returned` 時は必須）                  |
| `actor_user_id` | uuid        | NOT NULL                                        |
| `created_at`    | timestamptz | NOT NULL, DEFAULT `now()`                       |

- `submitted` / `approved` は `comment` NULL 可。`returned` は `comment` 必須。
- `actor_user_id` は `auth.getUser()` から取得し、クライアント指定値を信用しない。
- 審査履歴は追記のみ。通常の UPDATE / DELETE は禁止。
- 現在の `submitPetForReview()` は将来、`pets.status` を `draft` → `under_review` に更新すると同時に `pet_review_logs` へ `action = submitted` を記録する業務処理へ変更する。

- **理由:** 審査履歴の不変性と、公開申請・承認・差戻しの監査証跡を担保するため。
- **影響範囲:** `pet_review_logs` テーブル（設計・将来 Migration）、`submitPetForReview`、管理者 Server Actions
- **決定日:** 2026-08-07
- **参照:** [pet_review_logs テーブル](../05_データベース設計/pet_review_logs.md)

---

## Decision No.106

**AD-10 犬猫掲載審査一覧の表示順は申請日時が古い順とする**

- **決定内容:** AD-10（犬猫掲載審査一覧）の表示順は「申請日時が古い順」とする。対象は `pets.status = 'under_review'` かつ `pets.deleted_at IS NULL` の犬猫。申請日時は `pet_review_logs` の `action = 'submitted'` の最新 `created_at` を使用し、並び順は `submitted_at ASC`（申請日時昇順）とする。
- **理由:** 審査待ち時間が長い申請から順番に処理し、管理者の審査運用をシンプルにするため。
- **影響範囲:** AD-10 一覧取得クエリ、Repository / Service
- **決定日:** 2026-08-10
- **参照:** [AD-10 犬猫掲載審査一覧](../04_画面設計/AD-10_犬猫掲載審査一覧.md) / [Decision No.98](#decision-no98)

---

## Decision No.107

**犬猫公開承認の前提条件を具体値で確定する**

- **決定内容:** 管理者が `under_review` → `published` を許可できるのは、以下の **すべて** を満たす場合に限る。サーバー側（および Trigger / RPC 等）で再検証する。

| 条件           | 判定                                                 |
| -------------- | ---------------------------------------------------- |
| 掲載状態       | `pets.status = 'under_review'`                       |
| ブリーダー審査 | `breeders.review_status = 'approved'`                |
| 本人確認       | `breeders.identity_verification_status = 'verified'` |
| 登録証確認     | `breeders.business_verification_status = 'verified'` |
| 登録有効期限   | `breeders.registration_expires_at IS NOT NULL`       |
| 登録期限内     | `breeders.registration_expires_at >= CURRENT_DATE`   |

- `registration_expires_at` が NULL の場合は公開不可とする。
- **理由:** Decision No.101 の抽象条件を実装可能な具体値に確定し、未承認・未確認・登録無効の犬猫が公開されないよう担保するため。
- **影響範囲:** AD-11 承認操作、管理者承認 Server Action / RPC、`breeders` 参照、`enforce_pets_status_transition`（将来拡張）
- **決定日:** 2026-08-10
- **参照:** [AD-11 犬猫掲載審査詳細](../04_画面設計/AD-11_犬猫掲載審査詳細.md) / [Decision No.101](#decision-no101) / [breeders テーブル](../05_データベース設計/breeders.md)

---

## Decision No.108

**PU-02 公開詳細は一覧 View とは別の詳細 View 2 本で公開列のみ返す**

- **決定内容:** 一般公開 `/pets/[petId]` の READ は、PU-01 一覧 View を拡張せず、詳細専用 View `published_pet_detail_public` / `breeder_public_detail_profiles` から公開列のみ SELECT する。公開条件（`published` + approved + active + not deleted）は `is_publicly_listable_pet` / 一覧 View と **同一 WHERE 句** とする。RLS・Storage・`is_publicly_listable_pet` は変更しない。
- **理由:** 一覧 API の列肥大化を避けつつ、詳細画面に必要な `color` / `temperament` / `description` / ブリーダー長文を安全に公開するため。
- **影響範囲:** `supabase/migrations/20260814130000_add_public_pet_detail_read_views.sql`、PU-02 loader / UI、セキュリティテスト `test:public-pet-detail`
- **決定日:** 2026-08-14
- **参照:** [PU-02 公開犬猫詳細](../04_画面設計/PU-02_公開犬猫詳細.md) / [pets テーブル](../05_データベース設計/pets.md)

---

## Decision No.109

**購入希望者問い合わせ画面 ID と URL を BY-04〜BY-06 で確定する**

- **決定内容:** 購入希望者向け問い合わせ機能の画面 ID と URL を以下とする。

| 画面 ID | 画面名         | URL                                  |
| ------- | -------------- | ------------------------------------ |
| BY-04   | 問い合わせ入力 | `/buyer/inquiries/new?petId={petId}` |
| BY-05   | 問い合わせ履歴 | `/buyer/inquiries`                   |
| BY-06   | 問い合わせ詳細 | `/buyer/inquiries/[inquiryId]`       |

- ブリーダー側は既存 **BR-12**（`/breeder/inquiries`, `/breeder/inquiries/[inquiryId]`）を変更しない。
- **理由:** 第1期問い合わせ実装前に画面 ID・URL・遷移を固定し、Decision No.72（編集 URL 分離）に整合させるため。
- **影響範囲:** BY-04〜BY-06 設計書、PU-02 CTA、BY-02 menu、App Router、`src/features/inquiries/`
- **決定日:** 2026-08-21
- **参照:** [BY-04](../04_画面設計/BY-04_購入希望者問い合わせ入力.md) / [画面設計 README](../04_画面設計/README.md)

---

## Decision No.110

**同一購入希望者 × 同一犬猫の有効問い合わせは再利用する**

- **決定内容:** 第1期では、同一 `buyer_id` × 同一 `pet_id` について **有効な inquiry が既に存在する場合、新規スレッドを作成せず既存 inquiry（BY-06）へ遷移** する。DB UNIQUE 制約は第1期設計時点では追加しない。Server 側で既存行を検索する。
- **有効 inquiry の定義:** `deleted_at IS NULL` かつ `status NOT IN ('closed', 'completed')`。
- **理由:** 問い合わせスレッドの乱立を防ぎ、既存 DB スキーマを維持するため。
- **影響範囲:** BY-04 入口、PU-02 CTA、問い合わせ Server Action
- **決定日:** 2026-08-21
- **参照:** [BY-04](../04_画面設計/BY-04_購入希望者問い合わせ入力.md)

---

## Decision No.111

**問い合わせ `subject` は購入希望者入力せず Server 側で自動生成する（暫定ルール）**

- **決定内容:** 第1期 UI では `subject` 入力欄を設けない。`inquiries.subject` は Server Action で自動設定する。
- **暫定生成ルール:** `{public_display_name}についてのお問い合わせ`（pet の公開表示名。取得不可時は「犬猫についてのお問い合わせ」）。
- **理由:** 第1期 UX を簡素化し、必須入力項目を本文のみに絞るため。
- **影響範囲:** BY-04 Server Action、`inquiries.subject`
- **決定日:** 2026-08-21
- **参照:** [BY-04](../04_画面設計/BY-04_購入希望者問い合わせ入力.md) / [inquiries テーブル](../05_データベース設計/inquiries.md)

---

## Decision No.112

**第1期 BR-12 では購入希望者情報のうち表示名（`display_name`）のみをブリーダーへ開示する**

- **決定内容:** ブリーダー問い合わせ画面（BR-12）で購入希望者に関して表示してよいのは **`buyers.display_name`（表示名）のみ** とする。メールアドレス・電話番号・住所は **表示しない**。
- **RLS:** 第1期設計確定時点では **`buyers` への breeder SELECT RLS は追加しない**（BY-01 方針維持）。
- **表示名の取得方式:** **`public.get_inquiry_buyer_display_name(uuid)` SECURITY DEFINER RPC** を採用（Migration `20260821153000`）。`buyers` への breeder SELECT RLS は **追加しない**。Service Role クライアントでの一括取得は禁止。
- **理由:** 個人情報保護と第1期スコープのバランス。問い合わせ画面上のテキスト連絡を基本とするため。
- **影響範囲:** BR-12 UI、問い合わせ Repository / Loader、`supabase/migrations/20260821153000_create_get_inquiry_buyer_display_name_rpc.sql`
- **決定日:** 2026-08-21
- **参照:** [BR-12](../04_画面設計/BR-12_ブリーダー問い合わせ.md) / [BY-01](../04_画面設計/BY-01_購入希望者プロフィール.md)

---

## Decision No.113

**第1期問い合わせ機能では Supabase Realtime / WebSocket を使用しない**

- **決定内容:** 問い合わせ・返信は **非同期メッセージ方式**（ページロード / Server Action + revalidate）とする。Supabase Realtime 購読、WebSocket、リアルタイム既読通知 UI は第1期対象外。
- **理由:** Decision No.55（テキスト履歴）と整合。リアルタイムチャットと混同しないため。
- **影響範囲:** BY-06、BR-12、問い合わせ feature 全体
- **決定日:** 2026-08-21
- **参照:** [Decision No.55](#decision-no55) / [inquiry_messages テーブル](../05_データベース設計/inquiry_messages.md)

---

## Decision No.114

**問い合わせ開始には `buyers.profile_completed = true` を Server 側で必須とする**

- **決定内容:** 問い合わせ入力（BY-04）および PU-02 からの問い合わせ開始時、`profile_completed = false` の buyer は **BY-01 `/buyer/profile` へ誘導** する。検証は **Server Action / Loader で必須**。第1期では inquiries INSERT RLS への `profile_completed` 条件追加は **行わない**。
- **理由:** BY-01 設計方針との整合。RLS 変更なしで第1期実装可能にするため。
- **影響範囲:** BY-04、PU-02 CTA、問い合わせ Server Action
- **決定日:** 2026-08-21
- **参照:** [BY-01](../04_画面設計/BY-01_購入希望者プロフィール.md) / [Decision No.61](#decision-no61)

---

## Decision No.115

**犬猫非公開化後も既存問い合わせ履歴は購入希望者・ブリーダー双方で閲覧可能とする（第1期）**

- **決定内容:** 問い合わせ成立後に対象 pet が `published` 以外へ遷移した場合でも、**既存 `inquiries` / `inquiry_messages` の閲覧・メッセージ送信（status 許可時）は維持** する。BY-05 / BY-06 / BR-12 では pet サマリーを表示し続ける。新規問い合わせ（BY-04）のみ公開 pet を必須とする。
- **根拠:** 既存 RLS は inquiry 当事者 SELECT を pet status に依存しない。第1期 UX として過去のやり取りを失わない方が自然（**新規設計案** — 専用 Decision 以前の明示記載なし）。
- **影響範囲:** BY-05、BY-06、BR-12 Loader、新規問い合わせ Server Action
- **決定日:** 2026-08-21
- **参照:** [BY-05](../04_画面設計/BY-05_購入希望者問い合わせ履歴.md) / [inquiries RLS](../05_データベース設計/inquiries.md)

---

## Decision No.116

**問い合わせ詳細表示時に相手送信分の未読メッセージを既読化する（第1期）**

- **決定内容:** BY-06 / BR-12 詳細を当事者が開いたタイミングで、**相手（`sender_type` が自分以外）の `is_read = false` メッセージ** を Server 側で `is_read = true`, `read_at = now()` に更新する。UPDATE 対象カラムは **既読関連のみ**（Decision No.55 整合）。リアルタイム既読通知 UI は行わない。
- **理由:** DB 既存列の活用。RLS 変更なしで第1期実装可能。
- **影響範囲:** BY-06、BR-12 Loader / Server Action、`inquiry_messages`
- **決定日:** 2026-08-21
- **参照:** [BY-06](../04_画面設計/BY-06_購入希望者問い合わせ詳細.md) / [inquiry_messages テーブル](../05_データベース設計/inquiry_messages.md)

---

## Decision No.127

**ブリーダー審査の差戻しは `resubmission_required` とし、verification status は原則 `submitted` を維持する**

- **決定内容:** 管理者差戻し時、`review_status` を `under_review` から `resubmission_required` へ変更する。差戻し理由（`comment`）は必須。`identity_verification_status` / `business_verification_status` は第1期では原則 `submitted` を維持し、プロフィール差戻しのみで `unverified` へ自動戻ししない。
- **理由:** 書類提出済み状態を維持し、修正・再提出の UX を単純化するため。
- **影響範囲:** `return_breeder_review` RPC、AD-02、BR-09 再提出フロー（将来）
- **決定日:** 2026-08-25
- **参照:** [AD-02](../04_画面設計/AD-02_ブリーダー審査詳細.md) / [breeders テーブル](../05_データベース設計/breeders.md)

---

## Decision No.128

**ブリーダー審査の却下は `rejected` とし、第1期では再申請不可とする**

- **決定内容:** 管理者却下時、`review_status` を `under_review` から `rejected` へ変更する。却下理由（`comment`）は必須。第1期では `rejected` からの再申請は不可とする。
- **理由:** 却下と差戻しの責務を分離し、運用を明確にするため。
- **影響範囲:** `reject_breeder_review` RPC、AD-02
- **決定日:** 2026-08-25
- **参照:** [AD-02](../04_画面設計/AD-02_ブリーダー審査詳細.md)

---

## Decision No.129

**ブリーダー審査承認時は verification を `verified` にし、`membership_status` は変更しない**

- **決定内容:** 管理者承認時、`review_status = approved`、`identity_verification_status = verified`、`business_verification_status = verified`、`approved_at = now()` を同一操作で設定する。`membership_status` は変更しない（承認後も `pending` のまま）。
- **理由:** 審査承認と利用開始（課金）を分離するため（Decision No.130 参照）。
- **影響範囲:** `approve_breeder_review` RPC、`breeders` テーブル
- **決定日:** 2026-08-25
- **参照:** [AD-02](../04_画面設計/AD-02_ブリーダー審査詳細.md) / [breeders テーブル](../05_データベース設計/breeders.md)

---

## Decision No.130

**ブリーダー審査承認と Stripe 月額課金（`membership_status = active`）を分離する**

- **決定内容:** ブリーダー管理者審査の承認（`review_status = approved`）と、月額課金開始後の `membership_status = active` 化は別工程とする。承認時点では `membership_status = pending` のままとする。将来 Stripe 月額課金開始後に `membership_status = active` へ変更する。したがって審査承認だけでは PU-01/02 の一般公開条件（`review_status = approved` **かつ** `membership_status = active`）を満たさない。
- **理由:** Decision No.43 / No.45 の状態分離に沿い、未審査・未課金ブリーダーの公開を防ぐため。
- **影響範囲:** ブリーダー審査 RPC、公開 View、Stripe 連携（将来）
- **決定日:** 2026-08-25
- **参照:** [Decision No.43](#decision-no43) / [Decision No.45](#decision-no45) / [breeders テーブル](../05_データベース設計/breeders.md)

---

## Decision No.131

**第1期から `breeder_review_logs` でブリーダー審査履歴を管理する**

- **決定内容:** ブリーダー審査のイベント履歴を `public.breeder_review_logs` で管理する。第1期の `action` は `submitted` / `review_started` / `approved` / `returned` / `rejected` とする。`returned` / `rejected` 時は `comment` 必須。履歴は追記のみ（UPDATE / DELETE 禁止）。
- **理由:** 差戻し・却下理由の監査、申請日時の取得（AD-01 ソート）、`pet_review_logs` との設計対称のため。
- **影響範囲:** DB Migration、`breeders` 審査 RPC 群、AD-01 / AD-02、BR-09 提出処理（`submitted` log 追記）
- **決定日:** 2026-08-25
- **参照:** [breeder_review_logs](../05_データベース設計/breeder_review_logs.md) / [AD-01](../04_画面設計/AD-01_ブリーダー審査一覧.md)

---

## Decision No.132

**`breeder-documents` は private のまま admin SELECT RLS と Signed URL で管理者閲覧する**

- **決定内容:** `breeder-documents` バケットは private を維持する。管理者向け Storage SELECT RLS を追加し、AD-02 では `requireAdmin()` 確認後に Server 側から admin セッション JWT で短時間 Signed URL を発行する。Service Role Key は使用しない。
- **理由:** Decision No.100 に基づき書類原本確認を AD-02 で行うため。`pet-photos` admin 閲覧（Decision No.104）と同パターンのため。
- **影響範囲:** Storage Migration、AD-02、`src/features/admin/`（将来）
- **決定日:** 2026-08-25
- **参照:** [AD-02](../04_画面設計/AD-02_ブリーダー審査詳細.md) / [権限設計](../07_権限設計/README.md) / [Decision No.100](#decision-no100)

---

## Decision No.133

**ブリーダー審査操作は 4 つの専用 RPC で実装する**

- **決定内容:** ブリーダー審査の状態変更は以下の PostgreSQL RPC のみから実行する。いずれも `SECURITY DEFINER`、`SET search_path = public`、関数内で `auth.uid()` / `public.is_admin()` を再検証する。Service Role Key 不要。

| RPC | 概要 |
| --- | ---- |
| `start_breeder_review(p_breeder_id uuid)` | 審査開始 |
| `approve_breeder_review(p_breeder_id uuid)` | 承認 |
| `return_breeder_review(p_breeder_id uuid, p_comment text)` | 差戻し |
| `reject_breeder_review(p_breeder_id uuid, p_comment text)` | 却下 |

- **理由:** 多カラム原子更新、監査ログ追記、任意 UPDATE 防止（犬猫審査 RPC と同パターン）のため。
- **影響範囲:** Supabase Migration、AD-02 Server Action、`breeder_review_logs`
- **決定日:** 2026-08-25
- **参照:** [AD-02](../04_画面設計/AD-02_ブリーダー審査詳細.md) / [Decision No.96](#decision-no96)（犬猫審査 RPC 思想）

---

## Decision No.134

**`approve_breeder_review` は書類存在・登録期限内を RPC 側で検証する（内容の法的適否は自動判定しない）**

- **決定内容:** `approve_breeder_review` は以下を **すべて** 満たす場合のみ成功させる。

| 条件 | 判定 |
| ---- | ---- |
| 審査状態 | `review_status = 'under_review'` |
| 本人確認書類 | `identity_document_path IS NOT NULL`（Storage 上の存在も確認） |
| 登録証 | `business_license_path IS NOT NULL`（Storage 上の存在も確認） |
| 登録有効期限 | `registration_expires_at IS NOT NULL` |
| 登録期限内 | `registration_expires_at >= CURRENT_DATE` |

書類内容の法的適否・登録種別の適否は **システムで自動判定しない**。弁護士または管轄自治体への確認が必要な事項として扱う。

- **理由:** Decision No.107（犬猫公開）と整合する最低限の機械チェックを担保しつつ、法的判断をシステムに委ねないため。
- **影響範囲:** `approve_breeder_review` RPC、AD-02
- **決定日:** 2026-08-25
- **参照:** [AD-02](../04_画面設計/AD-02_ブリーダー審査詳細.md) / [Decision No.107](#decision-no107) / [breeders テーブル](../05_データベース設計/breeders.md)

