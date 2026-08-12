# submit_pet_for_review RPC 設計・影響調査

| 項目   | 内容                                                               |
| ------ | ------------------------------------------------------------------ |
| 調査日 | 2026-08-12                                                         |
| 対象   | `submitPetForReview()` の完全原子化（`submit_pet_for_review` RPC） |
| 種別   | **調査・設計のみ**（コード・Migration・DB 変更なし）               |

## 概要

現在の公開申請は PostgREST 2 リクエスト（`pets` UPDATE → `pet_review_logs` INSERT）で実装されている。  
本調査では、既存の `approve_pet_for_publish` / `return_pet_review` と設計思想を揃えた `submit_pet_for_review(p_pet_id uuid)` SECURITY DEFINER RPC による DB 内 1 トランザクション化を検討した。

---

## 1. 結論

| 質問                          | 回答                                                          |
| ----------------------------- | ------------------------------------------------------------- |
| **方式 A / B どちらを推奨か** | **方式 B（`submit_pet_for_review` RPC 移行）**                |
| **第1期として**               | RPC 移行を推奨。Migration 1 本 + Repository 差替 + テスト更新 |
| **方式 A を維持するケース**   | Migration 適用窗口が第1期に取れない短期間のみ                 |

**理由:**

1. Decision No.105（status + log のセット）を DB で保証できる唯一の現実的手段
2. 管理者審査 RPC（第5段階 29 件合格）と設計思想が一致
3. 現行 2 リクエストは二重 log 防止はできるが、**原子性欠如**（INSERT 失敗後の log 欠落）が残る
4. Trigger / 既存 admin RPC / RLS ポリシーの変更は不要

---

## 2. 現状（調査時点）

### アプリケーション層

```
submitPetForReviewAction (service.ts)
  → validatePetForReviewSubmit / photo count
  → submitPetForReview (repository.ts)
      1. pets UPDATE (draft → under_review, status guard)
      2. pet_review_logs INSERT (action = submitted)  ← UPDATE 成功時のみ
```

### 問題点

| 不整合                                   | 2 リクエスト方式            | RPC 方式 |
| ---------------------------------------- | --------------------------- | -------- |
| `under_review` だが `submitted` log なし | 起こりうる（INSERT 失敗時） | 防止     |
| log のみ追加で status 不変               | 起こりにくい                | 防止     |

---

## 3. 推奨 SQL 設計

Migration 候補: `20260812120000_create_submit_pet_for_review_rpc.sql`（admin RPC Migration の後）

```sql
CREATE OR REPLACE FUNCTION public.submit_pet_for_review(p_pet_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  v_pet public.pets%ROWTYPE;
BEGIN
  IF p_pet_id IS NULL THEN
    RAISE EXCEPTION 'pet id is required';
  END IF;

  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'authentication required';
  END IF;

  IF public.is_admin() THEN
    RAISE EXCEPTION 'invalid submit actor';
  END IF;

  SELECT *
  INTO v_pet
  FROM public.pets
  WHERE id = p_pet_id
    AND deleted_at IS NULL
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'pet not found';
  END IF;

  IF v_pet.status <> 'draft' THEN
    RAISE EXCEPTION 'invalid pet status';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.breeders b
    WHERE b.id = v_pet.breeder_id
      AND b.user_id = auth.uid()
  ) THEN
    RAISE EXCEPTION 'unauthorized';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.pet_photos pp
    WHERE pp.pet_id = p_pet_id
  ) THEN
    RAISE EXCEPTION 'photo required';
  END IF;

  UPDATE public.pets
  SET
    status = 'under_review',
    updated_by = auth.uid(),
    updated_at = now()
  WHERE id = p_pet_id
    AND deleted_at IS NULL
    AND status = 'draft';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'invalid pet status';
  END IF;

  INSERT INTO public.pet_review_logs (
    pet_id,
    action,
    comment,
    actor_user_id
  )
  VALUES (
    p_pet_id,
    'submitted',
    NULL,
    auth.uid()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.submit_pet_for_review(uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.submit_pet_for_review(uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.submit_pet_for_review(uuid) TO authenticated;
```

