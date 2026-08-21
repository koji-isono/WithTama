# Project Structure

WithTama Version 0.2 設計レビュー用のプロジェクト構成ドキュメントです。  
リポジトリルートから `src/`、`supabase/`、`docs/` を中心に、現時点（2026-08-05）の実装状態を整理しています。

## ① フォルダ構成（Tree）

```
WithTama/
├── docs/                              # 設計書の正本（GitHub）
│   ├── 00_アーキテクチャ/
│   │   └── ProjectStructure.md        # 本ドキュメント
│   ├── 00_プロジェクト全体設計/
│   ├── 01_設計変更管理/
│   ├── 02_要件定義/
│   ├── 03_業務フロー/
│   ├── 04_画面設計/
│   ├── 05_データベース設計/
│   ├── 06_API設計/
│   ├── 07_権限設計/
│   ├── 08_デザインシステム/
│   ├── 09_開発履歴/
│   ├── 10_運用手順/
│   ├── DEVELOPMENT.md
│   └── README.md
│
├── src/
│   ├── app/                           # Next.js App Router
│   │   ├── layout.tsx                 # ルート layout
│   │   ├── globals.css
│   │   ├── (admin)/admin/
│   │   ├── (auth)/login|signup/
│   │   ├── (buyer)/buyer/
│   │   ├── (public)/                  # 公開画面
│   │   ├── api/health/
│   │   └── breeder/                   # ブリーダー画面（実ルート）
│   │       ├── layout.tsx
│   │       ├── page.tsx               # 入口リダイレクト
│   │       ├── dashboard/
│   │       ├── profile/               # 5 Step ウィザード
│   │       └── pets/
│   │
│   ├── features/                      # 機能モジュール
│   │   ├── README.md
│   │   ├── auth/                      # 実装済み
│   │   ├── breeder-profile/           # 実装済み
│   │   ├── admin/                     # 空（予約）
│   │   ├── ai/
│   │   ├── billing/
│   │   ├── breeders/
│   │   ├── buyers/
│   │   ├── inquiries/
│   │   ├── pets/
│   │   └── visits/
│   │
│   ├── components/
│   │   ├── ui/                        # shadcn/ui 汎用コンポーネント
│   │   ├── layout/                    # サイト・ブリーダーレイアウト
│   │   └── dev/                       # 開発用ユーティリティ UI
│   │
│   ├── lib/
│   │   ├── utils.ts                   # cn() 等
│   │   ├── supabase/                  # Supabase クライアント・データアクセス
│   │   ├── dify/                      # 空（予約）
│   │   ├── errors/
│   │   ├── permissions/
│   │   ├── resend/
│   │   ├── stripe/
│   │   └── validation/
│   │
│   └── types/
│       ├── domain.ts                  # UserRole 等
│       └── pet.ts                     # PetRow, 一覧 DTO
│
└── supabase/
    ├── config.toml
    ├── seed.sql
    ├── functions/                     # Edge Functions（未使用）
    └── migrations/
        ├── README.md
        ├── 001_pets.sql
        ├── 20260804132200_update_pets_v1_1.sql
        ├── 20260804135800_create_breeders.sql
        ├── 20260804144700_update_breeders_draft_nullable.sql
        ├── 20260804161228_create_favorites.sql
        ├── 20260804163239_create_inquiries_messages_visits.sql
        ├── 20260804164648_create_buyers.sql
        ├── 20260805112007_update_breeders_profile_nullable.sql
        ├── 20260805112236_update_initial_registration_profile.sql
        └── 20260805112809_update_profile_registration_flow.sql
```

## ② 各フォルダの役割

| パス              | 役割                                                                                                         |
| ----------------- | ------------------------------------------------------------------------------------------------------------ |
| `docs/`           | 設計の正本。画面・DB・API・Decision Log を管理。コード変更時は該当ドキュメントを同期する。                   |
| `src/app/`        | ルーティング・ページ・layout・Route Handler。薄い組み立て層とし、ビジネスロジックは `features/` へ委譲する。 |
| `src/features/`   | ドメイン機能単位のモジュール。Validation / Service / Repository / 機能専用 UI を配置（Decision No.73）。     |
| `src/components/` | アプリ横断の UI。`ui/` は shadcn/ui、`layout/` はブリーダー・公開サイトの共通レイアウト。                    |
| `src/lib/`        | インフラ・外部サービス連携・Supabase クライアント。機能横断の低レベル API。                                  |
| `src/types/`      | DB 行型・ドメイン型・画面 DTO。カラム名の正本は `docs/05_データベース設計/`。                                |
| `supabase/`       | PostgreSQL マイグレーション、シード、ローカル Supabase 設定。                                                |

