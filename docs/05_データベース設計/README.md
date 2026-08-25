# データベース設計

## 目的

本ドキュメントは、WithTama の Supabase（PostgreSQL）スキーマに関する**カラム名の正本**です。

Supabase マイグレーション、TypeScript 型、Repository（`src/features/` および `src/lib/supabase/`）、画面実装は、すべて本設計書に定義されたカラム名・制約に従います。設計書に存在しないカラム名をコードで使用してはいけません。

## 共通方針

| 項目                  | 方針                                                           |
| --------------------- | -------------------------------------------------------------- |
| DB テーブル名         | 複数形・スネークケース（例: `pets`, `pet_photos`）             |
| DB カラム名           | スネークケース（例: `management_name`, `public_display_name`） |
| TypeScript 型名       | PascalCase（例: `PetRow`, `PetPhotoRow`）                      |
| TypeScript プロパティ | camelCase（例: `managementName`, `publicDisplayName`）         |
| DBMS                  | Supabase PostgreSQL                                            |
| マイグレーション      | `supabase/migrations/`                                         |
| シード                | `supabase/seed.sql`                                            |

## テーブル一覧

| テーブル                     | 状態                                           | 設計書                                             |
| ---------------------------- | ---------------------------------------------- | -------------------------------------------------- |
| `public.pets`                | Version 1.1 確定                               | [pets.md](./pets.md)                               |
| `public.pet_photos`          | Version 1.0 確定                               | [pet_photos.md](./pet_photos.md)                   |
| `public.pet_review_logs`     | Version 1.0 確定（Migration 作成済み・未適用） | [pet_review_logs.md](./pet_review_logs.md)         |
| `public.breeder_review_logs` | Version 1.0 確定（Migration 未作成）           | [breeder_review_logs.md](./breeder_review_logs.md) |
| `public.breeders`            | Version 1.4 確定                               | [breeders.md](./breeders.md)                       |
| `public.favorites`           | Version 1.0 確定                               | [favorites.md](./favorites.md)                     |
| `public.inquiries`           | Version 1.0 確定                               | [inquiries.md](./inquiries.md)                     |
| `public.inquiry_messages`    | Version 1.0 確定                               | [inquiry_messages.md](./inquiry_messages.md)       |
| `public.visits`              | Version 1.0 確定                               | [visits.md](./visits.md)                           |
| `public.buyers`              | Version 1.2 確定                               | [buyers.md](./buyers.md)                           |

## テーブルと機能モジュールの対応

Decision No.73 に基づき、主要テーブルは `src/features/` の機能モジュール経由で更新する方針とする。

| テーブル                                | Feature モジュール                 | 主な画面 URL                   |
| --------------------------------------- | ---------------------------------- | ------------------------------ |
| `breeders`                              | `src/features/breeder-profile/`    | `/breeder/profile/*`           |
| `breeders`, `buyers`                    | `src/features/auth/`               | 初回ログイン・入口リダイレクト |
| `pets`, `pet_photos`                    | `src/features/pets/`               | `/breeder/pets/*`              |
| `pets`, `pet_photos`, `pet_review_logs` | `src/features/admin/`              | `/admin/pets/reviews/*`        |
| `breeders`, `breeder_review_logs`       | 未実装（`src/features/admin/`）    | `/admin/breeders/reviews/*`    |
| `inquiries`, `inquiry_messages`         | 未実装（将来 `breeder-inquiries`） | `/breeder/inquiries/*`         |
| `visits`                                | 未実装                             | `/breeder/visits`              |
| `favorites`                             | 未実装                             | 購入希望者画面                 |

詳細: [features モジュール構成](../../src/features/README.md) / [画面設計](../04_画面設計/README.md)

## ER図

- [ER図 Version 1.4](./ER図.md)

## 今後設計予定

| テーブル     | 概要     |
| ------------ | -------- |
| `audit_logs` | 監査ログ |

## 設計変更ルール

スキーマを変更する場合は、以下を**同時に**更新してください。

1. 本設計書（`docs/05_データベース設計/`）
2. [DecisionLog](../01_設計変更管理/DecisionLog.md)（設計判断がある場合）
3. Supabase マイグレーション（`supabase/migrations/`）
4. TypeScript 型（`src/types/`）
5. Repository（`src/features/` または `src/lib/supabase/`）
6. [開発履歴](../09_開発履歴/2026-08.md)

## 関連ドキュメント

- [権限設計](../07_権限設計/README.md)
- [API設計](../06_API設計/README.md)
- [Decision Log](../01_設計変更管理/DecisionLog.md)
- `supabase/migrations/README.md`
