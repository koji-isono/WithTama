# Stripe Webhook service_role 権限不足 修正報告

| 項目   | 内容                                                                             |
| ------ | -------------------------------------------------------------------------------- |
| 作業日 | 2026-09-17                                                                       |
| 種別   | **原因特定 + Migration 草案**（Production DB 未適用 / commit / push **未実施**） |
| 症状   | Production Webhook `500` — `stage: webhook event insert`, `postgrestCode: 42501` |

**機密:** Secret Key / Webhook Secret / Session ID / Customer ID 実値は記載しない。

**関連:**

- [Production Stripe Webhook 500 診断ログ追加報告](./2026-09-17_Production_StripeWebhook500_診断ログ追加報告.md)
- [Production DB 権限修正 本番適用報告](./2026-09-14_Production_DB権限修正_本番適用報告.md)
- [権限設計 README § stripe_webhook_events](../07_権限設計/README.md)

---

## 1. なぜ Production で 42501 になったか

### 1.1 観測

| 項目                 | 内容                                                       |
| -------------------- | ---------------------------------------------------------- |
| Vercel Logs          | `stage: webhook event insert`                              |
| PostgREST / Supabase | `postgrestCode: 42501`（permission denied）                |
| HTTP                 | `/api/webhooks/stripe` → **500**                           |
| Stripe 側            | Checkout 決済は成功、`checkout.session.completed` 送信済み |

診断ログにより、**署名検証は通過**し、**`stripe_webhook_events` への claim INSERT** で初回失敗していると判断。

### 1.2 根本原因

PostgreSQL の **table-level GRANT 不足**（`service_role` に `stripe_webhook_events` への DML 権限がない）。

| レイヤー  | 状態                                                                                                      |
| --------- | --------------------------------------------------------------------------------------------------------- |
| **RLS**   | 有効・policy なし（anon/authenticated は行拒否、`service_role` は bypass 可）                             |
| **GRANT** | `20260914100000` で anon/authenticated を **REVOKE** 済みだが、**`service_role` への GRANT が一度も無い** |

`20260826173000_stripe_step1_billing_columns_and_protection.sql` はテーブル作成 + RLS 有効化のみで、コメントに「service_role only」とあるが **GRANT 文を含まない**。

`20260914100000_grant_phase1_table_privileges.sql` は Phase1 テーブル向けに **authenticated / anon** の GRANT を追加し、`stripe_webhook_events` については **REVOKE のみ**実施。Production 本番適用報告（2026-09-14）でも anon/authenticated が **false** であることのみ確認し、**service_role の privilege は未確認**だった。

### 1.3 設計とのギャップ

[権限設計 README](../07_権限設計/README.md) では `service_role` に SELECT/INSERT/UPDATE/DELETE **✅** と記載されているが、Migration 上は **意図のみで GRANT が未実装**だった。

### 1.4 DEV で顕在化しにくかった理由

[Production DB 権限エラー調査報告](./2026-09-14_Production_DB権限エラー調査報告.md) と同型:

- ローカル `supabase start` や既存 Hosted DEV では default privilege 等により `service_role` が動くことがある
- **新規 Production（空 DB + Migration のみ）** では SQL Migration で作成したテーブルに **明示 GRANT が無ければ 42501**

---

## 2. Webhook が `stripe_webhook_events` に対して必要とする操作

`src/features/billing/webhook/repository.ts`（**課金ロジック変更なし** — 調査のみ）:

| 処理段階           | 関数                          | PostgREST 操作 | 用途                                    |
| ------------------ | ----------------------------- | -------------- | --------------------------------------- |
| claim（初回）      | `insertWebhookClaim`          | **INSERT**     | イベント ID で排他 claim                |
| 重複判定           | `fetchWebhookEventTimestamps` | **SELECT**     | `created_at` / `processed_at` 比較      |
| 失敗時リトライ解放 | `releaseWebhookEventClaim`    | **DELETE**     | 未 finalize 行削除（Stripe 再送可能に） |
| 成功時 finalize    | `finalizeWebhookEvent`        | **UPDATE**     | `processed_at` を完了時刻に更新         |

**結論:** **INSERT のみでは不十分。** claim / 重複判定 / release / finalize のため **SELECT, INSERT, UPDATE, DELETE の 4 権限**が必要。

---

## 3. 修正内容（Migration 草案）

### 3.1 新規 Migration

| 項目     | 値                                                                                |
| -------- | --------------------------------------------------------------------------------- |
| ファイル | `supabase/migrations/20260917100000_grant_stripe_webhook_events_service_role.sql` |
| 位置     | **36 本目**（`20260916100000` の次）                                              |

```sql
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.stripe_webhook_events TO service_role;
```

### 3.2 付与する具体的な権限

| ロール          | SELECT | INSERT | UPDATE | DELETE | TRUNCATE | REFERENCES | TRIGGER |
| --------------- | ------ | ------ | ------ | ------ | -------- | ---------- | ------- |
| `service_role`  | **✅** | **✅** | **✅** | **✅** | ❌       | ❌         | ❌      |
| `authenticated` | ❌     | ❌     | ❌     | ❌     | ❌       | ❌         | ❌      |
| `anon`          | ❌     | ❌     | ❌     | ❌     | ❌       | ❌         | ❌      |

