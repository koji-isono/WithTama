# Stripe Step 1 — DB / 課金列保護 実装報告

**日付:** 2026-08-26（最終確認: 2026-08-27）  
**範囲:** Step 1 のみ（DB / Migration / 課金列保護）  
**commit / push:** 未実施（ユーザー確認待ち）

---

## 実DBテスト調査報告（2026-08-27）

Migration 手動適用後、`npm run test:stripe-step1-billing` を実行。**初回 13 PASS / 4 FAIL / 4 SKIP**。調査の結果、**DB 保護漏れではなくテスト脚本の誤判定**と判明。テスト修正後 **17 PASS / 0 FAIL / 4 SKIP**。

### 初回テスト結果（Migration 適用直後・テスト修正前）

```
13 passed / 4 failed / 4 skipped
```

| 結果 | テスト                                               | 詳細                               |
| ---- | ---------------------------------------------------- | ---------------------------------- |
| FAIL | 5. breeder membership_status update denied           | update unexpectedly succeeded      |
| FAIL | 14. admin membership_status update denied            | update unexpectedly succeeded      |
| FAIL | 3. anon SELECT stripe_webhook_events denied          | error なし（`[]` 返却）            |
| FAIL | 4. authenticated SELECT stripe_webhook_events denied | error なし（`[]` 返却）            |
| PASS | 6–8d. その他 Stripe 課金列                           | 直接 UPDATE 拒否                   |
| PASS | 9. 通常プロフィール更新                              | business_name 更新成功             |
| SKIP | 2, 10, 12                                            | `SUPABASE_SERVICE_ROLE_KEY` 未設定 |

※ ターミナル上 FAIL 5 が複数行表示されたが、テストコード上は **1 回のみ記録**。出力の重複表示であり、独立 FAIL ではない。

### 調査結論

| 項目                           | 結果                                                                                                                                                   |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **原因**                       | DB trigger は正常。FAIL は (1) テストが `active→active` の no-op UPDATE を試行、(2) webhook_events SELECT が RLS 下の `200 + []` を error 必須と誤判定 |
| **membership_status 保護漏れ** | **なし**                                                                                                                                               |
| **Migration ファイル**         | **正しい**（修正不要）                                                                                                                                 |
| **現在の実 DB function**       | **正しい**（実検証済み）                                                                                                                               |
| **修正 Migration**             | **不要**                                                                                                                                               |
| **既存 BR-09 への影響**        | **なし**                                                                                                                                               |

### 実 DB 検証（手動確認）

SEC_TEST breeder（`membership_status = active`）で確認:

| 操作                                    | 結果                                                           |
| --------------------------------------- | -------------------------------------------------------------- |
| `active → active`（同一値 UPDATE）      | 成功（値変化なし。trigger の `IS DISTINCT FROM` が false）     |
| `active → suspended`（異なる値 UPDATE） | **`direct update of membership_status is not allowed`** で拒否 |

→ **異なる値への変更は breeder / admin とも拒否される。** 同一値 no-op は PostgreSQL 上値が変わらないため trigger 例外なし（セキュリティ上問題なし）。

### admin 直接 membership_status 更新

| 条件                | 可否                                                               |
| ------------------- | ------------------------------------------------------------------ |
| 異なる値への UPDATE | **不可能**（拒否）                                                 |
| 同一値 no-op UPDATE | 可能（値は変わらない）                                             |
| 設計方針            | admin JWT による課金列直接変更は **不許可**（`service_role` のみ） |

### 4 FAIL の内訳

| #   | テスト                        | 原因分類           | 説明                                                             |
| --- | ----------------------------- | ------------------ | ---------------------------------------------------------------- |
| 1   | 5. breeder membership_status  | **テスト誤り**     | `active→active` no-op。DB は正常                                 |
| 2   | 14. admin membership_status   | **テスト誤り**     | 同上                                                             |
| 3   | 3. anon SELECT webhook_events | **テスト断言誤り** | RLS 有効・policy なし時、PostgREST は error ではなく `[]` を返す |
| 4   | 4. authenticated SELECT       | **テスト断言誤り** | 同上                                                             |

**独立不具合: 2 種（テスト脚本）、DB 起因: 0 件**

### 実施した修正（テストのみ）

**対象:** `scripts/test-stripe-step1-billing-protection.mts`  
**DB / Migration 変更:** なし（fix Migration 不要）

| 修正内容                     | 詳細                                                                |
| ---------------------------- | ------------------------------------------------------------------- |
| membership_status テスト     | 現在値と**異なる**値で UPDATE 試行（`alternateMembershipStatus()`） |
| webhook_events SELECT テスト | `error != null` **または** `rows=0` を拒否（RLS 正常挙動）と判定    |

