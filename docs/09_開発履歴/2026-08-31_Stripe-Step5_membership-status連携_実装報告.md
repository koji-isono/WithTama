# Stripe Step 5 — membership_status 連携 実装報告

**日付:** 2026-08-31  
**範囲:** Webhook 経由で Decision No.144 の `membership_status` 状態遷移を実装  
**commit / push:** **未実施**

**正本:** [Stripe 第1期実装計画 Step 5](./2026-08-26_Stripe第1期実装計画.md) / [Decision No.144](../01_設計変更管理/DecisionLog.md#decision-no144) / [Step 4 Webhook 実装報告](./2026-08-31_Stripe-Step4_Webhook冪等性_実装報告.md)

---

## 1. 実装目的

Step 4 Webhook 基盤の上に、Stripe Subscription 状態を WithTama `breeders.membership_status` へ **安全に反映**する。Step 6〜8（課金 UI / Portal / 公開 View 正式確認）には先回りしない。

---

## 2. 正本の状態遷移表

| 条件                                                         | `membership_status`      |
| ------------------------------------------------------------ | ------------------------ |
| A. 初回 Checkout 成功（`pending` + Subscription `active`）   | `pending` → **`active`** |
| B. Stripe `past_due`                                         | **`active` 維持**        |
| C. Stripe `unpaid`                                           | **`suspended`**          |
| D. 支払い回復（`active` / `past_due` → 有効）                | **`active`**             |
| E. 解約予約（Stripe `active` + `cancel_at_period_end=true`） | **`active` 維持**        |
| F. 契約期間終了（Stripe `canceled`）                         | **`canceled`**           |
| G. 再契約成功（`canceled` + 新 Subscription `active`）       | **`active`**             |

---

## 3. mapping 実装場所

| ファイル                                                            | 役割                                                                      |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| `src/lib/stripe/membership-mapping.ts`                              | 純粋関数（単体テスト可能）— Stripe status → membership                    |
| `src/features/billing/webhook/apply-subscription-webhook-update.ts` | Subscription + breeder 行 → DB 更新フィールド合成                         |
| 各 handler                                                          | Product 検証・breeder 解決後、`buildBreederUpdateFromSubscription` を呼ぶ |

---

## 4. イベント別 membership_status 更新

| イベント                        | membership 更新                                                                             |
| ------------------------------- | ------------------------------------------------------------------------------------------- |
| `checkout.session.completed`    | `pending`/`canceled` + Sub **`active`** → `active`（context=`checkout`）                    |
| `customer.subscription.updated` | 正本 mapping（context=`sync`）                                                              |
| `customer.subscription.deleted` | `canceled`（sync + mapping）                                                                |
| `invoice.payment_failed`        | `last_payment_failed_at` 更新 + **Subscription retrieve** 後 mapping（即 suspended しない） |

---

## 5. active 化の安全条件

Checkout / 再契約で `active` 化する前に handler 側で:

1. breeder 特定（metadata / DB 整合）
2. **Subscription retrieve**（Checkout は string ID 時も retrieve）
3. **`assertBreederSubscriptionProduct`**（Step 4 再利用、本番 fail-closed）
4. Customer / Subscription 不一致ガード（Step 4）
5. **`resolveMembershipForCheckoutSuccess`** — 現在 `pending`/`canceled` かつ Stripe status **`active`** のみ

Price ID / 金額 / Session 完了だけでは active 化 **しない**。

---

## 6. past_due / unpaid / 解約予約 / 解約完了

| Stripe status | membership                                  |
| ------------- | ------------------------------------------- |
| `active`      | `active`（`cancel_at_period_end` でも維持） |
| `past_due`    | `active`                                    |
| `unpaid`      | `suspended`                                 |
| `canceled`    | `canceled`                                  |

---

## 7. invoice.payment_failed

- **`last_payment_failed_at`** を Step 4 同様更新
- Subscription ID がある場合 **Stripe API retrieve** → Product 検証 → mapping 適用
- **`past_due` 中は active 維持**（即 `suspended` しない）
- **`unpaid` 時のみ `suspended`**

---

## 8. 未知 / 未決定 Stripe status

| status                              | 方針          | 理由                               |
| ----------------------------------- | ------------- | ---------------------------------- |
| `trialing`                          | **unchanged** | Decision No.144 — 第1期 trial なし |
| `incomplete` / `incomplete_expired` | **unchanged** | 契約未成立 — active 化しない       |
| `paused`                            | **unchanged** | 正本未記載 — 安全側で現状維持      |
| その他未知                          | **unchanged** | 推測で active 化しない             |

---

## 9. suspended_at

[Decision No.149](../01_設計変更管理/DecisionLog.md#decision-no149) に正式決定:

| 遷移                   | `suspended_at`               |
| ---------------------- | ---------------------------- |
| → `suspended`          | 現在時刻を設定               |
| `suspended` → `active` | **`null` でクリア**          |
| → `canceled`           | 変更なし（suspended 専用列） |

Migration **追加なし**。

---

## 10. イベント順序逆転への対応

`isStaleActiveEventAfterCancellation`: `membership_status=canceled` かつ **同一** `stripe_subscription_id` に対する `active` 復帰 mapping を **無視**（`subscription.deleted` 後の古い `subscription.updated` 対策）。

再契約（**新** subscription ID）は従来の re-contract ガードで許可。

---

## 11. pets.status 非変更

- handlers に `pets` テーブル UPDATE **なし**
- `review_status` 変更 **なし**
- 公開可否は既存 View 条件（Step 8 で正式確認）

---

## 12. service_role / Step 4 維持

- `createAdminClient()` 経由の `updateBreederWebhookFields` のみ
- 署名検証・冪等性 claim/release/finalize・503 in-progress・Product 検証 — **変更なし**

---

## 13. Step 3 Checkout（suspended）

**変更なし。** `membership-gate.ts` で `suspended` → 403 維持。Portal は Step 7。

---

## 14. DB / Migration

**変更なし。** Step 1 列（`membership_status`, `suspended_at` 等）を service_role で更新。

---

## 15. 変更ファイル一覧

### 新規

- `src/lib/stripe/membership-mapping.ts`
- `src/features/billing/webhook/apply-subscription-webhook-update.ts`
- `scripts/test-stripe-step5-membership-status.mts`

### 変更

- `src/features/billing/webhook/types.ts` — `membership_status`, `suspended_at` を update 対象に
- `src/features/billing/webhook/repository.ts` — select に `suspended_at`
- `src/features/billing/webhook/handlers/checkout-session-completed.ts`
- `src/features/billing/webhook/handlers/subscription-events.ts`
- `src/features/billing/webhook/handlers/invoice-payment-failed.ts`
- `scripts/test-stripe-step4-webhook.mts` — Step 5 連携チェック更新
- `package.json` — `test:stripe-step5-membership-status`

---

## 16. テスト結果

### Step 5

```
npm run test:stripe-step5-membership-status
→ 33 PASS / 0 FAIL
```

### Step 1〜4 回帰

| テスト                                    | 結果                       |
| ----------------------------------------- | -------------------------- |
| `test:stripe-step4-webhook`               | **48 PASS**                |
| `test:stripe-step3-checkout`              | **37 PASS**                |
| `test:stripe-step2-server-config`         | **14 PASS**                |
| `test:stripe-step1-billing`               | **21 PASS / 1 SKIP**       |
| `test:breeder-application-submit-rpcs`    | **41 PASS**                |
| `test:public-pet-read`（正規 prepare 後） | **22 PASS / 5 unverified** |
| lint / typecheck / build / Prettier       | **PASS**                   |

---

## 17. 未決定事項

| 項目                        | 内容                                                       |
| --------------------------- | ---------------------------------------------------------- |
| `paused` Subscription       | 正本未記載 — 現状維持。将来 Decision 追加時に mapping 拡張 |
| `suspended` からの Checkout | Step 3 は 403 維持。Portal 経由回復は Step 7               |
| Test Mode E2E 状態遷移      | Stripe CLI 実通信は Step 4 報告どおり未実施                |

`suspended_at` は **Decision No.149** で正式決定済み。

---

## 18. Step 6 へ送る事項

1. **BR-13 課金画面** — 現在の `membership_status` / `subscription_status` 表示
2. **pending / suspended / canceled 別 UI** と Checkout CTA 制御
3. **Customer Portal リンク**（Step 7 と連携）
4. **公開 View 連携** — Step 8 で `membership_status != active` 除外の E2E 確認

---

## 19. 結論

Step 5（membership_status 連携）は **実装・テスト完了**。Migration なし。Secret 漏洩なし。Step 4 基盤維持。**commit 可能な状態**（commit / push は未実施）。
