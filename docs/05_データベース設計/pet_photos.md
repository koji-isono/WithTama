# pet_photos テーブル

| 項目 | 内容 |
|------|------|
| テーブル名 | `public.pet_photos` |
| Version | 1.0 |
| 状態 | 確定（pets Version 1.1 と整合） |

## 目的

犬猫ごとの複数写真を管理する。画像本体は Supabase Storage に保存し、DB にはパスのみ保存する。

## カラム定義

| カラム名 | 型 | NULL | 初期値 | 説明 |
|---------|-----|------|--------|------|
| `id` | uuid | NOT NULL | `gen_random_uuid()` | 写真ID、主キー |
| `pet_id` | uuid | NOT NULL | なし | `pets.id` への外部キー |
| `storage_path` | text | NOT NULL | なし | Supabase Storage 内のファイルパス |
| `display_order` | integer | NOT NULL | `0` | 表示順 |
| `is_main` | boolean | NOT NULL | `false` | メイン写真かどうか |
| `alt_text` | text | NULL | `null` | アクセシビリティ用代替テキスト |
| `created_at` | timestamptz | NOT NULL | `now()` | 登録日時 |
| `updated_at` | timestamptz | NOT NULL | `now()` | 更新日時 |

## TypeScript 対応（参考）

| DB カラム（snake_case） | TypeScript（camelCase） |
|------------------------|------------------------|
| `pet_id` | `petId` |
| `storage_path` | `storagePath` |
| `display_order` | `displayOrder` |
| `is_main` | `isMain` |
| `alt_text` | `altText` |
| `created_at` | `createdAt` |
| `updated_at` | `updatedAt` |

## 制約

### キー

- **Primary Key:** `id`
- **Foreign Key:** `pet_id` → `pets.id`
- **ON DELETE:** `pets` 削除時は `pet_photos` も削除（CASCADE）

### CHECK 制約

| カラム | 制約 |
|--------|------|
| `display_order` | `0` 以上 |

### ビジネスルール

- 1 匹につきメイン写真（`is_main = true`）は原則 1 枚。
- 第1期の写真上限は **10 枚を推奨**。
- **未決定事項:** 実際の上限値（アプリ側バリデーション・DB 制約）は今後確定する。
- **未決定事項:** Supabase Storage バケット名は今後確定する。
- 動画は第1期対象外。
- 親テーブル `pets` は Version 1.1 より論理削除（`deleted_at`）を採用。物理削除は原則行わないため、`ON DELETE CASCADE` は将来の物理削除運用時のみ適用を検討する。

## 関連テーブル

- [pets](./pets.md) … 親テーブル（`pet_id` → `pets.id`）

## 関連 Decision

- [Decision No.24](../01_設計変更管理/DecisionLog.md#decision-no24) — 写真はドラッグ＆ドロップ対応
- [Decision No.35](../01_設計変更管理/DecisionLog.md#decision-no35) — 犬猫写真は pet_photos で複数管理

## 関連画面

- [BR-08 犬猫新規登録](../04_画面設計/BR-08_犬猫新規登録.md) — 登録ステップ 2（写真）
- [BR-07 犬猫管理一覧](../04_画面設計/BR-07_犬猫管理一覧.md) — 写真枚数表示
