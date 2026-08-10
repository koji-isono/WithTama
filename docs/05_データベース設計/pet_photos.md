# pet_photos テーブル

| 項目       | 内容                            |
| ---------- | ------------------------------- |
| テーブル名 | `public.pet_photos`             |
| Version    | 1.0                             |
| 状態       | 確定（pets Version 1.1 と整合） |

## 目的

犬猫ごとの複数写真を管理する。画像本体は Supabase Storage（private バケット `pet-photos`）に保存し、DB にはパスのみ保存する。画面表示には Signed URL を使用する（Decision No.87）。

## カラム定義

| カラム名        | 型          | NULL     | 初期値              | 説明                              |
| --------------- | ----------- | -------- | ------------------- | --------------------------------- |
| `id`            | uuid        | NOT NULL | `gen_random_uuid()` | 写真ID、主キー                    |
| `pet_id`        | uuid        | NOT NULL | なし                | `pets.id` への外部キー            |
| `storage_path`  | text        | NOT NULL | なし                | Supabase Storage 内のファイルパス |
| `display_order` | integer     | NOT NULL | `0`                 | 表示順                            |
| `is_main`       | boolean     | NOT NULL | `false`             | メイン写真かどうか                |
| `alt_text`      | text        | NULL     | `null`              | アクセシビリティ用代替テキスト    |
| `created_at`    | timestamptz | NOT NULL | `now()`             | 登録日時                          |
| `updated_at`    | timestamptz | NOT NULL | `now()`             | 更新日時                          |

## TypeScript 対応（参考）

| DB カラム（snake_case） | TypeScript（camelCase） |
| ----------------------- | ----------------------- |
| `pet_id`                | `petId`                 |
| `storage_path`          | `storagePath`           |
| `display_order`         | `displayOrder`          |
| `is_main`               | `isMain`                |
| `alt_text`              | `altText`               |
| `created_at`            | `createdAt`             |
| `updated_at`            | `updatedAt`             |

## 制約

### キー

- **Primary Key:** `id`
- **Foreign Key:** `pet_id` → `pets.id`
- **ON DELETE:** `pets` 削除時は `pet_photos` も削除（CASCADE）

### CHECK 制約

| カラム          | 制約     |
| --------------- | -------- |
| `display_order` | `0` 以上 |

### ビジネスルール

- 1 匹につきメイン写真（`is_main = true`）は **1 枚**（Decision No.88）。
- 第1期の写真上限は **10 枚**（アプリ側バリデーション、Decision No.88）。
- 許可 MIME: `image/jpeg`, `image/png`。1 ファイル 10MB 以内。
- 動画・PDF・GIF・WebP は第1期対象外（Decision No.89）。
- 並び替え UI は第1期未実装。表示は `display_order` → `created_at` 順。
- Storage バケット名: **`pet-photos`**（private）。
- Storage パス: `breeders/{authUserId}/pets/{petId}/{uuid}.{ext}`（元ファイル名は使用しない）。
- 親テーブル `pets` は Version 1.1 より論理削除（`deleted_at`）を採用。

## Storage（`pet-photos`）

| 項目               | 内容                                           |
| ------------------ | ---------------------------------------------- |
| バケット名         | `pet-photos`                                   |
| 公開設定           | **private**                                    |
| ファイルサイズ上限 | 10MB                                           |
| 許可 MIME          | `image/jpeg`, `image/png`                      |
| Migration          | `20260806143000_create_pet_photos_storage.sql` |

## RLS

ブリーダー本人は、`pet_photos.pet_id` に紐づく `pets.breeder_id` が自分の `breeders.id` と一致する場合のみ SELECT / INSERT / UPDATE / DELETE 可能。

管理者（`public.is_admin()`）は **SELECT のみ** 許可する（Decision No.104）。INSERT / UPDATE / DELETE は不可。写真表示は Server 側で admin 権限確認後、Signed URL を発行する。

Migration: `20260806143100_create_pet_photos_table_and_rls.sql`（admin SELECT ポリシーは将来追加）

メイン写真の一括更新は PostgreSQL 関数 `set_main_pet_photo(p_pet_id, p_photo_id)` を使用する。

## 関連テーブル

- [pets](./pets.md) … 親テーブル（`pet_id` → `pets.id`）

## 関連 Decision

- [Decision No.24](../01_設計変更管理/DecisionLog.md#decision-no24) — 写真はドラッグ＆ドロップ対応（将来）
- [Decision No.35](../01_設計変更管理/DecisionLog.md#decision-no35) — 犬猫写真は pet_photos で複数管理
- [Decision No.87](../01_設計変更管理/DecisionLog.md#decision-no87) — 非公開 Storage + Signed URL
- [Decision No.88](../01_設計変更管理/DecisionLog.md#decision-no88) — 最大 10 枚・メイン 1 枚
- [Decision No.89](../01_設計変更管理/DecisionLog.md#decision-no89) — 並び替え・動画・画像編集は第1期対象外
- [Decision No.104](../01_設計変更管理/DecisionLog.md#decision-no104) — admin は SELECT のみ

## 関連画面

- [BR-11 犬猫情報編集](../04_画面設計/BR-11_犬猫情報編集.md) — 写真アップロード・一覧・メイン設定・削除
- [BR-07 犬猫管理一覧](../04_画面設計/BR-07_犬猫管理一覧.md) — 写真枚数表示（将来）
- [AD-10 犬猫掲載審査一覧](../04_画面設計/AD-10_犬猫掲載審査一覧.md) — メイン写真表示
- [AD-11 犬猫掲載審査詳細](../04_画面設計/AD-11_犬猫掲載審査詳細.md) — 写真一覧表示
