# buyers テーブル

| 項目 | 内容 |
|------|------|
| テーブル名 | `public.buyers` |
| Version | 1.2 |
| 状態 | 確定 |

## 目的

購入希望者のプロフィール、希望条件、通知設定、利用状態を管理する。

`auth.users`（認証）と `buyers`（購入希望者プロフィール）は 1 対 1 で紐付ける。

## カラム定義

| カラム名 | 型 | NULL | 初期値 | 説明 |
|---------|-----|------|--------|------|
| `id` | uuid | NOT NULL | `gen_random_uuid()` | 購入希望者ID、主キー |
| `user_id` | uuid | NOT NULL | なし | `auth.users.id` への外部キー |
| `display_name` | text | NULL | `null` | 表示名 |
| `full_name` | text | NULL | `null` | 氏名 |
| `prefecture` | text | NULL | `null` | 都道府県 |
| `city` | text | NULL | `null` | 市区町村 |
| `phone` | text | NULL | `null` | 電話番号 |
| `profile_text` | text | NULL | `null` | 自己紹介 |
| `preferred_species` | text | NULL | `null` | 希望種別（`dog` / `cat` / `both`） |
| `preferred_breed` | text | NULL | `null` | 希望犬種・猫種 |
| `notification_enabled` | boolean | NOT NULL | `true` | 通知有効 |
| `membership_status` | text | NOT NULL | `active` | 利用状態 |
| `profile_completed` | boolean | NOT NULL | `false` | プロフィール入力完了 |
| `deleted_at` | timestamptz | NULL | `null` | 論理削除日時 |
| `created_at` | timestamptz | NOT NULL | `now()` | 作成日時 |
| `updated_at` | timestamptz | NOT NULL | `now()` | 更新日時（UPDATE 時にトリガーで自動更新） |

## TypeScript 対応（参考）

| DB カラム（snake_case） | TypeScript（camelCase） |
|------------------------|------------------------|
| `user_id` | `userId` |
| `display_name` | `displayName` |
| `full_name` | `fullName` |
| `profile_text` | `profileText` |
| `preferred_species` | `preferredSpecies` |
| `preferred_breed` | `preferredBreed` |
| `notification_enabled` | `notificationEnabled` |
| `membership_status` | `membershipStatus` |
| `profile_completed` | `profileCompleted` |
| `deleted_at` | `deletedAt` |
| `created_at` | `createdAt` |
| `updated_at` | `updatedAt` |

## 制約

### キー

- **Primary Key:** `id`
- **Foreign Key:** `user_id` → `auth.users.id`（ON DELETE RESTRICT）
- **Unique:** `user_id`（1 ユーザー 1 購入希望者）

### CHECK 制約

| カラム | 制約 |
|--------|------|
| `preferred_species` | NULL または `dog` / `cat` / `both` |
| `membership_status` | `active` / `suspended` / `canceled` / `deleted` |

## 仮登録方針

初回ログイン時に `public.buyers` レコードを自動作成する（Decision No.61）。プロフィール未入力のため、多くの項目は NULL のまま作成してよい。

### アプリケーション側の INSERT 項目

| カラム | 値 |
|--------|-----|
| `user_id` | `auth.users.id` |
| `display_name` | メールアドレス `@` より前 |

### DB 初期値（自動設定）

| カラム | 初期値 |
|--------|--------|
| `notification_enabled` | `true` |
| `membership_status` | `active` |
| `profile_completed` | `false` |
| `created_at` / `updated_at` | `now()` |

プロフィール入力完了後、アプリケーション側で `profile_completed` を `true` に更新する。

## RLS 方針

| 操作 | 方針 |
|------|------|
| SELECT | `user_id = auth.uid()` のレコードのみ |
| INSERT | `user_id = auth.uid()` の場合のみ |
| UPDATE | `user_id = auth.uid()` のレコードのみ |
| DELETE | 物理削除不可 |

## インデックス

| インデックス名 | カラム / 条件 |
|---------------|--------------|
| `buyers_user_id_idx` | `user_id` |
| `buyers_membership_status_idx` | `membership_status` |
| `buyers_active_idx` | `deleted_at IS NULL`（部分インデックス） |

## マイグレーション

| ファイル | 内容 |
|---------|------|
| `20260804164648_create_buyers.sql` | Version 1.0 新規作成 |
| `20260805112236_update_initial_registration_profile.sql` | Version 1.1 `profile_completed` 追加 |
| `20260805112809_update_profile_registration_flow.sql` | Version 1.2 仮登録フロー整合 |

## 関連ドキュメント

- [ER図 Version 1.4](./ER図.md)
- [favorites テーブル](./favorites.md)
- [Decision No.61](../01_設計変更管理/DecisionLog.md#decision-no61)
