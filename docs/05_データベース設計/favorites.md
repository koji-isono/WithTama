# favorites テーブル

| 項目 | 内容 |
|------|------|
| テーブル名 | `public.favorites` |
| Version | 1.0 |
| 状態 | 確定 |

## 目的

購入希望者が犬猫をお気に入り登録する関係を管理する。第1期では犬猫のみを対象とし、ブリーダーフォローは将来機能として分離する（Decision No.52）。

## カラム定義

| カラム名 | 型 | NULL | 初期値 | 説明 |
|---------|-----|------|--------|------|
| `id` | uuid | NOT NULL | `gen_random_uuid()` | お気に入りID、主キー |
| `buyer_id` | uuid | NOT NULL | なし | `buyers.id` への外部キー |
| `pet_id` | uuid | NOT NULL | なし | `pets.id` への外部キー |
| `created_at` | timestamptz | NOT NULL | `now()` | 登録日時 |

## TypeScript 対応（参考）

| DB カラム（snake_case） | TypeScript（camelCase） |
|------------------------|------------------------|
| `buyer_id` | `buyerId` |
| `pet_id` | `petId` |
| `created_at` | `createdAt` |

## 制約

### キー

- **Primary Key:** `id`
- **Foreign Key:** `buyer_id` → `buyers.id`
- **Foreign Key:** `pet_id` → `pets.id`
- **Unique:** `(buyer_id, pet_id)` … 同一購入希望者が同一犬猫を重複登録できない

### ON DELETE

| 親テーブル | 動作 |
|-----------|------|
| `buyers` | 関連 `favorites` も削除（CASCADE） |
| `pets` | 関連 `favorites` も削除（CASCADE） |

### ビジネスルール

- 論理削除は採用しない。
- お気に入り解除は対象レコードの **DELETE**（物理削除）で行う。
- 同じ購入希望者が同じ犬猫を重複登録できない。

## RLS 方針

RLS を有効化する。購入希望者本人のみ、自分の `favorites` を参照・追加・削除できる。

| 操作 | 方針 |
|------|------|
| SELECT | `favorites.buyer_id` に紐づく `buyers.user_id = auth.uid()` の場合のみ許可 |
| INSERT | 登録対象 `buyer_id` に紐づく `buyers.user_id = auth.uid()` の場合のみ許可 |
| DELETE | `favorites.buyer_id` に紐づく `buyers.user_id = auth.uid()` の場合のみ許可 |
| UPDATE | 使用しないため許可しない |

管理者の全件参照・削除権限は [権限設計](../07_権限設計/README.md) で別途定義する。

## 第1期の業務ルール

- お気に入り対象は **犬猫のみ**。
- ブリーダーをお気に入り対象にしない。
- ブリーダーフォロー機能は将来 `breeder_follows` として分離する。
- `deleted_at` が設定された犬猫は、通常のお気に入り一覧に表示しない。
- `status` が `published` 以外の犬猫をお気に入り登録できるかは **未決定事項** とする。
- **推奨:** 第1期では画面側で `published` の犬猫のみ登録対象とする。

## インデックス

| インデックス名 | カラム |
|---------------|--------|
| `favorites_buyer_id_idx` | `buyer_id` |
| `favorites_pet_id_idx` | `pet_id` |

## マイグレーション

| ファイル | 内容 |
|---------|------|
| `20260804161228_create_favorites.sql` | Version 1.0 新規作成 |

## 関連テーブル

- `buyers` … 親テーブル（`buyer_id` → `buyers.id`）。設計確定、Migration は別途
- [pets](./pets.md) … 親テーブル（`pet_id` → `pets.id`）

## 関連 Decision

- [Decision No.52](../01_設計変更管理/DecisionLog.md#decision-no52) — 第1期のお気に入り対象は犬猫のみ

## 関連ドキュメント

- [ER図 Version 1.1](./ER図.md)