### `src/components/` 詳細

| サブフォルダ | 内容                                                                                          |
| ------------ | --------------------------------------------------------------------------------------------- |
| `ui/`        | Button, Input, Card, Alert, Badge, Label, Progress, Select, Skeleton, Textarea                |
| `layout/`    | `site-header`, `breeder-header`, `breeder-sidebar`, `breeder-mobile-nav`, `breeder-nav-items` |
| `dev/`       | `supabase-connection-status`（開発時接続確認）                                                |

### `docs/` 詳細

| フォルダ                   | 内容                                               |
| -------------------------- | -------------------------------------------------- |
| `00_アーキテクチャ/`       | プロジェクト構成・アーキテクチャ（本ドキュメント） |
| `00_プロジェクト全体設計/` | 技術スタック・リポジトリ概要                       |
| `01_設計変更管理/`         | Decision Log                                       |
| `04_画面設計/`             | 画面 ID・URL・遷移図・ブリーダー最終構成           |
| `05_データベース設計/`     | テーブル定義・ER 図                                |
| `06_API設計/`              | Route Handler / Server Actions                     |
| `09_開発履歴/`             | 月次開発ログ                                       |

## ③ Repository 配置

Repository は Supabase への読み書きのみを担当する。バリデーションとユースケース编排は Service 層が担う（Decision No.69）。

| 配置                                         | 関数（例）                                                               | 対象テーブル         | 状態                           |
| -------------------------------------------- | ------------------------------------------------------------------------ | -------------------- | ------------------------------ |
| `src/features/auth/repository.ts`            | `getBuyerByUserId`, `createBuyer`, `getBreederByUserId`, `createBreeder` | `buyers`, `breeders` | **実装済み**（Browser Client） |
| `src/features/breeder-profile/repository.ts` | `updateBasicProfile`                                                     | `breeders`           | **実装済み**（Server Client）  |
| `src/lib/supabase/pets.ts`                   | `fetchPets`, `insertPet`                                                 | `pets`               | **実装済み**（Server Client）  |

### 配置方針

```
Client Component / Server Action
        ↓
    service.ts        … バリデーション、認証、結果型
        ↓
    repository.ts     … Supabase SELECT / INSERT / UPDATE / DELETE
        ↓
    lib/supabase/       … createClient（browser / server / admin）
```

- **新規機能** … `src/features/{機能}/repository.ts` に配置する。
- **既存の pets** … `lib/supabase/pets.ts` に残存。Version 0.2 以降 `features/pets/` へ移行予定。
- **auth repository** … 初回ログイン処理は Client Component から呼ばれるため Browser Client を使用。Server 専用処理は段階的に Server Client へ寄せる。

## ④ App Router 構成

Route Group `(名前)` は URL に含まれない。実際の URL はディレクトリ名が決定する。

### ルート一覧

| URL                            | ファイル                               | 種別     | 状態                                      |
| ------------------------------ | -------------------------------------- | -------- | ----------------------------------------- |
| `/`                            | `app/(public)/page.tsx`                | 公開     | 実装済み                                  |
| `/login`                       | `app/(auth)/login/page.tsx`            | 認証     | 実装済み                                  |
| `/signup`                      | `app/(auth)/signup/page.tsx`           | 認証     | 実装済み                                  |
| `/admin`                       | `app/(admin)/admin/page.tsx`           | 管理     | プレースホルダー（AD-00、ガード実装済み） |
| `/admin/pets/reviews`          | （未作成）                             | 管理     | 設計確定（AD-10）                         |
| `/admin/pets/reviews/[petId]`  | （未作成）                             | 管理     | 設計確定（AD-11）                         |
| `/pets`, `/pets/[petId]`       | `app/(public)/pets/`                   | 公開     | プレースホルダー                          |
| `/breeders/[breederId]`        | `app/(public)/breeders/`               | 公開     | プレースホルダー                          |
| `/api/health`                  | `app/api/health/route.ts`              | API      | 実装済み                                  |
| `/breeder`                     | `app/breeder/page.tsx`                 | 入口     | リダイレクト                              |
| `/breeder/dashboard`           | `app/breeder/dashboard/page.tsx`       | 表示専用 | 実装済み                                  |
| `/breeder/profile/*`           | `app/breeder/profile/`                 | 編集     | Step 1 実装済み                           |
| `/breeder/pets`                | `app/breeder/pets/page.tsx`            | 一覧     | 実装済み                                  |
| `/breeder/pets/new`            | `app/breeder/pets/new/page.tsx`        | 編集     | 一部実装                                  |
| `/buyer`                       | `app/(buyer)/buyer/page.tsx`           | 入口     | リダイレクト                              |
| `/buyer/dashboard`             | `app/(buyer)/buyer/dashboard/page.tsx` | 表示     | **実装済み**                              |
| `/buyer/profile`               | `app/(buyer)/buyer/profile/page.tsx`   | 編集     | **実装済み**                              |
| `/buyer/favorites`             | `app/(buyer)/buyer/favorites/page.tsx` | 表示     | **実装済み**（BY-03）                     |
| `/buyer/inquiries`             | （未作成）                             | 表示     | 設計確定（BY-05）                         |
| `/buyer/inquiries/new`         | （未作成）                             | 編集     | 設計確定（BY-04）                         |
| `/buyer/inquiries/[inquiryId]` | （未作成）                             | 編集     | 設計確定（BY-06）                         |

