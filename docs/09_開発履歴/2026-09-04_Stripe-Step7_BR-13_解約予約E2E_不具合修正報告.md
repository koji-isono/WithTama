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

**未実施:** DB 手動更新 / Migration / BR-13 UI 変更 / 手動 E2E 再実施 / push

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
| hash    | （commit 後に追記）                                  |
| message | `fix(billing): detect scheduled Stripe cancellation` |

---

## 16. push の有無

**未実施**（ユーザー指示）

---

## 17. 未確認事項・残課題

| #   | 内容                                        | 区分           |
| --- | ------------------------------------------- | -------------- |
| 1   | Test Mode 手動 E2E（解約予約 → BR-13 表示） | **未実施**     |
| 2   | 解約取消 → 「利用中」復帰の手動 E2E         | **未実施**     |
| 3   | 本番 Stripe API version で同一挙動か        | **未確認**     |
| 4   | `trialing` / `paused` + `cancel_at` 境界    | 自動テストのみ |

---

## 18. 次に実施する手動 E2E

1. `stripe listen --forward-to localhost:3000/api/webhooks/stripe` 起動（whsec 同期）
2. active テスト用ブリーダーで `/breeder/billing` を開く
3. Portal で「期間終了時に解約」
4. Webhook 200 → DB `cancel_at_period_end=true` を確認
5. BR-13 再表示 → **「解約予定」「利用終了予定日」** を確認
6. Portal で「サブスクを続ける」→ DB `false` → **「利用中」** 復帰を確認

---

## 関連

- [原因調査報告](./2026-09-04_Stripe-Step7_BR-13_解約予約E2E_原因調査_報告.md)
- [BR-13 解約予約表示 実装報告](./2026-09-04_BR-13_解約予約表示対応_実装報告.md)
