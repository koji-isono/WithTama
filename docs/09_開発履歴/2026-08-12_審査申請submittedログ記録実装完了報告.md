# 審査申請 submitted ログ記録 実装完了報告

| 項目   | 内容                                                           |
| ------ | -------------------------------------------------------------- |
| 実装日 | 2026-08-12                                                     |
| 対象   | `submitPetForReview()` + AD-10 ソート順修正                    |
| 目的   | ブリーダー公開申請時に `pet_review_logs` へ `submitted` を記録 |
| 状態   | **完了**（AD-11 着手前の前提整備）                             |

## 概要

ブリーダーが犬猫掲載を審査申請（`draft` → `under_review`）した際、同一処理内で `pet_review_logs` に `action = 'submitted'` を 1 件記録するよう `submitPetForReview()` を改修した。  
あわせて AD-10 一覧の申請日時ソートを Decision No.106 準拠（古い順）に修正した。

Service Role Key は使用せず、breeder JWT + 既存 RLS のみ。Migration / Trigger / 管理者審査 RPC は変更していない。

---

## 1. 実装前確認

### 既存 `submitPetForReview()` の状態

`src/features/pets/repository.ts` は `pets.status` を `under_review` に UPDATE するのみで、`pet_review_logs` への INSERT は **行っていなかった**。

### 二重 INSERT 機構の有無

コードベース・Migration を確認した結果、`submitted` ログを自動作成する Trigger / RPC / 別 Repository 関数は **存在しない**。

### Trigger / RLS との整合

| 要素                                            | 整合性                                                                               |
| ----------------------------------------------- | ------------------------------------------------------------------------------------ |
| `enforce_pets_status_transition`                | breeder の `draft → under_review` は従来どおり Trigger で許可                        |
| `pet_review_logs_insert_submitted_breeder`      | `actor_user_id = auth.uid()`、`action = 'submitted'`、本人所有 `pet_id` で INSERT 可 |
| `approve_pet_for_publish` / `return_pet_review` | 変更なし                                                                             |

参照 Migration: `supabase/migrations/20260807110000_create_pet_review_logs.sql`（56–71 行目）

---

## 2. 変更ファイル

| ファイル                                 | 内容                                                                                    |
| ---------------------------------------- | --------------------------------------------------------------------------------------- |
| `src/features/pets/repository.ts`        | `insertPetReviewSubmittedLog()` 追加、`submitPetForReview()` に submitted INSERT を接続 |
| `src/features/admin/loaders.ts`          | AD-10 ソートを申請日時昇順（Decision No.106）に変更                                     |
| `scripts/test-submit-pet-for-review.mts` | 審査申請 + submitted ログのセキュリティテスト（新規）                                   |
| `package.json`                           | `test:submit-pet-for-review` スクリプト追加                                             |

### 変更しなかったファイル

| ファイル                           | 理由                                                 |
| ---------------------------------- | ---------------------------------------------------- |
| `src/features/pets/service.ts`     | 既存の検証フローから `submitPetForReview` を呼ぶだけ |
| `src/features/admin/repository.ts` | AD-10 取得ロジックは原則変更なし                     |
| `supabase/migrations/*`            | DB スキーマ変更なし                                  |
| 管理者審査 RPC                     | 変更指示なし                                         |

---

## 3. DB 変更有無

**なし**（Migration 作成・実行なし）

既存テーブル・RLS・Trigger をそのまま利用し、アプリケーション層から breeder JWT で INSERT する方式。

---

## 4. submitted ログの記録方式

### 処理フロー（`submitPetForReview()`）

1. **`pets` UPDATE**
   - `status = 'under_review'`
   - `updated_by` / `updated_at` 更新
   - 条件: `id`, `breeder_id`, **`status = 'draft'`**

2. **UPDATE が 1 行成功した場合のみ** `pet_review_logs` INSERT

| カラム          | 値                            |
| --------------- | ----------------------------- |
| `pet_id`        | 対象 pet の ID                |
| `action`        | `'submitted'`                 |
| `actor_user_id` | `updatedBy`（= `auth.uid()`） |
| `comment`       | 未指定（NULL）                |
| `created_at`    | DB デフォルト `now()`         |

### 二重 INSERT 防止

UPDATE 条件に `status = 'draft'` を含めるため、2 回目以降の申請は UPDATE 0 行 → **INSERT しない**。

再審査（管理者差戻し後の再申請）では新たな `submitted` 行が追加される（監査履歴として正しい挙動）。

---

## 5. トランザクション整合性

| 項目         | 内容                                                                              |
| ------------ | --------------------------------------------------------------------------------- |
| 採用方式     | アプリ層の **UPDATE → INSERT**（PostgREST 2 リクエスト）                          |
| 二重ログ防止 | UPDATE の `status = 'draft'` ガードで ✅                                          |
| 完全原子性   | **未達** — INSERT 失敗時に `under_review` のまま log なしの不整合が理論上あり得る |

