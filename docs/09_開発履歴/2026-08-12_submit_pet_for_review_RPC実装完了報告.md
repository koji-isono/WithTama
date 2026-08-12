# submit_pet_for_review RPC 実装完了報告

| 項目   | 内容                                                   |
| ------ | ------------------------------------------------------ |
| 実装日 | 2026-08-12                                             |
| 対象   | 方式 B — `submit_pet_for_review(p_pet_id uuid)` RPC 化 |
| 方式   | SECURITY DEFINER + DB 内 1 トランザクション            |
| 状態   | **完了**（Migration 適用済み・セキュリティテスト合格） |

## 概要

ブリーダー公開申請（`draft` → `under_review` + `pet_review_logs.submitted`）を、PostgREST 2 リクエスト方式から `submit_pet_for_review` RPC へ移行した。  
既存の `approve_pet_for_publish` / `return_pet_review` と同様、status 更新と監査ログ INSERT を単一 DB トランザクションで実行する。

Service Role Key は使用しない。Trigger / 既存 admin RPC / RLS は変更していない。

---

## 1. search_path 設計判断

### 既存 RPC の確認結果

| RPC                       | SECURITY | search_path       |
| ------------------------- | -------- | ----------------- |
| `approve_pet_for_publish` | DEFINER  | `public, pg_temp` |
| `return_pet_review`       | DEFINER  | `public, pg_temp` |
| `set_main_pet_photo`      | DEFINER  | `public`          |

### 今回の採用

| 項目   | 内容                                                                       |
| ------ | -------------------------------------------------------------------------- |
| 新 RPC | `SET search_path = ''`（空）+ 完全修飾名                                   |
| 例     | `auth.uid()`, `public.is_admin()`, `public.pets`, `public.pet_review_logs` |

### `public, pg_temp` を維持しなかった理由

- 既存 admin RPC は `pg_temp` 付きだが、temp テーブルは未使用
- 新 RPC では安全性優先の `search_path = ''` が可能
- 既存 RPC との統一より、search_path インジェクション対策を優先

---

## 2. 変更ファイル

| ファイル                                                                  | 内容                                                                      |
| ------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `supabase/migrations/20260812120000_create_submit_pet_for_review_rpc.sql` | **新規** — RPC Migration                                                  |
| `src/features/pets/repository.ts`                                         | `.rpc("submit_pet_for_review")` 化、`insertPetReviewSubmittedLog()` 削除  |
| `src/features/pets/service.ts`                                            | `submitPetForReview(user.id, petId)` 呼び出し（第3引数 `updatedBy` 削除） |
| `scripts/test-submit-pet-for-review.mts`                                  | RPC テスト方式へ全面改修                                                  |

### 変更しなかったもの

- `enforce_pets_status_transition`（Trigger）
- RLS ポリシー
- `approve_pet_for_publish` / `return_pet_review`
- AD-10 一覧取得ロジック

---

## 3. Migration 内容

**ファイル:** `supabase/migrations/20260812120000_create_submit_pet_for_review_rpc.sql`

### 関数シグネチャ

```sql
public.submit_pet_for_review(p_pet_id uuid) RETURNS void
```

### 実装要件との対応

| #   | 要件                         | 対応                               |
| --- | ---------------------------- | ---------------------------------- |
| 1   | RPC Migration 作成           | ✅                                 |
| 2   | `auth.uid()` 必須            | ✅ `authentication required`       |
| 3   | admin からの実行拒否         | ✅ `invalid submit actor`          |
| 4   | breeder 本人所有 pet のみ    | ✅ `breeders.user_id = auth.uid()` |
| 5   | `deleted_at IS NULL`         | ✅ SELECT / UPDATE 条件            |
| 6   | `status = draft` のみ        | ✅ 事前チェック + UPDATE 条件      |
| 7   | 写真 1 枚以上                | ✅ `photo required`                |
| 8   | `FOR UPDATE` ロック          | ✅                                 |
| 9   | `draft → under_review`       | ✅                                 |
| 10  | `updated_by = auth.uid()`    | ✅                                 |
| 11  | `submitted` INSERT           | ✅                                 |
| 12  | `actor_user_id = auth.uid()` | ✅                                 |
| 13  | UPDATE + INSERT 同一 TX      | ✅ plpgsql 関数本体                |
| 14  | PUBLIC / anon EXECUTE 禁止   | ✅ REVOKE                          |
| 15  | authenticated のみ EXECUTE   | ✅ GRANT                           |

### EXECUTE 権限

```sql
REVOKE ALL ON FUNCTION public.submit_pet_for_review(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.submit_pet_for_review(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.submit_pet_for_review(uuid) TO authenticated;
```

---

## 4. アプリケーション変更

### `submitPetForReview()`（repository.ts）

**変更前:** PostgREST 2 リクエスト（UPDATE → INSERT）

