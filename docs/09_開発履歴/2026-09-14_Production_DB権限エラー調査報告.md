# Production DB 権限エラー調査報告

| 項目   | 内容                                                                                             |
| ------ | ------------------------------------------------------------------------------------------------ |
| 調査日 | 2026-09-14                                                                                       |
| 種別   | **調査のみ**（Migration 追加 / Production DB 変更 / コード変更なし）                             |
| 症状   | login E2E: Auth 200、`POST /rest/v1/buyers` **403** — `42501 permission denied for table buyers` |
| 判定   | **PostgreSQL テーブル privilege（GRANT）不足。RLS ポリシー不足ではない**                         |

**機密:** token / password / API key / 実メールアドレスは記載しない。

---

## 1. 結論

| 項目                              | 結果                                                                                                                    |
| --------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| Auth（`signInWithPassword`）      | **成功**（`token?grant_type=password` → 200）                                                                           |
| 失敗箇所                          | **`public.buyers` への PostgREST INSERT**（初回 login bootstrap）                                                       |
| 直接原因                          | **`authenticated` ロールに `public.buyers` の table privilege が無い**                                                  |
| Migration 上の根因                | **全 base table 作成 Migration に `GRANT` が無い**（View / RPC のみ GRANT あり）                                        |
| DEV で気づかなかった理由          | **DEV は Supabase ローカル init または既存 Project の default privilege により table GRANT が存在していた可能性が高い** |
| Production 空 DB + migration のみ | **table GRANT が付かず顕在化**                                                                                          |

**修正方針:** RLS は維持したまま、Supabase 標準に沿って **`authenticated` / `anon` への最小 table GRANT を 1 本の Migration として追加**する。`stripe_webhook_events` は **GRANT 対象外**（service_role のみ）。

---

## 2. Network 観測との対応

| リクエスト                  | 結果            | 意味                                                            |
| --------------------------- | --------------- | --------------------------------------------------------------- |
| `token?grant_type=password` | **200**         | Supabase Auth ログイン成功                                      |
| `buyers?...`（INSERT）      | **403 / 42501** | PostgREST が PostgreSQL に問い合わせた時点で **table 権限拒否** |

### 42501 の読み分け（重要）

| PostgreSQL / PostgREST message                             | 層                   | 今回     |
| ---------------------------------------------------------- | -------------------- | -------- |
| `permission denied for table buyers`                       | **Table GRANT 不足** | **該当** |
| `new row violates row-level security policy for table ...` | **RLS ポリシー拒否** | 非該当   |

前回報告（[Productionログインエラー追加調査](./2026-09-14_Productionログインエラー追加調査報告.md)）では RLS 42501 を疑ったが、**今回の message 文言は table privilege 不足を示す**。RLS が効いていればそもそも policy 評価まで到達するが、**GRANT が無いと policy 以前に拒否される**。

---

## 3. `public.buyers` Migration と RLS

### 3.1 作成 Migration

**ファイル:** `supabase/migrations/20260804160000_create_buyers.sql`

| 項目         | 内容                                                                                               |
| ------------ | -------------------------------------------------------------------------------------------------- |
| CREATE TABLE | `public.buyers`                                                                                    |
| FK           | `user_id → auth.users(id)`                                                                         |
| RLS          | `ENABLE ROW LEVEL SECURITY`                                                                        |
| Policies     | `buyers_select_own` / `buyers_insert_own` / `buyers_update_own`（いずれも `auth.uid() = user_id`） |
| **GRANT**    | **なし**                                                                                           |

### 3.2 後続 Migration

| Migration                                                | buyers への変更            |
| -------------------------------------------------------- | -------------------------- |
| `20260805112236_update_initial_registration_profile.sql` | `profile_completed` 列追加 |
| `20260805112809_update_profile_registration_flow.sql`    | 同上（IF NOT EXISTS）      |

**GRANT を追加した Migration は存在しない。**

### 3.3 RLS との関係

