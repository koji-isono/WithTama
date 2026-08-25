# breeders テーブル

| 項目       | 内容              |
| ---------- | ----------------- |
| テーブル名 | `public.breeders` |
| Version    | 1.4               |
| 状態       | 確定              |

## 目的

ブリーダーの基本情報、プロフィール、審査情報、第一種動物取扱業登録情報、Stripe 課金情報、利用状態を管理する。

`auth.users`（認証）と `breeders`（事業者プロフィール）は 1 対 1 で紐付ける（Decision No.41）。

## カラム定義

| カラム名                       | 型          | NULL     | 初期値              | 説明                                      |
| ------------------------------ | ----------- | -------- | ------------------- | ----------------------------------------- |
| `id`                           | uuid        | NOT NULL | `gen_random_uuid()` | ブリーダーID、主キー                      |
| `user_id`                      | uuid        | NOT NULL | なし                | `auth.users.id` への外部キー              |
| `business_name`                | text        | NULL     | `null`              | 屋号・事業所名                            |
| `representative_name`          | text        | NULL     | `null`              | 代表者名                                  |
| `profile_text`                 | text        | NULL     | `null`              | 自己紹介                                  |
| `breeding_policy`              | text        | NULL     | `null`              | 繁殖方針                                  |
| `health_policy`                | text        | NULL     | `null`              | 健康管理方針                              |
| `breeding_environment`         | text        | NULL     | `null`              | 飼育環境                                  |
| `postal_code`                  | text        | NULL     | `null`              | 郵便番号                                  |
| `prefecture`                   | text        | NULL     | `null`              | 都道府県                                  |
| `city`                         | text        | NULL     | `null`              | 市区町村                                  |
| `address_line`                 | text        | NULL     | `null`              | 番地・建物名。一般公開しない              |
| `phone`                        | text        | NULL     | `null`              | 電話番号                                  |
| `public_email`                 | text        | NULL     | `null`              | 公開用メールアドレス                      |
| `website_url`                  | text        | NULL     | `null`              | 公式サイト URL                            |
| `business_registration_number` | text        | NULL     | `null`              | 第一種動物取扱業登録番号                  |
| `business_registration_type`   | text        | NULL     | `null`              | 登録種別                                  |
| `registration_authority`       | text        | NULL     | `null`              | 登録自治体                                |
| `registration_expires_at`      | date        | NULL     | `null`              | 登録有効期限                              |
| `identity_document_path`       | text        | NULL     | `null`              | 本人確認書類の Storage パス               |
| `business_license_path`        | text        | NULL     | `null`              | 登録証画像の Storage パス                 |
| `identity_verification_status` | text        | NOT NULL | `unverified`        | 本人確認状態                              |
| `business_verification_status` | text        | NOT NULL | `unverified`        | 登録証確認状態                            |
| `review_status`                | text        | NOT NULL | `draft`             | 審査状態                                  |
| `membership_status`            | text        | NOT NULL | `pending`           | 利用状態                                  |
| `profile_completed`            | boolean     | NOT NULL | `false`             | プロフィール入力完了                      |
| `stripe_customer_id`           | text        | NULL     | `null`              | Stripe 顧客 ID                            |
| `stripe_subscription_id`       | text        | NULL     | `null`              | Stripe 定期課金 ID                        |
| `subscription_status`          | text        | NULL     | `null`              | Stripe 課金状態                           |
| `approved_at`                  | timestamptz | NULL     | `null`              | 承認日時                                  |
| `suspended_at`                 | timestamptz | NULL     | `null`              | 利用停止日時                              |
| `deleted_at`                   | timestamptz | NULL     | `null`              | 論理削除日時                              |
| `created_at`                   | timestamptz | NOT NULL | `now()`             | 作成日時                                  |
| `updated_at`                   | timestamptz | NOT NULL | `now()`             | 更新日時（UPDATE 時にトリガーで自動更新） |

## TypeScript 対応（参考）

