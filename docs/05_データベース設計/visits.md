# visits テーブル

| 項目 | 内容 |
|------|------|
| テーブル名 | `public.visits` |
| Version | 1.0 |
| 状態 | 確定 |

## 目的

問い合わせから派生した見学希望、日程確定、現物確認、対面説明、見学結果を管理する（Decision No.53, No.56〜No.58）。

`inquiries` には `visit_id` を持たせず、`visits.inquiry_id` に UNIQUE 制約を付け、1 問い合わせにつき 0 件または 1 件の見学とする。

## カラム定義

| カラム名 | 型 | NULL | 初期値 | 説明 |
|---------|-----|------|--------|------|
| `id` | uuid | NOT NULL | `gen_random_uuid()` | 見学ID、主キー |
| `inquiry_id` | uuid | NOT NULL | なし | `inquiries.id` への外部キー（UNIQUE） |
| `buyer_id` | uuid | NOT NULL | なし | `buyers.id` への外部キー |
| `breeder_id` | uuid | NOT NULL | なし | `breeders.id` への外部キー |
| `pet_id` | uuid | NOT NULL | なし | `pets.id` への外部キー |
| `requested_at` | timestamptz | NOT NULL | なし | 購入希望者の第一希望日時 |
| `requested_at_second` | timestamptz | NULL | `null` | 第二希望日時 |
| `requested_at_third` | timestamptz | NULL | `null` | 第三希望日時 |
| `scheduled_at` | timestamptz | NULL | `null` | 確定した見学日時 |
| `status` | text | NOT NULL | `requested` | 見学状態 |
| `confirmed_by_breeder_at` | timestamptz | NULL | `null` | ブリーダー承認日時 |
| `animal_confirmed` | boolean | NOT NULL | `false` | 現物確認実施 |
| `explanation_completed` | boolean | NOT NULL | `false` | 対面説明実施 |
| `result` | text | NOT NULL | `pending` | 見学結果 |
| `completed_at` | timestamptz | NULL | `null` | 見学完了日時 |
| `canceled_at` | timestamptz | NULL | `null` | キャンセル日時 |
| `cancellation_reason` | text | NULL | `null` | キャンセル理由 |
| `breeder_note` | text | NULL | `null` | ブリーダー内部メモ |
| `deleted_at` | timestamptz | NULL | `null` | 論理削除日時 |
| `created_at` | timestamptz | NOT NULL | `now()` | 作成日時 |
| `updated_at` | timestamptz | NOT NULL | `now()` | 更新日時（UPDATE 時にトリガーで自動更新） |

## TypeScript 対応（参考）

| DB カラム（snake_case） | TypeScript（camelCase） |
|------------------------|------------------------|
| `inquiry_id` | `inquiryId` |
| `buyer_id` | `buyerId` |
| `breeder_id` | `breederId` |
| `pet_id` | `petId` |
| `requested_at` | `requestedAt` |
| `requested_at_second` | `requestedAtSecond` |
| `requested_at_third` | `requestedAtThird` |
| `scheduled_at` | `scheduledAt` |
| `confirmed_by_breeder_at` | `confirmedByBreederAt` |
| `animal_confirmed` | `animalConfirmed` |
| `explanation_completed` | `explanationCompleted` |
| `completed_at` | `completedAt` |
| `canceled_at` | `canceledAt` |
| `cancellation_reason` | `cancellationReason` |
| `breeder_note` | `breederNote` |
| `deleted_at` | `deletedAt` |
| `created_at` | `createdAt` |
| `updated_at` | `updatedAt` |

## 制約

### キー

- **Primary Key:** `id`
- **Foreign Key:** `inquiry_id` → `inquiries.id`（ON DELETE RESTRICT）
- **Foreign Key:** `buyer_id` → `buyers.id`（ON DELETE RESTRICT）
- **Foreign Key:** `breeder_id` → `breeders.id`（ON DELETE RESTRICT）
- **Foreign Key:** `pet_id` → `pets.id`（ON DELETE RESTRICT）
- **Unique:** `inquiry_id` … 1 問い合わせにつき見学は最大 1 件

