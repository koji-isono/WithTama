# inquiries テーブル

| 項目       | 内容               |
| ---------- | ------------------ |
| テーブル名 | `public.inquiries` |
| Version    | 1.0                |
| 状態       | 確定               |

## 目的

購入希望者からブリーダーへの問い合わせ案件を管理する。メッセージ本文は [inquiry_messages](./inquiry_messages.md) で管理する。見学は [visits](./visits.md) で管理し、本テーブルには `visit_id` は持たない（Decision No.53, No.56）。

第1期ではリアルタイムチャットは実装せず、テキストメッセージの履歴として管理する。

## カラム定義

| カラム名          | 型          | NULL     | 初期値              | 説明                                      |
| ----------------- | ----------- | -------- | ------------------- | ----------------------------------------- |
| `id`              | uuid        | NOT NULL | `gen_random_uuid()` | 問い合わせID、主キー                      |
| `buyer_id`        | uuid        | NOT NULL | なし                | `buyers.id` への外部キー                  |
| `breeder_id`      | uuid        | NOT NULL | なし                | `breeders.id` への外部キー                |
| `pet_id`          | uuid        | NOT NULL | なし                | `pets.id` への外部キー                    |
| `status`          | text        | NOT NULL | `open`              | 問い合わせ状態                            |
| `subject`         | text        | NULL     | `null`              | 問い合わせ件名                            |
| `last_message_at` | timestamptz | NULL     | `null`              | 最終メッセージ日時                        |
| `closed_at`       | timestamptz | NULL     | `null`              | クローズ日時                              |
| `deleted_at`      | timestamptz | NULL     | `null`              | 論理削除日時                              |
| `created_at`      | timestamptz | NOT NULL | `now()`             | 作成日時                                  |
| `updated_at`      | timestamptz | NOT NULL | `now()`             | 更新日時（UPDATE 時にトリガーで自動更新） |

## TypeScript 対応（参考）

| DB カラム（snake_case） | TypeScript（camelCase） |
| ----------------------- | ----------------------- |
| `buyer_id`              | `buyerId`               |
| `breeder_id`            | `breederId`             |
| `pet_id`                | `petId`                 |
| `last_message_at`       | `lastMessageAt`         |
| `closed_at`             | `closedAt`              |
| `deleted_at`            | `deletedAt`             |
| `created_at`            | `createdAt`             |
| `updated_at`            | `updatedAt`             |

## 制約

### キー

- **Primary Key:** `id`
- **Foreign Key:** `buyer_id` → `buyers.id`（ON DELETE RESTRICT）
- **Foreign Key:** `breeder_id` → `breeders.id`（ON DELETE RESTRICT）
- **Foreign Key:** `pet_id` → `pets.id`（ON DELETE RESTRICT）

### CHECK 制約 — status

| 値                | 説明               |
| ----------------- | ------------------ |
| `open`            | 問い合わせ受付     |
| `replied`         | ブリーダー返信済み |
| `visit_requested` | 見学希望あり       |
| `visit_scheduled` | 見学日時確定       |
| `completed`       | 問い合わせ対応完了 |
| `closed`          | クローズ           |

### ステータス遷移

```
open → replied → visit_requested → visit_scheduled → completed → closed
```

問い合わせのみで終了する場合は、`open` または `replied` から `completed` または `closed` へ直接遷移可能とする。

### ビジネスルール

- `buyer`、`breeder`、`pet` の削除時は問い合わせを自動削除しない（ON DELETE RESTRICT）。
- `deleted_at` による論理削除を採用する。
- 物理 DELETE は第1期では許可しない。

## RLS 方針

RLS を有効化する。

### 購入希望者

`buyers.user_id = auth.uid()` である問い合わせのみ:

| 操作   | 許可                 |
| ------ | -------------------- |
| SELECT | 可                   |
| INSERT | 可                   |
| UPDATE | 可                   |
| DELETE | 不可（物理削除禁止） |

INSERT 時に確認する項目:

- `buyer_id` が自分の `buyers.id` である
- `pet_id` が存在する
- `breeder_id` が `pets.breeder_id` と一致する
- `pet.deleted_at IS NULL` である
- `pet.status = published` である

複雑な整合性確認は RLS だけで完結させず、Server Action または DB 関数で補強する。

### ブリーダー

`breeders.user_id = auth.uid()` である問い合わせのみ:

| 操作   | 許可 |
| ------ | ---- |
| SELECT | 可   |
| UPDATE | 可   |
| INSERT | 不可 |
| DELETE | 不可 |

### 管理者

全件参照・更新可能。管理者判定の詳細は [権限設計](../07_権限設計/README.md) で別途定義する。

## インデックス

| インデックス名                  | カラム / 条件                            |
| ------------------------------- | ---------------------------------------- |
| `inquiries_buyer_id_idx`        | `buyer_id`                               |
| `inquiries_breeder_id_idx`      | `breeder_id`                             |
| `inquiries_pet_id_idx`          | `pet_id`                                 |
| `inquiries_status_idx`          | `status`                                 |
| `inquiries_last_message_at_idx` | `last_message_at`                        |
| `inquiries_active_idx`          | `deleted_at IS NULL`（部分インデックス） |

## マイグレーション

| ファイル                                                       | 内容                                                                |
| -------------------------------------------------------------- | ------------------------------------------------------------------- |
| `20260804163239_create_inquiries_messages_visits.sql`          | Version 1.0 新規作成（`inquiries` / `inquiry_messages` / `visits`） |
| `20260821153000_create_get_inquiry_buyer_display_name_rpc.sql` | `get_inquiry_buyer_display_name` RPC（Decision No.112）             |

## RPC（Decision No.112）

問い合わせ当事者が buyer の **表示名のみ** を取得する。

| 関数                                         | 戻り値 | 用途                         |
| -------------------------------------------- | ------ | ---------------------------- |
| `get_inquiry_buyer_display_name(inquiry_id)` | `text` | BR-12 / BY-06 等の表示名取得 |

- breeder 向け `buyers` SELECT RLS は **追加しない**
- 詳細: [buyers.md — 問い合わせ表示名 RPC](./buyers.md#問い合わせ表示名-rpc-decision-no112)

## 関連テーブル

- `buyers` … `buyer_id` → `buyers.id`
- `breeders` … `breeder_id` → `breeders.id`
- [pets](./pets.md) … `pet_id` → `pets.id`
- [inquiry_messages](./inquiry_messages.md) … 子テーブル
- [visits](./visits.md) … `visits.inquiry_id` で 0 または 1 件関連

## 関連 Decision

- [Decision No.53](../01_設計変更管理/DecisionLog.md#decision-no53) — 問い合わせと見学を別テーブルで管理
- [Decision No.54](../01_設計変更管理/DecisionLog.md#decision-no54) — 問い合わせ本体とメッセージ履歴を分離

## 関連ドキュメント

- [ER図 Version 1.2](./ER図.md)
