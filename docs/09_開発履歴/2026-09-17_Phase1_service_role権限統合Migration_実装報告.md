# Phase 1 service_role 権限統合 Migration 実装報告

| 項目   | 内容                                                                                  |
| ------ | ------------------------------------------------------------------------------------- |
| 作業日 | 2026-09-17                                                                            |
| 種別   | **Migration 草案 + 静的テスト**（Production DB 未適用 / commit / push **未実施**）    |
| 背景   | [service_role 全体監査報告](./2026-09-17_Production_service_role権限全体監査_報告.md) |

**機密:** Secret / Key / 実 ID / メールは記載しない。

---

## 1. 実装概要

| 項目         | 内容                                                                                                                         |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------- |
| 対象テーブル | `public.breeders`                                                                                                            |
| 付与権限     | **SELECT, UPDATE** のみ（`service_role`）                                                                                    |
| 禁止事項遵守 | `GRANT ALL` なし / INSERT・DELETE なし / anon・authenticated 追加なし / RLS・Policy・Trigger 変更なし / 課金ロジック変更なし |

---

## 2. 新規 Migration

| 項目           | 値                                                                                |
| -------------- | --------------------------------------------------------------------------------- |
| **ファイル名** | `20260918100000_grant_phase1_service_role_table_privileges.sql`                   |
| **順序**       | **36 本目**（`20260917100000_grant_stripe_webhook_events_service_role.sql` の次） |

```sql
GRANT SELECT, UPDATE ON TABLE public.breeders TO service_role;
```

### Phase 1 service_role PostgREST 正本（Migration 分散）

| テーブル                | 権限       | Migration                      |
| ----------------------- | ---------- | ------------------------------ |
| `stripe_webhook_events` | S, I, U, D | `20260917100000`（既存・維持） |
| `breeders`              | S, U       | **`20260918100000`（本作業）** |

---

## 3. 変更ファイル

| ファイル                                                                            | 種別                                                                |
| ----------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| `supabase/migrations/20260918100000_grant_phase1_service_role_table_privileges.sql` | 新規 Migration                                                      |
| `scripts/test-phase1-service-role-grants.mts`                                       | 新規静的検証テスト                                                  |
| `scripts/test-migration-order.mts`                                                  | 36 本目・最終 Migration 検証追加                                    |
| `package.json`                                                                      | `test:phase1-service-role-grants` 追加                              |
| `docs/09_開発履歴/2026-09-17_Production_service_role権限全体監査_報告.md`           | `20260916100000` 記載修正（Production 適用済み・Local/Remote 一致） |

---

## 4. 静的テスト（`test:phase1-service-role-grants`）

| #    | チェック                                                                    | 結果     |
| ---- | --------------------------------------------------------------------------- | -------- |
| 1    | breeders → service_role SELECT / UPDATE                                     | **PASS** |
| 2    | breeders → service_role INSERT / DELETE なし                                | **PASS** |
| 3    | stripe_webhook_events → service_role S/I/U/D（`20260917100000`）            | **PASS** |
| 4    | GRANT ALL なし                                                              | **PASS** |
| 5    | anon / authenticated 追加 GRANT なし                                        | **PASS** |
| 6    | RLS / Policy 変更なし                                                       | **PASS** |
| 7    | `createAdminClient` は admin.ts 定義 + webhook repository のみ              | **PASS** |
| 8–10 | webhook repository の breeders SELECT/UPDATE・stripe_webhook_events S/I/U/D | **PASS** |

**10/10 passed**

---

## 5. 検証結果（ローカル）

| コマンド                                   | 結果      |
| ------------------------------------------ | --------- |
| `npm run lint`                             | **成功**  |
| `npm run typecheck`                        | **成功**  |
| `npm run build`                            | **成功**  |
| `npm run test:migration-order`             | **15/15** |
| `npm run test:phase1-service-role-grants`  | **10/10** |
| `npm run test:stripe-webhook-events-grant` | **10/10** |
| `npm run test:stripe-step4-webhook`        | **54/54** |

---

## 6. Production DB 未適用

| 項目                                  | 状態                                                                        |
| ------------------------------------- | --------------------------------------------------------------------------- |
| Production `supabase db push`         | **未実施**                                                                  |
| `breeders` service_role SELECT/UPDATE | Production 上は **従来どおり不足**（Webhook breeder lookup 失敗継続見込み） |
| Stripe Webhook 再送                   | **未実施**                                                                  |

---

## 7. 適用後の確認（次ステップ・本作業外）

```sql
SELECT has_table_privilege('service_role', 'public.breeders', 'SELECT') AS breeders_sel,
       has_table_privilege('service_role', 'public.breeders', 'UPDATE') AS breeders_upd;
```

| 期待（適用後） | `breeders_sel = true`, `breeders_upd = true` |

1. Production linked 確認 → `db push --dry-run`（`20260918100000` のみ）
2. `db push` 適用
3. 上記 SQL + Webhook 再送で `breeder lookup` 成功を確認

---

## 8. 関連

- [Production Stripe Webhook breeder lookup 失敗 調査報告](./2026-09-17_Production_StripeWebhook_breeder_lookup失敗_調査報告.md)
- [Stripe Webhook service_role 権限不足 修正報告](./2026-09-17_StripeWebhook_service_role権限不足_修正報告.md)