- **`GRANT ALL` は使用しない**（TRUNCATE 等を含めない）
- **RLS policy の追加・変更なし**
- **テーブル定義・課金 trigger 変更なし**

### 3.3 既存 Migration との重複・矛盾

| Migration        | 関係                                                                        |
| ---------------- | --------------------------------------------------------------------------- |
| `20260826173000` | テーブル作成 + RLS。本修正は **補完**（矛盾なし）                           |
| `20260914100000` | anon/authenticated REVOKE。**本修正は service_role GRANT のみ**（矛盾なし） |
| `20260916100000` | 別テーブル/関数（`is_publicly_listable_pet`）。無関係                       |

### 3.4 付帯変更（テストのみ・課金ロジック外）

| ファイル                                       | 内容                                    |
| ---------------------------------------------- | --------------------------------------- |
| `scripts/test-stripe-webhook-events-grant.mts` | Migration 静的検証（新規）              |
| `scripts/test-migration-order.mts`             | 期待 Migration 数 36、末尾ファイル検証  |
| `package.json`                                 | `test:stripe-webhook-events-grant` 追加 |

---

## 4. RLS への影響

| 項目           | 内容                                                               |
| -------------- | ------------------------------------------------------------------ |
| RLS            | **変更なし**（引き続き有効）                                       |
| policy         | **0 件のまま**（anon/authenticated は行レベルでも拒否）            |
| `service_role` | RLS **bypass**（Supabase 標準）。今回の修正は **table GRANT** のみ |
| `REVOKE`       | `20260914100000` の anon/authenticated REVOKE **維持**             |

GRANT は「テーブルに触れるか」、RLS は「どの行か」。両方が揃って初めて Webhook repository が動作する。

---

## 5. セキュリティ上問題がないか

| 観点         | 評価                                                                                   |
| ------------ | -------------------------------------------------------------------------------------- |
| 付与先       | **`service_role` のみ**（Vercel サーバー env の `SUPABASE_SERVICE_ROLE_KEY` のみ使用） |
| ブラウザ露出 | anon/authenticated には **付与しない** → クライアント JWT からは引き続き不可           |
| 保存データ   | event ID / event type / timestamp のみ（**payload 非保存** — Decision No.148）         |
| 権限範囲     | 当該テーブルへの **DML 4 種のみ**（TRUNCATE 等なし）                                   |
| 他テーブル   | **影響なし**（`breeders` 更新は別経路。本障害は insert 段階で停止）                    |

**問題なし。** 設計どおり service_role 専用テーブルへの最小 DML 付与。

---

## 6. ローカル検証結果

| コマンド                                   | 結果           |
| ------------------------------------------ | -------------- |
| `npm run lint`                             | **PASS**       |
| `npm run typecheck`                        | **PASS**       |
| `npm run build`                            | **PASS**       |
| `npm run test:migration-order`             | **14/14 PASS** |
| `npm run test:stripe-webhook-events-grant` | **10/10 PASS** |
| `npm run test:stripe-step4-webhook`        | **54/54 PASS** |

**Production DB への `db push`:** **未実施**（本報告書時点）

---

## 7. Production 適用手順（未実施 — 参考）

1. **接続先確認:** `supabase link --project-ref <Production ref>`、linked project が Production であることを三重確認
2. **Migration 状態:** `npx supabase migration list` — local 36 本、remote 35 本（`20260917100000` 未適用）であることを確認
3. **dry-run:** `npx supabase db push --dry-run` — **当該 1 本のみ**適用予定であること
4. **適用:** `npx supabase db push`
5. **事後確認 SQL（read-only）:**

```sql
SELECT grantee, privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
  AND table_name = 'stripe_webhook_events'
  AND grantee = 'service_role'
ORDER BY privilege_type;
```

期待: `DELETE`, `INSERT`, `SELECT`, `UPDATE` の **4 行**。

```sql
SELECT has_table_privilege('service_role', 'public.stripe_webhook_events', 'INSERT') AS can_insert;
```

期待: **`true`**

6. **anon/authenticated が引き続き false** であることも確認（Regression 防止）

---

## 8. Webhook 再送による復旧確認手順（未実施 — 参考）

Migration 適用 **後**:

1. Stripe Dashboard → Developers → Webhooks → Production endpoint
2. 失敗した `checkout.session.completed` を **Resend**（または新規 Checkout で再決済）
3. **期待 HTTP:** `/api/webhooks/stripe` → **200** `{"received":true}`
4. **Vercel Logs:** `[webhooks/stripe] processing failed` **が出ない**こと
5. **Supabase（read-only）:** `stripe_webhook_events` に該当 `stripe_event_id` が存在し、`processed_at > created_at`（finalize 済み）
6. **アプリ:** 対象ブリーダーの `membership_status` が **active** に更新（BR-13 / ダッシュボード）

**次段階で別エラー（例: `subscription update` / `billing status update`）が出た場合**は、別要因（`STRIPE_BREEDER_PRODUCT_ID`、`breeders` 更新権限等）を診断ログ `stage` で切り分け。

---

## 9. 次のアクション

| #   | アクション              | 状態       |
| --- | ----------------------- | ---------- |
| 1   | 本変更の commit / push  | **未実施** |
| 2   | Production `db push`    | **未実施** |
| 3   | Webhook 再送 + 復旧確認 | **未実施** |
