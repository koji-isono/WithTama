# Production DB 権限修正 実装報告

| 項目     | 内容                                                                                     |
| -------- | ---------------------------------------------------------------------------------------- |
| 作業日   | 2026-09-14                                                                               |
| 種別     | **実装完了（Migration + テスト + 本報告まで。commit / push / Production 適用は未実施）** |
| 前提調査 | [Production DB 権限エラー調査報告](./2026-09-14_Production_DB権限エラー調査報告.md)      |
| 確定原因 | PostgreSQL **table privilege（GRANT）不足**（RLS ではない）                              |

**機密:** token / password / API key / 実メールアドレスは記載しない。

---

## 1. 原因（確定）

| 観測                                           | 意味                                                                 |
| ---------------------------------------------- | -------------------------------------------------------------------- |
| Auth `signInWithPassword` → **200**            | ログイン自体は成功                                                     |
| `POST /rest/v1/buyers` → **403 / 42501**       | PostgREST が PostgreSQL に問い合わせた時点で **table 権限拒否**      |
| message: `permission denied for table buyers`  | **RLS policy 違反ではなく GRANT 不足**（policy 評価前に拒否）        |
| Production SQL: `authenticated` on `buyers`    | **REFERENCES / TRIGGER / TRUNCATE のみ**（SELECT / INSERT / UPDATE / DELETE **なし**） |

Phase1 の base table 作成 Migration 群は **RLS policy のみ定義**し、**`GRANT` を付与していなかった**。  
空の Supabase Project に Migration のみ `db push` した Production では table privilege が欠落し、DEV（ローカル init や Dashboard 由来の default grant）との差が顕在化した。

---

## 2. 追加 Migration

| 項目       | 内容                                                              |
| ---------- | ----------------------------------------------------------------- |
| ファイル   | `supabase/migrations/20260914100000_grant_phase1_table_privileges.sql` |
| 順序       | **34 本目**（最終 Migration）                                     |
| 方針       | RLS は変更しない。PostgREST ロールへの **最小 table GRANT** のみ |
| 未採用     | 調査報告 §8 案の **`ALTER DEFAULT PRIVILEGES`**（後述 §6）       |

---

## 3. テーブルごとの GRANT 内容

### 3.1 `authenticated`

| テーブル              | GRANT                          | 根拠（コード / RLS）                                                                 |
| --------------------- | ------------------------------ | ------------------------------------------------------------------------------------ |
| `buyers`              | SELECT, INSERT, UPDATE         | 初回 login bootstrap INSERT（`auth/repository.ts`）。RLS: own row のみ。DELETE policy なし |
| `breeders`            | SELECT, INSERT, UPDATE         | 同上 + プロフィール / billing read。DELETE policy なし                               |
| `pets`                | SELECT, INSERT, UPDATE         | ブリーダー CRUD（`pets/repository.ts`）。DELETE policy なし（論理削除は UPDATE）     |
| `favorites`           | SELECT, INSERT, DELETE         | お気に入り追加・削除。UPDATE policy なし                                             |
| `inquiries`           | SELECT, INSERT, UPDATE         | 問い合わせ作成・更新。DELETE policy なし（soft delete は UPDATE）                    |
| `inquiry_messages`    | SELECT, INSERT, UPDATE         | メッセージ送受信。同上                                                               |
| `visits`              | **SELECT のみ**                | アプリは一覧・詳細 read。作成・更新は **SECURITY DEFINER RPC**（`request_visit` 等） |
| `pet_photos`          | SELECT, INSERT, UPDATE, DELETE | ブリーダー写真管理 + 公開 pet main photo read                                        |
| `pet_review_logs`     | **SELECT のみ**                | 追記は RPC（`submit_pet_for_review` 等）。直接 INSERT はアプリ経路なし             |
| `breeder_review_logs` | **SELECT のみ**                | 同上                                                                                 |

**意図的に付与しない privilege:** DELETE（buyers / breeders / pets / inquiries 等）、TRIGGER / TRUNCATE / REFERENCES、`GRANT ALL`。

### 3.2 `anon`

| テーブル     | GRANT  | 根拠                                                                                    |
| ------------ | ------ | --------------------------------------------------------------------------------------- |
| `pet_photos` | SELECT | 公開 `/pets` の main photo 直 read（`test-public-pet-read.mts` L3 相当）。RLS: `pet_photos_select_public_published` |
| `pets`       | **なし** | 公開一覧・詳細は **View**（`published_pets_public` 等）経由。View には既存 Migration で GRANT 済み |

### 3.3 `stripe_webhook_events`