```
PostgREST (JWT role = authenticated)
  ↓
(1) Table GRANT があるか？  ← ★ Production ここで 403
  ↓
(2) RLS policy を評価
  ↓
(3) 行の INSERT / SELECT
```

**RLS ポリシー（`buyers_insert_own`）は Migration 上正しく定義されている。**  
今回のエラーは **(1) が未設定** のため RLS まで到達していない。

### 3.4 アプリ側 bootstrap 設計（再確認）

| タイミング     | 処理                                     | ファイル                          |
| -------------- | ---------------------------------------- | --------------------------------- |
| signup         | `auth.users` 作成 + `user_metadata.role` | `src/lib/supabase/sign-up.ts`     |
| メール確認     | `verifyOtp`                              | `src/app/auth/confirm/route.ts`   |
| **初回 login** | `createBuyer()` INSERT                   | `src/features/auth/repository.ts` |

**`public.profiles` テーブルは存在しない**（View `breeder_public_*` のみ）。

---

## 4. Migration 全体の GRANT 調査

### 4.1 現状：GRANT があるオブジェクト

| 種別               | 例                                                              | Migration          |
| ------------------ | --------------------------------------------------------------- | ------------------ |
| **View**           | `published_pets_public`, `breeder_public_profiles`              | `20260814120000_*` |
| **View**           | `published_pet_detail_public`, `breeder_public_detail_profiles` | `20260814130000_*` |
| **Function (RPC)** | `submit_pet_for_review`, `request_visit`, …                     | 各 RPC migration   |

### 4.2 現状：GRANT が無い base table（Phase1）

| テーブル                    | 作成 Migration        | RLS              | Browser Client アクセス           |
| --------------------------- | --------------------- | ---------------- | --------------------------------- |
| `buyers`                    | `20260804160000_*`    | ○                | **○** bootstrap / profile         |
| `breeders`                  | `20260804135800_*`    | ○                | **○** bootstrap / profile         |
| `pets`                      | `001_pets.sql` + 後続 | ○                | **○** breeder 管理                |
| `favorites`                 | `20260804161228_*`    | ○                | **○**                             |
| `inquiries`                 | `20260804163239_*`    | ○                | **○**                             |
| `inquiry_messages`          | 同上                  | ○                | **○**                             |
| `visits`                    | 同上                  | ○                | **○**（+ RPC）                    |
| `pet_photos`                | `20260806143100_*`    | ○                | **○**                             |
| `pet_review_logs`           | `20260807110000_*`    | ○                | **○**（breeder/admin read）       |
| `breeder_review_logs`       | `20260825100000_*`    | ○                | **○**（admin read）               |
| **`stripe_webhook_events`** | `20260826173000_*`    | ○（policy なし） | **×** service_role のみ（意図的） |

**buyers だけの問題ではない。** 上記 **10 テーブルすべて** に同様の GRANT 不足があり、Phase1 機能が順次 403 になる。

### 4.3 意図的に GRANT しないテーブル

| テーブル                | 設計                                                                                                      |
| ----------------------- | --------------------------------------------------------------------------------------------------------- |
| `stripe_webhook_events` | RLS policy なし + **anon/authenticated へ GRANT しない**（`service_role` のみ Webhook repository が使用） |

---

## 5. Supabase 標準設計との整合性

### 5.1 Supabase / PostgREST の二段防御

| 層              | 役割                             | WithTama                     |
| --------------- | -------------------------------- | ---------------------------- |
| **Table GRANT** | ロールがテーブルにアクセス可能か | **Migration 未設定（欠陥）** |
| **RLS**         | どの行にアクセス可能か           | Migration で **設定済み**    |

Supabase Dashboard からテーブルを作成すると、**anon / authenticated への GRANT が自動付与**される。  
**SQL Migration のみで空 Project を構築した場合、GRANT は自動付与されない**（既知パターン）。

### 5.2 ローカル DEV vs Production 空 DB

