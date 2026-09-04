# Stripe Step 7 + BR-13 解約予約 Test Mode E2E — 不具合修正報告

| 項目     | 内容                                                                         |
| -------- | ---------------------------------------------------------------------------- |
| 作業日   | 2026-09-04                                                                   |
| 種別     | **Webhook mapping 修正**（BR-13 UI 変更なし）                                |
| ベース   | `846a863`（Step 7 + BR-13 push 済）                                          |
| 正本調査 | [原因調査報告](./2026-09-04_Stripe-Step7_BR-13_解約予約E2E_原因調査_報告.md) |

**機密:** Stripe Secret / Webhook Secret / Customer ID / Subscription ID / メールアドレス等の **実値は本報告書に記載しない**。

---

## 1. 作業目的

Stripe Customer Portal の **期間終了解約予約** を WithTama が正しく認識し、Webhook 同期後に BR-13 で **「解約予定」** と表示できるようにする。

---

## 2. 原因

| 区分     | 内容                                                                                                                                     |
| -------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| 確認済み | Stripe API `2026-08-26.dahlia`（Test Mode E2E）で Portal 解約予約時 **`cancel_at_period_end=false`**、**`cancel_at=current_period_end`** |
| 確認済み | 既存 `extractSubscriptionSyncFields()` は `cancel_at_period_end` のみ DB 同期                                                            |
| 確認済み | BR-13 UI / loader は DB `cancel_at_period_end` を正しく表示（CASE B 不具合ではない）                                                     |

---

## 3. 修正方針

- DB schema **変更なし**。既存 `breeders.cancel_at_period_end` を内部フラグとして継続使用
- Stripe 固有判定を **`resolveSubscriptionCancelAtPeriodEnd()`** に閉じ込め、`extractSubscriptionSyncFields()` から利用
- BR-13 UI **変更なし**

### TRUE 条件

| #   | 条件                                                                                           |
| --- | ---------------------------------------------------------------------------------------------- |
| A   | `subscription.cancel_at_period_end === true`                                                   |
| B   | 終了済み status 以外 かつ `cancel_at != null` かつ `cancel_at === items[0].current_period_end` |

### FALSE

上記以外（`cancel_at != null` のみでは true にしない）

---

## 4. 実施内容

1. `resolveSubscriptionCurrentPeriodEndUnix()` を追加（既存 period end 取得と同一ソース）
2. `resolveSubscriptionCancelAtPeriodEnd()` を追加（CASE A / B 判定）
3. `extractSubscriptionSyncFields()` で上記関数を使用
4. Step 4 に CASE A〜E テスト追加
5. Step 6 に CASE B 統合テスト追加（`buildBreederUpdateFromSubscription` 経路）
6. 回帰テスト実行

**未実施:** DB 手動更新 / Migration / BR-13 UI 変更

**後日実施:** 手動 E2E（§19 参照） / push（§20 参照）

---

## 5. 変更ファイル一覧

| ファイル                                                                       | 内容                           |
| ------------------------------------------------------------------------------ | ------------------------------ |
| `src/features/billing/webhook/stripe-refs.ts`                                  | `cancel_at` ベース解約予約判定 |
| `scripts/test-stripe-step4-webhook.mts`                                        | CASE A〜E テスト（27b〜27g）   |
| `scripts/test-stripe-step6-billing-ui.mts`                                     | CASE B 統合テスト（38b）       |
| `docs/09_開発履歴/2026-09-04_Stripe-Step7_BR-13_解約予約E2E_不具合修正報告.md` | 本報告書                       |

---

## 6. 変更したロジック

```typescript
// resolveSubscriptionCancelAtPeriodEnd(subscription)
// A: cancel_at_period_end === true → true
// B: status ∉ {canceled, unpaid, incomplete_expired, incomplete}
//    && cancel_at != null
//    && cancel_at === items.data[0].current_period_end → true
//  else → false
```

SDK 型根拠:

- `subscription.cancel_at`: `number | null`（Unix 秒）
- `subscription.items.data[0].current_period_end`: `number`（Unix 秒、既存コードと同一）
- `subscription.status`: `Stripe.Subscription.Status`

---

## 7. CASE A〜E テスト内容・結果

| CASE | 内容                                                     | 結果                                 |
| ---- | -------------------------------------------------------- | ------------------------------------ |
| A    | `cancel_at_period_end=true`                              | **PASS**（Step 4 #27b）              |
| B    | `cancel_at_period_end=false`, `cancel_at === period_end` | **PASS**（Step 4 #27c, Step 6 #38b） |
| C    | `cancel_at=null`                                         | **PASS**（Step 4 #27d）              |
| D    | `cancel_at != period_end`                                | **PASS**（Step 4 #27e）              |
| E    | `status=canceled` + `cancel_at` あり                     | **PASS**（Step 4 #27f）              |

