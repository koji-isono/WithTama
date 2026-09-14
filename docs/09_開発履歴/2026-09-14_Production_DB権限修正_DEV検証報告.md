# Production DB 権限修正 DEV 検証報告

| 項目   | 内容                                                                                  |
| ------ | ------------------------------------------------------------------------------------- |
| 検証日 | 2026-09-14                                                                            |
| 種別   | **DEV 検証のみ**（Production 適用 / commit / push **未実施**）                        |
| 前提   | [実装報告](./2026-09-14_Production_DB権限修正_実装報告.md) の Migration を DEV に適用 |

**機密:** token / password / API key / DB password は記載しない。

---

## 1. DEV Project であることの確認

### 1.1 確認手順

| #   | 確認方法                                          | 結果                                                                                                                                            |
| --- | ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `npx supabase projects list` で linked 状態を確認 | **DEV** `withtama`（ref: `mahgsrtuyzgqlkoiwqky`）が linked。**Production** `WithTama Production`（ref: `ltgryguflovxktwpeybz`）は linked: false |
| 2   | `supabase/.temp/linked-project.json` を確認       | `"ref":"mahgsrtuyzgqlkoiwqky"`, `"name":"withtama"`                                                                                             |
| 3   | `.env.local` の `NEXT_PUBLIC_SUPABASE_URL` を確認 | `https://mahgsrtuyzgqlkoiwqky.supabase.co`（DEV ref と一致）                                                                                    |
| 4   | `db push` 前に Production ref でないことを再確認  | `ltgryguflovxktwpeybz` **ではない**                                                                                                             |

### 1.2 CLI 切替（実施内容）

検証開始時点では CLI が **Production**（`ltgryguflovxktwpeybz`）を向いていたため、以下を実行して **DEV に切替** した。

```bash
npx supabase link --project-ref mahgsrtuyzgqlkoiwqky
```

切替後、`linked-project.json` および `migration list` の接続先が DEV であることを確認した。

---

## 2. 適用した Migration

| 項目           | 内容                                                                   |
| -------------- | ---------------------------------------------------------------------- |
| ファイル       | `supabase/migrations/20260914100000_grant_phase1_table_privileges.sql` |
| 適用コマンド   | `npx supabase db push`（`--linked` = DEV）                             |
| Migration 番号 | **34 本目**（最終）                                                    |

### 2.1 適用上の補足

DEV の `supabase_migrations` 履歴が空だったため、`db push` は **001 から 34 本目まで全 Migration** を DEV に適用した（exit code 0）。  
その中に本件の `20260914100000_grant_phase1_table_privileges.sql` が含まれる。

適用後 `npx supabase migration list` で **local / remote が 34 本すべて一致** することを確認した（`20260914100000` の remote 欄も一致）。

---

## 3. Migration 適用結果

| 項目         | 結果                                                               |
| ------------ | ------------------------------------------------------------------ |
| `db push`    | **成功**（`Finished supabase db push.`）                           |
| 対象 Project | **DEV** `withtama`（`mahgsrtuyzgqlkoiwqky`）のみ                   |
| Production   | **適用していない**（`ltgryguflovxktwpeybz` には `db push` 未実行） |

---

## 4. `test:phase1-table-grants` 結果

**コマンド:** `npm run test:phase1-table-grants`  
**接続先:** `.env.local` → DEV Project

### 4.1 静的チェック（S1–S15）

| チェック                                         | 結果 |
| ------------------------------------------------ | ---- |
| S1. migration file exists                        | PASS |
| S2. GRANT USAGE ON SCHEMA public                 | PASS |
| S3. buyers authenticated SELECT INSERT UPDATE    | PASS |
| S4. breeders authenticated SELECT INSERT UPDATE  | PASS |
| S5. favorites authenticated SELECT INSERT DELETE | PASS |
| S6. visits authenticated SELECT only             | PASS |
| S7. anon pet_photos SELECT only                  | PASS |
| S8. stripe_webhook_events REVOKE                 | PASS |
| S9. no ALTER DEFAULT PRIVILEGES                  | PASS |
| S10. no TRIGGER TRUNCATE REFERENCES grants       | PASS |
| S11. no GRANT ALL ON TABLE                       | PASS |
| S12. no GRANT DELETE on buyers                   | PASS |
| S13. no GRANT DELETE on breeders                 | PASS |
| S14. review logs authenticated SELECT only       | PASS |
| S15. no anon GRANT on pets base table            | PASS |

### 4.2 Live チェック（L1–L10）

| チェック                                              | 結果     | 詳細                                              |
| ----------------------------------------------------- | -------- | ------------------------------------------------- |
| L1. anon cannot read buyers rows                      | **PASS** | rows=0                                            |
| L2. anon can SELECT published_pets_public view        | **PASS** |                                                   |
| L3. anon can SELECT pet_photos for public pet         | **PASS** |                                                   |
| L4. buyer authenticated SELECT own buyers row         | **PASS** |                                                   |
| L5. buyer bootstrap INSERT grant                      | **PASS** | unique → row exists                               |
| L6. buyer cannot read other buyers rows (RLS)         | **PASS** | rows=0                                            |
| L7. breeder authenticated SELECT own breeders row     | **PASS** |                                                   |
| L8. authenticated cannot SELECT stripe_webhook_events | **PASS** | permission denied for table stripe_webhook_events |
| L9. anon cannot SELECT stripe_webhook_events          | **PASS** | permission denied for table stripe_webhook_events |
| L10. public pets view without error                   | **PASS** | count=1                                           |

### 4.3 サマリ

| 区分 | 結果                          |
| ---- | ----------------------------- |
| 合計 | **25 PASS / 0 FAIL / 0 SKIP** |

