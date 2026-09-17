# Production service_role 権限 全体監査報告

| 項目   | 内容                                                                                    |
| ------ | --------------------------------------------------------------------------------------- |
| 作業日 | 2026-09-17                                                                              |
| 種別   | **棚卸し + 統合 Migration 案 + テスト案**（Production 適用 / commit / push **未実施**） |
| 背景   | Production で `service_role` の table-level GRANT 不足が連続顕在化                      |

**確認済み（ユーザー報告）:**

| 対象                    | Production 状態                               | 対応状況                                              |
| ----------------------- | --------------------------------------------- | ----------------------------------------------------- |
| `stripe_webhook_events` | service_role DML 不足 → 42501                 | `20260917100000` で **Git 反映済み**（DB 適用は別途） |
| `breeders`              | `has_table_privilege` **SELECT/UPDATE=false** | **未修正**                                            |

**機密:** Secret / Key / 実 ID / メールは記載しない。

**関連:**

- [Stripe Webhook breeder lookup 失敗 調査報告](./2026-09-17_Production_StripeWebhook_breeder_lookup失敗_調査報告.md)
- [Production DB 権限修正 実装報告](./2026-09-14_Production_DB権限修正_実装報告.md)
- [Stripe Webhook service_role 権限不足 修正報告](./2026-09-17_StripeWebhook_service_role権限不足_修正報告.md)

---

## 1. 結論（要約）

| 項目                                                     | 内容                                                                                                                                  |
| -------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| **アプリ runtime で `service_role` を使う Phase 1 処理** | **Stripe Webhook のみ**（`createAdminClient()` → `src/features/billing/webhook/repository.ts`）                                       |
| **不足している table GRANT（Production 確認済み）**      | `public.breeders` — **SELECT, UPDATE**                                                                                                |
| **既に Migration 化済み**                                | `public.stripe_webhook_events` — SELECT, INSERT, UPDATE, DELETE（`20260917100000`）                                                   |
| **その他 Phase 1 テーブル / Storage / RPC**              | **アプリコードは `authenticated` JWT** — service_role GRANT **不要**（修正不要）                                                      |
| **統合方針**                                             | 場当たり追加を止め、**Phase 1 service_role 正本 Migration 1 本**で `breeders` を追加し、既存 `20260917100000` と **役割分担を明文化** |
| **新規 Project 再現性**                                  | Migration のみの空 DB では **明示 GRANT が無ければ必ず 42501** — 現状 **再現可能な欠陥**                                              |

---

## 2. `createAdminClient()` / `SUPABASE_SERVICE_ROLE_KEY` 利用箇所

### 2.1 本番アプリ（`src/`）

| モジュール                                   | 用途                         | PostgREST 操作先                    |
| -------------------------------------------- | ---------------------------- | ----------------------------------- |
| `src/lib/supabase/admin.ts`                  | `createAdminClient()` 定義   | —                                   |
| `src/features/billing/webhook/repository.ts` | **唯一の呼び出し元**         | `stripe_webhook_events`, `breeders` |
| `src/app/api/webhooks/stripe/route.ts`       | Webhook エントリ（間接利用） | 上記 repository 経由                |

**`src/` 内に他の `createAdminClient` / `SUPABASE_SERVICE_ROLE_KEY` 参照は無い**（2026-09-17 時点 grep 確認）。

### 2.2 本番アプリで service_role を使わない Phase 1 処理