### 完全原子化に必要な将来対応

`submit_pet_for_review(p_pet_id uuid)` RPC（`approve_pet_for_publish` / `return_pet_review` と同パターン）による DB 内 1 トランザクション化。

**今回は Migration を作成・実行していない**（ご指示に従い、アプリ層実装で対応）。

### UPDATE-first を採用した理由

- INSERT-first だと `draft` のまま複数 `submitted` ログが積まれるリスクがある
- UPDATE-first なら status ガードで二重 INSERT を防止できる
- breeder は `under_review → draft` を自己実行できないため、INSERT 失敗後の補償 UPDATE は不可

---

## 6. AD-10 ソート順（Decision No.106）

`src/features/admin/loaders.ts` のソートを修正。

| 項目           | 変更前             | 変更後                                         |
| -------------- | ------------------ | ---------------------------------------------- |
| 順序           | 申請日時の新しい順 | **古い申請 → 新しい申請**（`submittedAt ASC`） |
| submitted なし | 末尾               | **「申請日時不明」のまま末尾**                 |

---

## 7. セキュリティ

| 条件                                    | 対応                                          |
| --------------------------------------- | --------------------------------------------- |
| Service Role Key 不使用                 | ✅                                            |
| RLS 回避なし                            | ✅ `pet_review_logs_insert_submitted_breeder` |
| `actor_user_id` はサーバー側で設定      | ✅ `auth.uid()` 由来の `updatedBy`            |
| 管理者審査 RPC 変更なし                 | ✅                                            |
| クライアント側だけの admin 判定にしない | ✅（breeder フロー。admin 変更なし）          |

---

## 8. 確認テスト

### コマンド

```bash
npm run test:submit-pet-for-review
```

### 結果

**14 passed / 0 failed**

| 確認項目                               | 結果 |
| -------------------------------------- | ---- |
| `draft → under_review` が成功する      | ✅   |
| `submitted` log が 1 件だけ作成される  | ✅   |
| `actor_user_id` が正しい               | ✅   |
| `pet_id` が正しい                      | ✅   |
| `created_at` が記録される              | ✅   |
| 同じ申請操作による二重ログが発生しない | ✅   |
| 他人の pet を申請できない              | ✅   |
| 不正な status から申請できない         | ✅   |

テストは `SUPABASE_SERVICE_ROLE_KEY` を使用しない。breeder JWT + PostgREST 直接操作（`submitPetForReview` と同経路）。

---

## 9. CI 実行結果

| コマンド                       | 結果     | 備考                                                            |
| ------------------------------ | -------- | --------------------------------------------------------------- |
| `npm run lint`                 | **成功** |                                                                 |
| `npm run typecheck`            | **成功** |                                                                 |
| `npm run build`                | **成功** |                                                                 |
| Prettier（変更ファイルのみ）   | **成功** | `repository.ts`, `loaders.ts`, `test-submit-pet-for-review.mts` |
| `npm run format:check`（全体） | 未実施   | リポジトリ全体の既存未整形問題のため                            |

---

## 10. 残課題

| #   | 項目                           | 内容                                                                            |
| --- | ------------------------------ | ------------------------------------------------------------------------------- |
| 1   | `submit_pet_for_review` RPC 化 | UPDATE + INSERT の DB トランザクション原子化（管理者 RPC と対称）               |
| 2   | 既存 `under_review` データ     | submitted ログが無い行は AD-10 で「申請日時不明」のまま（データ修復は別途判断） |
| 3   | AD-11 詳細画面                 | 未実装                                                                          |
| 4   | git commit / push              | 未実施                                                                          |

---

## 11. 実施しなかったこと

- git commit / push
- Migration 作成・Supabase への適用
- `approve_pet_for_publish` / `return_pet_review` の変更
- AD-10 一覧取得ロジックの変更（ソート除く）
- 既存 `under_review` データへの submitted ログのバックフィル

---

## 12. 関連ドキュメント

- [AD-10 犬猫掲載審査一覧](../04_画面設計/AD-10_犬猫掲載審査一覧.md)
- [pet_review_logs テーブル](../05_データベース設計/pet_review_logs.md)
- [AD-10 実装完了報告](./2026-08-12_AD-10_犬猫掲載審査一覧実装完了報告.md)
- [Decision No.105](../01_設計変更管理/DecisionLog.md) — 審査ログ追記
- [Decision No.106](../01_設計変更管理/DecisionLog.md) — 一覧表示順

---

## 13. 次のステップ（参考）

1. AD-11 犬猫掲載審査詳細（読み取り + 承認・差戻し）
2. `submit_pet_for_review` RPC Migration の設計・適用（原子化）
3. AD-00 管理者ダッシュボードから審査一覧へのリンク