### CHECK 制約 — status

| 値 | 説明 |
|----|------|
| `requested` | 見学希望受付 |
| `scheduled` | 見学日時確定 |
| `completed` | 見学完了 |
| `canceled` | キャンセル |

### CHECK 制約 — result

| 値 | 説明 |
|----|------|
| `pending` | 未決定 |
| `contracted` | 成約 |
| `declined` | 見送り |
| `considering` | 検討中 |

### ビジネスルール

- `deleted_at` による論理削除を採用する。
- 物理 DELETE は第1期では許可しない。

## 見学業務ルール

- 見学希望が作成された時点で `visits` を 1 件作成し、`inquiries.status` を `visit_requested` へ変更する。
- ブリーダーが日時確定した時点で `scheduled_at` を設定し、`visits.status` を `scheduled`、`inquiries.status` を `visit_scheduled` へ変更する。
- 日程変更は同一 `visits` レコードを更新する（Decision No.57）。
- 第1期では日程変更履歴を保持しない。第2期以降に `visit_histories` テーブルとして検討する。
- 現物確認は `animal_confirmed` で管理する（Decision No.58）。
- 対面説明は `explanation_completed` で管理する（Decision No.58）。
- 第1期では実施日時、担当者、電子署名は保持しない。
- 見学完了時は `completed_at` を設定する。
- 成約時は `result` を `contracted` へ変更する。
- 成約処理や犬猫売買契約はサイト内では完結させない。
- 法的判断が必要な運用は、弁護士または管轄自治体への確認が必要。

## RLS 方針

RLS を有効化する。

購入希望者本人または対象ブリーダー本人のみ SELECT 可能。

### 購入希望者

| 操作 | 許可内容 |
|------|---------|
| SELECT | 可 |
| INSERT | 見学希望作成 |
| UPDATE | 希望日時の変更、キャンセル |

### ブリーダー

| 操作 | 許可内容 |
|------|---------|
| SELECT | 可 |
| UPDATE | 確定日時設定、見学承認、現物確認記録、対面説明記録、見学結果更新、キャンセル |

カラム単位の更新制限は RLS だけでは複雑になるため、Server Action または DB 関数で制御する。

### 管理者

全件参照・更新可能。詳細は [権限設計](../07_権限設計/README.md) で別途定義する。

## インデックス

| インデックス名 | カラム / 条件 |
|---------------|--------------|
| `visits_buyer_id_idx` | `buyer_id` |
| `visits_breeder_id_idx` | `breeder_id` |
| `visits_pet_id_idx` | `pet_id` |
| `visits_status_idx` | `status` |
| `visits_scheduled_at_idx` | `scheduled_at` |
| `visits_active_idx` | `deleted_at IS NULL`（部分インデックス） |

## マイグレーション

| ファイル | 内容 |
|---------|------|
| `20260804163239_create_inquiries_messages_visits.sql` | Version 1.0 新規作成 |

## 関連テーブル

- [inquiries](./inquiries.md) … 親テーブル（`inquiry_id` → `inquiries.id`、0 または 1 件）
- `buyers` … `buyer_id` → `buyers.id`
- `breeders` … `breeder_id` → `breeders.id`
- [pets](./pets.md) … `pet_id` → `pets.id`

## 関連 Decision

- [Decision No.53](../01_設計変更管理/DecisionLog.md#decision-no53) — 問い合わせと見学を別テーブルで管理
- [Decision No.56](../01_設計変更管理/DecisionLog.md#decision-no56) — 見学希望時に visits レコードを作成
- [Decision No.57](../01_設計変更管理/DecisionLog.md#decision-no57) — 1 問い合わせにつき 1 見学
- [Decision No.58](../01_設計変更管理/DecisionLog.md#decision-no58) — 現物確認・対面説明を boolean で管理

## 関連ドキュメント

- [ER図 Version 1.2](./ER図.md)