| 環境                                               | table GRANT の出所                                                | 結果                                  |
| -------------------------------------------------- | ----------------------------------------------------------------- | ------------------------------------- |
| **`supabase start`（ローカル Docker）**            | 公式 DB init スクリプトが schema default privilege / grant を設定 | Migration だけでも **動くことが多い** |
| **既存 Hosted DEV Project**                        | 過去の Dashboard 操作・init・手動 SQL で grant 済みの可能性       | E2E **成功**                          |
| **新規 Production（空 DB + `db push` 33 本のみ）** | Migration に GRANT なし                                           | **403 顕在化**                        |

これが **「DEV E2E 成功・Production 初回 login 失敗」** の説明になる。

### 5.3 View だけ GRANT がある理由

PU-01 / PU-02（`20260814120000_*`, `20260814130000_*`）では **公開 READ 用 View に明示 GRANT** がある。  
**base table への GRANT は同 Migration でも追加されていない**（公開一覧は View 経由、login bootstrap は base table 直アクセスのため Production で破綻）。

---

## 6. DEV / Production 権限状態の比較（確認方法）

Production DB は本調査では **直接変更・クエリ実行していない**。  
以下を **Product Owner が Supabase SQL Editor で実行** すれば差分を確定できる。

### 6.1 確認 SQL（secret 不要）

```sql
-- buyers の authenticated 権限
SELECT grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND table_name = 'buyers'
  AND grantee IN ('authenticated', 'anon', 'service_role')
ORDER BY grantee, privilege_type;

-- Phase1 全テーブル一覧
SELECT table_name, grantee, string_agg(privilege_type, ', ' ORDER BY privilege_type) AS privileges
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND table_name IN (
    'buyers', 'breeders', 'pets', 'favorites',
    'inquiries', 'inquiry_messages', 'visits',
    'pet_photos', 'pet_review_logs', 'breeder_review_logs',
    'stripe_webhook_events'
  )
  AND grantee IN ('authenticated', 'anon')
GROUP BY table_name, grantee
ORDER BY table_name, grantee;
```

| 期待（修正前 Production）                        | 期待（修正後）                   |
| ------------------------------------------------ | -------------------------------- |
| `authenticated` 行 **0 件**（buyers）            | `SELECT, INSERT, UPDATE, DELETE` |
| 他 base table も同様                             | 同上（stripe 除く）              |
| `stripe_webhook_events` → authenticated **0 件** | **0 件のまま**                   |

DEV Project でも同 SQL を実行し、**authenticated に privilege があるか** を比較する。

---

## 7. 影響範囲

### 7.1 既に影響が出ている / 出る機能

| 機能                         | テーブル                                 | 操作                     |
| ---------------------------- | ---------------------------------------- | ------------------------ |
| **購入希望者 login（初回）** | `buyers`                                 | INSERT                   |
| ブリーダー login（初回）     | `breeders`                               | INSERT                   |
| 購入希望者プロフィール       | `buyers`                                 | SELECT / UPDATE          |
| ブリーダープロフィール       | `breeders`                               | SELECT / UPDATE          |
| 犬猫 CRUD                    | `pets`, `pet_photos`                     | SELECT / INSERT / UPDATE |
| お気に入り                   | `favorites`                              | SELECT / INSERT / DELETE |
| 問い合わせ                   | `inquiries`, `inquiry_messages`          | SELECT / INSERT          |
| 見学                         | `visits`                                 | SELECT（+ RPC）          |
| 審査ログ閲覧                 | `pet_review_logs`, `breeder_review_logs` | SELECT                   |

### 7.2 影響が小さい / 別経路

| 機能                 | 理由                                                   |
| -------------------- | ------------------------------------------------------ |
| 公開犬猫一覧 `/pets` | **View**（`published_pets_public`）に GRANT 済み       |
| 公開詳細             | **View**（`published_pet_detail_public`）に GRANT 済み |
| RPC（見学・審査等）  | **Function** に `GRANT EXECUTE` 済み                   |
| Stripe Webhook       | **service_role** client（RLS bypass）                  |
| Storage              | `storage.objects` policy（別 schema）                  |

