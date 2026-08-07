# src/features/

機能単位のビジネスロジック・Server Actions・UI コンポーネントを配置する（Decision No.73）。

## 方針

| レイヤー | 配置 | 責務 |
|---------|------|------|
| `app/` | ページ・layout・Route Handler | ルーティング、画面の組み立て |
| `features/` | 機能モジュール | バリデーション、Service、Repository、ドメイン UI |
| `lib/supabase/` | 汎用データアクセス | テーブル横断の CRUD（段階的に features へ移行可） |
| `components/` | 共通 UI | shadcn/ui、レイアウト |

各 feature は次のファイル構成を基本とする。

```
src/features/{機能名}/
  README.md
  types.ts
  validation.ts      # 任意
  repository.ts      # Supabase 操作（server-only）
  service.ts         # Server Actions・ユースケース
  index.ts           # 公開 API
  components/        # 機能専用 UI
```

## モジュール一覧

| モジュール | 説明 | 関連画面 |
|-----------|------|---------|
| [auth](./auth/README.md) | 認証、初回プロフィール作成、入口リダイレクト | `/login`, `/signup`, `/breeder`, `/buyer` |
| [breeder-profile](./breeder-profile/README.md) | ブリーダープロフィール Step 保存 | `/breeder/profile/*` |
| [pets](./pets/README.md) | 犬猫管理（Phase 7 基盤） | `/breeder/pets/*` |

## 今後追加予定

| モジュール | 関連画面 | 関連テーブル |
|-----------|---------|-------------|
| `breeder-inquiries` | `/breeder/inquiries/*` | `inquiries`, `inquiry_messages` |
| `breeder-settings` | `/breeder/settings/*` | `breeders`（通知・課金設定等） |

## 関連ドキュメント

- [画面設計 — ブリーダー画面構成](../docs/04_画面設計/README.md#ブリーダー画面--最終構成)
- [Decision No.69](../docs/01_設計変更管理/DecisionLog.md#decision-no69) — Repository パターン
- [Decision No.73](../docs/01_設計変更管理/DecisionLog.md#decision-no73) — features 整理
