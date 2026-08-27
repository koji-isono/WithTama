# public-pet-read 再発防止修正 完了報告

**日付:** 2026-08-27  
**範囲:** テスト脚本のみ（本番コード / DB / Migration / RLS 変更なし）  
**commit / push:** 未実施

関連: [prepare 失敗調査](./2026-08-27_public-pet-read_prepare失敗調査.md)

---

## 原因

`test-breeder-review-rpcs` 終了後に SEC_TEST breeder の `review_status=rejected` が残り、`prepare-sec-test-review-breeder` が `submitted/submitted/submitted` を前提としていたため、後続の `prepare-sec-test-public-read` / `test:public-pet-read` が連鎖失敗していた。

| 項目                       | 内容       |
| -------------------------- | ---------- |
| 本番コードの不具合         | **なし**   |
| Stripe Step 1 / 課金列保護 | **無関係** |
| BR-09 RPC 仕様             | **無関係** |

---

## 修正内容

### 修正1 — `scripts/test-breeder-review-rpcs.mts`

テスト正常終了時に `resetBreederSubmitted()` で SEC_TEST breeder を復帰。

| 更新する列                     | 値          |
| ------------------------------ | ----------- |
| `review_status`                | `submitted` |
| `identity_verification_status` | `submitted` |
| `business_verification_status` | `submitted` |
| `approved_at`                  | `null`      |

| 変更しない列              | 理由                                   |
| ------------------------- | -------------------------------------- |
| `membership_status`       | 要件どおり維持                         |
| `registration_expires_at` | 有効な場合は維持（無効時のみ将来日へ） |
| Stripe 課金列             | 触らない                               |

追加チェック: `cleanup reset to submitted`（**36 PASS** = 従来 35 + cleanup 1）

### 修正2 — `scripts/prepare-sec-test-review-breeder.mts`

idempotent 化。

| ケース | 状態                                                             | 動作                                                                    |
| ------ | ---------------------------------------------------------------- | ----------------------------------------------------------------------- |
| A      | `submitted/submitted/submitted` + 有効 `registration_expires_at` | `approved/verified/verified` へ更新                                     |
| B      | 既に `approved/verified/verified` + 有効期限 OK                  | **already prepared** として PASS（更新スキップ）                        |
| C      | `rejected` / `resubmission_required` 等                          | テスト用 admin reset（非課金列のみ）→ A へ。審査 RPC ルールは迂回しない |

---

## 制約遵守

| 項目                   | 変更 |
| ---------------------- | ---- |
| 本番コード             | なし |
| Migration              | なし |
| RLS                    | なし |
| RPC 仕様               | なし |
| membership_status 保護 | なし |
| Stripe 課金列保護      | なし |
| DB 手動 SQL            | なし |

---

## テスト実行（2026-08-27）

### 実行順

```bash
npm run test:breeder-review-rpcs
npm run prepare:sec-test-review-breeder   # 1回目
npm run prepare:sec-test-review-breeder   # 2回目
npm run test:public-pet-read
npm run test:stripe-step1-billing
npm run test:breeder-application-submit-rpcs
npm run lint
npm run typecheck
npm run format:check
npm run build
```

### 結果

| コマンド / チェック                        | 結果                             |
| ------------------------------------------ | -------------------------------- |
| `test:breeder-review-rpcs`                 | **36 PASS / 0 FAIL**             |
| `prepare:sec-test-review-breeder`（1回目） | **PASS**（submitted → approved） |
| `prepare:sec-test-review-breeder`（2回目） | **PASS**（already prepared）     |
| `test:public-pet-read`                     | **22 PASS / 0 FAIL / 5 未検証**  |
| `test:stripe-step1-billing`                | **21 PASS / 0 FAIL / 1 SKIP**    |
| `test:breeder-application-submit-rpcs`     | **41 PASS / 0 FAIL**             |
| lint                                       | **PASS**                         |
| typecheck                                  | **PASS**                         |
| format:check                               | **PASS**                         |
| build                                      | **PASS**                         |

### prepare 1回目（詳細）

```
PASS current review state (submitted/submitted/submitted with valid registration_expires_at)
PASS breeder review update
PASS final review state
Preparation completed
```

### prepare 2回目（詳細）

```
PASS current review state (already prepared (approved/verified/verified))
Preparation completed
```

---

## 変更ファイル

| ファイル                                                            | 種別            |
| ------------------------------------------------------------------- | --------------- |
| `scripts/test-breeder-review-rpcs.mts`                              | テスト脚本      |
| `scripts/prepare-sec-test-review-breeder.mts`                       | テスト脚本      |
| `docs/09_開発履歴/2026-08-27_public-pet-read_prepare失敗調査.md`    | 調査報告追記    |
| `docs/09_開発履歴/2026-08-26_Stripe-Step1_DB課金列保護_実装報告.md` | Step 1 報告追記 |

`.env.local`: git status に未表示 → **commit 対象外を確認**

---

## 次工程

1. Step 1 最終レビュー
2. commit / push