| 領域                   | クライアント                      | 根拠（代表ファイル）                                 |
| ---------------------- | --------------------------------- | ---------------------------------------------------- |
| Stripe Checkout        | `createClient()`（authenticated） | `checkout-handler.ts`, `billing/repository.ts`       |
| Stripe Customer Portal | `createClient()`（authenticated） | `portal-handler.ts`                                  |
| 管理者（AD-*）         | `createClient()` + `is_admin()`   | `admin/repository.ts`, `admin-auth.ts`               |
| ブリーダー審査 RPC     | authenticated `.rpc()`            | `admin/repository.ts` — `start_breeder_review` 等    |
| 犬猫審査・公開 RPC     | authenticated `.rpc()`            | `admin/repository.ts` — `approve_pet_for_publish` 等 |
| 問い合わせ・見学       | authenticated                     | `inquiries/*`, `visits/*`                            |
| Storage Signed URL     | authenticated + Storage RLS       | `admin/repository.ts`, `pets/repository.ts`          |
| 公開犬猫 read          | anon / authenticated + View       | `pets/public-repository.ts`                          |
| Auth bootstrap         | Browser / Server authenticated    | `auth/repository.ts`                                 |

Decision No.102 どおり **管理画面は service_role 不使用**。

### 2.3 テストスクリプト（本番 runtime 外・参考）

| スクリプト                             | service_role 用途                                                 |
| -------------------------------------- | ----------------------------------------------------------------- |
| `test-stripe-step1-billing-protection` | webhook テーブル INSERT / breeders billing UPDATE 検証            |
| `test-stripe-step4-webhook`            | idempotency claim 統合（任意）                                    |
| `test-stripe-step7-portal-live`        | テスト用 breeder 行の **SELECT のみ**（Portal 本体は Stripe API） |
| `prepare-sec-test-public-read`         | テスト準備の membership UPDATE（任意）                            |

---

## 3. 全対象一覧（Phase 1）

### 3.1 テーブル — service_role

| テーブル                    | 使用箇所（コード）                                                        | 必要操作（コード逆算） | 現在の Migration GRANT（service_role） | Production 不足リスク     | 不足 GRANT（最小） |
| --------------------------- | ------------------------------------------------------------------------- | ---------------------- | -------------------------------------- | ------------------------- | ------------------ |
| **`stripe_webhook_events`** | `claimWebhookEvent` / `releaseWebhookEventClaim` / `finalizeWebhookEvent` | **S, I, U, D**         | **`20260917100000` 明示**              | **低**（適用済みなら OK） | （済）             |
| **`breeders`**              | `getBreederWebhookRowBy*` / `updateBreederWebhookFields`                  | **S, U** のみ          | **なし**                               | **高（確認済み false）**  | **SELECT, UPDATE** |

**`breeders` SELECT / UPDATE の妥当性（Webhook コード再確認）:**

| 関数 / 処理                            | SQL 操作                                | 必要権限                     |
| -------------------------------------- | --------------------------------------- | ---------------------------- |
| `fetchWebhookEventTimestamps`          | SELECT `created_at, processed_at`       | （stripe_webhook_events 側） |
| `getBreederWebhookRowById`             | SELECT 10 列（billing 関連）            | **SELECT**                   |
| `getBreederWebhookRowBySubscriptionId` | 同上 `.eq(stripe_subscription_id)`      | **SELECT**                   |
| `getBreederWebhookRowByCustomerId`     | 同上 `.eq(stripe_customer_id)`          | **SELECT**                   |
| `updateBreederWebhookFields`           | UPDATE 課金列（`BreederWebhookUpdate`） | **UPDATE**                   |
| INSERT / DELETE on `breeders`          | **コードに無し**                        | **不要**                     |

UPDATE 対象列（`webhook/types.ts`）: `stripe_customer_id`, `stripe_subscription_id`, `stripe_price_id`, `membership_status`, `subscription_status`, `subscription_current_period_end`, `cancel_at_period_end`, `last_payment_failed_at`, `suspended_at` — いずれも `breeders_billing_update_allowed()` が **service_role のみ許可**（trigger 設計と整合）。

### 3.2 テーブル — service_role 不要（修正不要）