---

## 4. 確認項目への回答

### 4.1 SECURITY DEFINER が必要か

| 観点        | 結論                                                                                             |
| ----------- | ------------------------------------------------------------------------------------------------ |
| 管理者 RPC  | **必須** — `pets_update_admin` が無く、DEFINER で UPDATE                                         |
| breeder RPC | **必須ではない** — `pets_update_breeder_own` / `pet_review_logs_insert_submitted_breeder` が既存 |

**推奨:** 第1期は **SECURITY DEFINER** で admin RPC / `set_main_pet_photo` と揃える。

**代替:** SECURITY INVOKER も有効（RLS を活かし、関数内チェックを補助）。admin RPC との対称性は劣る。

|                      | SECURITY DEFINER（推奨）        | SECURITY INVOKER（代替） |
| -------------------- | ------------------------------- | ------------------------ |
| admin RPC との対称性 | ◎                               | △                        |
| RLS bypass リスク    | 関数内チェック必須              | RLS が最終防衛           |
| 原子性               | ◎                               | ◎                        |
| 既存 precedent       | `set_main_pet_photo`, admin RPC | Trigger（INVOKER）       |

### 4.2 search_path 固定

admin RPC と同様:

```sql
SET search_path = public, pg_temp
```

### 4.3 auth.uid() の検証

```sql
IF auth.uid() IS NULL THEN
  RAISE EXCEPTION 'authentication required';
END IF;
```

- `actor_user_id` は **引数に持たない**（Decision No.105）
- INSERT は常に `auth.uid()` を使用
- PostgREST 経由の DEFINER でも `auth.uid()` は呼び出し元 JWT を保持（admin RPC 第5段階テストで実証済み）

### 4.4 breeder 本人所有 pet の検証

```sql
EXISTS (
  SELECT 1 FROM public.breeders b
  WHERE b.id = v_pet.breeder_id
    AND b.user_id = auth.uid()
)
```

- `p_breeder_id` 引数は **持たない**（`p_pet_id` のみ）
- `FOR UPDATE` で行ロック後に検証
- DEFINER 時は RLS に頼らず関数内で必須

### 4.5 pets.status = draft の検証

二段階:

1. `IF v_pet.status <> 'draft'` で早期拒否
2. `UPDATE ... WHERE status = 'draft'` + `IF NOT FOUND`

admin RPC の `under_review` 確認と同パターン。

### 4.6 breeder 資格（No.107 相当）を RPC で検証すべきか

**結論: submit RPC では検証しない（No.107 は承認時のみ）**

| 条件                                      | submit（申請）   | approve（承認） |
| ----------------------------------------- | ---------------- | --------------- |
| `review_status = approved`                | 現状チェックなし | RPC で必須      |
| `identity_verification_status = verified` | なし             | RPC で必須      |
| `business_verification_status = verified` | なし             | RPC で必須      |
| `registration_expires_at`                 | なし             | RPC で必須      |

根拠:

- Decision No.107 は **`under_review → published`（管理者承認）** 向け
- 現行 `submitPetForReviewAction` も breeder 資格は未チェック
- 申請と承認の責務分離: 未承認 breeder の申請は AD-11 承認段階で拒否

**RPC に入れるべき breeder 側チェック（第1期）:**

| チェック                 | 推奨             | 根拠                                |
| ------------------------ | ---------------- | ----------------------------------- |
| 写真 1 枚以上            | **推奨**         | Decision No.96                      |
| 必須項目（品種・価格等） | **アプリ層維持** | `validatePetForReviewSubmit` が複雑 |
| `is_admin()` 拒否        | **推奨**         | Trigger と二重防御                  |

### 4.7 同一トランザクション化

PostgreSQL の plpgsql 関数本体は **暗黙の 1 トランザクション**:

```
BEGIN (暗黙)
  FOR UPDATE
  UPDATE pets
  INSERT pet_review_logs
COMMIT (正常終了時)
ROLLBACK (EXCEPTION 時 — UPDATE も INSERT も両方取り消し)
```