| ロール            | GRANT                         |
| ----------------- | ----------------------------- |
| `anon`            | **REVOKE ALL**（明示 deny）   |
| `authenticated`   | **REVOKE ALL**（明示 deny）   |
| `service_role`    | 変更なし（Webhook repository が使用） |

### 3.4 スキーマ

```sql
GRANT USAGE ON SCHEMA public TO anon, authenticated;
```

PostgREST が `public` 内オブジェクトを解決するために必要。

### 3.5 調査報告案との差分（意図的な最小化）

| 調査報告 §8 案                         | 本実装                                                     |
| -------------------------------------- | ---------------------------------------------------------- |
| 全テーブル `SELECT, INSERT, UPDATE, DELETE` | **RLS policy とコードに存在する操作のみ**（上表）          |
| `anon` に `pets` SELECT                | **付与しない**（View 経路で十分）                          |
| `ALTER DEFAULT PRIVILEGES`             | **不採用**（§6）                                           |
| review logs に INSERT                    | **SELECT のみ**（追記は SECURITY DEFINER RPC）             |
| `visits` に INSERT/UPDATE                | **SELECT のみ**（mutation は RPC）                         |

---

## 4. RLS との関係

PostgreSQL / PostgREST の二段防御は維持される。

```
JWT role (anon / authenticated)
  ↓
(1) Table GRANT  ← 今回追加（「操作を試行してよいか」）
  ↓
(2) RLS policy   ← 既存のまま（「どの行か」）
  ↓
(3) 行の返却 / 変更
```

| 例                               | GRANT 後の挙動                                      |
| -------------------------------- | --------------------------------------------------- |
| buyer が他人の `buyers` を SELECT | GRANT はあるが RLS で **0 行**                      |
| anon が `buyers` を SELECT       | **GRANT なし** → `42501 permission denied`（Production 適用後） |
| authenticated が `stripe_webhook_events` | **REVOKE 後** → `42501`（DEV 適用前は legacy grant 残存の可能性） |
| 公開犬猫一覧                     | **View** GRANT + View 定義（base `pets` GRANT 不要） |

**GRANT は RLS をバイパスしない。** service_role のみ RLS bypass（既存設計どおり）。

---

## 5. セキュリティ確認

| 確認項目                                         | 結果                                                                 |
| ------------------------------------------------ | -------------------------------------------------------------------- |
| 過剰 privilege 回避                              | DELETE / TRIGGER / TRUNCATE / REFERENCES / GRANT ALL を付与していない |
| `stripe_webhook_events`                          | `REVOKE ALL FROM anon, authenticated` を Migration に明示           |
| anon 非公開テーブル                              | `buyers` 等に GRANT なし。RLS 空結果 or permission denied           |
| 公開 READ                                        | View 経路維持 + `pet_photos` の anon SELECT のみ（RLS で published に限定） |
| `ALTER DEFAULT PRIVILEGES` 不採用                | 将来の機密テーブルへ anon/authenticated へ自動 GRANT されるリスクを回避 |
| Migration 再現性                                 | 空 Project + 34 Migration で同一 privilege 状態を再構築可能           |

### `ALTER DEFAULT PRIVILEGES` を採用しなかった理由

調査報告案では「新規 Migration テーブルへの再発防止」として提案されていたが、**将来追加される任意のテーブル（例: 監査ログ、内部課金テーブル）にも anon/authenticated へ自動 GRANT される**。  
Phase1 は対象テーブルが有限かつ明示リストで管理できるため、**テーブル単位 GRANT のみ**とし、default privilege は使わない。

---

## 6. 変更ファイル

| ファイル                                                         | 内容                                      |
| ---------------------------------------------------------------- | ----------------------------------------- |
| `supabase/migrations/20260914100000_grant_phase1_table_privileges.sql` | 新規 Migration                            |
| `scripts/test-phase1-table-grants.mts`                           | 静的 +  live 検証スクリプト               |
| `scripts/test-migration-order.mts`                               | EXPECTED_COUNT 33 → 34、最終 Migration 検証 |
| `package.json`                                                   | `test:phase1-table-grants` 追加           |
| `docs/09_開発履歴/2026-09-14_Production_DB権限修正_実装報告.md`   | 本報告                                    |

---

## 7. テスト

### 7.1 追加テスト

**コマンド:** `npm run test:phase1-table-grants`

| 区分 | 内容 |
| ---- | ---- |
| 静的 S1–S15 | Migration SQL 形状（GRANT 内容、REVOKE、DEFAULT PRIVILEGES なし、過剰 privilege なし） |
| Live L1–L10 | `.env.local` + SEC_TEST_* ユーザーで PostgREST 実 API 検証 |

