# Stripe Step 5 — membership_status 連携 E2E 完了報告

| 項目        | 内容                                                                                                                                                          |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 作業日      | 2026-09-02                                                                                                                                                    |
| 種別        | 実ブラウザ E2E 確認 → 開発履歴記録（**実装 commit は 2026-08-31 済**）                                                                                        |
| 実装 commit | **`52d407f`** — `feat: complete Stripe Step 5 membership status sync`（CI **#52 PASS**）                                                                      |
| 正本        | [Step 5 実装報告](./2026-08-31_Stripe-Step5_membership-status連携_実装報告.md) / [Webhook 転送調査](./2026-09-02_Stripe-Test-Mode-E2E_Webhook転送調査報告.md) |

**機密:** Stripe Secret / Webhook Secret / Service Role Key / Product ID / Price ID / Customer ID 等の **実値は本報告書に記載しない**。

---

## 1. 実施環境

| 項目               | 内容                                                       |
| ------------------ | ---------------------------------------------------------- |
| WithTama           | ローカル開発環境                                           |
| URL                | `http://localhost:3000`                                    |
| Stripe             | **Sandbox（Test Mode）**                                   |
| Stripe CLI         | `stripe listen` で localhost 転送                          |
| Webhook endpoint   | **`POST /api/webhooks/stripe`**                            |
| Webhook Secret env | **`STRIPE_WEBHOOK_SECRET`**（`.env.local`、commit 対象外） |

---

## 2. 確認したフロー（実ブラウザ E2E）

| #   | ステップ                                             | 結果 |
| --- | ---------------------------------------------------- | ---- |
| 1   | ブリーダー申請                                       | ✅   |
| 2   | 管理者によるブリーダー審査                           | ✅   |
| 3   | 管理者による承認                                     | ✅   |
| 4   | BR-13「月額会費」を表示                              | ✅   |
| 5   | 「月額会費のお支払いへ」を実行                       | ✅   |
| 6   | Stripe Checkout へ遷移                               | ✅   |
| 7   | WithTama ブリーダー月額会費を決済                    | ✅   |
| 8   | 税抜 5,000円                                         | ✅   |
| 9   | 消費税 10% 500円                                     | ✅   |
| 10  | 合計 5,500円                                         | ✅   |
| 11  | Stripe 上で Subscription 作成成功                    | ✅   |
| 12  | Stripe CLI で Webhook を localhost へ転送            | ✅   |
| 13  | `checkout.session.completed` を受信                  | ✅   |
| 14  | `POST /api/webhooks/stripe` が **HTTP 200**          | ✅   |
| 15  | WithTama 側 `membership_status` が **active** へ反映 | ✅   |
| 16  | BR-13 を再表示                                       | ✅   |
| 17  | 「**利用中**」と表示                                 | ✅   |
| 18  | 「月額会費のお支払いを確認できています。」と表示     | ✅   |
| 19  | 次回更新予定日「**2026年10月2日**」を表示            | ✅   |
| 20  | 「支払い方法を確認・変更」ボタンを表示               | ✅   |

---

## 3. Stripe CLI で確認した Webhook フロー

```
checkout.session.completed
  ↓
POST http://localhost:3000/api/webhooks/stripe
  ↓
HTTP 200 { received: true }
  ↓
membership_status: pending → active（他 Stripe 課金列も同期）
```

---

## 4. 判明した事項（初回決済後の表示ずれ）

| 現象                                                           | 原因                                                                               |
| -------------------------------------------------------------- | ---------------------------------------------------------------------------------- |
| Stripe 決済成功後も BR-13 が「お支払い手続きが必要です」のまま | **ローカル開発環境へ Stripe Webhook が届いていなかった**（Workbench 送信先未設定） |

### 解決手順（再決済なし）

1. `stripe listen --forward-to localhost:3000/api/webhooks/stripe` を起動
2. listen 出力の Webhook signing secret を `.env.local` の `STRIPE_WEBHOOK_SECRET` に設定
3. `npm run dev` を再起動
4. 既存の `checkout.session.completed` イベントを **Resend**
5. BR-13 が「利用中」に更新されることを確認

詳細: [Webhook 転送調査報告](./2026-09-02_Stripe-Test-Mode-E2E_Webhook転送調査報告.md)

