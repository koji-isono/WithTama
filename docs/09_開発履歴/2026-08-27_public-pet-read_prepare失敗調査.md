# public-pet-read prepare 失敗 調査報告

**日付:** 2026-08-27  
**範囲:** `prepare:sec-test-review-breeder` / `prepare:sec-test-public-read` / `test:public-pet-read`  
**commit / push:** 未実施

---

## 症状

以下を順に実行した際、prepare が失敗し `test:public-pet-read` が開始できない。

```bash
npm run prepare:sec-test-review-breeder   # FAIL current review state
npm run prepare:sec-test-public-read        # FAIL review_status approved
npm run test:public-pet-read                # 内部 prepare で同上停止
```

直前の BR-09 回帰は PASS:

| コマンド                                       | 結果             |
| ---------------------------------------------- | ---------------- |
| `npm run test:breeder-application-submit-rpcs` | 41 PASS / 0 FAIL |
| `npm run test:breeder-review-rpcs`             | 35 PASS / 0 FAIL |

Stripe Step 1: 21 PASS / 0 FAIL / 1 SKIP

---

## `submitted/submitted/submitted` の意味

`scripts/prepare-sec-test-review-breeder.mts` の `isExpectedPreUpdateState()` が要求する状態:

| 順  | カラム                         | 期待値                |
| --- | ------------------------------ | --------------------- |
| 1   | `review_status`                | `submitted`           |
| 2   | `identity_verification_status` | `submitted`           |
| 3   | `business_verification_status` | `submitted`           |
| +   | `registration_expires_at`      | 今日以降（NULL 不可） |

prepare 成功後、admin JWT で `approved` / `verified` / `verified` へ更新する（課金列は触らない）。

---

## 開発 DB 上の SEC_TEST breeder 実値（READ ONLY）

対象: `SEC_TEST_REVIEW_BREEDER_ID`（`c975c260-d0b8-40f4-9745-1557c64eb856`）

| カラム                         | 実値           | prepare 期待値                | 一致 |
| ------------------------------ | -------------- | ----------------------------- | ---- |
| `review_status`                | **`rejected`** | `submitted`                   | ❌   |
| `identity_verification_status` | `submitted`    | `submitted`                   | ✅   |
| `business_verification_status` | `submitted`    | `submitted`                   | ✅   |
| `membership_status`            | `active`       | —（public-read は active 可） | —    |
| `registration_expires_at`      | `2030-01-01`   | 有効日付                      | ✅   |
| `approved_at`                  | `null`         | —                             | —    |

**不一致は `review_status` のみ。**

---

## 原因

**本番コードの不具合ではない。** テスト間の状態依存が原因。

### テスト終了時の breeder 状態

| テスト                                 | 終了時 `review_status` | 終了 cleanup            |
| -------------------------------------- | ---------------------- | ----------------------- |
| `test-breeder-application-submit-rpcs` | `submitted`            | ✅ `resetToSubmitted()` |
| `test-breeder-review-rpcs`             | **`rejected`**         | ❌ なし                 |

### 状態遷移の流れ

```
test:breeder-application-submit-rpcs
  → cleanup で submitted/submitted/submitted に復帰

test:breeder-review-rpcs
  → prepare:sec-test-breeder-review で submitted に reset（テスト開始時）
  → approve / return / reject テスト実行
  → reject_breeder_review（テスト 18）で review_status=rejected に
  → cleanup なしで終了

prepare:sec-test-review-breeder
  → submitted/submitted/submitted を要求 → FAIL

prepare:sec-test-public-read
  → review_status=approved を要求 → FAIL
```

`SEC_TEST_BREEDER_REVIEW_ID` / `RETURN_ID` / `REJECT_ID` は同一 breeder のため、reject テスト後 `rejected` が残る。

---

## 調査結論

| 項目                                       | 結果                              |
| ------------------------------------------ | --------------------------------- |
| **本番コードの不具合**                     | **なし**                          |
| **テスト準備スクリプトの問題**             | **あり**                          |
| **membership_status 保護 / Stripe Step 1** | **無関係**                        |
| **BR-09 RPC 仕様**                         | **無関係**                        |
| **DB 手動修正**                            | **不要**（既存 prepare で復旧可） |
| **コード修正**                             | **推奨**（再発防止）              |

### テスト設計上の問題点

1. **`prepare-sec-test-review-breeder`** — 前提状態を**検証のみ**し、未達時に reset しない（`prepare-sec-test-breeder-review` は reset あり）
2. **`test-breeder-review-rpcs`** — submit テストと違い**終了 cleanup なし**
3. **チェーン依存** — public-pet-read → public-read prepare（要 `approved`）→ review-breeder prepare（要 `submitted`）→ review RPC テスト後は `rejected`

---

## 即時復旧（DB 手動 UPDATE 不要）

```bash
npm run prepare:sec-test-breeder-review
npm run prepare:sec-test-review-breeder
npm run test:public-pet-read
```

| コマンド                          | 作用                                     |
| --------------------------------- | ---------------------------------------- |
| `prepare:sec-test-breeder-review` | `submitted/submitted/submitted` へ reset |
| `prepare:sec-test-review-breeder` | `approved/verified/verified` へ更新      |
| `test:public-pet-read`            | 内部 prepare + テスト本体                |

---

## 推奨コード修正（2026-08-27 実施済み）

| #   | 対象                                          | 内容                                                                          | 状態   |
| --- | --------------------------------------------- | ----------------------------------------------------------------------------- | ------ |
| ①   | `scripts/test-breeder-review-rpcs.mts`        | 終了時に `resetBreederSubmitted()` で submitted に復帰（submit テストと同様） | ✅実施 |
| ②   | `scripts/prepare-sec-test-review-breeder.mts` | idempotent 化: 未達なら reset、既に `approved` なら skip                      | ✅実施 |

---

## 再発防止修正後テスト（2026-08-27 実行）

### 実行順

```bash
npm run test:breeder-review-rpcs
npm run prepare:sec-test-review-breeder   # 1回目
npm run prepare:sec-test-review-breeder   # 2回目（idempotent）
npm run test:public-pet-read
npm run test:stripe-step1-billing
npm run test:breeder-application-submit-rpcs
npm run lint && npm run typecheck && npm run format:check && npm run build
```

### 結果

| コマンド / チェック                        | 結果                               |
| ------------------------------------------ | ---------------------------------- |
| `test:breeder-review-rpcs`                 | **36 PASS / 0 FAIL**（cleanup +1） |
| `prepare:sec-test-review-breeder`（1回目） | **PASS**（submitted → approved）   |
| `prepare:sec-test-review-breeder`（2回目） | **PASS**（already prepared）       |
| `test:public-pet-read`                     | **22 PASS / 0 FAIL / 5 未検証**    |
| `test:stripe-step1-billing`                | **21 PASS / 0 FAIL / 1 SKIP**      |
| `test:breeder-application-submit-rpcs`     | **41 PASS / 0 FAIL**               |
| lint / typecheck / format:check / build    | **PASS**                           |

---

## 次工程

1. Step 1 最終レビュー → commit / push