| DB カラム（snake_case）        | TypeScript（camelCase）      |
| ------------------------------ | ---------------------------- |
| `user_id`                      | `userId`                     |
| `business_name`                | `businessName`               |
| `representative_name`          | `representativeName`         |
| `profile_text`                 | `profileText`                |
| `breeding_policy`              | `breedingPolicy`             |
| `health_policy`                | `healthPolicy`               |
| `breeding_environment`         | `breedingEnvironment`        |
| `postal_code`                  | `postalCode`                 |
| `address_line`                 | `addressLine`                |
| `public_email`                 | `publicEmail`                |
| `website_url`                  | `websiteUrl`                 |
| `business_registration_number` | `businessRegistrationNumber` |
| `business_registration_type`   | `businessRegistrationType`   |
| `registration_authority`       | `registrationAuthority`      |
| `registration_expires_at`      | `registrationExpiresAt`      |
| `identity_document_path`       | `identityDocumentPath`       |
| `business_license_path`        | `businessLicensePath`        |
| `identity_verification_status` | `identityVerificationStatus` |
| `business_verification_status` | `businessVerificationStatus` |
| `review_status`                | `reviewStatus`               |
| `membership_status`            | `membershipStatus`           |
| `profile_completed`            | `profileCompleted`           |
| `stripe_customer_id`           | `stripeCustomerId`           |
| `stripe_subscription_id`       | `stripeSubscriptionId`       |
| `subscription_status`          | `subscriptionStatus`         |
| `approved_at`                  | `approvedAt`                 |
| `suspended_at`                 | `suspendedAt`                |
| `deleted_at`                   | `deletedAt`                  |
| `created_at`                   | `createdAt`                  |
| `updated_at`                   | `updatedAt`                  |

## 制約

### キー

- **Primary Key:** `id`
- **Foreign Key:** `user_id` → `auth.users.id`
- **Unique:** `user_id`（1 ユーザー 1 ブリーダー）
- **Unique（部分）:** `stripe_customer_id` … NULL 以外の値は一意
- **Unique（部分）:** `stripe_subscription_id` … NULL 以外の値は一意

### CHECK 制約 — identity_verification_status

| 値           | 説明     |
| ------------ | -------- |
| `unverified` | 未確認   |
| `submitted`  | 提出済み |
| `verified`   | 確認済み |
| `rejected`   | 却下     |

### CHECK 制約 — business_verification_status

| 値           | 説明     |
| ------------ | -------- |
| `unverified` | 未確認   |
| `submitted`  | 提出済み |
| `verified`   | 確認済み |
| `rejected`   | 却下     |
| `expired`    | 期限切れ |

### CHECK 制約 — review_status

| 値                      | 説明             |
| ----------------------- | ---------------- |
| `draft`                 | 下書き           |
| `submitted`             | 提出済み         |
| `under_review`          | 審査中           |
| `approved`              | 承認             |
| `rejected`              | 却下             |
| `resubmission_required` | 修正・再提出依頼 |

### CHECK 制約 — membership_status

| 値          | 説明       |
| ----------- | ---------- |
| `pending`   | 利用開始前 |
| `active`    | 利用中     |
| `suspended` | 停止中     |
| `canceled`  | 解約済み   |

### CHECK 制約 — subscription_status

| 値         | 説明         |
| ---------- | ------------ |
| `trialing` | トライアル中 |
| `active`   | 有効         |
| `past_due` | 支払い遅延   |
| `unpaid`   | 未払い       |
| `canceled` | 解約         |

## 仮登録方針

メール認証後の初回ログイン時に `public.breeders` レコードを自動作成する（Decision No.46, No.61）。

### アプリケーション側の INSERT 項目

初回作成時は **`user_id` のみ** INSERT する。ダミー値（「未設定」、メールアドレス由来の代表者名、住所、電話番号、動物取扱業登録情報等）は入れない。

### DB 初期値（自動設定）

| カラム                         | 初期値                                                  |
| ------------------------------ | ------------------------------------------------------- |
| `identity_verification_status` | `unverified`                                            |
| `business_verification_status` | `unverified`                                            |
| `review_status`                | `draft`                                                 |
| `membership_status`            | `pending`                                               |
| `profile_completed`            | `false`                                                 |
| `subscription_status`          | `null`（初回は未設定。`inactive` は許可値に含まれない） |
| `created_at` / `updated_at`    | `now()`                                                 |

`review_status` が `draft` の間は、申請に必要な基本情報が未入力でも保存可能とする。以下は NULL のまま作成してよい。

| カラム                         | 備考                             |
| ------------------------------ | -------------------------------- |
| `business_name`                | プロフィール入力画面で後から入力 |
| `representative_name`          | 同上                             |
| `postal_code`                  | 同上                             |
| `prefecture`                   | 同上                             |
| `city`                         | 同上                             |
| `address_line`                 | 同上                             |
| `phone`                        | 同上                             |
| `business_registration_number` | 同上                             |
| `business_registration_type`   | 同上                             |
| `registration_authority`       | 同上                             |
| `registration_expires_at`      | 同上                             |
| `website_url`                  | 同上                             |
| `profile_text`                 | 同上                             |