| テーブル              | Phase 1 アプリの DB アクセス | ロール              | Migration GRANT  | service_role 要否 |
| --------------------- | ---------------------------- | ------------------- | ---------------- | ----------------- |
| `buyers`              | bootstrap / profile          | authenticated       | `20260914100000` | **不要**          |
| `pets`                | breeder CRUD / admin 審査    | authenticated       | 同上             | **不要**          |
| `favorites`           | buyer                        | authenticated       | 同上             | **不要**          |
| `inquiries`           | buyer / breeder              | authenticated       | 同上             | **不要**          |
| `inquiry_messages`    | 同上                         | authenticated       | 同上             | **不要**          |
| `visits`              | SELECT + RPC mutation        | authenticated       | SELECT のみ      | **不要**          |
| `pet_photos`          | breeder / public read        | authenticated, anon | 同上             | **不要**          |
| `pet_review_logs`     | admin SELECT                 | authenticated       | SELECT のみ      | **不要**          |
| `breeder_review_logs` | admin SELECT                 | authenticated       | SELECT のみ      | **不要**          |

**根拠:** いずれも `createClient()`（ユーザ JWT）+ RLS / SECURITY DEFINER RPC。`createAdminClient()` 経由の参照なし。

### 3.3 View（公開 read）

| View 例                    | ロール                        | service_role |
| -------------------------- | ----------------------------- | ------------ |
| `published_pets_public` 等 | anon / authenticated GRANT 済 | **不要**     |

Webhook は View を使用しない。

### 3.4 Storage（`storage.objects`）

| Bucket              | アプリアクセス      | ロール / Policy                                         | service_role |
| ------------------- | ------------------- | ------------------------------------------------------- | ------------ |
| `breeder-documents` | Signed URL          | authenticated + `is_admin()` policy（`20260825110000`） | **不使用**   |
| `pet-photos`        | Signed URL / upload | authenticated / anon policies                           | **不使用**   |

Storage API も **authenticated JWT**。service_role による bypass 経路は Phase 1 アプリに **無い**。  
`is_publicly_listable_pet` EXECUTE 不足は **anon/authenticated** 問題（`20260916100000` — **Production 適用済み・Local/Remote 一致**）であり **service_role 監査対象外**。

### 3.5 RPC / Function（EXECUTE）

| 関数群（例）                    | GRANT 先                                | 呼び出し元    | service_role EXECUTE           |
| ------------------------------- | --------------------------------------- | ------------- | ------------------------------ |
| `submit_breeder_application` 等 | authenticated                           | breeder JWT   | **不要**                       |
| `approve_breeder_review` 等     | authenticated                           | admin JWT     | **不要**                       |
| `approve_pet_for_publish` 等    | authenticated                           | admin JWT     | **不要**                       |
| `request_visit` 等              | authenticated                           | buyer/breeder | **不要**                       |
| `is_admin()`                    | （PUBLIC 既定）                         | RLS / RPC 内  | **不要**（Webhook から未呼出） |
| `is_publicly_listable_pet`      | anon, authenticated（`20260916100000`） | Storage RLS   | **不要**                       |

SECURITY DEFINER RPC は **関数 owner 権限**で内部 DML。PostgREST 経由の service_role から RPC を呼ぶ設計 **なし**。

### 3.6 スキーマ

| オブジェクト                   | anon / authenticated      | service_role                                                                                                                        |
| ------------------------------ | ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| `GRANT USAGE ON SCHEMA public` | **`20260914100000` 明示** | **Migration 未明示**（Supabase プラットフォーム既定で足りている想定。`stripe_webhook_events` GRANT 適用後の INSERT 成功が間接証拠） |

---

## 4. 現在の権限 vs 必要権限 vs 不足権限

### 4.1 service_role — 修正対象

| リソース                | 現在（Production 確認・Migration） | 必要（コード逆算） | 不足                               |
| ----------------------- | ---------------------------------- | ------------------ | ---------------------------------- |
| `stripe_webhook_events` | S,I,U,D（`20260917100000`）        | S,I,U,D            | **なし**（Migration 適用済みなら） |
| `breeders`              | **なし**（false/false 確認済み）   | **S, U**           | **SELECT, UPDATE**                 |

