---
project: WithTama
type: development-log
date: 2026-08-25
status: blocked
tags:
  - WithTama
  - BR-09
  - Migration
  - SEC-TEST
---

# BR-09 提出 RPC Migration 適用・実 DB テスト完了報告

## 作業目的

`20260825130000_create_breeder_application_submit_rpcs.sql` を WithTama **開発用** Supabase に適用し、専用 SEC-TEST と回帰テストを PASS させる。

---

## 適用 Migration

`supabase/migrations/20260825130000_create_breeder_application_submit_rpcs.sql`

### Migration 事前確認（問題なし）

| 項目                                              | 確認 |
| ------------------------------------------------- | ---- |
| `submit_breeder_application()`                    | ✅   |
| `resubmit_breeder_application()`                  | ✅   |
| SECURITY DEFINER                                  | ✅   |
| `SET search_path = public`                        | ✅   |
| `auth.uid()` による本人特定（引数なし）           | ✅   |
| admin 拒否（`invalid submit actor`）              | ✅   |
| status 検証（draft / resubmission_required のみ） | ✅   |
| `submitted` log INSERT（同一トランザクション）    | ✅   |
| `membership_status` 不変                          | ✅   |
| 再提出時 verification status 不変                 | ✅   |
| `approved_at` 不変（再提出 RPC）                  | ✅   |
| schema 追加なし                                   | ✅   |
| RLS 変更なし                                      | ✅   |
| Storage Policy 変更なし                           | ✅   |
| destructive SQL なし                              | ✅   |

---

## 適用先

| 項目             | 内容                                                                                                                             |
| ---------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| プロジェクト ref | `mahgsrtuyzgqlkoiwqky`（`.env.local` の `NEXT_PUBLIC_SUPABASE_URL` から判別）                                                    |
| 根拠             | [PU-01 Migration 適用検証](../09_開発履歴/2026-08-14_PU-01_公開READ_Migration適用検証完了報告.md) で **開発プロジェクト** と記載 |
| 本番 DB          | **適用していない**                                                                                                               |

---

## Migration 適用結果

| 方法                                                  | 結果                                                     |
| ----------------------------------------------------- | -------------------------------------------------------- |
| `SUPABASE_DB_URL` + `scripts/apply-sql-migration.mts` | **未実行** — `.env.local` に `SUPABASE_DB_URL` 未設定    |
| 自動適用                                              | **実施せず**（運用ルール上 Dashboard SQL Editor が必要） |

### ユーザー作業（必須）

Supabase Dashboard → **開発プロジェクト**（ref: `mahgsrtuyzgqlkoiwqky`）→ SQL Editor で以下を実行してください。

```
supabase/migrations/20260825130000_create_breeder_application_submit_rpcs.sql
```

適用後、ローカルで再実行:

```bash
npm run test:breeder-application-submit-rpcs
npm run test:breeder-review-rpcs
```

---

## RPC 存在確認

| RPC                            | 結果             |
| ------------------------------ | ---------------- |
| `submit_breeder_application`   | **NG**（未作成） |
| `resubmit_breeder_application` | **NG**（未作成） |

---

## 専用テスト結果

`npm run test:breeder-application-submit-rpcs` — **未完了**（Migration 未適用のため RPC 不存在で早期停止）

| 結果 | 件数 |
| ---- | ---- |
| PASS | 2    |
| FAIL | 1    |
| SKIP | 0    |

---

## テストケース確認（スクリプト定義）

`scripts/test-breeder-application-submit-rpcs.mts` は以下をカバー。**不足なし**。

### 初回提出

- draft → submitted
- submitted log 追加
- verification status → submitted
- membership_status 不変
- submitted / under_review / approved / rejected / resubmission_required から拒否

### 再提出

- resubmission_required → submitted
- submitted log 追加
- verification status 不変
- membership_status 不変
- approved_at 不変
- draft / submitted / under_review / approved / rejected から拒否

### 不正操作

- 非ログイン拒否
- buyer 拒否
- admin 拒否
- 他 breeder 指定不可（RPC 引数なし設計）
- 書類不足時の原子性（status + log 片方だけ更新しない）

---

## breeder-review-rpcs 結果

前回確認: **35 PASS / 0 FAIL**（今回 Migration 未適用のため再実行せず）

---

## その他回帰テスト

初回プロフィール提出専用の別 SEC-TEST スクリプトは **なし**。

---

## SEC_TEST 最終状態

prepare スクリプト実行により SEC_TEST breeder は **draft** にリセット済み（前回テスト実行時）。Migration 適用・テスト完了後は `test:breeder-application-submit-rpcs` 内 cleanup で **submitted** に復旧する設計。

---

## 品質確認

| チェック         | 結果 |
| ---------------- | ---- |
| lint             | PASS |
| typecheck        | PASS |
| format:check     | PASS |
| build            | PASS |
| git diff --check | PASS |

---

## DB / RLS / Storage

| 項目           | 変更                         |
| -------------- | ---------------------------- |
| DB schema      | **なし**（Migration 未適用） |
| RLS            | **なし**                     |
| Storage Policy | **なし**                     |

---

## commit / push

**未実施**

---

## 次工程

1. **SQL Editor で Migration 適用**（上記）
2. `npm run test:breeder-application-submit-rpcs` → FAIL 0 確認
3. `npm run test:breeder-review-rpcs` → 35 PASS 確認
4. BR-06 差戻し理由表示（別工程）

---

## 関連ノート

- [[docs/09_開発履歴/2026-08-25_BR-09再提出RPC初回提出log実装完了報告]]
