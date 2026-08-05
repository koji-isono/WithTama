# プロジェクト全体設計

## プロジェクト概要

WithTama は、命を大切に育てるブリーダーと、家族として迎えたい人をつなぐ Web サービスです。

## 技術スタック

| 区分 | 技術 |
|------|------|
| フロントエンド | Next.js（App Router）、TypeScript、Tailwind CSS |
| UI | shadcn/ui |
| バックエンド / DB | Supabase |
| ソース管理 | GitHub（設計書の正本） |
| 成果物保管 | Google Drive |

## リポジトリ構成（概要）

```
src/
  app/          # Next.js App Router ページ・API
  features/     # 機能モジュール（auth, breeder-profile 等）
  components/   # 共通 UI コンポーネント
  lib/          # ユーティリティ・Supabase クライアント
  types/        # ドメイン型定義
docs/           # 設計書（本リポジトリの正本）
supabase/       # マイグレーション・シード
```

- 画面 URL と `app/` の対応 … [画面設計](../04_画面設計/README.md#ブリーダー画面--最終構成)
- 機能モジュール … [src/features/README.md](../../src/features/README.md)

## 設計書管理方針

- **GitHub（`docs/`）** … 開発に使用する設計書の正本
- **Google Drive** … 成果物・共有資料の保管
- 設計変更は [DecisionLog](../01_設計変更管理/DecisionLog.md) に記録する
- 画面・API・DB の変更時は該当ドキュメントを更新する

## 関連ドキュメント

- [要件定義](../02_要件定義/第1期要件定義.md)
- [画面設計](../04_画面設計/README.md)
- [デザインシステム](../08_デザインシステム/README.md)