**変更後:**

```typescript
const { error } = await supabase.rpc("submit_pet_for_review", {
  p_pet_id: petId,
});
```

- `insertPetReviewSubmittedLog()` は削除
- RPC エラー `invalid pet status` / `pet not found` / `unauthorized` → `false` 返却（従来互換）
- その他の RPC エラー → throw

### `submitPetForReviewAction()`（service.ts）

- 申請前バリデーション（必須項目・写真枚数）は **従来どおりアプリ層**
- Repository 呼び出しを `submitPetForReview(user.id, petId)` に変更

---

## 5. セキュリティテスト

### コマンド

```bash
npm run test:submit-pet-for-review
```

### テスト項目（25 件）

| 区分      | チェック                                                    |
| --------- | ----------------------------------------------------------- |
| 前提      | RPC 存在確認、breeder / admin サインイン                    |
| 写真 0 枚 | 拒否、status draft 維持、log 不変、ロールバック確認         |
| admin     | 実行拒否、no-photo pet draft 維持                           |
| 成功系    | draft→under_review、submitted 1 件、actor/pet_id/created_at |
| 二重申請  | status / log 不変、invalid status 拒否                      |
| 他人 pet  | 拒否、log / status 不変（`SEC_TEST_OTHER_PET_ID` 設定時）   |

### 実行結果（Migration 適用後・最終）

**25 passed / 0 failed**

- Service Role Key 未使用（breeder / admin JWT + `.rpc()` のみ）
- テストデータ: `[SEC-TEST]` プレフィックスのみ（本番用 Pet 非接触）
- 成功系 Pet: `[SEC-TEST] Submit RPC With Photo Pet`（draft + 写真 1 枚以上）を使用

関連: [テスト Pet 不足調査](./2026-08-12_submit_pet_for_review_テストPet不足調査.md)

---

## 6. CI 実行結果

| コマンド                             | 結果                             |
| ------------------------------------ | -------------------------------- |
| `npm run lint`                       | **成功**                         |
| `npm run typecheck`                  | **成功**                         |
| `npm run build`                      | **成功**                         |
| `npm run test:submit-pet-for-review` | **成功**（25 passed / 0 failed） |

---

## 7. Supabase Migration 適用

| 項目          | 内容                                                            |
| ------------- | --------------------------------------------------------------- |
| Migration     | `20260812120000_create_submit_pet_for_review_rpc.sql`           |
| 開発 Supabase | **適用済み**                                                    |
| 本番 DB       | 別途判断（本報告時点では本番適用の記載なし）                    |
| 適用後確認    | `npm run test:submit-pet-for-review` — **25 passed / 0 failed** |

---

## 8. トランザクション整合性

| 項目            | 2 リクエスト方式（旧）              | RPC 方式（今回）                       |
| --------------- | ----------------------------------- | -------------------------------------- |
| UPDATE + INSERT | 別 HTTP リクエスト                  | **同一 DB トランザクション**           |
| INSERT 失敗時   | status だけ `under_review` のリスク | **両方ロールバック**                   |
| 二重 log 防止   | UPDATE ガード                       | UPDATE ガード + RPC 内 status チェック |

---

## 9. 残課題

| #   | 項目                              | 内容                                                 |
| --- | --------------------------------- | ---------------------------------------------------- |
| 1   | 本番 DB 適用                      | 別途判断                                             |
| 2   | `prepare-sec-test-submit-pet.mts` | テスト Pet 自動準備（任意・繰り返し実行向け）        |
| 3   | 既存 RPC search_path 統一         | admin RPC を `search_path = ''` へ揃えるかは将来判断 |
| 4   | git commit / push                 | 未実施                                               |

### 完了済み（以前の残課題）

- ~~Migration 適用（開発 Supabase）~~
- ~~`npm run test:submit-pet-for-review` 全件合格~~

---

## 10. 実施しなかったこと

- git commit / push
- Trigger / RLS / admin RPC の変更
- 既存 `under_review` データへの submitted ログバックフィル

---

## 11. 関連ドキュメント

- [submit_pet_for_review RPC 設計調査](./2026-08-12_submit_pet_for_review_RPC設計調査.md)
- [審査申請 submitted ログ記録 実装完了報告](./2026-08-12_審査申請submittedログ記録実装完了報告.md)
- [管理者犬猫審査 RPC 設計比較](./2026-08-10_管理者犬猫審査_RPC設計比較.md)
- Migration: `supabase/migrations/20260810120000_create_pet_review_admin_rpcs.sql`（既存 admin RPC）

---

## 12. 次のステップ（参考）

1. AD-11 犬猫掲載審査詳細の実装
2. `prepare-sec-test-submit-pet.mts` の整備（テストデータ再利用性向上）
3. git commit（AD-10 / submitted ログ / submit RPC 一式）
