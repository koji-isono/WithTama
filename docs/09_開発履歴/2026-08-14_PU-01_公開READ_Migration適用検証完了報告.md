# PU-01 公開 READ Migration 適用・検証完了報告

| 項目   | 内容                                                                           |
| ------ | ------------------------------------------------------------------------------ |
| 作業日 | 2026-08-14                                                                     |
| 対象   | PU-01 公開犬猫一覧 `/pets` 公開 READ 基盤（Migration 適用・検証のみ）          |
| 種別   | Migration 適用判断 + セキュリティ検証 + 品質ゲート                             |
| 前提   | [Migration 実装完了報告](./2026-08-14_PU-01_公開READ_Migration実装完了報告.md) |

---

## 1. Supabase 接続状態（秘密情報は記載しない）

| 確認項目                       | 結果                                                                                                                      |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------- |
| `supabase/config.toml`         | ローカル開発用 `project_id = "withtama"` のみ。リモート project ref の link 設定なし                                      |
| `.env.local`                   | `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` / `SEC_TEST_*`（admin・breeder・pet ID 等）が設定済み |
| `.env.local` 未設定            | `SUPABASE_ACCESS_TOKEN` / `SUPABASE_SERVICE_ROLE_KEY` / DB 接続パスワード系                                               |
| Supabase CLI（`npx supabase`） | v2.114.0 利用可能。グローバル `supabase` コマンドは PATH 未登録                                                           |
| `supabase login`               | **未実施**（`SUPABASE_ACCESS_TOKEN` なし → `projects list` は認証エラー）                                                 |
| `supabase link`                | **未 link**（`supabase/.temp/project-ref` なし → `migration list` は `LegacyProjectNotLinkedError`）                      |
| リモート Migration 履歴        | CLI からは取得不可（link / 認証不足）                                                                                     |

**接続先プロジェクト ref（URL から判別）:** `mahgsrtuyzgqlkoiwqky`（値そのものは `.env.local` を参照）

---

## 2. Migration 適用方法

### 2.1 自動適用の可否

| 手段                          | 判定                   | 理由                                                                        |
| ----------------------------- | ---------------------- | --------------------------------------------------------------------------- |
| `npx supabase db push`        | **不可（今回未実行）** | `supabase login` + `supabase link` + DB パスワードが必要。認証・link 未完了 |
| 既存 Migration ファイルの改変 | **実施していない**     | ユーザー指示どおり                                                          |

**結論:** 今回の環境から **安全に CLI 自動適用できない** ため、**Supabase Dashboard → SQL Editor での手動適用**を推奨する。

### 2.2 Dashboard SQL Editor 手順（推奨）

