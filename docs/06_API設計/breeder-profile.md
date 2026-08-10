# ブリーダープロフィール API

## 概要

ブリーダープロフィールの保存処理は Next.js Server Actions 経由で Supabase を更新する（Decision No.69）。Route Handler は使用しない。

## 実装構成

| レイヤー   | ファイル                                     | 責務                                 |
| ---------- | -------------------------------------------- | ------------------------------------ |
| UI         | `src/app/breeder/profile/basic/page.tsx`     | Step 1 フォーム表示                  |
| Service    | `src/features/breeder-profile/service.ts`    | バリデーション → Repository 呼び出し |
| Repository | `src/features/breeder-profile/repository.ts` | Supabase UPDATE                      |
| Validation | `src/features/breeder-profile/validation.ts` | 入力チェック                         |

## saveBasicProfile

| 項目 | 内容                                         |
| ---- | -------------------------------------------- |
| 種別 | Server Action                                |
| 実装 | `src/features/breeder-profile/service.ts`    |
| 認証 | Supabase Auth セッション（`auth.getUser()`） |

### リクエスト（BasicProfileInput）

| フィールド           | 型     | 必須   |
| -------------------- | ------ | ------ |
| `businessName`       | string | はい   |
| `representativeName` | string | はい   |
| `phone`              | string | はい   |
| `publicEmail`        | string | いいえ |
| `websiteUrl`         | string | いいえ |

### レスポンス（SaveBasicProfileResult）

**成功**

```json
{ "success": true }
```

**バリデーションエラー**

```json
{
  "success": false,
  "fieldErrors": {
    "businessName": "屋号・事業所名を入力してください。"
  }
}
```

**その他エラー**

```json
{
  "success": false,
  "error": "保存に失敗しました。"
}
```

### 更新対象テーブル

`public.breeders`（`user_id = auth.uid()` のレコード）

| DB カラム             | 内容                            |
| --------------------- | ------------------------------- |
| `business_name`       | 屋号・事業所名                  |
| `representative_name` | 代表者氏名                      |
| `phone`               | 電話番号                        |
| `public_email`        | 公開用メール（空の場合 NULL）   |
| `website_url`         | Web サイト URL（空の場合 NULL） |
| `updated_at`          | 更新日時                        |

### 成功時の画面遷移

`/breeder/profile/location` へ遷移する。

## saveLocationProfile

| 項目 | 内容                                         |
| ---- | -------------------------------------------- |
| 種別 | Server Action                                |
| 実装 | `src/features/breeder-profile/service.ts`    |
| 認証 | Supabase Auth セッション（`auth.getUser()`） |

### リクエスト（LocationProfileInput）

| フィールド    | 型     | 必須               |
| ------------- | ------ | ------------------ |
| `postalCode`  | string | はい（`NNN-NNNN`） |
| `prefecture`  | string | はい               |
| `city`        | string | はい               |
| `addressLine` | string | はい               |

### 更新対象カラム

| DB カラム      | 内容         |
| -------------- | ------------ |
| `postal_code`  | 郵便番号     |
| `prefecture`   | 都道府県     |
| `city`         | 市区町村     |
| `address_line` | 番地・建物名 |
| `updated_at`   | 更新日時     |

### 成功時の画面遷移

`/breeder/profile/license` へ遷移する。

## saveLicenseProfile

| 項目       | 内容                                                              |
| ---------- | ----------------------------------------------------------------- |
| 種別       | Server Action                                                     |
| 実装       | `src/features/breeder-profile/service.ts`                         |
| 認証       | Supabase Auth セッション（`auth.getUser()`）                      |
| 初期値取得 | `loadLicenseProfile`（`src/features/breeder-profile/loaders.ts`） |

### リクエスト（LicenseProfileInput）

| フィールド                   | 型     | 必須                           |
| ---------------------------- | ------ | ------------------------------ |
| `businessRegistrationType`   | string | はい（7 種類の Select）        |
| `businessRegistrationNumber` | string | はい                           |
| `registrationAuthority`      | string | はい                           |
| `registrationExpiresAt`      | string | はい（`YYYY-MM-DD`、本日以降） |

### 更新対象カラム

| DB カラム                      | 内容       |
| ------------------------------ | ---------- |
| `business_registration_type`   | 登録種別   |
| `business_registration_number` | 登録番号   |
| `registration_authority`       | 登録自治体 |
| `registration_expires_at`      | 有効期限   |
| `updated_at`                   | 更新日時   |