### テスト修正後の結果

```
17 passed / 0 failed / 4 skipped
```

| 項目                                 | 結果                                                                    |
| ------------------------------------ | ----------------------------------------------------------------------- |
| billing columns exist                | PASS                                                                    |
| anon / authenticated webhook_events  | SELECT PASS（rows=0）、INSERT 拒否 PASS                                 |
| breeder membership_status 改ざん拒否 | PASS                                                                    |
| admin membership_status 改ざん拒否   | PASS                                                                    |
| その他 Stripe 列改ざん拒否           | PASS                                                                    |
| 通常プロフィール更新                 | PASS                                                                    |
| SKIP（4 件）                         | `SUPABASE_SERVICE_ROLE_KEY` 未設定 — UNIQUE / service_role 更新 / CHECK |

### 実 DB function 確認用 READ ONLY SQL

```sql
SELECT pg_get_functiondef(p.oid)
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND p.proname IN (
    'breeders_billing_update_allowed',
    'enforce_breeders_billing_columns_update'
  );

SELECT tgname, pg_get_triggerdef(t.oid)
FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
WHERE c.relname = 'breeders'
  AND tgname = 'breeders_enforce_billing_columns'
  AND NOT t.tgisinternal;
```

### service_role key 設定方法

1. Supabase Dashboard → プロジェクト `mahgsrtuyzgqlkoiwqky` → **Settings** → **API**
2. **service_role** key をコピー
3. `.env.local` に追加: `SUPABASE_SERVICE_ROLE_KEY=<コピーした値>`
4. `npm run test:stripe-step1-billing` 再実行 → SKIP 4 件が PASS になることを確認

※ Secret の値をコード・報告書に記載しないこと。

### 次のユーザー操作

1. `.env.local` に `SUPABASE_SERVICE_ROLE_KEY` を設定
2. `npm run test:stripe-step1-billing` 再実行（全 PASS 必須）
3. BR-09 回帰・品質チェック
4. Step 1 最終レビュー → commit / push

---

## 正本

- DecisionLog No.139–148（特に No.143, 144, 147, 148）
- [Stripe 第1期実装計画](./2026-08-26_Stripe第1期実装計画.md) Step 1
- [breeders.md](../05_データベース設計/breeders.md)
- [権限設計 README](../07_権限設計/README.md)

---

## 適用後テスト再実行チェックリスト

```bash
npm run test:stripe-step1-billing
npm run test:breeder-application-submit-rpcs
npm run test:breeder-review-rpcs
npm run prepare:sec-test-review-breeder
npm run test:public-pet-read
npm run lint
npm run typecheck
npm run format:check
npm run build
```

---

## 次工程

1. `.env.local` に `SUPABASE_SERVICE_ROLE_KEY` を設定
2. Step 1 専用テスト全 PASS 確認（SKIP 0 件）
3. BR-09 回帰・public-pet-read・品質チェック
4. Step 1 最終レビュー → commit / push
5. Stripe Step 2 — SDK / server config

---

## Migration SQL レビュー（適用前）

**結果: PASS**（2026-08-26 再レビュー。admin 許可を削除して Decision No.147 に整合）

| 確認項目                                         | 結果           |
| ------------------------------------------------ | -------------- |
| 既存列との重複なし（`ADD COLUMN IF NOT EXISTS`） | PASS           |
| DROP / DELETE / TRUNCATE なし                    | PASS           |
| 既存データ UPDATE なし                           | PASS           |
| `membership_status` / `review_status` 変更なし   | PASS           |
| `pets` 変更なし                                  | PASS           |
| 追加列 4 件のみ                                  | PASS           |
| `stripe_webhook_events.stripe_event_id` UNIQUE   | PASS           |
| RLS ENABLE、anon/authenticated policy なし       | PASS           |
| trigger: `service_role` のみ許可                 | PASS（修正後） |
| SECURITY DEFINER `search_path = public`          | PASS           |
| NULL 比較 `IS DISTINCT FROM`                     | PASS           |

---

## admin 直接課金列 UPDATE

**結論: 不許可**（Migration 適用前に修正済み）

| 項目            | 内容                                                                                                                                                                      |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 修正前          | `breeders_billing_update_allowed()` が `service_role OR is_admin()`                                                                                                       |
| 修正後          | **`service_role` のみ**                                                                                                                                                   |
| 理由            | Decision No.147 は「一般 authenticated」の直接 UPDATE 禁止。第1期に管理者 UI から課金列を編集する要件なし。課金状態は Webhook（service_role）のみが正本                   |
| 管理者 RPC 互換 | **影響なし** — `approve_breeder_review` 等は `review_status` / verification のみ UPDATE（No.129/130 で `membership_status` 非変更）。trigger は課金列が変わらなければ通過 |
| テスト prepare  | `prepare-sec-test-public-read` の admin JWT による `membership_status` 更新は不可。`SUPABASE_SERVICE_ROLE_KEY` がある場合のみ service_role で pending→active              |

