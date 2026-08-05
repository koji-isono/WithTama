# WithTama開発ドキュメント

GitHub を設計書の正本とし、開発で使用する設計書は `docs` フォルダで管理します。  
Google Drive は成果物保管用とします。

## ドキュメント一覧

| フォルダ | 内容 |
|---------|------|
| [00_プロジェクト全体設計](./00_プロジェクト全体設計/README.md) | プロジェクトの全体方針・構成 |
| [01_設計変更管理](./01_設計変更管理/DecisionLog.md) | 設計判断の記録（Decision Log） |
| [02_要件定義](./02_要件定義/第1期要件定義.md) | 第1期の機能要件 |
| [03_業務フロー](./03_業務フロー/README.md) | 業務フロー・利用シナリオ |
| [04_画面設計](./04_画面設計/README.md) | 画面一覧・画面別設計書 |
| [05_データベース設計](./05_データベース設計/README.md) | テーブル・ER・マイグレーション方針 |
| [06_API設計](./06_API設計/README.md) | API エンドポイント設計 |
| [07_権限設計](./07_権限設計/README.md) | ロール・権限マトリクス |
| [08_デザインシステム](./08_デザインシステム/README.md) | UI コンポーネント・スタイルガイド |
| [09_開発履歴](./09_開発履歴/2026-08.md) | 月次の開発ログ |
| [10_運用手順](./10_運用手順/README.md) | デプロイ・運用・障害対応 |

## データベーステーブル一覧

カラム名の正本は [05_データベース設計](./05_データベース設計/README.md) です。

| テーブル | 状態 | 設計書 |
|---------|------|--------|
| `public.pets` | Version 1.1 確定 | [pets.md](./05_データベース設計/pets.md) |
| `public.pet_photos` | Version 1.0 確定 | [pet_photos.md](./05_データベース設計/pet_photos.md) |
| `public.breeders` | Version 1.4 確定 | [breeders.md](./05_データベース設計/breeders.md) |
| `public.buyers` | Version 1.2 確定 | [buyers.md](./05_データベース設計/buyers.md) |
| `public.favorites` | Version 1.0 確定 | [favorites.md](./05_データベース設計/favorites.md) |
| `public.inquiries` | Version 1.0 確定 | [inquiries.md](./05_データベース設計/inquiries.md) |
| `public.inquiry_messages` | Version 1.0 確定 | [inquiry_messages.md](./05_データベース設計/inquiry_messages.md) |
| `public.visits` | Version 1.0 確定 | [visits.md](./05_データベース設計/visits.md) |

### 今後設計予定

| テーブル | 概要 |
|---------|------|
| `audit_logs` | 監査ログ |

## 関連ドキュメント

- [DEVELOPMENT.md](./DEVELOPMENT.md) — 開発ワークフロー
