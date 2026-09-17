# Production Stripe 本番課金 Webhook 正常化 完了報告

| 項目   | 内容                                                        |
| ------ | ----------------------------------------------------------- |
| 作業日 | 2026-09-17                                                  |
| 種別   | **Production 障害解消・本番課金 E2E 完了**                  |
| 対象   | Stripe Webhook / BR-13 月額会費 / Phase 1 service_role 権限 |

**機密:** Secret Key / Webhook Secret / Session ID / Customer ID / メール等の **実値は記載しない**。

**関連:**

- [Stripe Webhook service_role 権限不足 修正報告](./2026-09-17_StripeWebhook_service_role権限不足_修正報告.md)
- [Production Stripe Webhook breeder lookup 失敗 調査報告](./2026-09-17_Production_StripeWebhook_breeder_lookup失敗_調査報告.md)
- [service_role 全体監査報告](./2026-09-17_Production_service_role権限全体監査_報告.md)
- [Phase 1 service_role 権限統合 Migration 実装報告](./2026-09-17_Phase1_service_role権限統合Migration_実装報告.md)

---

## 1. 結論

| 項目                                                     | 結果                                                   |
| -------------------------------------------------------- | ------------------------------------------------------ |
| **Production 本番課金 E2E**                              | **完了**                                               |
| Stripe Webhook（既存 `checkout.session.completed` 再送） | **HTTP 200** / `{"received": true}`                    |
| BR-13 会員ステータス                                     | **利用中**                                             |
| 次回更新予定日                                           | **2026年10月17日**                                     |
| 月額表示                                                 | **5,000円（税抜）**                                    |
| Customer Portal 導線                                     | **「支払い方法を確認・変更」ボタン表示確認**           |
| 新規 Stripe 決済                                         | **実施していない**（既存 Session の Webhook 再送のみ） |

---

## 2. 障害原因と修正経緯（簡潔）

| #   | 段階                | 内容                                                                                                 |
| --- | ------------------- | ---------------------------------------------------------------------------------------------------- |
| 1   | **症状**            | Production Checkout 成功後、`checkout.session.completed` Webhook が **500**                          |
| 2   | **原因 1**          | `public.stripe_webhook_events` — **service_role の table-level GRANT 不足**（42501 on claim INSERT） |
| 3   | **修正 1**          | Migration `20260917100000` — `GRANT SELECT, INSERT, UPDATE, DELETE` → service_role                   |
| 4   | **原因 2**          | 修正 1 適用・再送後 — `public.breeders` — **service_role SELECT/UPDATE 不足**（breeder lookup 失敗） |
| 5   | **監査**            | Phase 1 全体の service_role 利用箇所を棚卸し → **Webhook のみ**が `createAdminClient()` 使用と確定   |
| 6   | **修正 2**          | Migration `20260918100000` — `GRANT SELECT, UPDATE ON public.breeders TO service_role`（最小権限）   |
| 7   | **Production 適用** | `20260918100000` を Production DB に適用                                                             |
| 8   | **権限確認**        | `has_table_privilege('service_role', 'public.breeders', 'SELECT')` = **true** / UPDATE = **true**    |
| 9   | **Webhook 再送**    | 既存 `checkout.session.completed` → **200** / `received: true`                                       |
| 10  | **UI 確認**         | BR-13 → **利用中**、次回更新予定日・税抜価格・Portal ボタン表示                                      |

**根本原因の型:** 新規 Production（Migration のみ構築）では **RLS bypass する service_role でも table-level GRANT が明示されていないと 42501**。`20260914100000` は authenticated/anon のみ付与し、service_role は「意図のみ」だった。

---

## 3. 適用した Production Migration

| Migration                                                       | 内容                                           | Git commit |
| --------------------------------------------------------------- | ---------------------------------------------- | ---------- |
| `20260917100000_grant_stripe_webhook_events_service_role.sql`   | `stripe_webhook_events` → service_role S,I,U,D | `84cb579`  |
| `20260918100000_grant_phase1_service_role_table_privileges.sql` | `breeders` → service_role S,U                  | `64a55bd`  |

---

## 4. Production Migration Local / Remote 一致（最終確認）

**実行:** `npx supabase migration list`（2026-09-17）

| 項目           | 結果                                                |
| -------------- | --------------------------------------------------- |
| 接続先         | **Production**（linked project）                    |
| Local / Remote | **全 Migration 一致**（不一致行 **なし**）          |
| 件数           | **37**（`001` + timestamped **36** 本）             |
| 最終 Migration | `20260918100000` — Local **あり** / Remote **あり** |

**末尾 3 本（確認）:**

| Local            | Remote           |
| ---------------- | ---------------- |
| `20260916100000` | `20260916100000` |
| `20260917100000` | `20260917100000` |
| `20260918100000` | `20260918100000` |

**Production DB への追加変更:** 本作業では **実施していない**（list 確認のみ）。

---

## 5. Webhook 再送結果

| 項目              | 結果                                                      |
| ----------------- | --------------------------------------------------------- |
| イベント種別      | `checkout.session.completed`（**既存 Checkout Session**） |
| HTTP ステータス   | **200**                                                   |
| レスポンス body   | `{"received": true}`                                      |
| 新規決済          | **未実施**                                                |
| 追加 Webhook 再送 | **未実施**（本作業）                                      |

---

## 6. BR-13（月額会費）UI 確認

| 表示項目        | 確認結果                                 |
| --------------- | ---------------------------------------- |
| 会員ステータス  | **利用中**                               |
| 次回更新予定日  | **2026年10月17日**                       |
| 月額会費        | **5,000円（税抜）**                      |
| Customer Portal | **「支払い方法を確認・変更」ボタン表示** |

---

## 7. Git / CI（本報告書）

| 項目                  | 値                                                                                                                                                                |
| --------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **report commit SHA** | **`525cca5`**（`525cca596c1fbd56fb7faa44b12dc2517b821829`）                                                                                                       |
| **final HEAD**        | **`f7ed633`**（`f7ed6332e7d7592d421029806655a76ffdc54685`）                                                                                                       |
| **GitHub Actions**    | [#113 success](https://github.com/koji-isono/WithTama/actions/runs/35178914687) / [#114 success](https://github.com/koji-isono/WithTama/actions/runs/35179076889) |
| push range            | `64a55bd..525cca5` → `525cca5..f7ed633` → **成功**                                                                                                                |

**関連 feature commit:** `84cb579`（stripe_webhook_events GRANT）/ `64a55bd`（breeders GRANT）

---

## 8. 本作業で行っていないこと

- Production DB への Migration **追加適用**（list 確認のみ）
- 新規 Stripe Checkout / 決済
- Webhook の追加再送