PostgREST の `.rpc()` 1 回 = 上記が保証される。

### 4.8 actor_user_id の設定

```sql
actor_user_id = auth.uid()  -- 引数・クライアント値は使わない
```

### 4.9 二重申請防止

| レイヤー | 手段                                                |
| -------- | --------------------------------------------------- |
| RPC      | `FOR UPDATE` + `status = 'draft'` 条件 UPDATE       |
| Trigger  | `draft → under_review` のみ許可（非 admin breeder） |
| アプリ   | `submitPetForReviewAction` の事前 status チェック   |
| ログ     | 2 回目は UPDATE 0 行 → EXCEPTION → INSERT なし      |

### 4.10 差戻し後の再申請

```
draft → under_review + submitted   (1回目)
under_review → draft + returned    (管理者差戻し)
draft → under_review + submitted   (2回目 — 新しい submitted 行)
```

- `pet_review_logs` は追記専用（Decision No.105）
- AD-10 は **最新 submitted** の `created_at` を使用
- RPC 側で特別処理不要

### 4.11 EXECUTE 権限

admin RPC と同じ:

| ロール          | EXECUTE                                             |
| --------------- | --------------------------------------------------- |
| `anon`          | **禁止**                                            |
| `authenticated` | **許可**（関数内で breeder 本人 + 非 admin を検証） |
| `PUBLIC`        | **禁止**                                            |

```sql
REVOKE ALL ... FROM PUBLIC;
REVOKE ALL ... FROM anon;
GRANT EXECUTE ... TO authenticated;
```

### 4.12 既存 RLS / Trigger との関係

```
Server Action (validatePetForReviewSubmit, photo count)
  → supabase.rpc('submit_pet_for_review', { p_pet_id })
      → [RPC: FOR UPDATE / 検証 / UPDATE / INSERT]  ← 1 TX
          → Trigger: enforce_pets_status_transition (UPDATE 時発火)
```

| コンポーネント                                  | 役割                       | 変更                 |
| ----------------------------------------------- | -------------------------- | -------------------- |
| `pets_update_breeder_own`                       | breeder 直接 UPDATE 用 RLS | **変更不要**         |
| `pet_review_logs_insert_submitted_breeder`      | breeder 直接 INSERT 用 RLS | **変更不要**         |
| `enforce_pets_status_transition`                | status 遷移 allowlist      | **削除・変更しない** |
| `approve_pet_for_publish` / `return_pet_review` | 管理者審査                 | **変更しない**       |

Trigger は **最終防御**として残す。

---

## 5. admin RPC との設計比較

| 項目           | `submit_pet_for_review` | `approve_pet_for_publish`  | `return_pet_review`     |
| -------------- | ----------------------- | -------------------------- | ----------------------- |
| 主体           | breeder（非 admin）     | admin                      | admin                   |
| 引数           | `p_pet_id` のみ         | `p_pet_id`                 | `p_pet_id`, `p_comment` |
| status 遷移    | `draft → under_review`  | `under_review → published` | `under_review → draft`  |
| log action     | `submitted`             | `approved`                 | `returned`              |
| breeder 資格   | **検証しない**          | **No.107 必須**            | 不要                    |
| `published_at` | 触らない                | `now()` 設定               | 触らない                |
| SECURITY       | DEFINER（推奨）         | DEFINER                    | DEFINER                 |
| Trigger        | 発火                    | 発火                       | 発火                    |
| 原子性         | UPDATE + INSERT         | UPDATE + INSERT            | UPDATE + INSERT         |

参照 Migration: `supabase/migrations/20260810120000_create_pet_review_admin_rpcs.sql`

---

## 6. アプリケーション影響範囲

| ファイル                          | 影響                                                                                                 |
| --------------------------------- | ---------------------------------------------------------------------------------------------------- |
| `src/features/pets/repository.ts` | `submitPetForReview` を `.rpc('submit_pet_for_review')` に置換。`insertPetReviewSubmittedLog` 削除可 |
| `src/features/pets/service.ts`    | **変更最小** — 申請前バリデーションは維持                                                            |
| `breeder-pets-list-content.tsx`   | 変更なし                                                                                             |
| `src/features/admin/*`            | 変更なし                                                                                             |
| `docs/06_API設計/pets.md`         | RPC 記載追加                                                                                         |
| Migration                         | 新規 1 ファイル                                                                                      |

