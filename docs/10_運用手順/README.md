# 運用手順

## 概要

WithTama のデプロイ・運用・障害対応手順を記載します。

## 開発環境

```bash
# 依存関係インストール
npm install

# 環境変数
cp .env.example .env.local
# NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY を設定

# 開発サーバー起動
npm run dev
```

## 品質チェック

```bash
npm run lint
npm run typecheck
npm run format:check
```

## デプロイ（予定）

- 本番環境へのデプロイ手順は今後追記

## 設計書更新

- 機能変更時は `docs/` 内の該当設計書を更新
- 設計判断は [DecisionLog](../01_設計変更管理/DecisionLog.md) に追記
- 開発ログは [09_開発履歴](../09_開発履歴/2026-08.md) に月次で記録

## Supabase Storage（ブリーダー書類）

- バケット `breeder-documents` は **private**
- Migration 適用: `supabase db push` または Dashboard から `supabase/migrations/20260805140000_create_breeder_documents_storage.sql` を実行
- 書類の公開 URL は発行しない。管理者閲覧は将来の管理画面で Signed URL を使用

## セキュリティテスト

- [pets status Trigger セキュリティテスト](./pets_status_trigger_セキュリティテスト.md) — ブリーダー認証セッションでの Trigger 検証手順

## 関連ドキュメント

- [DEVELOPMENT.md](../DEVELOPMENT.md)
- [プロジェクト全体設計](../00_プロジェクト全体設計/README.md)
