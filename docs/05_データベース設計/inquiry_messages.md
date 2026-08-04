# inquiry_messages テーブル

| 項目 | 内容 |
|------|------|
| テーブル名 | `public.inquiry_messages` |
| Version | 1.0 |
| 状態 | 確定 |

## 目的

問い合わせ内の購入希望者、ブリーダー、管理者によるテキストメッセージ履歴を管理する（Decision No.54, No.55）。

第1期ではリアルタイムチャットは実装せず、テキストメッセージの履歴として管理する。

## カラム定義

| カラム名 | 型 | NULL | 初期値 | 説明 |
|---------|-----|------|--------|------|
| `id` | uuid | NOT NULL | `gen_random_uuid()` | メッセージID、主キー |
| `inquiry_id` | uuid | NOT NULL | なし | `inquiries.id` への外部キー |
| `sender_type` | text | NOT NULL | なし | `buyer` / `breeder` / `admin` |
| `sender_user_id` | uuid | NOT NULL | なし | `auth.users.id` |
| `message` | text | NOT NULL | なし | メッセージ本文 |
| `is_read` | boolean | NOT NULL | `false` | 既読状態 |
| `read_at` | timestamptz | NULL | `null` | 既読日時 |
| `created_at` | timestamptz | NOT NULL | `now()` | 送信日時 |

## TypeScript 対応（参考）

| DB カラム（snake_case） | TypeScript（camelCase） |
|------------------------|------------------------|
| `inquiry_id` | `inquiryId` |
| `sender_type` | `senderType` |
| `sender_user_id` | `senderUserId` |
| `is_read` | `isRead` |
| `read_at` | `readAt` |
| `created_at` | `createdAt` |

## 制約

### キー

- **Primary Key:** `id`
- **Foreign Key:** `inquiry_id` → `inquiries.id`（ON DELETE CASCADE）
- **Foreign Key:** `sender_user_id` → `auth.users.id`（ON DELETE RESTRICT）

### CHECK 制約

| カラム | 制約 |
|--------|------|
| `sender_type` | `buyer` / `breeder` / `admin` のみ |
| `message` | 空文字不可（`length(trim(message)) > 0`） |

### ビジネスルール

- 第1期はテキストのみ。画像、動画、添付ファイルは第1期対象外。
- UPDATE は既読更新（`is_read` / `read_at`）だけに限定する。
- 送信済み本文の編集・削除は第1期では行わない。
- 物理 DELETE は第1期では許可しない。

## メッセージ送信時の処理方針

新規メッセージ作成時に以下を行う（第1期では DB トリガーではなく Server Action または Repository 層で実施）:

- `inquiries.last_message_at` をメッセージの `created_at` で更新
- 購入希望者が送信した場合、必要に応じて `inquiries.status` を `open` へ更新
- ブリーダーが初回返信した場合、`inquiries.status` を `replied` へ更新

## RLS 方針

RLS を有効化する。

### 購入希望者・ブリーダー

関連 `inquiries` の当事者である場合のみ:

| 操作 | 許可 |
|------|------|
| SELECT | 可 |
| INSERT | 可（下記条件） |
| UPDATE | 可（既読更新のみ、Server Action で制限） |
| DELETE | 不可 |

INSERT 時に確認する項目:

- `sender_user_id = auth.uid()`
- `sender_type` とユーザー役割が一致
- 関連 `inquiries` の当事者である

UPDATE は、受信者が `is_read` および `read_at` を更新する場合に限定する。カラム単位の制限は Server Action または DB 関数で補強する。

### 管理者

全件参照可能。管理者による送信方針は [権限設計](../07_権限設計/README.md) で別途定義する。

## インデックス

| インデックス名 | カラム / 条件 |
|---------------|--------------|
| `inquiry_messages_inquiry_id_idx` | `inquiry_id` |
| `inquiry_messages_created_at_idx` | `created_at` |
| `inquiry_messages_unread_idx` | `is_read = false`（部分インデックス） |

## マイグレーション

| ファイル | 内容 |
|---------|------|
| `20260804163239_create_inquiries_messages_visits.sql` | Version 1.0 新規作成 |

## 関連テーブル

- [inquiries](./inquiries.md) … 親テーブル（`inquiry_id` → `inquiries.id`）

## 関連 Decision

- [Decision No.54](../01_設計変更管理/DecisionLog.md#decision-no54) — 問い合わせ本体とメッセージ履歴を分離
- [Decision No.55](../01_設計変更管理/DecisionLog.md#decision-no55) — 第1期メッセージはテキストのみ

## 関連ドキュメント

- [ER図 Version 1.2](./ER図.md)