---

## 8. Step 4 / 5 / 6 / 7 結果

| スクリプト             | 結果             |
| ---------------------- | ---------------- |
| Step 4 webhook         | **54 / 54 PASS** |
| Step 5 membership      | **33 / 33 PASS** |
| Step 6 billing UI      | **43 / 43 PASS** |
| Step 7 Customer Portal | **38 / 38 PASS** |

---

## 9. lint 結果

**PASS**

---

## 10. typecheck 結果

**PASS**

---

## 11. build 結果

**PASS**

---

## 12. format:check 結果

変更ファイル 3 件に対する Prettier check: **PASS**

リポジトリ全体の `npm run format:check` は **無関係 docs の既存差分により FAIL**（今回修正ファイル外。commit 対象外）

---

## 13. Migration の有無

**なし**

---

## 14. セキュリティへの影響

| 項目                           | 影響     |
| ------------------------------ | -------- |
| Webhook 署名検証               | 変更なし |
| Stripe Secret クライアント露出 | なし     |
| Service Role クライアント露出  | なし     |
| breeder 特定ロジック           | 変更なし |

---

## 15. commit hash / message

| 項目    | 内容                                                 |
| ------- | ---------------------------------------------------- |
| hash    | `ed174c5`                                            |
| message | `fix(billing): detect scheduled Stripe cancellation` |

---

## 16. push の有無（修正 commit `ed174c5`）

**未実施**（修正 commit 時点）

---

## 17. 未確認事項・残課題

| #   | 内容                                        | 区分                                  |
| --- | ------------------------------------------- | ------------------------------------- |
| 1   | 本番 Stripe API version で同一挙動か        | **未確認**                            |
| 2   | `trialing` / `paused` + `cancel_at` 境界    | 自動テストのみ                        |
| 3   | 期間終了まで待つ `subscription.deleted` E2E | **未実施**（Step 5 自動テストで担保） |

---

## 18. 次に実施する手動 E2E（修正 commit 時点）

~~1. stripe listen 起動~~ → **§19 で PASS 済み**

---

## 19. 手動 E2E 結果

### 実施日

2026-09-04

### 環境

- Stripe Test Mode
- Stripe Customer Portal
- Stripe CLI Webhook forwarding
- localhost Next.js
- Supabase 接続環境

### 解約予約

| 項目                            | 結果     |
| ------------------------------- | -------- |
| Customer Portal 操作            | **PASS** |
| `customer.subscription.updated` | **PASS** |
| Webhook HTTP 200                | **PASS** |
| Supabase 同期                   | **PASS** |
| BR-13「解約予定」表示           | **PASS** |
| 利用終了予定日表示              | **PASS** |

確認内容（ユーザー実ブラウザ）:

- 初期: 「利用中」「次回更新予定日 2026年10月2日」
- Portal: 「10/02 に終了します」「サブスクを続ける」
- 再読み込み後: 「解約予定」「2026年10月2日に利用終了予定です。」「解約予定日までは引き続きご利用いただけます。」「利用終了予定日 2026年10月2日」

### 解約取消

| 項目                            | 結果     |
| ------------------------------- | -------- |
| Customer Portal 操作            | **PASS** |
| `customer.subscription.updated` | **PASS** |
| Webhook HTTP 200                | **PASS** |
| Supabase 同期                   | **PASS** |
| BR-13「利用中」復帰             | **PASS** |
| 次回更新予定日復帰              | **PASS** |

確認内容（ユーザー実ブラウザ）:

- Portal「サブスクを続ける」実行後、BR-13 が「利用中」「次回更新予定日 2026年10月2日」に復帰
- Stripe 側でも次回請求が復活（ユーザー目視確認）

### E2E 総合判定

**PASS**

### 確認できた一連のフロー

```
利用中
  → Customer Portal
  → 期間終了解約
  → customer.subscription.updated
  → Webhook
  → Supabase
  → BR-13 解約予定
  → Customer Portal
  → サブスク継続
  → customer.subscription.updated
  → Webhook
  → Supabase
  → BR-13 利用中
```

### 残課題（手動 E2E 時点）

- 本番 Stripe API version での同一挙動: **未確認**
- 期間終了後 `subscription.deleted` までの E2E: **未実施**（Step 5 自動テストで担保）
- `trialing` / `paused` 状態での Portal 解約予約: **未実施**

---

## 20. E2E 報告 commit

| 項目    | 内容                                                   |
| ------- | ------------------------------------------------------ |
| hash    | `4e1867e`                                              |
| message | `docs(billing): record Stripe cancellation E2E result` |

---

## 21. push 結果（修正 + E2E 報告）

| 項目   | 内容                                        |
| ------ | ------------------------------------------- |
| branch | `main`                                      |
| 結果   | **成功** — `846a863..4e1867e  main -> main` |
| 対象   | `ed174c5`（修正）+ `4e1867e`（E2E 報告）    |

