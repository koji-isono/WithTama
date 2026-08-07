# pets status 変更 セキュリティレビュー

| 項目 | 内容 |
|------|------|
| 調査日 | 2026-08-07 |
| 目的 | 公開申請（`draft → under_review`）の実行経路と status 変更のセキュリティ評価 |
| 対象 Migration | `20260807120000_harden_pets_rls.sql`（**未適用**） |
| 備考 | 調査のみ。コード・Migration 変更は行っていない |

---

## 前提

- `20260807120000_harden_pets_rls.sql` は **Supabase へ未適用**
- 以下の RLS 評価は、Migration ファイルの内容と、現行 DB（開発用 Policy が残っている可能性）を分けて記載

---

## 1. 公開申請を開始する UI ファイル

| ファイル | 役割 |
|---------|------|
| `src/app/breeder/pets/page.tsx` | 犬猫一覧ページ（Server Component） |
| `src/features/pets/components/breeder-pets-list-content.tsx` | 一覧 Card UI。「公開申請」ボタン（`status === "draft"` のみ） |
| `src/features/pets/components/pet-submit-review-dialog.tsx` | 確認ダイアログ（UI のみ、DB 操作なし） |

公開申請ボタンは `PetListCard` 内（`breeder-pets-list-content.tsx`）。確認後 `handleConfirmSubmit()` → `submitPetForReviewAction(pet.id)` を呼び出す。

---

## 2. Server Action / Service / Repository の呼び出し経路

```
/breeder/pets (page.tsx)
  └─ loadBreederPets() … 一覧表示のみ

BreederPetsListContent (Client)
  └─ PetListCard.handleConfirmSubmit()
       └─ submitPetForReviewAction(petId)     … service.ts ("use server")
            ├─ createClient() + auth.getUser()
            ├─ getPetByIdForBreeder(user.id, petId)
            ├─ pet.status === "draft" チェック（アプリ層）
            ├─ validatePetForReviewSubmit(pet)
            ├─ countPetPhotosForBreeder(user.id, petId) >= 1
            └─ submitPetForReview(user.id, petId, user.id)  … repository.ts
                 └─ supabase.from("pets").update({ status: "under_review", ... })
```

`pet_review_logs` への INSERT は **未実装**（Decision No.105 は将来対応）。

---

## 3. `pets.status` を `under_review` に UPDATE しているファイルと関数

| 層 | ファイル | 関数 |
|----|---------|------|
| Repository | `src/features/pets/repository.ts` | **`submitPetForReview()`** |

```typescript
// src/features/pets/repository.ts — submitPetForReview
const { data, error } = await supabase
  .from("pets")
  .update({
    status: "under_review",
    updated_by: updatedBy,
    updated_at: new Date().toISOString(),
  })
  .eq("id", petId)
  .eq("breeder_id", breederId)
  .eq("status", "draft")
  .select("id")
  .maybeSingle();
```

コードベース内で `status: "under_review"` を SET するのは **この関数のみ**。

`updatePetDraft()` は `status` を更新しない（基本情報フィールドのみ）。

---

## 4. Supabase クライアントは通常ユーザーのセッションを使っているか

**はい。**

- `submitPetForReview` → `createClient()` from `@/lib/supabase/server`
- `NEXT_PUBLIC_SUPABASE_URL` + `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`（anon key）
- Cookie 経由で **ログインユーザーの JWT** を使用

Server Action 内で実行されるため、RLS は **その breeder の `auth.uid()`** として評価される。

---

## 5. Service Role Key を使っているか

**公開申請フローでは使っていない。**

- `createAdminClient()`（`src/lib/supabase/admin.ts`）は pets 機能から **未参照**
- `submitPetForReview` / `submitPetForReviewAction` とも Service Role 不使用

---

## 6. UPDATE 時の WHERE 条件

### Repository（PostgREST / Supabase JS）

| 条件 | 値 |
|------|-----|
| `id` | `petId` |
| `breeder_id` | ログインユーザーに紐づく `breeders.id` |
| `status` | `'draft'` |

SET する列: `status = 'under_review'`, `updated_by`, `updated_at`

### Service 層の事前チェック（SQL 前）

- ログイン必須
- `getPetByIdForBreeder` で本人所有を確認
- `pet.status !== "draft"` ならエラー
- 必須項目バリデーション（`validatePetForReviewSubmit`）
- 写真 1 枚以上（`countPetPhotosForBreeder`）

---

## 7. `draft → under_review` の二重送信防止

| 層 | 机制 |
|----|------|
| UI | 申請中 `isSubmitting` でボタン無効化 |
| Service | `pet.status !== "draft"` なら拒否 |
| Repository | **`.eq("status", "draft")`** — 既に `under_review` なら 0 行更新 → `false` |

同時二重リクエストでも、SQL の `status = draft` 条件により **1 件のみ成功**（楽観的ロック相当）。アプリ層チェックだけではレースあり得るが、Repository 条件で最終防御。

---