### 7.3 セキュリティ上の注意

| 項目                    | 方針                                                               |
| ----------------------- | ------------------------------------------------------------------ |
| GRANT 追加              | **RLS をバイパスしない**（GRANT は「試行許可」、行フィルタは RLS） |
| `stripe_webhook_events` | **authenticated / anon へ GRANT しない**                           |
| service_role            | 既存どおり Webhook / admin 系のみ（アプリ browser 不使用）         |
| 過剰権限                | `GRANT ALL` 一括より **Phase1 テーブル明示リスト** を推奨          |

---

## 8. 修正案（Migration 提案・未実施）

### 8.1 新規 Migration（案）

**ファイル名（案）:** `supabase/migrations/20260914100000_grant_phase1_table_privileges.sql`

```sql
-- Migration: Grant PostgREST table privileges for Phase1 base tables
-- RLS remains the row-level gate; GRANT only allows role to attempt operations.
-- No DROP TABLE, TRUNCATE, or DELETE FROM

BEGIN;

-- PostgREST roles must have schema usage
GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- Phase1 application tables (browser / authenticated JWT)
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.buyers TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.breeders TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.pets TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.favorites TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.inquiries TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.inquiry_messages TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.visits TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.pet_photos TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.pet_review_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.breeder_review_logs TO authenticated;

-- anon: base-table SELECT only where RLS policies explicitly include anon
-- (public READ primary path uses Views; these support pet_photos direct read)
GRANT SELECT ON TABLE public.pets TO anon;
GRANT SELECT ON TABLE public.pet_photos TO anon;

-- service_role-only table: keep locked down (no policy + no grant)
REVOKE ALL ON TABLE public.stripe_webhook_events FROM anon, authenticated;

-- Future tables created by migration role (postgres) inherit grants
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT ON TABLES TO anon;

COMMIT;
```

### 8.2 設計上の補足

| 決定                                           | 理由                                                     |
| ---------------------------------------------- | -------------------------------------------------------- |
| `authenticated` に DML 4 種                    | Supabase 慣行。DELETE 等は **RLS policy が無ければ拒否** |
| `anon` は `pets` / `pet_photos` の SELECT のみ | RLS に `TO anon` ポリシーがあるテーブルのみ              |
| `stripe_webhook_events` を REVOKE              | 明示的 deny（将来の default privilege 追加時の安全弁）   |
| `ALTER DEFAULT PRIVILEGES`                     | **新規 Migration で作るテーブル** に再発防止             |

### 8.3 意図的に含めないもの

| 対象                | 理由                           |
| ------------------- | ------------------------------ |
| View GRANT          | 既存 Migration で付与済み      |
| RPC `GRANT EXECUTE` | 各 Migration で付与済み        |
| RLS policy 変更     | 不要（今回の原因ではない）     |
| Storage policy      | 別 schema（`storage.objects`） |

### 8.4 適用手順（将来・PO 向け）

1. 上記 Migration を repo に追加（別 PR）
2. DEV Project で `supabase db push` → 既存 grant あっても **GRANT は冪等**
3. Production Project で `supabase db push`（**34 本目**）
4. §9 のテスト実施
5. login E2E 再確認

**Production への手動 `GRANT` だけでは再現性が無い。** Migration 化必須。

---

## 9. テスト方法（修正後）

### 9.1 SQL 検証（Hosted / 空 DB 再構築後）

```sql
SELECT has_table_privilege('authenticated', 'public.buyers', 'INSERT') AS buyers_insert;
SELECT has_table_privilege('authenticated', 'public.breeders', 'INSERT') AS breeders_insert;
SELECT has_table_privilege('anon', 'public.pets', 'SELECT') AS anon_pets_select;
SELECT has_table_privilege('authenticated', 'public.stripe_webhook_events', 'SELECT') AS stripe_select;
```

