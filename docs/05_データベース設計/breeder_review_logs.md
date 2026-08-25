# breeder_review_logs テーブル

| 項目       | 内容                                           |
| ---------- | ---------------------------------------------- |
| テーブル名 | `public.breeder_review_logs`                   |
| Version    | 1.0                                            |
| 状態       | Version 1.0 確定（Migration 作成済み・未適用） |

## 目的

ブリーダー審査の履歴（申請・審査開始・承認・差戻し・却下）を時系列で管理する（Decision No.131）。

- **`breeders`** … 現在の審査状態・確認状態
- **`breeder_review_logs`** … 審査イベントの履歴

申請日時・承認日時・差戻し日時は、対応するログ行の `created_at` から取得する。`breeders` に `submitted_at` 等の専用カラムは **第1期では追加しない**（`pet_review_logs` と同思想、Decision No.98 準拠）。

## カラム定義

| カラム名        | 型          | NULL     | 初期値              | 説明                                 |
| --------------- | ----------- | -------- | ------------------- | ------------------------------------ |
| `id`            | uuid        | NOT NULL | `gen_random_uuid()` | ログ ID、主キー                      |
| `breeder_id`    | uuid        | NOT NULL | なし                | 対象ブリーダー ID。`breeders.id` FK  |
| `action`        | text        | NOT NULL | なし                | 審査イベント種別（下記 5 種類）      |
| `comment`       | text        | NULL     | `null`              | 差戻し・却下理由。該当 action 時必須 |
| `actor_user_id` | uuid        | NOT NULL | なし                | 操作者の `auth.users.id`             |
| `created_at`    | timestamptz | NOT NULL | `now()`             | イベント発生日時                     |

## TypeScript 対応（参考）

| DB カラム（snake_case） | TypeScript（camelCase） |
| ----------------------- | ----------------------- |
| `breeder_id`            | `breederId`             |
| `actor_user_id`         | `actorUserId`           |
| `created_at`            | `createdAt`             |

## 制約

### キー

- **Primary Key:** `id`
- **Foreign Key:** `breeder_id` → `public.breeders.id`（ON DELETE RESTRICT）
- **Foreign Key:** `actor_user_id` → `auth.users.id`（ON DELETE RESTRICT）

### CHECK 制約 — action

| 値               | 説明                     | `comment`                          |
| ---------------- | ------------------------ | ---------------------------------- |
| `submitted`      | ブリーダーによる審査申請 | NULL 可                            |
| `review_started` | 管理者による審査開始     | NULL 可                            |
| `approved`       | 管理者による承認         | NULL 可（第1期）                   |
| `returned`       | 管理者による差戻し       | **必須**（`btrim(comment) <> ''`） |
| `rejected`       | 管理者による却下         | **必須**（`btrim(comment) <> ''`） |

DB 制約（実装時）:

- `breeder_review_logs_returned_comment_check` — `action = 'returned'` 時は comment 非空
- `breeder_review_logs_rejected_comment_check` — `action = 'rejected'` 時は comment 非空

### ビジネスルール

- 審査履歴は **追記のみ**。通常の UPDATE / DELETE は禁止する（Decision No.131、`pet_review_logs` と同様）。
- `actor_user_id` はサーバー側で `auth.uid()` から取得し、クライアント指定値を信用しない。
- **初回提出:** RPC `submit_breeder_application`（Decision No.137）で `review_status` を `submitted` に更新すると同時に `action = submitted` を INSERT。
- **再提出:** RPC `resubmit_breeder_application`（Decision No.137）で `review_status` を `submitted` に更新すると同時に `action = submitted` を INSERT。
- **審査開始:** RPC `start_breeder_review` で `submitted` / `resubmission_required` → `under_review` と同時に `action = review_started` を INSERT。
- **承認:** RPC `approve_breeder_review` で breeders 更新と同時に `action = approved` を INSERT。
- **差戻し:** RPC `return_breeder_review` で `under_review` → `resubmission_required` と差戻し理由を INSERT。
- **却下:** RPC `reject_breeder_review` で `under_review` → `rejected` と却下理由を INSERT。

