# PU-01 公開 READ Migration 実装完了報告

| 項目     | 内容                                                                  |
| -------- | --------------------------------------------------------------------- |
| 作業日   | 2026-08-14                                                            |
| 対象     | PU-01 公開犬猫一覧 `/pets` 公開 READ 基盤                             |
| 種別     | Migration + セキュリティテスト（UI 未実装）                           |
| 前提設計 | [PU-01 設計完了報告](./2026-08-14_PU-01_公開犬猫一覧_設計完了報告.md) |

---

## 1. 概要

一般公開 `/pets` 向けに、**published かつ承認済み・利用中ブリーダー所属**の犬猫だけを anon / authenticated が安全に読める DB 基盤を追加した。

- View 2 本（公開列のみ）
- `pet_photos` / Storage `pet-photos` の anon SELECT ポリシー
- `pets` 直接 anon SELECT の縮小（View 経由を正とする）
- セキュリティテスト `npm run test:public-pet-read`

**`/pets` UI は未実装。** 新規 RPC なし。Service Role 不使用。バケット public 化なし。

---

## 2. Migration

| 項目     | 内容                                                                                                   |
| -------- | ------------------------------------------------------------------------------------------------------ |
| ファイル | `supabase/migrations/20260814120000_add_public_pet_list_read_access.sql`                               |
| 適用状態 | **未適用**（リモート Supabase 未 link のため自動 push 不可）                                           |
| 適用手順 | Supabase Dashboard → SQL Editor で当該ファイルを実行、または `supabase link` 後 `npx supabase db push` |

---

## 3. 公開条件（確定）

一般公開対象 Pet は **すべて** 満たすもの:

| #   | 条件                               | 根拠カラム                              |
| --- | ---------------------------------- | --------------------------------------- |
| 1   | `pets.status = 'published'`        | `public.pets.status`                    |
| 2   | `pets.deleted_at IS NULL`          | `public.pets.deleted_at`                |
| 3   | ブリーダー承認済み                 | `breeders.review_status = 'approved'`   |
| 4   | ブリーダー利用中（停止・解約以外） | `breeders.membership_status = 'active'` |
| 5   | ブリーダー論理削除なし             | `breeders.deleted_at IS NULL`           |

**使用したステータス値（Migration / CHECK 定義より）:**

- `breeders.review_status`: `'approved'`（`20260804135800_create_breeders.sql`）
- `breeders.membership_status`: `'active'`（同上。`'suspended'` / `'canceled'` は除外）

---

## 4. 作成した View

### 4.1 `published_pets_public`

| 公開列                | 型（pets 由来） |
| --------------------- | --------------- |
| `id`                  | uuid            |
| `public_display_name` | text            |
| `species`             | text            |
| `breed`               | text            |
| `sex`                 | text            |
| `birthday`            | date            |
| `price`               | integer         |
| `breeder_id`          | uuid            |

**非公開（View に含めない）:** `management_name`, `created_by`, `updated_by`, `ai_description`, `description`, `status`, `display_order`, `published_at` 等

### 4.2 `breeder_public_profiles`

| 公開列          | 型（breeders 由来） |
| --------------- | ------------------- |
| `id`            | uuid                |
| `business_name` | text                |
| `prefecture`    | text                |

**非公開（View に含めない）:** `user_id`, `phone`, `address_line`, `postal_code`, 書類パス, Stripe, 審査状態 等

### 4.3 権限

```sql
GRANT SELECT ON public.published_pets_public TO anon, authenticated;
GRANT SELECT ON public.breeder_public_profiles TO anon, authenticated;
```

---

## 5. RLS / Storage Policy

### 5.1 内部関数

| 名前                                    | 用途                                                         |
| --------------------------------------- | ------------------------------------------------------------ |
| `public.is_publicly_listable_pet(uuid)` | RLS ポリシー共用（`SECURITY DEFINER`、`REVOKE FROM PUBLIC`） |

### 5.2 `public.pet_photos`

| ポリシー                             | 操作   | 対象                | 条件                               |
| ------------------------------------ | ------ | ------------------- | ---------------------------------- |
| `pet_photos_select_public_published` | SELECT | anon, authenticated | `is_publicly_listable_pet(pet_id)` |

既存 `pet_photos_select_own` / `pet_photos_select_admin` は **維持**。

### 5.3 `storage.objects`（`pet-photos`）