## 8. ブリーダーが Supabase API を直接呼んだ場合、`published` に変更できるか

### 現行 DB（開発用 Policy が有効な場合）

**できる可能性が高い。**

`001_pets.sql` の `pets_allow_all_for_development` や Dashboard 上の `Development pets *`（`USING (true)` / `WITH CHECK (true)`）が残っていれば、authenticated ユーザーは **任意の `pets.status` へ UPDATE 可能**。

### `20260807120000_harden_pets_rls.sql` 適用後

**本人所有の犬猫であれば、理論上 `published` へ変更可能。**

`pets_update_breeder_own` は:

- USING / WITH CHECK: 本人 `breeder_id` + `deleted_at IS NULL` のみ
- **`status` 列の制限なし**

直接呼び出し例（JWT 付き）:

```javascript
supabase.from('pets').update({ status: 'published' }).eq('id', petId)
```

→ 本人の犬猫なら RLS を通過しうる。他人の犬猫は **不可**（ownership チェック）。

---

## 9. 現在の RLS だけで不正な status 遷移を防止できるか

**いいえ（hardened Migration 適用後も不可）。**

| 遷移 | RLS で防止 |
|------|-----------|
| 他人の pets への UPDATE | ✅ 防止 |
| 新規 INSERT が `draft` 以外 | ✅ 防止（INSERT Policy） |
| 本人 pets の `draft → under_review` | ✅ 許可（意図どおり） |
| 本人 pets の `draft → published`（API 迂回） | ❌ **防止不可** |
| 本人 pets の `under_review → published` | ❌ **防止不可** |
| 本人 pets の任意 status ジャンプ | ❌ **防止不可** |
| admin の `under_review → published` | admin UPDATE Policy 未作成のため不可（意図どおり未実装） |

status 遷移の厳密制御は **アプリ層（Server Action）のみ**。RLS は **所有者スコープ** に留まる設計（Migration 内コメントも同旨）。

---

## 10. DB 側で status 遷移を保証する場合の最小変更案

大規模変更なしで効果が高い順:

### 案 A: `BEFORE UPDATE` トリガー（最小・横断的）

```sql
-- 疑似コード
CREATE FUNCTION enforce_pets_status_transition() ...
-- OLD.status / NEW.status の許可遷移のみ通す
-- 例: breeder JWT では draft→under_review のみ（is_admin() なら別ルール）
```

- Migration 1 本追加
- 既存 `submitPetForReview` の Supabase JS UPDATE はそのまま利用可
- 直接 API 迂回も DB で拒否

### 案 B: SECURITY DEFINER RPC（Decision No.94 / No.105 と整合）

| 関数 | 遷移 | 呼び出し元 |
|------|------|-----------|
| `submit_pet_for_review(p_pet_id)` | `draft → under_review` + `pet_review_logs` INSERT | 既存 Repository から RPC 呼び出し |
| `approve_pet_for_publish(...)` | `under_review → published` | 将来 admin Action |
| `return_pet_review(...)` | `under_review → draft` | 将来 admin Action |

- 一般ユーザーへの `pets` 直接 UPDATE を REVOKE または RLS で status 変更不可に近づける
- 変更範囲は Repository の呼び出し差し替え + Migration

### 案 C: RLS `WITH CHECK` で status 固定（非推奨・限界あり）

PostgreSQL RLS の UPDATE `WITH CHECK` は **NEW 行のみ**参照可能で OLD.status との比較ができないため、**遷移制御には不向き**。案 A または B が現実的。

**推奨:** 短期は **案 A（トリガー）**、中長期は **案 B（専用 RPC + pet_review_logs 同時記録）** を Decision No.94 / No.105 に沿って導入。

---

## リスク整理

| 状態 | リスク |
|------|--------|
| DB が開発用全許可 Policy のまま | **最高** — 越権・任意 status 変更が可能 |
| hardened RLS 適用後 | **中** — 本人 pets への任意 status 変更は API 迂回で可能 |
| アプリ経由の公開申請 | **低** — 多層チェック + SQL `status = draft` で妥当 |

公開申請フロー自体の実装は、Server Action + ユーザー JWT + 所有者スコープ + `status = draft` 条件で **設計意図どおり**。弱点は **RLS が status 列を縛らない**点と、**未適用時の開発用 Policy** である。

---

## 関連ドキュメント

- [pets テーブル](../05_データベース設計/pets.md)
- [権限設計](../07_権限設計/README.md)
- [2026-08-07_管理者機能調査](./2026-08-07_管理者機能調査.md)
- [Decision No.94](../01_設計変更管理/DecisionLog.md#decision-no94) — 専用業務操作
- [Decision No.103](../01_設計変更管理/DecisionLog.md#decision-no103) — pets RLS 本番化
- [Decision No.105](../01_設計変更管理/DecisionLog.md#decision-no105) — pet_review_logs

## 関連 Migration（未適用）

- `supabase/migrations/20260807120000_harden_pets_rls.sql`
- `supabase/migrations/20260807110000_create_pet_review_logs.sql`
