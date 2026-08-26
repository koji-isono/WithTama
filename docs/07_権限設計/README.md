# 権限設計

## 概要

WithTama ではロールベースアクセス制御（RBAC）を採用します。

## ロール定義

| ロール  | 説明       | 型定義                              |
| ------- | ---------- | ----------------------------------- |
| buyer   | 購入希望者 | `UserRole` in `src/types/domain.ts` |
| breeder | ブリーダー | 同上                                |
| admin   | 管理者     | 同上                                |

## 管理者権限の正本（Decision No.102）

| 項目           | 方針                                                            |
| -------------- | --------------------------------------------------------------- |
| 正本           | Supabase Auth **`app_metadata.role = "admin"`**                 |
| 使用禁止       | `user_metadata.role` を管理者権限判定に使用しない               |
| アカウント作成 | 一般会員登録（`/signup`）からは作成不可。運営側で発行・権限付与 |
| DB 連携        | RLS の `public.is_admin()` は `app_metadata.role` を参照        |
| ルートガード   | `/admin/*` は **Server 側** で admin 判定必須                   |
| Service Role   | 通常の管理画面処理では **使用しない**                           |

### 実装（Decision No.102 反映）

| モジュール                         | 内容                                                            |
| ---------------------------------- | --------------------------------------------------------------- |
| `src/features/auth/types.ts`       | `isAdminUser(user)` — `app_metadata.role === "admin"` のみ      |
| `src/features/auth/admin-auth.ts`  | `getCurrentAdmin()`, `requireAdmin()`（Server 専用）            |
| `src/app/(admin)/admin/layout.tsx` | `requireAdmin()` による `/admin/*` ガード                       |
| `src/app/(auth)/login/page.tsx`    | admin ログイン時は `ensureUserProfile` をスキップし `/admin` へ |

型の分離:

| 型                      | 用途                                                |
| ----------------------- | --------------------------------------------------- |
| `PublicSignupRole`      | サインアップ（`buyer` \| `breeder`）                |
| `MemberUserRole`        | 一般会員（`user_metadata.role`）                    |
| `AuthenticatedUserRole` | ログイン済み全体（`buyer` \| `breeder` \| `admin`） |

非 admin ユーザーが `/admin` にアクセスした場合:

- 未ログイン → `/login`
- buyer → `/buyer`
- breeder → `/breeder`
- ロール不明 → `/login`

## 権限マトリクス（概要）

| 機能               | buyer | breeder      | admin |
| ------------------ | ----- | ------------ | ----- |
| 犬猫閲覧（公開）   | ✅    | ✅           | ✅    |
| 犬猫管理（自犬猫） | —     | ✅           | —     |
| 犬猫審査・運用     | —     | —            | ✅    |
| ご縁（問い合わせ） | ✅    | ✅（自犬猫） | ✅    |
| 審査・運用         | —     | —            | ✅    |

## 実装方針

- Supabase Auth で認証
- RLS（Row Level Security）でデータアクセス制御
- ブリーダー画面（`/breeder/*`）は breeder ロール必須（次工程）
- 管理者画面（`/admin/*`）は admin ロール必須（Decision No.102）
- ロール別トップ URL（`/breeder`、`/buyer`）は入口専用。`profile_completed` に応じて `/profile` または `/dashboard` へリダイレクトする（Decision No.62）

## `public.pets` RLS（Decision No.103）

| 操作   | breeder（本人）                | admin                                | anon / buyer（公開） |
| ------ | ------------------------------ | ------------------------------------ | -------------------- |
| SELECT | ✅ 本人所有（全 status）       | ✅ 全 status（`deleted_at IS NULL`） | ✅ `published` のみ  |
| INSERT | ✅ 本人・`status = draft` のみ | —                                    | —                    |
| UPDATE | ✅ 本人所有のみ                | —（未実装・後述）                    | —                    |
| DELETE | —                              | —                                    | —                    |

- 開発用全許可ポリシーは撤去済み（Migration: `20260807120000_harden_pets_rls.sql`）
- `status` 遷移の厳密制御は RLS では行わず、`BEFORE UPDATE OF status` トリガー + Server Actions / 将来 RPC で担保（Decision No.94）
- **Supabase への適用は未実施**（Migration 作成済み）

### ポリシー一覧