| ポリシー                                     | 操作   | 対象                | 条件                                                                                       |
| -------------------------------------------- | ------ | ------------------- | ------------------------------------------------------------------------------------------ |
| `pet_photos_storage_select_public_published` | SELECT | anon, authenticated | バケット `pet-photos`、パス `breeders/*/pets/{petId}/*`、`is_publicly_listable_pet(petId)` |

**バケット `public` 設定:** 変更なし（private 維持）

**パス構造（既存踏襲）:** `breeders/{userId}/pets/{petId}/{filename}`（`20260806143000_create_pet_photos_storage.sql`）

### 5.4 `public.pets` 既存ポリシー変更

| 変更前 `pets_select_public_published` | 変更後                      |
| ------------------------------------- | --------------------------- |
| `TO anon, authenticated`              | **`TO authenticated` のみ** |

anon は **`published_pets_public` View 経由**で取得（内部列漏洩防止）。

---

## 6. セキュリティテスト

| 項目       | 内容                               |
| ---------- | ---------------------------------- |
| スクリプト | `scripts/test-public-pet-read.mts` |
| コマンド   | `npm run test:public-pet-read`     |
| 認証       | anon のみ（publishable key）       |

### 6.1 テスト結果（Migration 適用前）

```
FAIL published_pets_public view available
0 passed / 1 failed
```

**原因:** 開発 Supabase に Migration 未適用。

### 6.2 Migration 適用後の期待

| 区分 | チェック                                                        |
| ---- | --------------------------------------------------------------- |
| PASS | View から published Pet 取得                                    |
| PASS | View は公開列のみ（`management_name` 列なし）                   |
| PASS | anon から `pets.management_name` 不可                           |
| PASS | published Pet の `pet_photos` / Signed URL                      |
| PASS | `breeder_public_profiles` 取得                                  |
| FAIL | draft / under_review Pet が View・写真に出ない（env ID 指定時） |
| FAIL | `breeders.phone` / View に phone 列なし                         |

### 6.3 推奨 env（適用後の完全テスト用）

| 変数                                  | 例 / 用途               |
| ------------------------------------- | ----------------------- |
| `SEC_TEST_PUBLIC_PUBLISHED_PET_ID`    | published SEC-TEST Pet  |
| `SEC_TEST_PUBLIC_DRAFT_PET_ID`        | draft Pet（差戻し後等） |
| `SEC_TEST_PUBLIC_UNDER_REVIEW_PET_ID` | under_review Pet        |
| `SEC_TEST_REVIEW_BREEDER_ID`          | 承認済みブリーダー ID   |

---

## 7. lint / typecheck / format:check / build

| コマンド                       | 結果                         |
| ------------------------------ | ---------------------------- |
| `npm run lint`                 | **PASS**                     |
| `npm run typecheck`            | **PASS**                     |
| `npm run format:check`         | **PASS**（Prettier 修正後）  |
| `npm run build`                | **PASS**                     |
| `npm run test:public-pet-read` | **FAIL**（Migration 未適用） |

---

## 8. 変更ファイル

| 種別 | パス                                                                     |
| ---- | ------------------------------------------------------------------------ |
| 新規 | `supabase/migrations/20260814120000_add_public_pet_list_read_access.sql` |
| 新規 | `scripts/test-public-pet-read.mts`                                       |
| 新規 | `docs/09_開発履歴/2026-08-14_PU-01_公開READ_Migration実装完了報告.md`    |
| 変更 | `package.json`（`test:public-pet-read` 追加）                            |

---

## 9. 残課題

| 項目                         | 内容                                             |
| ---------------------------- | ------------------------------------------------ |
| Migration 適用               | 開発 Supabase へ手動または CLI で適用            |
| セキュリティテスト再実行     | 適用後 `npm run test:public-pet-read`            |
| 一覧ソート順 Decision        | 未決定                                           |
| `/pets` UI                   | 未実装                                           |
| `docs/05_` / `docs/07_` 追記 | pet_photos / 権限設計への Migration 反映（任意） |

---

## 10. 次工程

**Migration 適用 → `test:public-pet-read` 全 PASS 確認** の後、

**`/pets` ページ実装**（`loadPublicPetsPage()` + Card UI、`published_pets_public` / `breeder_public_profiles` 利用）

---

## 11. 関連ドキュメント

- [PU-01_公開犬猫一覧.md](../04_画面設計/PU-01_公開犬猫一覧.md)
- [2026-08-14_PU-01_公開犬猫一覧_設計.md](./2026-08-14_PU-01_公開犬猫一覧_設計.md)