---

## 5. Step 5 ビジネスルール最終確認

| ルール                                                                                      | 実装 | テスト                                    |
| ------------------------------------------------------------------------------------------- | ---- | ----------------------------------------- |
| Checkout 成功: `pending → active`（Product 検証後）                                         | ✅   | M1, W1, S2                                |
| 再契約: `canceled → active`                                                                 | ✅   | M2, W2                                    |
| `past_due`: active 維持（Smart Retry 期間）                                                 | ✅   | M4, W3, W7                                |
| `invoice.payment_failed`: `last_payment_failed_at` のみ（past_due 時は suspended 化しない） | ✅   | W7, Step 4 #36b                           |
| `unpaid`: `membership_status = suspended`, `suspended_at` 設定                              | ✅   | M5, W4, W8                                |
| 支払い回復: `suspended → active`, `suspended_at` クリア                                     | ✅   | M6, W5, M14                               |
| `cancel_at_period_end = true`: 期間終了まで active 維持                                     | ✅   | M7                                        |
| `subscription.deleted` / canceled: `membership_status = canceled`                           | ✅   | M8, W6                                    |
| 古い Subscription イベント: canceled 後の stale active を無視                               | ✅   | W9, `isStaleActiveEventAfterCancellation` |
| Product validation（Price/金額のみで active 化しない）                                      | ✅   | S2–S4, Step 4 #30–32                      |

---

## 6. 古い Subscription イベント対策

| 機構                                  | 内容                                                                                                |
| ------------------------------------- | --------------------------------------------------------------------------------------------------- |
| `assertSubscriptionIdReplaceAllowed`  | active 中に別 Subscription ID への上書きを拒否                                                      |
| `isStaleActiveEventAfterCancellation` | `membership_status=canceled` かつ **同一** `stripe_subscription_id` への active 復帰 mapping を無視 |
| `resolveBreederForSubscription`       | metadata / subscription_id / customer_id で breeder 解決後に整合性チェック                          |

**テスト:** Step 5 **W9. stale active after canceled blocked** — PASS

---

## 7. Product validation

- `assertBreederSubscriptionProduct` を checkout / subscription / invoice.payment_failed 全 handler で使用
- 本番: `STRIPE_BREEDER_PRODUCT_ID` 未設定時 fail-closed
- 非本番: env 未設定時はスキップ可（テスト: S4, Step 4 #30）
- env 設定時は Product 不一致で `WebhookHandlerError`（テスト: S3, Step 4 #32）

---

## 8. 回帰テスト結果（2026-09-02 再実行）

| テスト                                 | 結果                                                                                                                       |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| `npm run lint`                         | **PASS**                                                                                                                   |
| `npm run typecheck`                    | **PASS**                                                                                                                   |
| `npm run build`                        | **PASS**                                                                                                                   |
| `test:stripe-step5-membership-status`  | **33 / 33 PASS**                                                                                                           |
| `test:stripe-step4-webhook`            | **48 / 48 PASS**                                                                                                           |
| `test:stripe-step3-checkout`           | **37 / 37 PASS**                                                                                                           |
| `test:stripe-step2-server-config`      | **14 / 14 PASS**                                                                                                           |
| `test:stripe-step1-billing`            | **21 PASS / 1 SKIP**                                                                                                       |
| `test:stripe-step6-billing-ui`         | **33 / 33 PASS**                                                                                                           |
| `test:breeder-application-submit-rpcs` | **41 / 41 PASS**                                                                                                           |
| `test:public-pet-read`                 | **SKIP**（prepare: SEC_TEST breeder `review_status` が approved でない — E2E テストデータ状態。Step 5 実装不具合ではない） |

---

## 9. Migration

**なし。** Step 5 実装時点から Migration 追加なし（Step 1 列 + `stripe_webhook_events` を利用）。

---

## 10. 結論

**Stripe Step 5 正式完了**

- 実装: **`52d407f`**（2026-08-31, CI **#52 PASS**）
- 実ブラウザ E2E: **2026-09-02 確認済み**（Checkout → Webhook → `membership_status=active` → BR-13「利用中」）
- 次の Stripe Step: **Step 7 Customer Portal**（worktree 未 commit）