| ポリシー名                     | 操作   | 対象ロール          | 条件                                                         |
| ------------------------------ | ------ | ------------------- | ------------------------------------------------------------ |
| `pets_select_breeder_own`      | SELECT | authenticated       | 本人 `breeders.id` = `pets.breeder_id`、`deleted_at IS NULL` |
| `pets_select_public_published` | SELECT | anon, authenticated | `status = 'published'`、`deleted_at IS NULL`                 |
| `pets_select_admin`            | SELECT | authenticated       | `is_admin()`、`deleted_at IS NULL`                           |
| `pets_insert_breeder_own`      | INSERT | authenticated       | 本人 `breeder_id`、`status = 'draft'`、`deleted_at IS NULL`  |
| `pets_update_breeder_own`      | UPDATE | authenticated       | USING / WITH CHECK とも本人所有、`deleted_at IS NULL`        |

### admin UPDATE について

**`pets_update_admin` RLS は作成しない。**

- admin が PostgREST 経由で `pets` を直接 UPDATE できない（`pets_select_admin` のみ）
- 犬猫掲載審査の状態変更は **審査専用 RPC** のみから実行する
- Migration: `20260810120000_create_pet_review_admin_rpcs.sql`（**作成済み・未適用**）

### 審査専用 RPC（Decision No.96 / No.101 / No.105 / No.107）

| 関数                                               | 遷移                                                           | 戻り値 |
| -------------------------------------------------- | -------------------------------------------------------------- | ------ |
| `approve_pet_for_publish(p_pet_id uuid)`           | `under_review` → `published` + `published_at` + log `approved` | `void` |
| `return_pet_review(p_pet_id uuid, p_comment text)` | `under_review` → `draft` + log `returned`                      | `void` |

- **SECURITY DEFINER** + `SET search_path = public`（既存 `set_main_pet_photo` / `is_admin` パターン）
- 関数内で `auth.uid()` / `public.is_admin()` を再検証。`actor_user_id` は引数不可・`auth.uid()` のみ
- **RLS bypass:** 関数 owner 権限で `pets` UPDATE / `pet_review_logs` INSERT。通常 admin JWT からの直接 UPDATE は不可のまま
- status UPDATE は **`enforce_pets_status_transition` Trigger を通る**（disable / 迂回なし）
- `REVOKE EXECUTE FROM PUBLIC, anon` / `GRANT EXECUTE TO authenticated`（非 admin は関数内で拒否）
- Service Role Key 不要

**公開条件（`approve_pet_for_publish` 内部・No.107）:**

| 条件           | 判定                                                 |
| -------------- | ---------------------------------------------------- |
| 掲載状態       | `pets.status = 'under_review'`                       |
| ブリーダー審査 | `breeders.review_status = 'approved'`                |
| 本人確認       | `breeders.identity_verification_status = 'verified'` |
| 登録証確認     | `breeders.business_verification_status = 'verified'` |
| 登録有効期限   | `breeders.registration_expires_at IS NOT NULL`       |
| 登録期限内     | `breeders.registration_expires_at >= CURRENT_DATE`   |

**差戻し（`return_pet_review`）:** `p_comment` 必須（`btrim` 後非空）。`published_at IS NOT NULL` の `under_review` pet は拒否（データ不整合）。

### ブリーダー審査専用 RPC（Decision No.133 / No.134）

| 関数                                             | 遷移                                                           | 戻り値 |
| ------------------------------------------------ | -------------------------------------------------------------- | ------ |
| `start_breeder_review(p_breeder_id uuid)`        | `submitted` / `resubmission_required` → `under_review` + log   | `void` |
| `approve_breeder_review(p_breeder_id uuid)`      | → `approved` + verification `verified` + `approved_at` + log   | `void` |
| `return_breeder_review(p_breeder_id, p_comment)` | `under_review` → `resubmission_required` + log（comment 必須） | `void` |
| `reject_breeder_review(p_breeder_id, p_comment)` | `under_review` → `rejected` + log（comment 必須）              | `void` |

- **SECURITY DEFINER** + `SET search_path = public`
- 関数内で `auth.uid()` / `public.is_admin()` を再検証
- `membership_status` は承認 RPC では **更新しない**（Decision No.129 / No.130）
- Service Role Key 不要
- Migration: **未作成**

**承認条件（`approve_breeder_review` 内部・No.134）:** `review_status = under_review`、書類パス非 NULL（Storage 存在確認）、`registration_expires_at >= CURRENT_DATE`

### ブリーダー提出 RPC（Decision No.137）

