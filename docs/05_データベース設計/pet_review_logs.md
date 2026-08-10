# pet_review_logs テーブル

| 項目       | 内容                                           |
| ---------- | ---------------------------------------------- |
| テーブル名 | `public.pet_review_logs`                       |
| Version    | 1.0                                            |
| 状態       | Version 1.0 確定（Migration 作成済み・未適用） |

## 目的

犬猫掲載審査の履歴（公開申請・差戻し・承認）を時系列で管理する。

- **`pets`** … 現在の掲載状態（Decision No.98）
- **`pet_review_logs`** … 審査イベントの履歴（Decision No.97）

申請日時・承認日時・差戻し日時は、対応するログ行の `created_at` から取得する。`pets` に `submitted_at` 等の専用カラムは追加しない（Decision No.98）。

## カラム定義

| カラム名        | 型          | NULL     | 初期値              | 説明                                |
| --------------- | ----------- | -------- | ------------------- | ----------------------------------- |
| `id`            | uuid        | NOT NULL | `gen_random_uuid()` | ログ ID、主キー                     |
| `pet_id`        | uuid        | NOT NULL | なし                | 対象犬猫 ID。`pets.id` への外部キー |
| `action`        | text        | NOT NULL | なし                | 審査イベント種別（下記 3 種類）     |
| `comment`       | text        | NULL     | `null`              | 差戻し理由等。`returned` 時は必須   |
| `actor_user_id` | uuid        | NOT NULL | なし                | 操作者の `auth.users.id`            |
| `created_at`    | timestamptz | NOT NULL | `now()`             | イベント発生日時                    |

## TypeScript 対応（参考）

| DB カラム（snake_case） | TypeScript（camelCase） |
| ----------------------- | ----------------------- |
| `pet_id`                | `petId`                 |
| `actor_user_id`         | `actorUserId`           |
| `created_at`            | `createdAt`             |

## 制約

### キー

- **Primary Key:** `id`
- **Foreign Key:** `pet_id` → `public.pets.id`（ON DELETE RESTRICT）
- **Foreign Key:** `actor_user_id` → `auth.users.id`（ON DELETE RESTRICT）

### CHECK 制約 — action

| 値          | 説明                     | `comment`                          |
| ----------- | ------------------------ | ---------------------------------- |
| `submitted` | ブリーダーによる公開申請 | NULL 可                            |
| `returned`  | 管理者による差戻し       | **必須**（`btrim(comment) <> ''`） |
| `approved`  | 管理者による公開承認     | NULL 可                            |

DB 制約: `pet_review_logs_returned_comment_check` — `action = 'returned'` 時は `comment IS NOT NULL AND btrim(comment) <> ''`

### ビジネスルール

- 審査履歴は **追記のみ**。通常の UPDATE / DELETE は禁止する（Decision No.105）。
- `actor_user_id` はサーバー側で `auth.getUser()` から取得し、クライアント指定値を信用しない（Decision No.105）。
- 公開申請時: `pets.status` を `draft` → `under_review` と同時に `action = submitted` を INSERT する（将来実装、Decision No.105）。
- 差戻し時: `pets.status` を `under_review` → `draft` と同時に `action = returned` と差戻し理由を INSERT する（RPC `return_pet_review`、Migration: `20260810120000_create_pet_review_admin_rpcs.sql`）。
- 承認時: `pets.status` を `under_review` → `published` と同時に `action = approved` を INSERT する（RPC `approve_pet_for_publish`、Migration: `20260810120000_create_pet_review_admin_rpcs.sql`）。

### 申請日時の取得

一覧・詳細画面で表示する「申請日時」は、対象 `pet_id` の **`action = submitted` のうち最新行** の `created_at` を使用する（Decision No.98）。

```sql
-- 参考クエリ（実装時）
SELECT created_at
FROM public.pet_review_logs
WHERE pet_id = :pet_id
  AND action = 'submitted'
ORDER BY created_at DESC
LIMIT 1;
```

## 関連テーブル

- [pets](./pets.md) … 親テーブル（`pet_id` → `pets.id`）

## RLS

| 操作   | breeder（本人）              | admin                           | 備考                 |
| ------ | ---------------------------- | ------------------------------- | -------------------- |
| SELECT | ✅ 自犬猫のログのみ          | ✅                              |                      |
| INSERT | ✅ `action = submitted` のみ | ✅ `returned` / `approved` のみ | 追記専用             |
| UPDATE | —                            | —                               | ポリシーなし（禁止） |
| DELETE | —                            | —                               | ポリシーなし（禁止） |

### ポリシー一覧

| ポリシー名                                 | 操作   | 条件                                                                                   |
| ------------------------------------------ | ------ | -------------------------------------------------------------------------------------- |
| `pet_review_logs_select_breeder_own`       | SELECT | 対象 `pet_id` の `breeder_id` = 自分の `breeders.id`                                   |
| `pet_review_logs_select_admin`             | SELECT | `public.is_admin()`                                                                    |
| `pet_review_logs_insert_submitted_breeder` | INSERT | `actor_user_id = auth.uid()`、`action = 'submitted'`、本人所有の `pet_id`              |
| `pet_review_logs_insert_admin_review`      | INSERT | `public.is_admin()`、`actor_user_id = auth.uid()`、`action IN ('returned','approved')` |

- `actor_user_id` は RLS で `auth.uid()` 一致を必須とする
- Service Role Key 前提にしない

Migration: `20260807110000_create_pet_review_logs.sql`

## インデックス

| 名前                                    | カラム                      |
| --------------------------------------- | --------------------------- |
| `pet_review_logs_pet_id_created_at_idx` | `pet_id`, `created_at DESC` |

## マイグレーション

| ファイル                                    | 内容                              |
| ------------------------------------------- | --------------------------------- |
| `20260807110000_create_pet_review_logs.sql` | テーブル・制約・インデックス・RLS |

**Supabase への適用は未実施**（ファイル作成のみ）。

## 未決定事項

以下は本設計書では確定しない。実装前に Decision または運用設計で決める。

| 項目                            | 備考                               |
| ------------------------------- | ---------------------------------- |
| 承認時 `comment` を必須にするか | 第1期は NULL 可（Decision No.105） |
| `audit_logs` との役割分担       | 別テーブル。詳細は未設計           |

## 関連 Decision

- [Decision No.96](../01_設計変更管理/DecisionLog.md#decision-no96) — 差戻しは `under_review` → `draft`
- [Decision No.97](../01_設計変更管理/DecisionLog.md#decision-no97) — 審査履歴テーブル
- [Decision No.98](../01_設計変更管理/DecisionLog.md#decision-no98) — 申請日時は `created_at`
- [Decision No.105](../01_設計変更管理/DecisionLog.md#decision-no105) — カラム・action・運用ルール

## 関連画面

- [AD-10 犬猫掲載審査一覧](../04_画面設計/AD-10_犬猫掲載審査一覧.md)
- [AD-11 犬猫掲載審査詳細](../04_画面設計/AD-11_犬猫掲載審査詳細.md)