プロフィール入力完了後、アプリケーション側で `profile_completed` を `true` に更新する。

## 審査申請時の必須チェック

以下がすべて入力・提出済みの場合のみ、`review_status` を `submitted` へ変更できる。

| 項目           | カラム                         |
| -------------- | ------------------------------ |
| 屋号・事業所名 | `business_name`                |
| 代表者名       | `representative_name`          |
| 郵便番号       | `postal_code`                  |
| 都道府県       | `prefecture`                   |
| 市区町村       | `city`                         |
| 番地・建物名   | `address_line`                 |
| 電話番号       | `phone`                        |
| 登録番号       | `business_registration_number` |
| 登録種別       | `business_registration_type`   |
| 登録自治体     | `registration_authority`       |
| 登録有効期限   | `registration_expires_at`      |
| 本人確認書類   | `identity_document_path`       |
| 登録証画像     | `business_license_path`        |

必須チェックはアプリケーション側で実施する。将来は DB 関数または制約での補強を検討する。

## 書類 Storage（`breeder-documents`）

| 項目       | 内容                                                                   |
| ---------- | ---------------------------------------------------------------------- |
| バケット名 | `breeder-documents`                                                    |
| 公開設定   | **private**（公開 URL を発行しない）                                   |
| DB 保存    | Storage パスのみ（`identity_document_path` / `business_license_path`） |
| パス例     | `breeders/{userId}/identity/{timestamp}-{uuid}.jpg`                    |

### ファイル制限

- 拡張子: jpg / jpeg / png / pdf
- MIME: `image/jpeg`, `image/png`, `application/pdf`
- 最大サイズ: 10MB / ファイル

### RLS（Storage）

- authenticated ユーザーのみ
- `breeders/{auth.uid()}/...` 配下のみ INSERT / SELECT / UPDATE
- 一般ユーザーの DELETE は第1期では不可
- 管理者閲覧は AD-02 から Signed URL を発行（Decision No.132）。Migration で admin SELECT RLS を追加予定

### 本人確認書類の法的判断

利用可能書類の正式な範囲については、弁護士または運営責任者への確認が必要。登録種別の適否については管轄自治体への確認が必要。

### profile_completed 更新条件

Step1〜Step4 の必須項目および Step5 の両書類パスがすべて揃った場合のみ、`completeBreederProfile` により `profile_completed = true` および `review_status = submitted` へ更新する。

## 住所・機密情報の公開方針

一般公開向けの参照は、公開用 View または API 経由で必要項目のみ返す。

### 一般公開するプロフィール項目

以下を公開対象とする。

- `business_name`
- `profile_text`
- `breeding_policy`
- `health_policy`
- `breeding_environment`
- `prefecture`（都道府県）
- `city`（市区町村）
- `website_url`
- `public_email`（ブリーダーが公開を希望した場合のみ）

### 一般公開しない項目

以下は一般公開しない。

| 区分         | カラム                   | 備考         |
| ------------ | ------------------------ | ------------ |
| 住所（詳細） | `postal_code`            | 郵便番号     |
| 住所（詳細） | `address_line`           | 番地・建物名 |
| 連絡先       | `phone`                  | 電話番号     |
| 書類         | `identity_document_path` | 本人確認書類 |
| 書類         | `business_license_path`  | 登録証画像   |
| Stripe       | `stripe_customer_id`     | 顧客 ID      |
| Stripe       | `stripe_subscription_id` | 定期課金 ID  |
| Stripe       | `subscription_status`    | 課金状態     |

**住所の公開範囲:** 都道府県（`prefecture`）・市区町村（`city`）までを一般公開する。郵便番号・番地は非公開とする（Decision No.44）。

見学日程確定後の詳細住所通知方法は、見学フロー設計で別途定義する。

## Stripe 方針

WithTama 側では以下のみ保持する（Decision No.45）。

| カラム                   | 内容               |
| ------------------------ | ------------------ |
| `stripe_customer_id`     | Stripe 顧客 ID     |
| `stripe_subscription_id` | Stripe 定期課金 ID |
| `subscription_status`    | 課金状態           |

請求金額、請求履歴、支払い方法の正本は Stripe とする。

## RLS 方針

RLS を有効化する。

| 主体           | 方針                                                                               |
| -------------- | ---------------------------------------------------------------------------------- |
| ブリーダー本人 | `user_id = auth.uid()` のレコードのみ参照・更新可能                                |
| 管理者         | 全件参照・更新可能（ロール判定は [権限設計](../07_権限設計/README.md) で別途定義） |
| 一般公開       | 公開用 View または API 経由で必要項目のみ返す                                      |