| 関数                           | 遷移                                                             | 実行者         |
| ------------------------------ | ---------------------------------------------------------------- | -------------- |
| `submit_breeder_application`   | `draft` → `submitted` + verification submitted + `submitted` log | ブリーダー本人 |
| `resubmit_breeder_application` | `resubmission_required` → `submitted` + `submitted` log          | ブリーダー本人 |

- **SECURITY DEFINER** + `SET search_path = public`
- 引数なし — `auth.uid()` から対象 `breeders` を特定（他ブリーダー指定不可）
- 再提出時: `membership_status` / verification status は **変更しない**（No.127 整合）
- 初回提出時: verification status を `submitted` に更新（既存 `completeBreederProfile` 仕様準拠）
- **`under_review` へは変更しない**（No.126 — 管理者 `start_breeder_review` と分離）

### Stripe 課金列保護（Decision No.147 確定・**実装未着手**）

- `breeders_update_own` により、現状ブリーダー本人が **行全体 UPDATE 可能**（Stripe 列含む）
- 第1期実装: **BEFORE UPDATE trigger** で課金関連列の直接変更を禁止。Webhook は **service_role** で更新
- 保護列: `membership_status`, `stripe_*`, `subscription_*`, `last_payment_failed_at`, `suspended_at` 等
- 参照: [Stripe 第1期実装計画 Step 1](../09_開発履歴/2026-08-26_Stripe第1期実装計画.md)
- Migration: `20260825130000_create_breeder_application_submit_rpcs.sql`

### ブリーダープロフィール編集（Decision No.136）

| `review_status`         | プロフィール Step 保存     |
| ----------------------- | -------------------------- |
| `draft`                 | ✅                         |
| `resubmission_required` | ✅                         |
| 上記以外                | ❌（Server Action で拒否） |

### BR-09 セキュリティ要件（Decision No.137）

- 本人のみ: 差戻し理由閲覧、プロフィール修正、再提出
- 他ブリーダー・buyer・非ログイン: 不可
- 管理者審査 RPC: breeder から実行不可
- `breeder-documents`: private のまま。Signed URL をログに保存しない

### status 遷移トリガー（`pets_enforce_status_transition`）

Migration:

- `20260807130000_enforce_pets_status_transition.sql` — Phase 1（breeder `draft → under_review`）
- `20260810110000_extend_pets_status_trigger_for_admin.sql` — Phase 2（admin 審査遷移）（**作成済み・未適用**）

| レイヤー | 役割         |
| -------- | ------------ |
| RLS      | 操作可能な行 |
| トリガー | status 遷移  |

**許可する status 変更**

| 主体                          | 遷移                         | 条件                                                |
| ----------------------------- | ---------------------------- | --------------------------------------------------- |
| breeder（本人・**非 admin**） | `draft` → `under_review`     | トリガー内で `breeders.user_id = auth.uid()` を確認 |
| admin                         | `under_review` → `published` | `public.is_admin()`                                 |
| admin                         | `under_review` → `draft`     | `public.is_admin()`                                 |

- **admin 兼 breeder** は admin 許可遷移表を優先。`draft → under_review` は admin では不可（審査操作用アカウント想定）
- `status` が変わらない UPDATE はトリガー非発火（`OF status`）または即許可
- `auth.uid() IS NULL` の status 変更は拒否（Service Role 前提にしない）
- admin の任意 status 変更は不可（`draft → published` 等は拒否）
- **Trigger Function のみ差し替え**。`pets_enforce_status_transition` Trigger 本体は変更なし
- 状態変更の実行経路: **審査専用 RPC**（`20260810120000_create_pet_review_admin_rpcs.sql`）。`pets_update_admin` RLS は付与しない

### 将来課題

- AD-10 / AD-11 Server Action 実装（`requireAdmin()` + `.rpc()` 呼び出し）
- `submit_pet_for_review` RPC 化（breeder `submitted` log 原子化）
- `paused` / `family_decided` / `closed` 関連の status 遷移

## Storage 権限（`breeder-documents`）（Decision No.132）

| 操作                       | buyer | breeder（本人）               | admin                            |
| -------------------------- | ----- | ----------------------------- | -------------------------------- |
| 書類アップロード（INSERT） | —     | ✅ 自分の `{userId}` 配下のみ | —                                |
| 書類閲覧（SELECT）         | —     | ✅ 自分の配下のみ             | ✅ **SELECT のみ**（Signed URL） |
| 書類更新（UPDATE）         | —     | ✅ 自分の配下のみ             | —                                |
| 書類削除（DELETE）         | —     | —（第1期）                    | —                                |

