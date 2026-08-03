# データベース設計

## 概要

WithTama のデータベースは Supabase（PostgreSQL）を使用します。

## 管理方針

- スキーマ変更は `supabase/migrations/` で管理
- シードデータは `supabase/seed.sql`
- ローカル開発は Supabase CLI

## 主要エンティティ（予定）

| テーブル | 説明 |
|---------|------|
| profiles | ユーザープロフィール |
| breeders | ブリーダー情報 |
| pets | 犬猫情報（管理名・公開表示名を分離 — Decision No.23） |
| pet_photos | 犬猫写真 |
| matches | ご縁（問い合わせ） |

## 関連ドキュメント

- [権限設計](../07_権限設計/README.md)
- [API設計](../06_API設計/README.md)
- `supabase/migrations/README.md`