### 4.2 修正不要対象

- Phase 1 の上記 9 テーブル（buyers 〜 breeder_review_logs）— authenticated GRANT + RLS で足りる
- 全 Storage bucket — authenticated / anon policy
- 全 Phase 1 RPC — authenticated EXECUTE + SECURITY DEFINER
- Stripe Checkout / Portal — authenticated のみ

---

## 5. 既存 Migration との重複・矛盾

| Migration            | 内容                                                                                                  | 本監査との関係                                                                   |
| -------------------- | ----------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| **`20260914100000`** | authenticated / anon の Phase1 table GRANT + `stripe_webhook_events` REVOKE                           | **矛盾なし**。service_role 節は「変更なし」と記載され **GRANT 漏れの温床**だった |
| **`20260917100000`** | `stripe_webhook_events` → service_role S,I,U,D                                                        | **維持**（統合案では **再 GRANT 不要**。参照のみ）                               |
| **`20260916100000`** | `is_publicly_listable_pet` EXECUTE → anon/authenticated（**Production 適用済み・Local/Remote 一致**） | **無関係**（service_role 対象外）                                                |
| **`20260826173000`** | breeders billing trigger / stripe_webhook_events 作成                                                 | **意図（service_role only）と GRANT 実装が乖離**                                 |

**矛盾点の本質:** 設計コメント・trigger は「service_role Webhook only」だが、**table-level GRANT Migration が `stripe_webhook_events` まで届いていなかった** → 個別パッチ化。本報告は **`breeders` を含む Phase 1 service_role 正本** として整理する。

---

## 6. RLS への影響

| リソース                | RLS                          | service_role GRANT 追加の効果                                                                                                   |
| ----------------------- | ---------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| `breeders`              | 有効（own + admin policies） | service_role は **RLS bypass**。Webhook が **全 breeders 行を SELECT 可能**になるが、**サーバー Secret のみ**・ブラウザ露出なし |
| `stripe_webhook_events` | 有効・policy なし            | 同上。anon/authenticated は引き続き REVOKE                                                                                      |

**GRANT は RLS をバイパスしない（authenticated 向け）。service_role は Supabase 仕様で RLS bypass** — 既存設計どおり。

---

## 7. セキュリティ評価

| 項目                 | 評価                                                                                                          |
| -------------------- | ------------------------------------------------------------------------------------------------------------- |
| 最小権限             | `breeders` は **SELECT + UPDATE のみ**（INSERT/DELETE 不要）。`GRANT ALL` **禁止**                            |
| anon / authenticated | **追加 GRANT なし**                                                                                           |
| 鍵管理               | `SUPABASE_SERVICE_ROLE_KEY` は Vercel Server のみ。Webhook / 将来の admin クライアント化時も **サーバー限定** |
| breeders 全行 SELECT | Webhook の subscription/customer フォールバック lookup に必要。代替は RPC 化だが **Phase 1 スコープ外**       |
| billing 列 UPDATE    | trigger が **service_role 以外拒否** — table GRANT と二段防御                                                 |

**リスク許容:** Phase 1 では Stripe Webhook **1 経路のみ** service_role PostgREST を使用。範囲は **2 テーブル・計 6 権限種** に限定可能。

---

## 8. 統合 Migration 案（実施は未行い）

### 8.1 方針

- **新規 1 本**で Phase 1 service_role **table GRANT の不足分**を追加
- **`20260917100000` は削除・改変しない**（既に main / Production 適用の可能性）
- ファイル内コメントで **Phase 1 service_role 正本一覧** を明記

### 8.2 提案ファイル

| 項目             | 値                                                                                  |
| ---------------- | ----------------------------------------------------------------------------------- |
| ファイル名（案） | `supabase/migrations/20260918100000_grant_phase1_service_role_table_privileges.sql` |
| 位置             | `20260917100000` の次（`20260916100000` は Production 適用済み・Local/Remote 一致） |