- バケットは **private**。公開 URL は発行しない
- AD-11（犬猫掲載審査）では書類画像を表示しない（Decision No.100）
- AD-02（ブリーダー審査詳細）で admin セッション JWT により Signed URL を発行（Service Role 不要）
- Migration: `20260805140000_create_breeder_documents_storage.sql`（本人 RLS）、admin SELECT RLS は **未作成**

## Storage 権限（`pet-photos`）（Decision No.104）

| 操作                       | buyer | breeder（本人）                              | admin                            |
| -------------------------- | ----- | -------------------------------------------- | -------------------------------- |
| 写真アップロード（INSERT） | —     | ✅ 自分の `breeders/{userId}/pets/` 配下のみ | —                                |
| 写真閲覧（SELECT）         | —     | ✅ 自分の配下のみ（Signed URL）              | ✅ **SELECT のみ**（Signed URL） |
| 写真更新（UPDATE）         | —     | ✅ 自分の配下のみ                            | —                                |
| 写真削除（DELETE）         | —     | ✅ 自分の配下のみ                            | —                                |

- バケットは **private**（`public = false`）。公開 URL は発行しない
- 管理者の写真表示は Server 側で `requireAdmin()` 確認後、admin セッション JWT で `createSignedUrl()` を発行する（Service Role 不要）
- Migration:
  - `20260806143000_create_pet_photos_storage.sql` — バケット + ブリーダー本人 Storage RLS
  - `20260810100000_add_admin_pet_photo_select_rls.sql` — admin SELECT RLS（**作成済み・未適用**）

### `pet-photos` Storage ポリシー一覧

| ポリシー名                        | 操作   | 対象ロール    | 条件                                         |
| --------------------------------- | ------ | ------------- | -------------------------------------------- |
| `pet_photos_storage_select_own`   | SELECT | authenticated | 本人 `breeders/{userId}/pets/{petId}/` 配下  |
| `pet_photos_storage_insert_own`   | INSERT | authenticated | 同上                                         |
| `pet_photos_storage_update_own`   | UPDATE | authenticated | 同上                                         |
| `pet_photos_storage_delete_own`   | DELETE | authenticated | 同上                                         |
| `pet_photos_storage_select_admin` | SELECT | authenticated | `bucket_id = 'pet-photos'` かつ `is_admin()` |

## `pet_photos` テーブル RLS（Decision No.104）

| 操作                     | breeder（本人） | admin              |
| ------------------------ | --------------- | ------------------ |
| SELECT                   | ✅              | ✅ **SELECT のみ** |
| INSERT / UPDATE / DELETE | ✅              | —                  |

Migration:

- `20260806143100_create_pet_photos_table_and_rls.sql` — テーブル + ブリーダー本人 RLS
- `20260810100000_add_admin_pet_photo_select_rls.sql` — admin SELECT RLS（**作成済み・未適用**）

### `pet_photos` ポリシー一覧

| ポリシー名                | 操作   | 対象ロール    | 条件               |
| ------------------------- | ------ | ------------- | ------------------ |
| `pet_photos_select_own`   | SELECT | authenticated | 本人所有犬猫の写真 |
| `pet_photos_insert_own`   | INSERT | authenticated | 同上               |
| `pet_photos_update_own`   | UPDATE | authenticated | 同上               |
| `pet_photos_delete_own`   | DELETE | authenticated | 同上               |
| `pet_photos_select_admin` | SELECT | authenticated | `is_admin()`       |

## `pet_review_logs` テーブル RLS

| 操作            | breeder（本人）     | admin                          |
| --------------- | ------------------- | ------------------------------ |
| SELECT          | ✅ 自犬猫のログ     | ✅                             |
| INSERT          | ✅ `submitted` のみ | ✅ `returned` / `approved`     |
| UPDATE / DELETE | —                   | —（追記のみ、Decision No.105） |

- `actor_user_id = auth.uid()` を INSERT 時に RLS で強制
- UPDATE / DELETE ポリシーは作成しない

Migration: `20260807110000_create_pet_review_logs.sql`（作成済み・未適用）

## 関連ドキュメント

- [要件定義](../02_要件定義/第1期要件定義.md)
- [データベース設計](../05_データベース設計/README.md)
- [Decision No.102](../01_設計変更管理/DecisionLog.md#decision-no102)
- [Decision No.103](../01_設計変更管理/DecisionLog.md#decision-no103)
- [Decision No.104](../01_設計変更管理/DecisionLog.md#decision-no104)
