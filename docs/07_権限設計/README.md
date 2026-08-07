# 権限設計

## 概要

WithTama ではロールベースアクセス制御（RBAC）を採用します。

## ロール定義

| ロール | 説明 | 型定義 |
|--------|------|--------|
| buyer | 購入希望者 | `UserRole` in `src/types/domain.ts` |
| breeder | ブリーダー | 同上 |
| admin | 管理者 | 同上 |

## 管理者権限の正本（Decision No.102）

| 項目 | 方針 |
|------|------|
| 正本 | Supabase Auth **`app_metadata.role = "admin"`** |
| 使用禁止 | `user_metadata.role` を管理者権限判定に使用しない |
| アカウント作成 | 一般会員登録（`/signup`）からは作成不可。運営側で発行・権限付与 |
| DB 連携 | RLS の `public.is_admin()` は `app_metadata.role` を参照 |
| ルートガード | `/admin/*` は **Server 側** で admin 判定必須 |
| Service Role | 通常の管理画面処理では **使用しない** |

### 実装（Decision No.102 反映）

| モジュール | 内容 |
|-----------|------|
| `src/features/auth/types.ts` | `isAdminUser(user)` — `app_metadata.role === "admin"` のみ |
| `src/features/auth/admin-auth.ts` | `getCurrentAdmin()`, `requireAdmin()`（Server 専用） |
| `src/app/(admin)/admin/layout.tsx` | `requireAdmin()` による `/admin/*` ガード |
| `src/app/(auth)/login/page.tsx` | admin ログイン時は `ensureUserProfile` をスキップし `/admin` へ |

型の分離:

| 型 | 用途 |
|----|------|
| `PublicSignupRole` | サインアップ（`buyer` \| `breeder`） |
| `MemberUserRole` | 一般会員（`user_metadata.role`） |
| `AuthenticatedUserRole` | ログイン済み全体（`buyer` \| `breeder` \| `admin`） |

非 admin ユーザーが `/admin` にアクセスした場合:

- 未ログイン → `/login`
- buyer → `/buyer`
- breeder → `/breeder`
- ロール不明 → `/login`

## 権限マトリクス（概要）

| 機能 | buyer | breeder | admin |
|------|-------|---------|-------|
| 犬猫閲覧（公開） | ✅ | ✅ | ✅ |
| 犬猫管理（自犬猫） | — | ✅ | — |
| 犬猫審査・運用 | — | — | ✅ |
| ご縁（問い合わせ） | ✅ | ✅（自犬猫） | ✅ |
| 審査・運用 | — | — | ✅ |

## 実装方針

- Supabase Auth で認証
- RLS（Row Level Security）でデータアクセス制御
- ブリーダー画面（`/breeder/*`）は breeder ロール必須（次工程）
- 管理者画面（`/admin/*`）は admin ロール必須（Decision No.102）
- ロール別トップ URL（`/breeder`、`/buyer`）は入口専用。`profile_completed` に応じて `/profile` または `/dashboard` へリダイレクトする（Decision No.62）

## `public.pets` RLS（Decision No.103）

| 操作 | breeder（本人） | admin | anon / buyer（公開） |
|------|-----------------|-------|---------------------|
| SELECT | ✅ 本人所有（全 status） | ✅ 全 status（`deleted_at IS NULL`） | ✅ `published` のみ |
| INSERT | ✅ 本人・`status = draft` のみ | — | — |
| UPDATE | ✅ 本人所有のみ | —（未実装・後述） | — |
| DELETE | — | — | — |

- 開発用全許可ポリシーは撤去済み（Migration: `20260807120000_harden_pets_rls.sql`）
- `status` 遷移の厳密制御は RLS では行わず、`BEFORE UPDATE OF status` トリガー + Server Actions / 将来 RPC で担保（Decision No.94）
- **Supabase への適用は未実施**（Migration 作成済み）

### ポリシー一覧

| ポリシー名 | 操作 | 対象ロール | 条件 |
|-----------|------|-----------|------|
| `pets_select_breeder_own` | SELECT | authenticated | 本人 `breeders.id` = `pets.breeder_id`、`deleted_at IS NULL` |
| `pets_select_public_published` | SELECT | anon, authenticated | `status = 'published'`、`deleted_at IS NULL` |
| `pets_select_admin` | SELECT | authenticated | `is_admin()`、`deleted_at IS NULL` |
| `pets_insert_breeder_own` | INSERT | authenticated | 本人 `breeder_id`、`status = 'draft'`、`deleted_at IS NULL` |
| `pets_update_breeder_own` | UPDATE | authenticated | USING / WITH CHECK とも本人所有、`deleted_at IS NULL` |