1. [Supabase Dashboard](https://supabase.com/dashboard) にログイン
2. 開発プロジェクト（ref: `mahgsrtuyzgqlkoiwqky`）を開く
3. 左メニュー **SQL Editor** → **New query**
4. リポジトリの次ファイルを **全文** コピーして貼り付け  
   `supabase/migrations/20260814120000_add_public_pet_list_read_access.sql`
5. **Run** を実行（成功メッセージを確認）
6. ローカルで再検証:

   ```bash
   npm run test:public-pet-read
   ```

7. 期待される作成物（Dashboard → Database → Views / Functions / Policies で確認可）:
   - View: `published_pets_public`, `breeder_public_profiles`
   - Function: `is_publicly_listable_pet(uuid)`
   - Policy 更新: `pets_select_public_published`（anon 除外）
   - Policy 追加: `pet_photos_select_public_published`, `pet_photos_storage_select_public_published`

### 2.3 CLI で適用する場合（将来・別セッション）

```bash
npx supabase login
npx supabase link --project-ref mahgsrtuyzgqlkoiwqky
npx supabase db push
```

DB パスワード入力が求められる。本番相当 DB への誤適用に注意すること。

---

## 3. Migration 適用結果

| 項目                                                 | 結果                                             |
| ---------------------------------------------------- | ------------------------------------------------ |
| `20260814120000_add_public_pet_list_read_access.sql` | **未適用**（開発 Supabase に View が存在しない） |
| 適用実行者                                           | 本セッションでは適用不可（認証・link 不足）      |
| 既存 Migration の改変                                | なし                                             |

---

## 4. View 確認結果

Migration 未適用のため **anon からの View 実体確認は未実施**。

| チェック                                           | 結果                    |
| -------------------------------------------------- | ----------------------- |
| `published_pets_public` が anon から SELECT 可能   | **FAIL**（View 不存在） |
| 公開列のみ（`management_name` 等なし）             | **未検証**              |
| `breeder_public_profiles` が anon から SELECT 可能 | **未検証**              |
| `breeder_public_profiles` に `phone` 等なし        | **未検証**              |

---

## 5. RLS 確認結果

Migration 未適用のため **ポリシー変更後の実動確認は未実施**。

| チェック                                                      | 結果                                                                                |
| ------------------------------------------------------------- | ----------------------------------------------------------------------------------- |
| anon から `public.pets` 直接 SELECT で行が返らない            | **未検証**                                                                          |
| anon から `pets.management_name` が取得できない               | **未検証**                                                                          |
| 正規ルートは `published_pets_public`                          | **未検証**（View 未作成）                                                           |
| published Pet の `pet_photos` のみ anon SELECT 可             | **未検証**                                                                          |
| draft / under_review / returned Pet の写真 anon 不可          | **未検証**（テストは env / breeder 探索で ID 解決可能だが View 未作成で実行未到達） |
| 未承認 / suspended / canceled ブリーダー Pet が View に出ない | **未検証**（専用 SEC-TEST Pet ID 未設定）                                           |

---

## 6. Storage Policy 確認結果

| チェック                                        | 結果                                                       |
| ----------------------------------------------- | ---------------------------------------------------------- |
| `pet-photos` バケットが private のまま          | **未検証**（Migration 適用前は公開 SELECT ポリシー未追加） |
| 公開条件を満たす Pet 写真のみ Signed URL 取得可 | **未検証**                                                 |
| anon がバケット root を list できない           | **未検証**                                                 |
| 公開 URL（非 Signed）では取得できない           | **未検証**                                                 |

**設計上の意図（Migration 内容）:** バケット `public` フラグは変更せず、`storage.objects` に `pet_photos_storage_select_public_published` を追加するのみ。

---

## 7. セキュリティテスト結果

| 項目       | 内容                                                                               |
| ---------- | ---------------------------------------------------------------------------------- |
| コマンド   | `npm run test:public-pet-read`                                                     |
| スクリプト | `scripts/test-public-pet-read.mts`（本セッションで UNVERIFIED 対応・チェック拡充） |
| 認証       | anon（publishable key）+ 任意で breeder セッションによる Pet ID 探索               |

### 7.1 実行ログ（Migration 適用前）

```
FAIL published_pets_public view available (apply supabase/migrations/20260814120000_add_public_pet_list_read_access.sql first)

0 passed / 1 failed / 0 unverified
```

View 不存在のため **早期終了**。以降のチェック（計 30 件超）は実行されなかった。

### 7.2 件数サマリ

| 区分       | 件数                                                                                |
| ---------- | ----------------------------------------------------------------------------------- |
| **PASS**   | **0**                                                                               |
| **FAIL**   | **1**                                                                               |
| **未検証** | **0**（早期終了のため未検証カウントは 0。本来 29+ 件は Migration 適用後に実行必要） |

### 7.3 Migration 適用後に実行されるチェック一覧

| #   | チェック名                                                     |
| --- | -------------------------------------------------------------- |
| 1   | `published_pets_public` view available                         |
| 2   | `breeder_public_profiles` view available                       |
| 3   | anon can select published pets from published_pets_public view |
| 4   | published pet sample available for photo tests                 |
| 5   | view row exposes public columns only                           |
| 6   | management_name not selectable from published_pets_public      |
| 7   | internal pet columns not selectable from published_pets_public |
| 8   | anon direct SELECT on public.pets returns no rows              |
| 9   | management_name not readable from public.pets as anon          |
| 10  | draft pet excluded from published_pets_public                  |
| 11  | draft pet photos not readable by anon                          |
| 12  | draft pet storage signed url not creatable by anon             |
| 13  | under_review pet excluded from published_pets_public           |
| 14  | under_review pet photos not readable by anon                   |
| 15  | returned pet excluded from published_pets_public               |
| 16  | published pet main photo readable by anon                      |
| 17  | published pet storage signed url creatable by anon             |
| 18  | pet-photos bucket remains private                              |
| 19  | anon can select breeder_public_profiles                        |
| 20  | approved active SEC_TEST breeder in public profiles            |
| 21  | breeder phone not readable from breeders table                 |
| 22  | breeder phone not selectable from breeder_public_profiles      |
| 23  | breeder private columns not selectable from profile view       |
| 24  | unapproved breeder published pet excluded                      |
| 25  | suspended breeder published pet excluded                       |
| 26  | canceled breeder published pet excluded                        |
| 27  | anon cannot list pet-photos bucket root                        |

**env フォールバック（テストスクリプト）:**

- `SEC_TEST_ADMIN_APPROVE_PET_ID` → under_review 否定テスト
- `SEC_TEST_ADMIN_RETURN_PET_ID` / `SEC_TEST_SUBMIT_DRAFT_PET_ID` → draft 否定テスト
- `SEC_TEST_BREEDER_*` → `[SEC-TEST]` Pet の status 別 ID 探索

**未検証になりうる項目（テストデータ不足）:**

- 未承認ブリーダーの published Pet（`SEC_TEST_PUBLIC_UNAPPROVED_PUBLISHED_PET_ID` 未設定）
- suspended / canceled ブリーダーの published Pet（各 env 未設定）

---

## 8. lint / typecheck / format:check / build

| コマンド               | 結果                                                              |
| ---------------------- | ----------------------------------------------------------------- |
| `npm run lint`         | **PASS**                                                          |
| `npm run typecheck`    | **PASS**                                                          |
| `npm run format:check` | **PASS**（`scripts/test-public-pet-read.mts` を Prettier 整形後） |
| `npm run build`        | **PASS**                                                          |

---

## 9. 問題点

| #   | 内容                                                                    | 深刻度                         |
| --- | ----------------------------------------------------------------------- | ------------------------------ |
| 1   | 開発 Supabase に PU-01 Migration **未適用**                             | **高**                         |
| 2   | Supabase CLI が login / link 未完了のため自動 `db push` 不可            | 中                             |
| 3   | セキュリティテストが View 不存在で早期 FAIL。RLS / Storage の実動未確認 | **高**                         |
| 4   | 未承認・suspended・canceled ブリーダー向け SEC-TEST Pet が未整備        | 中（適用後も未検証になりうる） |

---

## 10. 残課題

1. **Dashboard SQL Editor で Migration を適用**（上記 §2.2）
2. `npm run test:public-pet-read` を再実行し、FAIL 0 を確認
3. 未検証 3 件（未承認 / suspended / canceled ブリーダー Pet）用テストデータを準備するか、専用 env を設定
4. `supabase link` を整備し、今後は `npx supabase db push` で Migration 適用可能にする（任意）
5. `/pets` UI 実装（Migration + テスト PASS 後）

---

## 11. 次工程

1. Dashboard で `20260814120000_add_public_pet_list_read_access.sql` を適用
2. `npm run test:public-pet-read` で PASS / 未検証を確認（FAIL 0 がゲート）
3. 未検証項目のテストデータ整備（必要なら prepare スクリプト拡張）
4. **PASS 確認後** `/pets` UI 実装（`published_pets_public` / `breeder_public_profiles` 利用）

---

## 12. `/pets` UI 実装へ進んでよい状態か

**NO**

**理由:**

- 開発 Supabase に Migration **未適用**
- セキュリティテスト **FAIL**（View 不存在）
- anon からの `published_pets_public` / RLS / Storage 実動検証 **未完了**

---

## 13. 関連ドキュメント

- [PU-01_公開犬猫一覧.md](../04_画面設計/PU-01_公開犬猫一覧.md)
- [2026-08-14_PU-01_公開READ_Migration実装完了報告.md](./2026-08-14_PU-01_公開READ_Migration実装完了報告.md)