---

## 22. GitHub Actions（push 後）

| 項目        | 結果                                                            |
| ----------- | --------------------------------------------------------------- |
| workflow    | **CI**（`.github/workflows/ci.yml`）                            |
| run         | **#63**                                                         |
| head commit | `4e1867e`                                                       |
| status      | **success**                                                     |
| URL         | https://github.com/koji-isono/WithTama/actions/runs/33845231278 |

### job: `quality`

| step                   | 結果    |
| ---------------------- | ------- |
| `npm ci`               | success |
| `npm run lint`         | success |
| `npm run typecheck`    | success |
| `npm run format:check` | success |
| `npm run build`        | success |

---

## 23. 旧 §17〜18（修正 commit 時点の記録）

<details>
<summary>修正 commit 時点の未確認・次手順（アーカイブ）</summary>

| #   | 内容                                        | 区分                  |
| --- | ------------------------------------------- | --------------------- |
| 1   | Test Mode 手動 E2E（解約予約 → BR-13 表示） | ~~未実施~~ → §19 PASS |
| 2   | 解約取消 → 「利用中」復帰の手動 E2E         | ~~未実施~~ → §19 PASS |

</details>

---

## 関連

- [原因調査報告](./2026-09-04_Stripe-Step7_BR-13_解約予約E2E_原因調査_報告.md)
- [BR-13 解約予約表示 実装報告](./2026-09-04_BR-13_解約予約表示対応_実装報告.md)

---

## 最終ドキュメント確定

| 項目                  | 内容                                                                 |
| --------------------- | -------------------------------------------------------------------- |
| 作業日                | 2026-09-04                                                           |
| 種別                  | ドキュメント整理のみ（**コード変更なし**）                           |
| 実施内容              | §20〜22（E2E 報告 commit / push 結果 / GitHub Actions #63）を commit |
| 手動 E2E 総合         | **PASS**（§19 参照）                                                 |
| Stripe Step 7 + BR-13 | **FINAL PASS**                                                       |

### 最終 docs commit

| 項目    | 内容                                                     |
| ------- | -------------------------------------------------------- |
| hash    | `8cc76a4`                                                |
| message | `docs(billing): finalize Stripe cancellation E2E report` |

### push 結果（最終 docs commit）

| 項目   | 内容                                        |
| ------ | ------------------------------------------- |
| branch | `main`                                      |
| 結果   | **成功** — `4e1867e..8cc76a4  main -> main` |

### GitHub Actions（最終 docs commit push 後）

| 項目        | 結果                                                            |
| ----------- | --------------------------------------------------------------- |
| workflow    | **CI**（`.github/workflows/ci.yml`）                            |
| run         | **#64**                                                         |
| head commit | `8cc76a4`                                                       |
| status      | **failure**                                                     |
| URL         | https://github.com/koji-isono/WithTama/actions/runs/33846118105 |

#### job: `quality`

| step                   | 結果    |
| ---------------------- | ------- |
| `npm ci`               | success |
| `npm run lint`         | success |
| `npm run typecheck`    | success |
| `npm run format:check` | failure |
| `npm run build`        | skipped |

**失敗原因:** 本報告書 MD の Prettier 未整形。機能コードは CI **#63**（`4e1867e`）で success 済み。

### git status（作業完了時点）

| 区分       | 内容                                                                 |
| ---------- | -------------------------------------------------------------------- |
| 対象 MD    | commit 済み（working tree に残存なし）                               |
| 無関係変更 | 他 docs / `next-env.d.ts` / `tsconfig.tsbuildinfo` 等 — **未 touch** |

### Stripe Step 7 + BR-13 総合判定

**FINAL PASS**

| 区分              | 結果     | 根拠                                |
| ----------------- | -------- | ----------------------------------- |
| Webhook 修正      | **PASS** | `ed174c5`                           |
| 手動 E2E          | **PASS** | §19                                 |
| 機能 CI           | **PASS** | Actions **#63**（`4e1867e`）        |
| 最終 docs CI      | **FAIL** | Actions **#64** — format:check のみ |
| Customer Portal   | **PASS** | `4bcc89e`                           |
| BR-13 解約予約 UI | **PASS** | `846a863`                           |

### CI クリーンアップ（format:check 修正）

| 項目             | 内容                                                   |
| ---------------- | ------------------------------------------------------ |
| 作業日           | 2026-09-04                                             |
| 対象 CI          | GitHub Actions **#64**（head: `8cc76a4`）              |
| 失敗 step        | `npm run format:check`                                 |
| 原因             | 本報告書 MD の Prettier 未整形                         |
| 対応             | 本報告書 MD を Prettier 整形（**機能コード変更なし**） |
| その他 step 結果 | `npm ci` / `lint` / `typecheck` — success（#64 時点）  |