**Migration 適用前に FAIL していた L8 / L9 も PASS**（`permission denied` に変化）。

---

## 5. L8 / L9 結果（詳細）

| チェック                                   | 適用前（実装報告時）           | DEV 適用後                    |
| ------------------------------------------ | ------------------------------ | ----------------------------- |
| L8 authenticated → `stripe_webhook_events` | FAIL（query succeeded rows=0） | **PASS**（permission denied） |
| L9 anon → `stripe_webhook_events`          | FAIL（query succeeded rows=0） | **PASS**（permission denied） |

`REVOKE ALL ON TABLE public.stripe_webhook_events FROM anon, authenticated` が DEV で有効化されたことを確認。

---

## 6. `test:public-pet-read` 結果

**コマンド:** `npm run test:public-pet-read`

| 結果                            | 詳細                                                                           |
| ------------------------------- | ------------------------------------------------------------------------------ |
| **22 PASS / 0 FAIL / 5 未検証** | 公開犬猫 View・anon main photo・draft/under_review 除外・Storage signed URL 等 |

公開犬猫表示への **回帰なし**。

---

## 7. `test:migration-order` 結果

**コマンド:** `npm run test:migration-order`

| 結果           |
| -------------- |
| **12/12 PASS** |

- Migration 数 34 本
- `20260914100000_grant_phase1_table_privileges.sql` が存在し **最終 Migration**

---

## 8. 実際の GRANT 確認結果（DEV）

DEV linked DB に対し `npx supabase db query --linked` で SQL 実行。

### 8.1 `information_schema.role_table_grants`（抜粋）

Phase1 対象テーブルについて `anon` / `authenticated` の privilege を集約した結果:

| table_name                | grantee             | privileges（information_schema 表示）                         |
| ------------------------- | ------------------- | ------------------------------------------------------------- |
| buyers                    | anon, authenticated | DELETE, INSERT, REFERENCES, SELECT, TRIGGER, TRUNCATE, UPDATE |
| breeders                  | 同上                | 同上                                                          |
| pets                      | 同上                | 同上                                                          |
| favorites                 | 同上                | 同上                                                          |
| inquiries                 | 同上                | 同上                                                          |
| inquiry_messages          | 同上                | 同上                                                          |
| visits                    | 同上                | 同上                                                          |
| pet_photos                | 同上                | 同上                                                          |
| pet_review_logs           | 同上                | 同上                                                          |
| breeder_review_logs       | 同上                | 同上                                                          |
| **stripe_webhook_events** | —                   | **行なし**（anon / authenticated への grant なし）            |

### 8.2 `has_table_privilege`（抜粋）

| table_name                                | auth SELECT/INSERT/UPDATE/DELETE | anon SELECT |
| ----------------------------------------- | -------------------------------- | ----------- |
| buyers 〜 visits, pet_photos, review logs | **すべて true**                  | **true**    |
| **stripe_webhook_events**                 | **すべて false**                 | **false**   |

### 8.3 DEV と Production の解釈

| 観点                     | DEV（本検証）                               | Production（調査報告・適用前）                                           |
| ------------------------ | ------------------------------------------- | ------------------------------------------------------------------------ |
| `buyers` + authenticated | SELECT/INSERT/UPDATE/DELETE 等 **利用可能** | **SELECT/INSERT/UPDATE/DELETE なし**（REFERENCES/TRIGGER/TRUNCATE のみ） |
| `stripe_webhook_events`  | anon/authenticated **アクセス不可**         | 同様に遮断が必要                                                         |

DEV では Supabase Hosted の **テーブル作成時 default grant** により、Migration の最小 GRANT に加えて `information_schema` 上は広い privilege が見える。  
**本 Migration の必須効果**（login bootstrap 用 INSERT/SELECT/UPDATE の付与、`stripe_webhook_events` の REVOKE）は Live テストおよび `has_table_privilege('stripe_webhook_events')` で確認済み。

Production は空 DB + Migration のみの構成のため、適用後は **Migration が明示した最小 GRANT + stripe REVOKE** が主な privilege 状態になる見込み（調査報告 §6.1 の確認 SQL で適用後検証推奨）。

---

## 9. Production 適用可否の判定

| 判定項目                                         | 結果                          |
| ------------------------------------------------ | ----------------------------- |
| DEV で Migration 適用成功                        | **OK**                        |
| `test:phase1-table-grants` 全 PASS（L8/L9 含む） | **OK**                        |
| 公開犬猫回帰なし                                 | **OK**                        |
| buyer bootstrap / breeder SELECT / RLS 遮断      | **OK**                        |
| `stripe_webhook_events` 遮断                     | **OK**                        |
| Production への誤適用なし                        | **OK**（本検証では DEV のみ） |

### 結論

**Production への Migration 適用は GO（実施可能）** と判定する。

ただし本報告時点では **Production への `db push` は未実施**。次ステップは PO 判断のうえ Production へ 34 本目のみ（または未適用分）を適用し、調査報告 §6.1 の SQL と buyer login E2E で最終確認すること。

---

## 10. 未実施事項（意図的 STOP）

| 項目                              | 状態                            |
| --------------------------------- | ------------------------------- |
| Production DB への Migration 適用 | **未実施**                      |
| git commit / push                 | **未実施**                      |
| Production login E2E              | **未実施**（Production 適用後） |

---

## 11. 次のアクション（PO）

1. 本報告をレビュー
2. commit / push（別作業）
3. **Production** 向けに CLI link を `ltgryguflovxktwpeybz` に切替 → `db push`（**DEV とは別操作として慎重に**）
4. Production で privilege 確認 SQL + buyer login E2E