| Live チェック | 要件対応 |
| ------------- | -------- |
| L1 | anon から buyers 非公開 |
| L4–L5 | buyer bootstrap（SELECT + INSERT grant） |
| L6 | 他ユーザー buyers 行 RLS 遮断 |
| L7 | breeder 側 SELECT |
| L8–L9 | stripe_webhook_events 遮断（**Migration 適用後**） |
| L2–L3, L10 | 公開犬猫 View / pet_photos |

### 7.2 実行結果（2026-09-14 ローカル）

| コマンド                      | 結果 |
| ----------------------------- | ---- |
| `npm run lint`                | **PASS** |
| `npm run typecheck`           | **PASS** |
| `npm run build`               | **PASS** |
| `npm run test:migration-order`| **12/12 PASS**（34 本目確認含む） |
| `npm run test:phase1-table-grants` | **23 PASS / 2 FAIL**（下記） |
| `npm run test:public-pet-read`| **22 PASS / 0 FAIL**（公開犬猫回帰 OK） |

#### `test:phase1-table-grants` の 2 FAIL について

| チェック | 結果 | 理由 |
| -------- | ---- | ---- |
| L8 authenticated → `stripe_webhook_events` | FAIL | 接続先 DEV DB に **本 Migration 未適用**。legacy default grant により SELECT が **エラーなく 0 行**で成功 |
| L9 anon → `stripe_webhook_events`         | FAIL | 同上 |

**Production 適用後**（`REVOKE ALL` 反映後）は L8/L9 も PASS になる設計。  
本セッションでは **Production / 接続先 DB への Migration 適用は意図的に未実施**。

#### ローカル Supabase について

`supabase status` → Docker 未インストールのため **ローカル `db reset` は未実行**。  
静的検証 + 接続先 Hosted DEV への live 検証（Migration 適用前状態）で代替した。

---

## 8. Production への適用手順（未実施・PO 向け）

1. 本変更を **commit / push**（別作業）
2. **Production 以外**の検証用 Project、または Supabase Branch で先に `supabase db push` し、`test:phase1-table-grants` の L8/L9 含め全 PASS を確認
3. Production で `supabase link` 済み CLI から **34 本目のみ**適用:
   ```bash
   supabase db push
   ```
4. SQL Editor で privilege 確認（secret 不要）:
   ```sql
   SELECT table_name, grantee, string_agg(privilege_type, ', ' ORDER BY privilege_type) AS privileges
   FROM information_schema.role_table_grants
   WHERE table_schema = 'public'
     AND table_name IN ('buyers', 'breeders', 'stripe_webhook_events')
     AND grantee IN ('authenticated', 'anon')
   GROUP BY table_name, grantee
   ORDER BY table_name, grantee;
   ```
   | 期待（Production 適用後） |
   | ------------------------- |
   | `buyers` + `authenticated` → `INSERT, SELECT, UPDATE` |
   | `buyers` + `anon` → **行なし** |
   | `stripe_webhook_events` + `authenticated` / `anon` → **行なし** |
5. アプリ E2E: buyer signup → メール確認 → **login** → `POST /buyers` **201** → `/buyer/profile` 遷移
6. 公開 `/pets` 表示確認（View 経路）

**手動 SQL Editor GRANT のみでは再現性がない。** 必ず Migration 経由で適用すること。

---

## 9. rollback 時の考え方

| 方針 | 内容 |
| ---- | ---- |
| 推奨 | **新規 Migration で REVOKE**（履歴を残す）。例: 各テーブルから付与した privilege を `REVOKE` |
| 非推奨 | Production SQL Editor で ad-hoc REVOKE のみ（Migration 履歴と乖離） |
| 影響 | REVOKE 後は再び `42501 permission denied` が発生し login bootstrap 等が停止。**RLS は変わらない** |
| `stripe_webhook_events` | rollback Migration で `REVOKE` を取り消す場合、legacy grant が復活しないよう **GRANT を付けない**（service_role のみ維持） |

緊急時の一時 GRANT（調査報告 §8 相当の手動 SQL）は **Migration 適用までの暫定**とし、恒久対応は本 Migration とする。

---

## 10. 未実施事項（意図的 STOP）

| 項目 | 状態 |
| ---- | ---- |
| git commit / push | **未実施** |
| Production DB への Migration 適用 | **未実施** |
| DEV / Production への `supabase db push` | **未実施**（L8/L9 FAIL の直接原因） |

---

## 11. 次のアクション（PO）

1. 本報告と Migration diff をレビュー
2. commit / push → 検証環境で `db push` → `npm run test:phase1-table-grants` 全 PASS
3. Production `db push`（34 本目）
4. buyer login E2E 再確認

---

## 付録 — Migration 全文参照

`supabase/migrations/20260914100000_grant_phase1_table_privileges.sql`
