# Supabase Migration buyers 依存順序修正 実装報告

| 項目          | 内容                                                                |
| ------------- | ------------------------------------------------------------------- |
| 作業日        | 2026-09-10                                                          |
| 種別          | migration rename + 依存順序テスト + docs（**DB 操作なし**）         |
| Decision      | [Decision No.155](../01_設計変更管理/DecisionLog.md#decision-no155) |
| commit / push | **未実施**                                                          |

---

## 1. 結論

| 項目           | 結果                                                                                       |
| -------------- | ------------------------------------------------------------------------------------------ |
| 修正           | **`20260804164648_create_buyers.sql` → `20260804160000_create_buyers.sql` に rename 完了** |
| SQL 本文       | **変更なし**（rename のみ）                                                                |
| migration 総数 | **33 本**（増減なし）                                                                      |
| 依存順序       | **buyers → favorites → inquiries 成立。他に順序 NG なし**                                  |
| テスト         | `npm run test:migration-order` — **10/10 PASS**                                            |
| 品質ゲート     | lint / typecheck / build — **PASS**                                                        |
| Production     | **一切操作していない**                                                                     |
| DEV            | **一切操作していない**                                                                     |

---

## 2. 原因

Production 初回 `db push` で `create_favorites` が `public.buyers` FK を参照した時点で `buyers` テーブルが未作成だった。  
原因は migration **version（ファイル名 timestamp）順**で `create_buyers` が `create_favorites` / `create_inquiries` より後だったこと。

詳細: [初回 Migration 失敗 原因調査・修正方針](./2026-09-10_SupabaseProduction_初回Migration失敗_原因調査_修正方針.md)

---

## 3. 修正内容

| 操作     | 内容                                                                                        |
| -------- | ------------------------------------------------------------------------------------------- |
| rename   | `supabase/migrations/20260804164648_create_buyers.sql` → `20260804160000_create_buyers.sql` |
| SQL      | **無変更**                                                                                  |
| Decision | Decision No.155 追加                                                                        |
| docs     | `buyers.md`, `ProjectStructure.md` の migration 参照を更新                                  |
| テスト   | `scripts/test-migration-order.mts` + `npm run test:migration-order`                         |

---

## 4. rename 前後

| 項目         | 変更前                                | 変更後                                |
| ------------ | ------------------------------------- | ------------------------------------- |
| ファイル名   | `20260804164648_create_buyers.sql`    | `20260804160000_create_buyers.sql`    |
| 適用順（#5） | favorites / inquiries の **後**（#7） | favorites / inquiries の **前**（#5） |
| version ID   | `20260804164648`                      | `20260804160000`                      |

---

## 5. 修正後 migration 順（全 33 本）

| #   | ファイル                                                          |
| --- | ----------------------------------------------------------------- |
| 1   | `001_pets.sql`                                                    |
| 2   | `20260804132200_update_pets_v1_1.sql`                             |
| 3   | `20260804135800_create_breeders.sql`                              |
| 4   | `20260804144700_update_breeders_draft_nullable.sql`               |
| 5   | **`20260804160000_create_buyers.sql`**                            |
| 6   | `20260804161228_create_favorites.sql`                             |
| 7   | `20260804163239_create_inquiries_messages_visits.sql`             |
| 8   | `20260805112007_update_breeders_profile_nullable.sql`             |
| 9   | `20260805112236_update_initial_registration_profile.sql`          |
| 10  | `20260805112809_update_profile_registration_flow.sql`             |
| 11  | `20260805140000_create_breeder_documents_storage.sql`             |
| 12  | `20260806143000_create_pet_photos_storage.sql`                    |
| 13  | `20260806143100_create_pet_photos_table_and_rls.sql`              |
| 14  | `20260807090000_fix_pets_breeder_fk.sql`                          |
| 15  | `20260807110000_create_pet_review_logs.sql`                       |
| 16  | `20260807120000_harden_pets_rls.sql`                              |
| 17  | `20260807130000_enforce_pets_status_transition.sql`               |
| 18  | `20260810100000_add_admin_pet_photo_select_rls.sql`               |
| 19  | `20260810110000_extend_pets_status_trigger_for_admin.sql`         |
| 20  | `20260810120000_create_pet_review_admin_rpcs.sql`                 |
| 21  | `20260812120000_create_submit_pet_for_review_rpc.sql`             |
| 22  | `20260814120000_add_public_pet_list_read_access.sql`              |
| 23  | `20260814130000_add_public_pet_detail_read_views.sql`             |
| 24  | `20260821153000_create_get_inquiry_buyer_display_name_rpc.sql`    |
| 25  | `20260824120000_create_visit_rpcs.sql`                            |
| 26  | `20260824183000_complete_visit_requires_scheduled_at_elapsed.sql` |
| 27  | `20260825100000_create_breeder_review_logs.sql`                   |
| 28  | `20260825110000_add_admin_breeder_documents_select_rls.sql`       |
| 29  | `20260825120000_create_breeder_review_admin_rpcs.sql`             |
| 30  | `20260825130000_create_breeder_application_submit_rpcs.sql`       |
| 31  | `20260826173000_stripe_step1_billing_columns_and_protection.sql`  |
| 32  | `20260907100000_add_pet_description_revision_review.sql`          |
| 33  | `20260908100000_add_pet_listing_pause_resume.sql`                 |

---

## 6. migration 総数

**33 本**（rename 前後で変化なし）

---

## 7. 33 本依存関係確認結果

rename 後、空 DB・ファイル名順適用を前提に再監査。

| チェーン                                   | 判定                       |
| ------------------------------------------ | -------------------------- |
| **buyers → favorites**                     | **OK**（#5 → #6）          |
| **buyers → inquiries / messages / visits** | **OK**（#5 → #7）          |
| pets / breeders → favorites                | OK                         |
| pets / breeders / buyers → inquiries 系    | OK                         |
| breeders → pet_photos / Storage            | OK（#11 以降）             |
| pets + breeders → fix_pets_breeder_fk      | OK（#14）                  |
| 以降 RPC / Views / Triggers                | OK（先行テーブル作成済み） |

**追加の順序 NG: なし**

---

## 8. 追加テスト

| 項目       | 内容                                                                            |
| ---------- | ------------------------------------------------------------------------------- |
| ファイル   | `scripts/test-migration-order.mts`                                              |
| npm script | `test:migration-order`                                                          |
| 検証内容   | 33 本数、旧 version 不在、buyers < favorites、buyers < inquiries、先頭 7 本順序 |
| 結果       | **10/10 PASS**                                                                  |

---

## 9. lint / typecheck / build 等

| コマンド                       | 結果     |
| ------------------------------ | -------- |
| `npm run test:migration-order` | **PASS** |
| `npm run lint`                 | **PASS** |
| `npm run typecheck`            | **PASS** |
| `npm run build`                | **PASS** |

**アプリコードへの影響:** migration ファイル名変更のみ。**`src/` 変更なし**。

---

## 10. DEV への影響

| 項目                        | 内容                                                                                                                                               |
| --------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| DEV Supabase schema         | **変更なし**（今回 DEV へ link / push / repair / reset 未実施）                                                                                    |
| `buyers` テーブル           | **既存のまま**                                                                                                                                     |
| 旧 version `20260804164648` | DEV `schema_migrations` に **存在する可能性あり**（手動適用 + 過去 Dashboard 適用）                                                                |
| 将来 CLI 管理時             | `migration repair --status reverted 20260804164648` + `migration repair --status applied 20260804160000` が **必要になる可能性**（SQL 再実行不要） |

---

## 11. Production への影響

| 項目                    | 内容                                                                                                        |
| ----------------------- | ----------------------------------------------------------------------------------------------------------- |
| 今回の操作              | **なし**                                                                                                    |
| 既存 Production Project | 初回 push 失敗時点の **4 migration 適用状態のまま**（触っていない）                                         |
| 採用候補の復旧方針      | **新規 Production Project 作成 → 修正 main から空 DB へ 33 本 `db push`**（PO 判断。db reset は採用しない） |

---

## 12. Production で今回実行していない操作

- `db push` / `db reset` / `migration repair`
- SQL Editor / Storage / Auth / データ変更

---

## 13. 次の Production 再構築手順

1. 本修正を **main へ commit / merge**（PO 判断）
2. **新規 WithTama Production Project** を Dashboard で作成
3. `npx supabase login`（PO）
4. `npx supabase link --project-ref <新 Production ref>` — **DEV ref ではないこと**を確認
5. `npx supabase migration list` — **Local 33 / Remote 0**
6. `npx supabase db push` — 33 本一括適用
7. `migration list` — **33/33** 確認
8. Supabase smoke test（Auth / RLS / Storage 等 — 別チェックリスト）

---

## 14. git diff（本スコープのみ）

```
 supabase/migrations/20260804164648_create_buyers.sql
   → supabase/migrations/20260804160000_create_buyers.sql  (rename, SQL 無変更)

 scripts/test-migration-order.mts                            (新規)
 package.json                                               (+ test:migration-order)
 docs/01_設計変更管理/DecisionLog.md                        (+ No.155)
 docs/05_データベース設計/buyers.md                         (version 表記)
 docs/00_アーキテクチャ/ProjectStructure.md                 (一覧順序)
 docs/09_開発履歴/2026-09-10_SupabaseMigration_buyers依存順序修正_実装報告.md (本報告)
```

**含めないもの:** 既存の無関係な未 commit docs、`tsconfig.tsbuildinfo`（build 副産物）等

---

## 15. git status（本スコープ）

| 状態    | パス                                                                 |
| ------- | -------------------------------------------------------------------- |
| Renamed | `supabase/migrations/20260804160000_create_buyers.sql`               |
| 新規    | `scripts/test-migration-order.mts`                                   |
| 新規    | 本報告 MD                                                            |
| 変更    | `package.json`, `DecisionLog.md`, `buyers.md`, `ProjectStructure.md` |

**commit / push: 未実施**
