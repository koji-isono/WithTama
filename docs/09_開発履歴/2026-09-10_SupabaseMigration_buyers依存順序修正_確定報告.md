# Supabase Migration buyers 依存順序修正 確定報告

| 項目     | 内容                                      |
| -------- | ----------------------------------------- |
| 確定日   | 2026-09-10                                |
| 判定     | **PASS — main / origin/main 同期、CI SUCCESS** |

---

## 1. 結論

`create_buyers` migration の version 修正（Decision No.155）を **main へ commit / push 完了**。GitHub Actions **#78 SUCCESS**。Production / DEV DB 操作は **未実施**。

---

## 2. feature/fix commit hash

| 項目 | 値 |
| ---- | -- |
| fix commit | **`a188bf8`** |
| 親 commit | `a21c64a` |

---

## 3. commit message

```
fix(db): correct buyers migration dependency order
```

---

## 4. push 結果

| 項目 | 結果 |
| ---- | ---- |
| branch | `main` |
| remote | `origin/main` |
| push | **成功**（`a21c64a..a188bf8`） |

---

## 5. GitHub Actions run 番号

**Run #78**（fix commit `a188bf8` 向け）

---

## 6. GitHub Actions URL

https://github.com/koji-isono/WithTama/actions/runs/34439977115

---

## 7. CI 結果

| Step | 結果 |
| ---- | ---- |
| npm ci | **SUCCESS** |
| lint | **SUCCESS** |
| typecheck | **SUCCESS** |
| format:check | **SUCCESS** |
| build | **SUCCESS** |

**総合: SUCCESS**

---

## 8. 最終 HEAD

| 項目 | 値 |
| ---- | -- |
| fix commit 時点 HEAD | `a188bf8` |
| 確定報告 commit 後 | （本 MD push 後に更新 — 下記 §14 参照） |

---

## 9. migration 総数

**33 本**（rename 前後で変化なし）

---

## 10. buyers / favorites / inquiries の順序

| 順 | migration |
| -- | --------- |
| #5 | `20260804160000_create_buyers.sql` |
| #6 | `20260804161228_create_favorites.sql` |
| #7 | `20260804163239_create_inquiries_messages_visits.sql` |

---

## 11. test:migration-order 結果

**10/10 PASS**（ローカル実施済み）

---

## 12. Production DB 未操作確認

| 操作 | 状態 |
| ---- | ---- |
| db push / db reset / migration repair | **未実行** |
| SQL Editor / Storage / Auth | **未実行** |

---

## 13. DEV DB 未操作確認

| 操作 | 状態 |
| ---- | ---- |
| link / push / reset / repair | **未実行** |
| DEV schema | **変更なし** |

---

## 14. git status

fix commit 後、本 MD 以外の無関係な未 commit 変更は **コミット対象外** のまま残存。

---

## 15. 次の Production 再構築手順

1. **新規 WithTama Production Project** を Dashboard で作成
2. `npx supabase login`（PO）
3. `npx supabase link --project-ref <新 Production ref>` — DEV ではないことを確認
4. `npx supabase migration list` — **Local 33 / Remote 0**
5. `npx supabase db push` — 33 本一括適用
6. `migration list` — **33/33** 確認
7. Supabase smoke test（別チェックリスト）

---

## 付録 — 確定報告 commit（push 後追記）

| 項目 | 値 |
| ---- | -- |
| docs commit message | `docs(db): add migration dependency fix completion report` |
| 確定報告 commit hash | （push 後記載） |
| CI run（確定報告後） | （push 後記載） |