### 申請日時の取得

一覧・詳細画面（AD-01 / AD-02）で表示する「申請日時」は、対象 `breeder_id` の **`action = submitted` のうち最新行** の `created_at` を使用する。

```sql
-- 参考クエリ（実装時）
SELECT created_at
FROM public.breeder_review_logs
WHERE breeder_id = :breeder_id
  AND action = 'submitted'
ORDER BY created_at DESC
LIMIT 1;
```

## 関連テーブル

- [breeders](./breeders.md) … 親テーブル（`breeder_id` → `breeders.id`）

## RLS（設計案）

| 操作   | breeder（本人）                | admin                                                      | 備考                 |
| ------ | ------------------------------ | ---------------------------------------------------------- | -------------------- |
| SELECT | ✅ 自分の `breeders.id` のログ | ✅                                                         |                      |
| INSERT | ✅ `action = submitted` のみ   | ✅ `review_started` / `approved` / `returned` / `rejected` | 追記専用             |
| UPDATE | —                              | —                                                          | ポリシーなし（禁止） |
| DELETE | —                              | —                                                          | ポリシーなし（禁止） |

### ポリシー一覧（実装時）

| ポリシー名（仮称）                             | 操作   | 条件                                                                                                               |
| ---------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------ |
| `breeder_review_logs_select_breeder_own`       | SELECT | 対象 `breeder_id` の `user_id = auth.uid()`                                                                        |
| `breeder_review_logs_select_admin`             | SELECT | `public.is_admin()`                                                                                                |
| `breeder_review_logs_insert_submitted_breeder` | INSERT | `actor_user_id = auth.uid()`、`action = 'submitted'`、本人の `breeder_id`                                          |
| `breeder_review_logs_insert_admin_review`      | INSERT | `public.is_admin()`、`actor_user_id = auth.uid()`、`action IN ('review_started','approved','returned','rejected')` |

- Service Role Key 前提にしない
- admin 操作は **RPC 経由** を正とし、RPC 内で log INSERT と breeders UPDATE を同一トランザクションで実行

## インデックス（設計案）

| 名前                                            | カラム                          |
| ----------------------------------------------- | ------------------------------- |
| `breeder_review_logs_breeder_id_created_at_idx` | `breeder_id`, `created_at DESC` |

## マイグレーション

| ファイル                                                    | 内容                                     |
| ----------------------------------------------------------- | ---------------------------------------- |
| `20260825100000_create_breeder_review_logs.sql`             | テーブル・制約・インデックス・RLS        |
| `20260825110000_add_admin_breeder_documents_select_rls.sql` | 管理者 SELECT（`breeder-documents`）     |
| `20260825120000_create_breeder_review_admin_rpcs.sql`       | 審査 RPC 4 種                            |
| `20260825130000_create_breeder_application_submit_rpcs.sql` | 初回提出 / 再提出 RPC（Decision No.137） |

**Supabase への適用:** Migration ファイル作成済み。適用後 `npm run test:breeder-application-submit-rpcs` で検証。

## 関連 Decision

- [Decision No.98](../01_設計変更管理/DecisionLog.md#decision-no98) — 申請日時はログ `created_at`（思想準拠）
- [Decision No.105](../01_設計変更管理/DecisionLog.md#decision-no105) — pet_review_logs 設計（対称）
- [Decision No.131](../01_設計変更管理/DecisionLog.md#decision-no131) — 本テーブル採用
- [Decision No.137](../01_設計変更管理/DecisionLog.md#decision-no137) — 再提出 RPC・初回 submitted log

## 関連画面

- [AD-01 ブリーダー審査一覧](../04_画面設計/AD-01_ブリーダー審査一覧.md)
- [AD-02 ブリーダー審査詳細](../04_画面設計/AD-02_ブリーダー審査詳細.md)
- [BR-09 ブリーダープロフィール](../04_画面設計/BR-09_ブリーダープロフィール.md)