| 期待値                        |
| ----------------------------- |
| `buyers_insert` = **true**    |
| `breeders_insert` = **true**  |
| `anon_pets_select` = **true** |
| `stripe_select` = **false**   |

### 9.2 Migration 再現性テスト（推奨・将来 implement）

| テスト                                 | 内容                                                                             |
| -------------------------------------- | -------------------------------------------------------------------------------- |
| **新規 `test-table-grants.mts`（案）** | 33+1 migration 適用後、`information_schema.role_table_grants` を静的期待値と照合 |
| **`npm run test:migration-order`**     | 既存。依存順序は維持                                                             |
| **空 DB `db push` smoke**              | 新 Supabase branch / local reset で全 migration → SQL 検証                       |

### 9.3 アプリ E2E

| Step                      | 期待                                   |
| ------------------------- | -------------------------------------- |
| buyer signup → メール確認 | 変更なし                               |
| login                     | **`POST /buyers` → 201**（または 200） |
| redirect                  | `/buyer` → `/buyer/profile`            |
| 公開 `/pets`              | View 経由で **従来どおり表示**         |
| breeder signup → login    | `breeders` INSERT 成功                 |

### 9.4 回帰（セキュリティ）

| 確認                                                 | 方法                              |
| ---------------------------------------------------- | --------------------------------- |
| 他ユーザー buyers 行が読めない                       | 既存 RLS テスト / 手動            |
| `stripe_webhook_events` に authenticated INSERT 不可 | SQL `has_table_privilege` = false |
| anon が buyers INSERT 不可                           | RLS + 必要なら E2E                |

---

## 10. 前回調査との関係

| 報告                                                                                     | 更新                                                                             |
| ---------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| [Productionログインエラー追加調査](./2026-09-14_Productionログインエラー追加調査報告.md) | 42501 を RLS と推定していたが、**Network message により table GRANT 不足に確定** |
| [Productionメール認証エラー調査](./2026-09-14_Productionメール認証エラー調査報告.md)     | メール認証自体は成功。login 失敗は **別問題（本件）**                            |

---

## 11. 次に 1 つだけ行う確認（修正前の最終確証）

**Production Supabase SQL Editor で §6.1 の grant 確認 SQL を実行し、`buyers` に `grantee = authenticated` の行が 0 件であることを記録する。**

→ 0 件なら **本報告の原因確定**。続けて §8 Migration 実装 PR へ進む。

---

## 12. git status

本調査で変更したファイル:

```
?? docs/09_開発履歴/2026-09-14_Production_DB権限エラー調査報告.md
```

Migration 追加・コード変更・Production DB 変更・commit / push は **未実施**。

---

## 付録 A — Phase1 browser Client が触る PostgREST オブジェクト

| オブジェクト種別        | GRANT 状態（現行 Migration）                   |
| ----------------------- | ---------------------------------------------- |
| base table ×10          | **不足**                                       |
| `stripe_webhook_events` | **GRANT なし（正しい意図、明示 REVOKE 推奨）** |
| public View ×4          | **SELECT 付与済み**                            |
| RPC function            | **EXECUTE 付与済み**                           |

## 付録 B — 関連 Migration ファイル

| ファイル                                                         | 内容                                               |
| ---------------------------------------------------------------- | -------------------------------------------------- |
| `20260804160000_create_buyers.sql`                               | buyers + RLS（GRANT なし）                         |
| `20260804135800_create_breeders.sql`                             | breeders + RLS（GRANT なし）                       |
| `001_pets.sql`                                                   | pets 初期（開発用 allow-all policy → 後続 harden） |
| `20260814120000_add_public_pet_list_read_access.sql`             | View GRANT **あり**                                |
| `20260826173000_stripe_step1_billing_columns_and_protection.sql` | stripe_webhook_events（service_role 専用設計）     |