## マイグレーション

| ファイル                                              | 内容                                                               |
| ----------------------------------------------------- | ------------------------------------------------------------------ |
| `20260804135800_create_breeders.sql`                  | Version 1.0 新規作成                                               |
| `20260804144700_update_breeders_draft_nullable.sql`   | Version 1.1 仮登録向け NULL 許可（審査申請項目）                   |
| `20260805112007_update_breeders_profile_nullable.sql` | Version 1.2 プロフィール項目の NULL 許可（初回ログイン仮レコード） |
| `20260805112809_update_profile_registration_flow.sql` | Version 1.4 仮登録フロー向け NULL 許可・`profile_completed`        |
| `20260814120000_add_public_pet_list_read_access.sql`  | PU-01 公開一覧 View `breeder_public_profiles`                      |
| `20260814130000_add_public_pet_detail_read_views.sql` | PU-02 公開詳細 View `breeder_public_detail_profiles`               |

### 一般公開 View（PU-02 詳細）

| View                             | 公開列                                                                                                                  |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| `breeder_public_detail_profiles` | `id`, `business_name`, `prefecture`, `city`, `profile_text`, `breeding_policy`, `health_policy`, `breeding_environment` |

公開条件: `deleted_at IS NULL`, `review_status = 'approved'`, `membership_status = 'active'`。

**View に含めない列:** `user_id`, `phone`, `representative_name`, `postal_code`, `address_line`, `public_email`, `website_url`, 書類パス, Stripe 関連, 審査状態 等。

PU-02 第1期では `website_url` / `public_email` は画面にも表示しない（[PU-02 画面設計](../04_画面設計/PU-02_公開犬猫詳細.md)）。

## 関連テーブル

- `auth.users` … 認証ユーザー（`user_id`）
- [pets](./pets.md) … `pets.breeder_id` → `breeders.id`（将来 FK 接続）

## pets との外部キー移行

最終構成では `pets.breeder_id` は `breeders.id` を参照する。

現在の開発途中では、`pets.breeder_id` に `auth.users.id` を保持している可能性がある。

Migration では、次の順序で実施する。

```
breeders レコード作成
  ↓
pets.breeder_id を breeders.id へ変換
  ↓
Foreign Key 設定
```

既存データを確認せず Foreign Key を追加しないこと。

## 関連 Decision

- [Decision No.41](../01_設計変更管理/DecisionLog.md#decision-no41) — id と user_id の分離
- [Decision No.42](../01_設計変更管理/DecisionLog.md#decision-no42) — 標準項目採用
- [Decision No.43](../01_設計変更管理/DecisionLog.md#decision-no43) — 審査・登録証・課金状態
- [Decision No.44](../01_設計変更管理/DecisionLog.md#decision-no44) — 住所公開範囲
- [Decision No.45](../01_設計変更管理/DecisionLog.md#decision-no45) — Stripe 保持範囲
- [Decision No.46](../01_設計変更管理/DecisionLog.md#decision-no46) — 仮登録方式
- [Decision No.61](../01_設計変更管理/DecisionLog.md#decision-no61) — `profile_completed` によるプロフィール完了管理

## 関連画面

- [BR-06 ブリーダーダッシュボード](../04_画面設計/BR-06_ブリーダーダッシュボード.md)
- [BR-09 ブリーダープロフィール](../04_画面設計/BR-09_ブリーダープロフィール.md)
- [AD-01 ブリーダー審査一覧](../04_画面設計/AD-01_ブリーダー審査一覧.md)
- [AD-02 ブリーダー審査詳細](../04_画面設計/AD-02_ブリーダー審査詳細.md)
- [breeder_review_logs テーブル](./breeder_review_logs.md)

## アプリケーション更新（Step 1 基本情報）

`saveBasicProfile` Server Action により、ブリーダー本人の `breeders` レコードを UPDATE する（Decision No.69）。

| 更新カラム            | 備考                                |
| --------------------- | ----------------------------------- |
| `business_name`       | 必須                                |
| `representative_name` | 必須                                |
| `phone`               | 必須                                |
| `public_email`        | 任意（空は NULL）                   |
| `website_url`         | 任意（空は NULL）                   |
| `updated_at`          | 明示更新（DB トリガーでも自動更新） |

- 実装: `src/features/breeder-profile/repository.ts` — `updateBasicProfile(userId, data)`
- RLS: `breeders_update_own`（`user_id = auth.uid()`）
- API 設計: [ブリーダープロフィール API](../06_API設計/breeder-profile.md)