### エラー表示

- 本番環境: 汎用メッセージのみ
- 開発環境: `console.error` に詳細を出力

### 成功時の画面遷移

`/breeder/profile/introduction` へ遷移する。

## saveIntroductionProfile

| 項目       | 内容                                                                   |
| ---------- | ---------------------------------------------------------------------- |
| 種別       | Server Action                                                          |
| 実装       | `src/features/breeder-profile/service.ts`                              |
| 認証       | Supabase Auth セッション（`auth.getUser()`）                           |
| 初期値取得 | `loadIntroductionProfile`（`src/features/breeder-profile/loaders.ts`） |

### リクエスト（IntroductionProfileInput）

| フィールド            | 型     | 必須                  |
| --------------------- | ------ | --------------------- |
| `profileText`         | string | はい（20〜1000 文字） |
| `breedingPolicy`      | string | はい（20〜1000 文字） |
| `healthPolicy`        | string | はい（20〜1000 文字） |
| `breedingEnvironment` | string | はい（20〜1000 文字） |

### 更新対象カラム

| DB カラム              | 内容           |
| ---------------------- | -------------- |
| `profile_text`         | ブリーダー紹介 |
| `breeding_policy`      | 繁殖方針       |
| `health_policy`        | 健康管理方針   |
| `breeding_environment` | 飼育環境       |
| `updated_at`           | 更新日時       |

### AI 文章生成（将来方針）

- 第1期では AI 下書き生成は未実装
- 将来 Dify で下書き生成予定
- AI 生成文の自動公開は行わない
- 公開フロー: AI 下書き → ブリーダー確認・修正 → 管理者審査 → 公開

### エラー表示

- 本番環境: 汎用メッセージのみ
- 開発環境: `console.error` に詳細を出力

### 成功時の画面遷移

`/breeder/profile/verification` へ遷移する。

## uploadBreederDocument

| 項目    | 内容                                         |
| ------- | -------------------------------------------- |
| 種別    | Server Action                                |
| 実装    | `src/features/breeder-profile/service.ts`    |
| 認証    | Supabase Auth セッション（`auth.getUser()`） |
| Storage | `breeder-documents`（private バケット）      |

### リクエスト（FormData）

| フィールド     | 型                          | 必須 |
| -------------- | --------------------------- | ---- |
| `documentType` | `"identity"` \| `"license"` | はい |
| `file`         | File                        | はい |

### ファイル制限

- 拡張子: jpg / jpeg / png / pdf
- MIME: `image/jpeg`, `image/png`, `application/pdf`
- 最大 10MB
- 保存パス例: `breeders/{userId}/identity/{timestamp}-{uuid}.jpg`

### 更新対象カラム

| DB カラム                | 内容                                       |
| ------------------------ | ------------------------------------------ |
| `identity_document_path` | 本人確認書類（`documentType=identity` 時） |
| `business_license_path`  | 登録証（`documentType=license` 時）        |
| `updated_at`             | 更新日時                                   |

公開 URL は発行しない。DB には Storage パスのみ保存する。

## completeBreederProfile

| 項目       | 内容                                      |
| ---------- | ----------------------------------------- |
| 種別       | Server Action                             |
| 実装       | `src/features/breeder-profile/service.ts` |
| 初期値取得 | `loadVerificationStepState`               |

### 処理

1. Step1〜Step4 の必須項目確認
2. `identity_document_path` / `business_license_path` の存在確認
3. 不足がある場合は `profile_completed` を更新せず、不足ステップを返却
4. すべて揃っている場合のみ以下を更新:

| DB カラム                      | 値          |
| ------------------------------ | ----------- |
| `identity_verification_status` | `submitted` |
| `business_verification_status` | `submitted` |
| `review_status`                | `submitted` |
| `profile_completed`            | `true`      |

`membership_status` / `subscription_status` は変更しない。

### 成功時の画面遷移

`/breeder/dashboard` へ遷移する。

## 関連ドキュメント

- [breeders テーブル](../05_データベース設計/breeders.md)
- [BR-09 ブリーダープロフィール](../04_画面設計/BR-09_ブリーダープロフィール.md)
- [Decision No.69](../01_設計変更管理/DecisionLog.md#decision-no69)