Repository 変更イメージ:

```typescript
const { error } = await supabase.rpc("submit_pet_for_review", { p_pet_id: petId });
// error を解釈して boolean / メッセージに変換
```

---

## 7. セキュリティテスト移行

### 7.1 14 件テスト（`test-submit-pet-for-review.mts`）

**RPC 方式へ移行可能。**

```typescript
await supabase.rpc("submit_pet_for_review", { p_pet_id: petId });
```

| テスト観点                  | RPC 移行 |
| --------------------------- | -------- |
| draft → under_review        | ✅       |
| submitted 1 件              | ✅       |
| actor / pet_id / created_at | ✅       |
| 二重 log 防止               | ✅       |
| 他人 pet                    | ✅       |
| 不正 status                 | ✅       |

### 7.2 変更しないテスト

| スクリプト                     | 理由                                 |
| ------------------------------ | ------------------------------------ |
| `test-pets-status-trigger.mts` | Trigger 単体検証（直接 UPDATE 継続） |
| `test-pet-review-rpcs.mts`     | admin RPC（29 件）                   |

### 7.3 追加推奨テスト

- admin JWT から `submit_pet_for_review` 拒否
- 写真 0 枚 pet の拒否（RPC に photo check を入れた場合）

---

## 8. Migration rollback 方針

リポジトリは **forward-only Migration**（DOWN ファイルなし）。

| 段階                | 方針                                                                   |
| ------------------- | ---------------------------------------------------------------------- |
| ロールバック        | 新 Migration で `DROP FUNCTION public.submit_pet_for_review(uuid);`    |
| アプリ              | Repository を 2 リクエスト方式に戻す                                   |
| データ              | RPC 適用後に作成された `submitted` log は監査証跡として **削除しない** |
| Trigger / admin RPC | 触らない                                                               |

---

## 9. 方式 A / B 比較

| 観点               | A. 現行 2 リクエスト維持       | B. `submit_pet_for_review` RPC          |
| ------------------ | ------------------------------ | --------------------------------------- |
| 原子性             | INSERT 失敗時に log 欠落リスク | **DB が保証**                           |
| Service Role       | 不使用                         | 不使用                                  |
| RLS 回避           | なし                           | DEFINER 時は bypass（関数内検証で補完） |
| admin RPC との対称 | △                              | **◎**                                   |
| Migration          | 不要                           | **1 本必要**                            |
| 実装コスト         | 済                             | Repository 差替 + テスト更新            |
| 必須項目 bypass    | アプリ直叩きで可能             | RPC 直叩きで可能（現状と同程度）        |
| AD-10 申請日時     | 通常動作                       | **より信頼性高い**                      |

---

## 10. 推奨実装順（参考）

1. Migration 作成（`submit_pet_for_review` RPC）
2. Supabase へ適用
3. `repository.ts` を `.rpc()` 化
4. `test-submit-pet-for-review.mts` 更新
5. `docs/06_API設計/pets.md` 更新

---

## 11. 実施しなかったこと

- コード変更
- Migration 作成・実行
- DB 変更
- 既存 Trigger / admin RPC / RLS の変更

---

## 12. 関連ドキュメント

- [管理者犬猫審査 RPC 設計比較](./2026-08-10_管理者犬猫審査_RPC設計比較.md)
- [審査申請 submitted ログ記録 実装完了報告](./2026-08-12_審査申請submittedログ記録実装完了報告.md)
- [pet_review_logs テーブル](../05_データベース設計/pet_review_logs.md)
- [pets API](../06_API設計/pets.md)
- [Decision No.105 / No.106 / No.107](../01_設計変更管理/DecisionLog.md)
- Migration: `supabase/migrations/20260810120000_create_pet_review_admin_rpcs.sql`
