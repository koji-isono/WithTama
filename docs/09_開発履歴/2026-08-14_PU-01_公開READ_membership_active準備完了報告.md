# PU-01 公開 READ セキュリティテスト — membership active 準備完了報告

| 項目     | 内容                                                                           |
| -------- | ------------------------------------------------------------------------------ |
| 作業日   | 2026-08-14                                                                     |
| 対象     | PU-01 公開犬猫一覧 `/pets` 公開 READ セキュリティテスト                        |
| 種別     | テストデータ準備スクリプト追加 + テスト修正 + 検証                             |
| 前提調査 | [公開写真 READ FAIL 原因調査](./2026-08-14_PU-01_公開写真READ_FAIL原因調査.md) |

---

## 1. 背景

SQL Editor 調査で、公開 View に Pet が出ない直接原因は **`breeders.membership_status = pending`** であることを確認。

| 項目                   | 値                                                                               |
| ---------------------- | -------------------------------------------------------------------------------- |
| 公開条件               | `review_status = approved` **かつ** `membership_status = active`                 |
| SEC-TEST ブリーダー    | `review_status = approved` だが `membership_status = pending` のまま             |
| 写真付き published Pet | `bb3c9725-5615-44aa-8913-286348203a41`（`[SEC-TEST] Submit RPC With Photo Pet`） |

**RLS / Migration / View 条件は変更していない。**

---

## 2. membership_status=active にする正しい方法

### 2.1 設計上の位置づけ

| 項目              | 内容                                                                                                               |
| ----------------- | ------------------------------------------------------------------------------------------------------------------ |
| 初期値            | `breeders.membership_status` デフォルト `pending`（`20260804135800_create_breeders.sql`）                          |
| 本番想定          | Stripe 課金完了後に `active` へ（未実装）                                                                          |
| 審査承認          | `prepare-sec-test-review-breeder.mts` が admin JWT で `review_status=approved` のみ更新。**membership は触らない** |
| admin UPDATE 経路 | `breeders_update_own` RLS — `is_admin()` なら UPDATE 可（既存設計）                                                |

### 2.2 採用した方法

**新規スクリプト `prepare-sec-test-public-read.mts`**

- 対象: **`SEC_TEST_REVIEW_BREEDER_ID` のみ**（env で固定、他ブリーダー不触）
- 前提: `review_status = approved`（未達なら abort → `prepare:sec-test-review-breeder` 実行を案内）
- 冪等:
  - 既に `active` → UPDATE スキップ（PASS: already active）
  - `pending` → admin JWT で `membership_status = 'active'` のみ UPDATE
  - `suspended` / `canceled` → abort（テスト都合で変更しない）
- **Service Role 不使用**（審査 prepare と同じ admin JWT + RLS）

---

## 3. 写真付き published Pet の利用

| 項目                     | 結果                                       |
| ------------------------ | ------------------------------------------ |
| Pet ID                   | `bb3c9725-5615-44aa-8913-286348203a41`     |
| 管理名                   | `[SEC-TEST] Submit RPC With Photo Pet`     |
| `pet_photos`             | main 写真 1 件                             |
| `published_pets_public`  | membership active 後 **anon から visible** |
| anon `pet_photos` SELECT | **count=1 PASS**                           |
| anon Signed URL          | **PASS**                                   |

prepare スクリプトがこの Pet を自動解決し、出力:

```
SEC_TEST_PUBLIC_PUBLISHED_PET_ID=bb3c9725-5615-44aa-8913-286348203a41
```

---

## 4. 変更ファイル

| 種別 | パス                                       |
| ---- | ------------------------------------------ |
| 新規 | `scripts/prepare-sec-test-public-read.mts` |
| 変更 | `scripts/test-public-pet-read.mts`         |
| 変更 | `package.json`                             |

### 4.1 テストスクリプト修正概要

| 修正                                                                        | 理由                                                                      |
| --------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| published Pet 探索: 写真付き `[SEC-TEST] Submit RPC With Photo Pet` を優先  | 写真なし Approve Pet #4 誤選定を防止                                      |
| `under_review` ID: `discovered` を `SEC_TEST_ADMIN_APPROVE_PET_ID` より優先 | stale env（published 化済み ID）による FAIL 防止                          |
| `breeder_public_profiles`: `SEC_TEST_REVIEW_BREEDER_ID` を直接 lookup       | 先頭 5 件依存の未検証を解消                                               |
| Storage root list: フォルダプレースホルダのみなら PASS                      | 公開 READ 適用後の Supabase list 挙動に整合（ファイル実体は非公開のまま） |

---

## 5. セキュリティテスト結果

```bash
npm run test:public-pet-read
```

### 5.1 prepare 結果

```
PASS SEC_TEST breeder membership_status active (already active)
PASS published pet with main photo available (bb3c9725-5615-44aa-8913-286348203a41)
PASS published pet visible in published_pets_public
```

### 5.2 セキュリティテスト結果

```
22 passed / 0 failed / 5 unverified
```

**目標（18 passed / 0 failed）を達成。**

### 5.3 未検証（5 件 — テストデータ env 未設定）

| チェック                                               | 理由                        |
| ------------------------------------------------------ | --------------------------- |
| draft pet storage signed url                           | draft Pet に写真なし        |
| returned pet excluded                                  | draft と同一 ID             |
| unapproved / suspended / canceled breeder pet excluded | 専用 SEC-TEST Pet ID 未設定 |

---

## 6. lint / typecheck / format:check / build

| コマンド               | 結果     |
| ---------------------- | -------- |
| `npm run lint`         | **PASS** |
| `npm run typecheck`    | **PASS** |
| `npm run format:check` | **PASS** |
| `npm run build`        | **PASS** |

---

## 7. セキュリティへの影響

| 項目                                  | 判定                                            |
| ------------------------------------- | ----------------------------------------------- |
| `is_publicly_listable_pet()` 条件変更 | **なし**                                        |
| `published_pets_public` 条件変更      | **なし**                                        |
| RLS 緩和                              | **なし**                                        |
| Storage bucket public 化              | **なし**                                        |
| 変更対象                              | **SEC-TEST ブリーダー 1 件のみ**（env 固定 ID） |

---

## 8. 運用

```bash
# 公開 READ セキュリティテスト（prepare 自動実行）
npm run test:public-pet-read

# prepare のみ
npm run prepare:sec-test-public-read
```

**初回または review 未承認時:**

```bash
npm run prepare:sec-test-review-breeder
npm run test:public-pet-read
```

**推奨 `.env.local` 追記（任意 — prepare が stdout 出力）:**

```
SEC_TEST_PUBLIC_PUBLISHED_PET_ID=bb3c9725-5615-44aa-8913-286348203a41
```

---

## 9. 残課題

| 項目                 | 内容                                                                 |
| -------------------- | -------------------------------------------------------------------- |
| 未検証 5 件          | unapproved / suspended / canceled 用 SEC-TEST データ整備（別タスク） |
| draft 写真否定テスト | draft Pet に写真を付けた否定ケース（任意）                           |
| `/pets` UI           | Migration + セキュリティテスト PASS 後に実装                         |

---

## 10. 次工程

**`/pets` UI 実装**（`published_pets_public` / `breeder_public_profiles` / Signed URL 利用）

---

## 11. `/pets` UI 実装へ進んでよい状態か

**YES**（公開 READ Migration 適用済み・セキュリティテスト 0 failed）
