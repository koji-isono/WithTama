# Production Stripe Webhook 500 診断ログ追加 報告

| 項目   | 内容                                                                                                                                   |
| ------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| 作業日 | 2026-09-17                                                                                                                             |
| 種別   | **原因調査用の最小変更**（commit / push **未実施**）                                                                                   |
| 症状   | Checkout 決済成功後、`checkout.session.completed` 受信時に `/api/webhooks/stripe` が **500**、`{"error":"Webhook processing failed."}` |

**機密:** Secret Key / Webhook Secret / Checkout Session ID / Customer ID / Subscription ID 実値 / メール / JWT / Cookie はログ・本報告書に記載しない。

**関連ドキュメント:**

- [Stripe 本番 Checkout 環境変数設定障害 報告](./2026-09-16_Stripe本番Checkout環境変数設定障害_報告.md)
- [Production Stripe Checkout 失敗 診断ログ追加報告](./2026-09-16_Production_StripeCheckout失敗_診断ログ追加報告.md)
- [Stripe 本番環境設定 調査報告](./2026-09-15_Stripe本番環境設定調査報告.md)
- [Stripe Step 4 Webhook 冪等性 実装報告](./2026-08-31_Stripe-Step4_Webhook冪等性_実装報告.md)

---

## 1. 背景（Production 現象）

| 項目            | 内容                                                                      |
| --------------- | ------------------------------------------------------------------------- |
| Checkout 決済   | **成功**                                                                  |
| Stripe イベント | `checkout.session.completed` が WithTama へ送信されている                 |
| HTTP 応答       | `/api/webhooks/stripe` → **500**                                          |
| レスポンス body | `{"error":"Webhook processing failed."}`                                  |
| Vercel 観測     | Supabase `stripe_webhook_events` への **POST（claim INSERT）** までは確認 |
| ログ            | **具体的な例外内容が Production ログに出ていない**                        |

Checkout 側 env 修正後（[2026-09-16 報告](./2026-09-16_Stripe本番Checkout環境変数設定障害_報告.md)）は Session 作成成功。Webhook 処理段階での失敗原因特定が次の課題。

---

## 2. 作業内容

Webhook 処理の **catch 箇所** に、**Production でも**サーバー側のみ安全な一時診断ログを追加した。

| 項目           | 内容                                                                        |
| -------------- | --------------------------------------------------------------------------- |
| ログ出力       | `console.error`（Vercel Functions / Server Logs）                           |
| プレフィックス | `[webhooks/stripe] processing failed`                                       |
| 変更前         | `NODE_ENV === "development"` のときのみ `eventId` / `eventType` を 1 行出力 |
| 変更後         | **全環境**で構造化ログ（許可フィールド + 固定 stage ラベルのみ）            |

### 実施しなかったこと

| 項目                                | 状態                     |
| ----------------------------------- | ------------------------ |
| DB / Migration 変更                 | **なし**                 |
| RLS 変更                            | **なし**                 |
| Stripe Dashboard / Webhook 設定変更 | **なし**                 |
| 課金ロジック・Webhook ハンドラ変更  | **なし**（ログ追加のみ） |
| commit / push                       | **未実施**               |

---

## 3. 変更ファイル

| ファイル                                                              | 変更内容                                                         |
| --------------------------------------------------------------------- | ---------------------------------------------------------------- |
| `src/features/billing/webhook/webhook-diagnostics.ts`                 | **新規** — 安全な診断ログヘルパー                                |
| `src/features/billing/webhook/handle-stripe-webhook-request.ts`       | signature / claim / finalize の catch でログ。dev 限定ログを削除 |
| `src/features/billing/webhook/handlers/checkout-session-completed.ts` | 各処理段階の catch で stage 付きログ                             |
| `src/features/billing/webhook/handlers/subscription-events.ts`        | 同上（subscription 系イベント）                                  |
| `src/features/billing/webhook/handlers/invoice-payment-failed.ts`     | 同上（invoice 系イベント）                                       |
| `scripts/test-stripe-step4-webhook.mts`                               | チェック 39 を production-safe diagnostics 検証に更新            |

**変更していないファイル:** `repository.ts`（ロジック不変）、`process-webhook-event.ts`、`route.ts`（500 応答のみ）、Stripe env、Migration 等。

---

## 4. ログ出力内容

### 4.1 固定 stage ラベル

| stage ラベル                          | 該当処理                                                                |
| ------------------------------------- | ----------------------------------------------------------------------- |
| `signature verification`              | `Stripe.webhooks.constructEvent`                                        |
| `webhook event insert`                | `claimWebhookEvent` / `finalizeWebhookEvent`（`stripe_webhook_events`） |
| `checkout.session.completed handling` | Checkout Session バリデーション（mode / metadata / customer 存在確認）  |
| `breeder lookup`                      | `getBreederWebhookRowById` / `resolveBreederForSubscription` 等         |
| `subscription update`                 | Subscription 取得、Product 検証、`buildBreederUpdateFromSubscription`   |
| `billing status update`               | `updateBreederWebhookFields`（`breeders` 課金列更新）                   |