### 8.3 SQL 草案

```sql
-- Migration: Phase 1 service_role table privileges (explicit minimum)
-- Runtime consumer: createAdminClient() in src/features/billing/webhook/repository.ts
-- Complements:
--   20260914100000_grant_phase1_table_privileges.sql (authenticated / anon)
--   20260917100000_grant_stripe_webhook_events_service_role.sql (stripe_webhook_events)
--
-- Phase 1 service_role PostgREST matrix (canonical):
--   public.stripe_webhook_events  → SELECT, INSERT, UPDATE, DELETE  (see 20260917100000)
--   public.breeders               → SELECT, UPDATE                    (this migration)
--
-- No GRANT ALL. No anon/authenticated grants. No RLS/policy/trigger changes.

BEGIN;

GRANT SELECT, UPDATE ON TABLE public.breeders TO service_role;

COMMIT;
```

**`stripe_webhook_events` を同一ファイルに含めない理由:** 既存 `20260917100000` と重複するが **idempotent ではある**ものの、適用履歴を分けた方が Production 追跡が容易。

**将来:** greenfield 向け README / 権限設計 doc に上記 **2 テーブル matrix** を正本として追記推奨。

---

## 9. 新規 Supabase Project（Migration のみ）での再現性

| 手順                                                      | 期待結果（現状）                     | GRANT 統合後 |
| --------------------------------------------------------- | ------------------------------------ | ------------ |
| 空 DB に全 Migration 適用                                 | authenticated は Phase1 GRANT 済     | 同左         |
| `service_role` + PostgREST INSERT `stripe_webhook_events` | **`20260917100000` までなら OK**     | OK           |
| `service_role` + SELECT `breeders`                        | **42501 / null → breeder_not_found** | **OK**       |
| `service_role` + UPDATE `breeders` billing 列             | **42501**                            | **OK**       |
| Checkout / admin / Storage                                | authenticated — **影響なし**         | 同左         |

**結論:** 現状は **「Migration のみの新規 Project」で必ず再現する欠陥** がある。統合 Migration 適用で **再現可能な正しい設計** にできる。

---

## 10. 回帰防止テスト案

### 10.1 新規スクリプト（案）

| 項目             | 内容                                          |
| ---------------- | --------------------------------------------- |
| ファイル（案）   | `scripts/test-phase1-service-role-grants.mts` |
| npm script（案） | `test:phase1-service-role-grants`             |
| 依存             | **DB 不要**（静的）+ 任意 Live                |

### 10.2 静的チェック（Migration のみで PASS 可能）

| #   | チェック                                                                            |
| --- | ----------------------------------------------------------------------------------- |
| S1  | `20260918100000`（または統合ファイル）が存在                                        |
| S2  | `GRANT SELECT, UPDATE ON TABLE public.breeders TO service_role`                     |
| S3  | `GRANT ALL` / `TO anon` / `TO authenticated` が **含まれない**                      |
| S4  | `CREATE POLICY` / RLS 変更が **含まれない**                                         |
| S5  | `20260917100000` が `stripe_webhook_events` S,I,U,D を GRANT                        |
| S6  | `webhook/repository.ts` が `breeders` で SELECT + UPDATE のみ（INSERT/DELETE なし） |
| S7  | `src/` に `createAdminClient` が **webhook repository のみ**                        |

### 10.3 Live チェック（空 DB + Migration 適用後）

**前提:** `supabase db reset` または CI ephemeral DB + `SUPABASE_SERVICE_ROLE_KEY`

