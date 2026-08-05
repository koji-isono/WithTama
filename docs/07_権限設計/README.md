# 権限設計

## 概要

WithTama ではロールベースアクセス制御（RBAC）を採用します。

## ロール定義

| ロール | 説明 | 型定義 |
|--------|------|--------|
| buyer | 購入希望者 | `UserRole` in `src/types/domain.ts` |
| breeder | ブリーダー | 同上 |
| admin | 管理者 | 同上 |

## 権限マトリクス（概要）

| 機能 | buyer | breeder | admin |
|------|-------|---------|-------|
| 犬猫閲覧（公開） | ✅ | ✅ | ✅ |
| 犬猫管理 | — | ✅ | ✅ |
| ご縁（問い合わせ） | ✅ | ✅（自犬猫） | ✅ |
| 審査・運用 | — | — | ✅ |

## 実装方針

- Supabase Auth で認証
- RLS（Row Level Security）でデータアクセス制御
- ブリーダー画面（`/breeder/*`）は breeder ロール必須（次工程）
- ロール別トップ URL（`/breeder`、`/buyer`）は入口専用。`profile_completed` に応じて `/profile` または `/dashboard` へリダイレクトする（Decision No.62）

## Storage 権限（`breeder-documents`）

| 操作 | buyer | breeder（本人） | admin |
|------|-------|-----------------|-------|
| 書類アップロード（INSERT） | — | ✅ 自分の `{userId}` 配下のみ | 別途（将来） |
| 書類閲覧（SELECT） | — | ✅ 自分の配下のみ | Signed URL（将来） |
| 書類更新（UPDATE） | — | ✅ 自分の配下のみ | 別途（将来） |
| 書類削除（DELETE） | — | —（第1期） | 別途（将来） |

- バケットは **private**。公開 URL は発行しない
- Service Role Key をブラウザへ公開しない
- Migration: `20260805140000_create_breeder_documents_storage.sql`

## 関連ドキュメント

- [要件定義](../02_要件定義/第1期要件定義.md)
- [データベース設計](../05_データベース設計/README.md)