### 4.2 出力するフィールド

| フィールド         | 内容                                                        |
| ------------------ | ----------------------------------------------------------- |
| `stage`            | 上記固定ラベル                                              |
| `errorName`        | `error.name`（Error の場合）                                |
| `errorMessage`     | `error.message`                                             |
| `postgrestCode`    | Supabase / PostgREST エラー時の `code`（それ以外は `null`） |
| `postgrestDetails` | PostgREST `details`（文字列時のみ）                         |
| `postgrestHint`    | PostgREST `hint`（文字列時のみ）                            |

### 4.3 出力しないもの（遵守）

- Stripe Secret Key / Webhook Secret **実値**
- Checkout Session ID / Customer ID / Subscription ID **実値**
- JWT / Cookie
- メールアドレス・その他個人情報
- Stripe Event ID（`evt_...`）— 旧 dev ログにあった `eventId` も **出力しない**

### 4.4 期待ログ例

**Product 検証失敗（`STRIPE_BREEDER_PRODUCT_ID` 未設定等）:**

```text
[webhooks/stripe] processing failed {
  stage: 'subscription update',
  errorName: 'WebhookHandlerError',
  errorMessage: 'STRIPE_BREEDER_PRODUCT_ID is required in production',
  postgrestCode: null,
  postgrestDetails: null,
  postgrestHint: null
}
```

**Supabase UPDATE 権限エラー等:**

```text
[webhooks/stripe] processing failed {
  stage: 'billing status update',
  errorName: 'Object',
  errorMessage: 'permission denied for table breeders',
  postgrestCode: '42501',
  postgrestDetails: null,
  postgrestHint: null
}
```

---

## 5. Production での確認手順

1. Stripe Dashboard で `checkout.session.completed` を再送、または Checkout を再実行
2. Vercel Production Logs で `[webhooks/stripe] processing failed` を検索
3. **`stage`** で失敗段階を特定
4. **`errorMessage` / `postgrestCode`** を記録し、env（`STRIPE_BREEDER_PRODUCT_ID` 等）・DB 権限・breeder 行の有無を切り分け

**想定されやすい原因（参考）:**

| stage                   | 想定原因例                                                                    |
| ----------------------- | ----------------------------------------------------------------------------- |
| `subscription update`   | `STRIPE_BREEDER_PRODUCT_ID` 未設定 / Product 不一致（Production fail-closed） |
| `breeder lookup`        | `metadata.breeder_id` と DB 行の不整合                                        |
| `billing status update` | Supabase service_role / RLS / 列制約                                          |
| `webhook event insert`  | `stripe_webhook_events` への finalize UPDATE 失敗                             |

---

## 6. 検証結果

| コマンド                                      | 結果           |
| --------------------------------------------- | -------------- |
| `npm run lint`                                | **PASS**       |
| `npm run typecheck`                           | **PASS**       |
| `npm run build`                               | **PASS**       |
| `npm run test:stripe-step4-webhook`           | **54/54 PASS** |
| `npm run test:stripe-step5-membership-status` | **33/33 PASS** |

---

## 7. 既存ドキュメント・決定事項との整合

| 参照                                                                                         | 整合性                                                                                                                |
| -------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| [Stripe 本番環境設定 調査報告](./2026-09-15_Stripe本番環境設定調査報告.md)                   | **一致** — Production では `STRIPE_BREEDER_PRODUCT_ID` 必須。Webhook handler の Product 検証 fail-closed は設計どおり |
| [Stripe Step 4 Webhook 実装報告](./2026-08-31_Stripe-Step4_Webhook冪等性_実装報告.md)        | **一致** — claim / release / finalize の流れは変更なし。ログのみ追加                                                  |
| [Checkout 診断ログ追加報告](./2026-09-16_Production_StripeCheckout失敗_診断ログ追加報告.md)  | **一致** — 同方針（Production 安全・prefix boolean / stage ラベル・秘密情報非出力）                                   |
| [Stripe 本番 Checkout env 障害報告](./2026-09-16_Stripe本番Checkout環境変数設定障害_報告.md) | **矛盾なし** — Checkout 成功後の Webhook 500 は別フェーズの調査                                                       |

---

## 8. 次のアクション（本報告書作成時点）

| #   | アクション                                                               |
| --- | ------------------------------------------------------------------------ |
| 1   | 本変更を commit / push → Vercel Production 反映                          |
| 2   | Production で Webhook 再送 → Vercel Logs で `stage` / 例外内容を取得     |
| 3   | 原因確定後、env 修正 / DB 権限等 **必要最小限** の対応（別報告書で記録） |