### admin UPDATE について

**今回は追加しない。**

- 管理者犬猫審査（AD-10 / AD-11）の Server Actions は未実装
- 先に広い admin UPDATE を付与すると、`under_review` → `published` / `draft` 等を RLS だけでは遷移制御できず、過剰権限になる
- 審査機能実装時に、専用 Server Action + 必要な admin UPDATE ポリシー（または RPC）を追加する

### status 遷移トリガー（`pets_enforce_status_transition`）

Migration: `20260807130000_enforce_pets_status_transition.sql`（作成済み・未適用。`harden_pets_rls` の後に適用）

| レイヤー | 役割 |
|---------|------|
| RLS | 操作可能な行 |
| トリガー | status 遷移 |

**第1期で許可する status 変更**

| 主体 | 遷移 | 条件 |
|------|------|------|
| breeder（本人） | `draft` → `under_review` | トリガー内で `breeders.user_id = auth.uid()` を確認 |

- `status` が変わらない UPDATE はトリガー非発火（`OF status`）または即許可
- `auth.uid() IS NULL` の status 変更は拒否（Service Role 前提にしない）
- **admin による status 変更は今回未実装**（審査機能実装時に RLS + トリガー + `pet_review_logs` を一体設計）

### 将来課題

- 管理者承認・差戻し（AD-10 / AD-11）: admin UPDATE RLS、トリガー admin 遷移、`published_at`、`pet_review_logs`
- `paused` / `family_decided` / `closed` 関連の status 遷移

## Storage 権限（`breeder-documents`）

| 操作 | buyer | breeder（本人） | admin |
|------|-------|-----------------|-------|
| 書類アップロード（INSERT） | — | ✅ 自分の `{userId}` 配下のみ | — |
| 書類閲覧（SELECT） | — | ✅ 自分の配下のみ | 別途（ブリーダー審査画面・将来） |
| 書類更新（UPDATE） | — | ✅ 自分の配下のみ | — |
| 書類削除（DELETE） | — | —（第1期） | — |

- バケットは **private**。公開 URL は発行しない
- AD-11（犬猫掲載審査）では書類画像を表示しない（Decision No.100）
- Migration: `20260805140000_create_breeder_documents_storage.sql`

## Storage 権限（`pet-photos`）（Decision No.104）

| 操作 | buyer | breeder（本人） | admin |
|------|-------|-----------------|-------|
| 写真アップロード（INSERT） | — | ✅ 自分の `breeders/{userId}/pets/` 配下のみ | — |
| 写真閲覧（SELECT） | — | ✅ 自分の配下のみ（Signed URL） | ✅ **SELECT のみ**（Signed URL） |
| 写真更新（UPDATE） | — | ✅ 自分の配下のみ | — |
| 写真削除（DELETE） | — | ✅ 自分の配下のみ | — |

- バケットは **private**。公開 URL は発行しない
- 管理者の写真表示は Server 側で admin 権限確認後、Signed URL を発行する
- Migration: `20260806143000_create_pet_photos_storage.sql`（admin ポリシーは将来追加）

## `pet_photos` テーブル RLS（Decision No.104）

| 操作 | breeder（本人） | admin |
|------|-----------------|-------|
| SELECT | ✅ | ✅ **SELECT のみ** |
| INSERT / UPDATE / DELETE | ✅ | — |

Migration: `20260806143100_create_pet_photos_table_and_rls.sql`（admin ポリシーは将来追加）

## `pet_review_logs` テーブル RLS

| 操作 | breeder（本人） | admin |
|------|-----------------|-------|
| SELECT | ✅ 自犬猫のログ | ✅ |
| INSERT | ✅ `submitted` のみ | ✅ `returned` / `approved` |
| UPDATE / DELETE | — | —（追記のみ、Decision No.105） |

- `actor_user_id = auth.uid()` を INSERT 時に RLS で強制
- UPDATE / DELETE ポリシーは作成しない

Migration: `20260807110000_create_pet_review_logs.sql`（作成済み・未適用）

## 関連ドキュメント

- [要件定義](../02_要件定義/第1期要件定義.md)
- [データベース設計](../05_データベース設計/README.md)
- [Decision No.102](../01_設計変更管理/DecisionLog.md#decision-no102)
- [Decision No.103](../01_設計変更管理/DecisionLog.md#decision-no103)
- [Decision No.104](../01_設計変更管理/DecisionLog.md#decision-no104)