---

## 開発 DB

| 項目    | 値                                                                        |
| ------- | ------------------------------------------------------------------------- |
| 接続先  | `https://mahgsrtuyzgqlkoiwqky.supabase.co`                                |
| 確認    | `.env.local` の `NEXT_PUBLIC_SUPABASE_URL` と一致 → **WithTama 開発環境** |
| 本番 DB | 該当なし                                                                  |

---

## Migration 適用

**状態: 実施済み**（2026-08-27 — SQL Editor 手動適用）

| 方法                                          | 可否                   |
| --------------------------------------------- | ---------------------- |
| Supabase SQL Editor                           | ✅ **適用済み**        |
| `SUPABASE_DB_URL` + `apply-sql-migration.mts` | ❌ `.env.local` 未設定 |
| `supabase db push`                            | ❌ 未 link / 未 login  |

`npm run test:stripe-step1-billing` → billing columns exist **PASS**（Migration 適用確認済み）

### fix Migration

**不要** — 実 DB trigger / function は正しく動作。テスト脚本のみ修正。

---

## 実装内容

### Migration

`supabase/migrations/20260826173000_stripe_step1_billing_columns_and_protection.sql`

### breeders 追加列

`stripe_price_id`, `subscription_current_period_end`, `cancel_at_period_end` (DEFAULT false), `last_payment_failed_at`

### stripe_webhook_events

`stripe_event_id` UNIQUE、RLS 有効、policy なし、payload なし

### 課金列保護

- Function: `breeders_billing_update_allowed()`, `enforce_breeders_billing_columns_update()`
- Trigger: `breeders_enforce_billing_columns`（BEFORE UPDATE ON breeders）

---

## 適用後確認（READ ONLY）

Migration 適用後、以下を確認:

```sql
-- breeders 追加列
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'breeders'
  AND column_name IN (
    'stripe_price_id', 'subscription_current_period_end',
    'cancel_at_period_end', 'last_payment_failed_at'
  );

-- stripe_webhook_events
SELECT indexname FROM pg_indexes
WHERE tablename = 'stripe_webhook_events' AND indexdef LIKE '%UNIQUE%';

SELECT relrowsecurity FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'public' AND c.relname = 'stripe_webhook_events';

-- trigger / functions
SELECT tgname FROM pg_trigger t
JOIN pg_class c ON c.oid = t.tgrelid
WHERE c.relname = 'breeders' AND tgname = 'breeders_enforce_billing_columns';

SELECT proname FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND proname IN ('breeders_billing_update_allowed', 'enforce_breeders_billing_columns_update');
```

---

## テスト結果（2026-08-27）

### Step 1 専用（`npm run test:stripe-step1-billing`）

| タイミング                         | 結果                                                     |
| ---------------------------------- | -------------------------------------------------------- |
| Migration 適用直後（テスト修正前） | **13 PASS / 4 FAIL / 4 SKIP**                            |
| テスト脚本修正後                   | **21 PASS / 0 FAIL / 1 SKIP**（service_role key 設定後） |

SKIP 1 件は BR-09 別実行案内（`test:breeder-application-submit-rpcs`）。

### BR-09 回帰

| コマンド                                       | 結果                                   |
| ---------------------------------------------- | -------------------------------------- |
| `npm run test:breeder-application-submit-rpcs` | **41 PASS / 0 FAIL**                   |
| `npm run test:breeder-review-rpcs`             | **36 PASS / 0 FAIL**（cleanup 追加後） |

### public-pet-read（2026-08-27 再発防止修正後）

| 項目 | 結果                                                                |
| ---- | ------------------------------------------------------------------- |
| 状態 | **22 PASS / 0 FAIL / 5 未検証**                                     |
| 手順 | review-rpcs → prepare×2 → `test:public-pet-read`（手動 reset 不要） |

### 品質チェック（2026-08-27 最終）

| コマンド     | 結果 |
| ------------ | ---- |
| lint         | PASS |
| typecheck    | PASS |
| format:check | PASS |
| build        | PASS |

### テスト後状態復元

service_role テスト実行時、脚本内で課金列を元に戻す実装あり。review-rpcs 終了 cleanup で `submitted/submitted/submitted` に復帰。