| #   | 操作                                                                          | 期待                                          |
| --- | ----------------------------------------------------------------------------- | --------------------------------------------- |
| L1  | `has_table_privilege('service_role','public.breeders','SELECT')`              | **true**                                      |
| L2  | `has_table_privilege('service_role','public.breeders','UPDATE')`              | **true**                                      |
| L3  | `has_table_privilege('service_role','public.breeders','INSERT')`              | **false**                                     |
| L4  | `has_table_privilege('service_role','public.stripe_webhook_events','INSERT')` | **true**                                      |
| L5  | service_role client: `stripe_webhook_events` INSERT → DELETE（claim 相当）    | **成功**                                      |
| L6  | service_role client: 既存 breeder 行 SELECT by id                             | **成功**（テスト用行が必要）                  |
| L7  | service_role client: billing 列 UPDATE → 元に戻す                             | **成功**（`test-stripe-step1` check 10 相当） |
| L8  | authenticated client: `stripe_webhook_events` INSERT                          | **42501**                                     |

### 10.4 既存テストとの統合

| 既存                                   | 追加連携                                      |
| -------------------------------------- | --------------------------------------------- |
| `test:migration-order`                 | 36 本目 / service_role migration 存在チェック |
| `test:stripe-webhook-events-grant`     | 維持（stripe テーブル専用）                   |
| `test:stripe-step1-billing-protection` | L6–L7 と重複 — Live では **継続実行**         |
| `test:stripe-step4-webhook`            | check 40–41（claim DB）— **継続**             |

### 10.5 CI 推奨

| ジョブ | 内容                                |
| ------ | ----------------------------------- |
| 必須   | 静的 S1–S7 + `test:migration-order` |
| 任意   | Supabase local job で L1–L8         |

---

## 11. Production 適用前の確認方法

1. **linked project が Production** であることを三重確認（`linked-project.json` / `projects list` / `migration list`）
2. **dry-run:** `npx supabase db push --dry-run` → 適用対象が **`20260918100000` のみ**（+ 未適用の `20260917100000` があればそれも）
3. **現状 privilege（read-only）:**

```sql
SELECT has_table_privilege('service_role', 'public.breeders', 'SELECT') AS breeders_sel,
       has_table_privilege('service_role', 'public.breeders', 'UPDATE') AS breeders_upd,
       has_table_privilege('service_role', 'public.stripe_webhook_events', 'INSERT') AS swe_ins;
```

4. **期待（適用前）:** `breeders_sel/upd = false`（ユーザー確認済み）。`swe_ins = true`（`20260917100000` 適用済みなら）

---

## 12. 適用後の検証方法

| #   | 検証                                                    | 期待                                                                  |
| --- | ------------------------------------------------------- | --------------------------------------------------------------------- |
| 1   | §11 SQL 再実行                                          | `breeders_sel/upd = **true**`                                         |
| 2   | `npm run test:phase1-service-role-grants`（作成後）     | 静的 **ALL PASS**                                                     |
| 3   | Stripe Dashboard: `checkout.session.completed` **再送** | Vercel **200**、`breeder lookup` エラー **なし**                      |
| 4   | `stripe_webhook_events`                                 | claim → finalize（`processed_at` 更新）                               |
| 5   | `breeders`                                              | `membership_status` / `stripe_*` 列が Webhook 後に更新                |
| 6   | 回帰                                                    | Checkout / Portal / admin 審査 — **従来どおり**（authenticated 経路） |

---

## 13. 修正対象 / 修正不要 — サマリー

| 区分                 | 対象                                                                       |
| -------------------- | -------------------------------------------------------------------------- |
| **修正対象**         | `public.breeders` → service_role **SELECT, UPDATE**（統合 Migration 1 本） |
| **修正済み（維持）** | `public.stripe_webhook_events` → service_role S,I,U,D（`20260917100000`）  |
| **修正不要**         | その他全 Phase 1 テーブル、Storage、RPC、Checkout、Portal、admin           |

---

## 14. 本作業で行っていないこと

- Production `db push`
- Migration ファイルの repo 追加 / commit / push
- アプリケーションコード変更
- Stripe / Vercel 設定変更