### ブリーダー layout 階層

```
app/layout.tsx
└── app/breeder/layout.tsx          … サイドバー・ヘッダー・モバイルナビ
    ├── dashboard/page.tsx
    ├── pets/…
    └── profile/layout.tsx          … Step ヘッダー・プログレスバー（Decision No.68）
        ├── basic/page.tsx
        ├── location/page.tsx
        └── …
```

### Colocation 方針

- ページ専用 UI … `app/breeder/pets/pet-management-list.tsx` 等、`app/` 配下に colocation 可。
- 再利用するドメイン UI … `features/{機能}/components/` へ配置。
- Server Actions … 現状 `app/breeder/pets/actions.ts`。新規は `features/` の `service.ts` を優先。

### 未作成ルート（設計済み）

| URL                                                    | 用途              |
| ------------------------------------------------------ | ----------------- |
| `/breeder/pets/[petId]/edit`                           | 犬猫編集（BR-10） |
| `/breeder/visits`                                      | 見学管理          |
| `/breeder/inquiries`, `/breeder/inquiries/[inquiryId]` | 問い合わせ        |
| `/breeder/settings/*`                                  | 設定              |

詳細: [04_画面設計 — ブリーダー最終構成](../04_画面設計/README.md#ブリーダー画面--最終構成)

## ⑤ Features 構成

### 実装済みモジュール

#### `src/features/auth/`

| ファイル            | 責務                                  |
| ------------------- | ------------------------------------- |
| `types.ts`          | `UserRole`, `getPostLoginPath`, 行型  |
| `repository.ts`     | buyers / breeders の SELECT・INSERT   |
| `service.ts`        | `ensureUserProfile`                   |
| `entry-redirect.ts` | `/breeder`, `/buyer` 入口リダイレクト |
| `index.ts`          | 公開 API                              |

#### `src/features/breeder-profile/`

| ファイル        | 責務                                         |
| --------------- | -------------------------------------------- |
| `types.ts`      | 入力型、`SaveBasicProfileResult`             |
| `validation.ts` | `validateBasicProfile`                       |
| `repository.ts` | `updateBasicProfile`                         |
| `service.ts`    | `saveBasicProfile`（Server Action）          |
| `constants.ts`  | 5 Step URL 定義                              |
| `components/`   | フォーム、ウィザード shell、プレースホルダー |
| `index.ts`      | 公開 API                                     |

### 標準モジュール構成（テンプレート）

```
src/features/{機能名}/
  README.md
  types.ts
  validation.ts       # 任意
  repository.ts       # server-only
  service.ts          # "use server"
  index.ts
  components/
```

### 空ディレクトリ（予約）

以下は Version 0.2 以降の実装用にディレクトリのみ確保されている。

| ディレクトリ         | 想定ドメイン               |
| -------------------- | -------------------------- |
| `features/pets`      | 犬猫 CRUD・写真            |
| `features/inquiries` | 問い合わせ・メッセージ     |
| `features/visits`    | 見学管理                   |
| `features/buyers`    | 購入希望者プロフィール     |
| `features/breeders`  | ブリーダー公開プロフィール |
| `features/admin`     | 管理者機能                 |
| `features/billing`   | Stripe 課金                |
| `features/ai`        | AI 紹介文生成              |

## ⑥ Supabase 構成

```
supabase/
├── config.toml          # ローカル Supabase 設定
├── seed.sql             # シードデータ
├── migrations/          # タイムスタンプ順に適用
└── functions/           # Edge Functions（未使用）
```

### マイグレーション一覧（適用順）

| ファイル                                                 | 内容                                |
| -------------------------------------------------------- | ----------------------------------- |
| `001_pets.sql`                                           | pets 初期                           |
| `20260804132200_update_pets_v1_1.sql`                    | pets v1.1                           |
| `20260804135800_create_breeders.sql`                     | breeders 新規・RLS                  |
| `20260804144700_update_breeders_draft_nullable.sql`      | breeders 仮登録 NULL 許可           |
| `20260804161228_create_favorites.sql`                    | favorites                           |
| `20260804163239_create_inquiries_messages_visits.sql`    | inquiries, inquiry_messages, visits |
| `20260804164648_create_buyers.sql`                       | buyers                              |
| `20260805112007_update_breeders_profile_nullable.sql`    | breeders プロフィール NULL          |
| `20260805112236_update_initial_registration_profile.sql` | address1/2, profile_completed       |
| `20260805112809_update_profile_registration_flow.sql`    | 仮登録フロー v1.4                   |

### テーブルと features / lib の対応

| テーブル                        | データアクセス層                            | 画面                                         |
| ------------------------------- | ------------------------------------------- | -------------------------------------------- |
| `auth.users`                    | Supabase Auth                               | `/login`, `/signup`                          |
| `breeders`                      | `features/auth`, `features/breeder-profile` | `/breeder/profile/*`                         |
| `buyers`                        | `features/auth`                             | `/buyer/profile`（予定）                     |
| `pets`                          | `lib/supabase/pets.ts`                      | `/breeder/pets/*`                            |
| `pet_photos`                    | 未実装                                      | —                                            |
| `favorites`                     | 未実装                                      | 購入希望者画面                               |
| `inquiries`, `inquiry_messages` | **設計確定・未実装**                        | `/buyer/inquiries/*`, `/breeder/inquiries/*` |
| `visits`                        | 未実装                                      | `/breeder/visits`                            |

### Supabase クライアント（`src/lib/supabase/`）

| ファイル                    | 用途                                                    |
| --------------------------- | ------------------------------------------------------- |
| `client.ts`                 | Browser Client（Client Component・クライアント側 auth） |
| `server.ts`                 | Server Client（Server Component・Server Actions）       |
| `admin.ts`                  | Service Role Client（管理者バッチ等・要 env）           |
| `sign-in.ts` / `sign-up.ts` | 認証ラッパー                                            |
| `pets.ts`                   | pets 読み書き                                           |
| `check-connection.ts`       | 接続確認                                                |

## ⑦ 今後追加予定

### アプリケーション

| 項目                             | 内容                                                              |
| -------------------------------- | ----------------------------------------------------------------- |
| ブリーダープロフィール Step 2〜5 | `/breeder/profile/location` 以降の実装・DB 保存                   |
| 犬猫 feature 移行                | `lib/supabase/pets.ts` → `features/pets/`                         |
| 問い合わせ・見学・設定           | App Router ルート + features モジュール                           |
| 購入希望者プロフィール           | `features/buyers/` + `/buyer/profile/*`                           |
| 外部連携 lib                     | `lib/stripe/`, `lib/resend/`, `lib/dify/`（ディレクトリ予約済み） |
| Middleware                       | ロール別ルートガード                                              |
| 空 Route Group 整理              | `app/(breeder)/breeder/`（空）の削除または統合                    |

### ドキュメント（Version 0.2）

| 項目                 | 内容                                          |
| -------------------- | --------------------------------------------- |
| 本ドキュメントの維持 | 機能追加時に Tree・Repository 表を更新        |
| 画面 ID 付与         | BR-11 見学、BR-12 問い合わせ、BR-13 設定      |
| ER 図                | pets.breeder_id → breeders.id FK 移行後の更新 |

### インフラ

| 項目                  | 内容                               |
| --------------------- | ---------------------------------- |
| Supabase Storage      | 犬猫写真、本人確認書類             |
| Edge Functions        | 必要に応じて `supabase/functions/` |
| `audit_logs` テーブル | 監査ログ                           |

## 関連ドキュメント

- [docs/README.md](../README.md)
- [00_プロジェクト全体設計](../00_プロジェクト全体設計/README.md)
- [04_画面設計](../04_画面設計/README.md)
- [05_データベース設計](../05_データベース設計/README.md)
- [src/features/README.md](../../src/features/README.md)
- [Decision Log](../01_設計変更管理/DecisionLog.md)
