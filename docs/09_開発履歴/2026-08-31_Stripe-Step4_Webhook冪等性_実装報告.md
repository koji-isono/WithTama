# Stripe Step 4 — Webhook + 冪等性 実装報告

**日付:** 2026-08-31  
**範囲:** Stripe Webhook 受信・署名検証・event.id 冪等性・4 イベント handler 基盤（`membership_status` 状態遷移なし）  
**commit / push:** **未実施**（実装・テスト・本報告まで）

**正本:** [Stripe 第1期実装計画 Step 4](./2026-08-26_Stripe第1期実装計画.md) / Decision No.139〜148

---

## 1. 実装目的

Step 1〜3 で整備した billing 列・Checkout Session 作成に続き、Stripe Webhook から **署名検証済みイベント** を安全に受け取り、**service_role** 経由で課金同期列のみを更新する基盤を構築する。

Step 5 の `membership_status` 状態遷移（`active` / `suspended` / `canceled`）には **先回りしない**。

---

## 2. Webhook URL / 署名検証

| 項目       | 値                                                                       |
| ---------- | ------------------------------------------------------------------------ |
| Path       | **`POST /api/webhooks/stripe`**                                          |
| 実装       | `src/app/api/webhooks/stripe/route.ts`                                   |
| Raw body   | `await request.text()`（JSON.parse 前の本文）                            |
| 署名       | `Stripe-Signature` header                                                |
| 検証       | `Stripe.webhooks.constructEvent(body, signature, STRIPE_WEBHOOK_SECRET)` |
| Secret env | 既存 **`STRIPE_WEBHOOK_SECRET`** のみ（新規 env 追加なし）               |

### HTTP レスポンス

| 条件                                   | HTTP | body 概要                                                             |
| -------------------------------------- | ---- | --------------------------------------------------------------------- |
| 署名検証成功 + 処理成功                | 200  | `{ received: true }`                                                  |
| 対象外イベント                         | 200  | `{ received: true }`                                                  |
| 同一 event.id 再送（処理済み）         | 200  | `{ received: true }`                                                  |
| 同一 event.id 同時到着（1 件目処理中） | 503  | `{ error: "Webhook event is still being processed." }`（Stripe 再送） |
| Stripe-Signature なし                  | 400  | `{ error: "Stripe-Signature header is required." }`                   |
| 署名不正                               | 400  | `{ error: "Webhook signature verification failed." }`                 |
| Webhook Secret 未設定                  | 500  | `{ error: "Webhook is not configured." }`（Secret 値は含めない）      |
| 内部処理失敗                           | 500  | `{ error: "Webhook processing failed." }`（Stripe 再送可能）          |

---

## 3. 対象 4 イベント

| event.type                      | handler                             | 用途（Step 4）                               |
| ------------------------------- | ----------------------------------- | -------------------------------------------- |
| `checkout.session.completed`    | `handleCheckoutSessionCompleted`    | Customer / Subscription / breeder 正式紐付け |
| `customer.subscription.updated` | `handleCustomerSubscriptionUpdated` | Subscription 課金情報同期                    |
| `customer.subscription.deleted` | `handleCustomerSubscriptionDeleted` | Subscription 終了情報同期                    |
| `invoice.payment_failed`        | `handleInvoicePaymentFailed`        | 支払い失敗時刻同期                           |

その他イベントは **200 で安全に無視**（400 にしない）。

---

## 4. 冪等性設計（`stripe_webhook_events`）

Step 1 Migration 正本: `supabase/migrations/20260826173000_stripe_step1_billing_columns_and_protection.sql`

| 列                | 用途                                                  |
| ----------------- | ----------------------------------------------------- |
| `stripe_event_id` | Stripe `event.id`（**UNIQUE**）                       |
| `event_type`      | Stripe `event.type`                                   |
| `processed_at`    | claim 時は `created_at` と同値、finalize 後は成功時刻 |
| `created_at`      | 受信 claim 時刻                                       |

**payload 全文は保存しない**（PII 最小化 / Decision No.148）。

### フロー（Migration 追加なし — レビュー後改訂）

1. **claim:** `INSERT`（`stripe_event_id`, `event_type`）— `processed_at` / `created_at` は DB DEFAULT `now()` で同一時刻
2. **UNIQUE 競合 `23505`:** 既存行を SELECT し `isWebhookEventFinalized` で判定
   - `processed_at > created_at` → **処理済み** → HTTP **200**（再処理なし）
   - `processed_at <= created_at` → **処理中** → HTTP **503**（Stripe 再送）
   - 行なし（release 直後の競合）→ INSERT を **1 回再試行**
3. **handler 成功:** `finalizeWebhookEvent` — `processed_at` を成功時刻に UPDATE（`created_at` より後になる）
4. **handler 失敗:** `releaseWebhookEventClaim` — 行を **DELETE** し Stripe 再送を可能に

`processed_at` の意味（現行スキーマ）: **finalize 済み**（= `processed_at > created_at`）。claim 直後は「処理中」とみなす。

### 同時 Webhook 競合への最終判断

| 状況                               | 旧挙動                         | 改訂後                       |
| ---------------------------------- | ------------------------------ | ---------------------------- |
| 1 件目処理中に同一 event.id が到着 | UNIQUE → 200 duplicate（危険） | UNIQUE → **503 in-progress** |
| 処理完了後の Stripe 再送           | 200 duplicate                  | 200 duplicate（変更なし）    |
| handler 失敗後の Stripe 再送       | DELETE 後に再 claim 可         | 同左                         |

**Migration は今回追加していない。** 上記は既存列（`created_at` / `processed_at`）の比較で「処理中 vs 処理済み」を区別する。

### Migration 追加の要否（提案）

**Step 4 時点: 必須ではない**（上記比較ロジックで同時競合を 503 化）。

**中長期の推奨 Migration（Step 4 追補候補）** — 语义を DB スキーマで明示したい場合:

```sql
-- 提案のみ（未適用）
ALTER TABLE public.stripe_webhook_events
  ALTER COLUMN processed_at DROP NOT NULL,
  ALTER COLUMN processed_at DROP DEFAULT;

COMMENT ON COLUMN public.stripe_webhook_events.processed_at IS
  'NULL = claim only (in progress); NOT NULL = handler succeeded.';
```

| 観点                | 現行（比較方式）                                     | 提案（nullable）                                                          |
| ------------------- | ---------------------------------------------------- | ------------------------------------------------------------------------- |
| 処理中 / 成功の区別 | `processed_at > created_at`                          | `processed_at IS NULL` / `IS NOT NULL`                                    |
| RLS / trigger 影響  | なし                                                 | なし（service_role のみ）                                                 |
| 既存行              | finalize 済み行は `processed_at > created_at` で整合 | 既存行は `processed_at` 既に NOT NULL のためそのまま「処理済み」扱い可    |
| インデックス        | 現状維持                                             | `(processed_at) WHERE processed_at IS NULL` で in-progress 監視可（任意） |

**採用判断:** commit 前の現行実装は Migration なしで安全側（503）まで到達。nullable 化は可読性・運用監視のための **任意改善**。

---

## 5. service_role 使用箇所

既存 `createAdminClient()`（`src/lib/supabase/admin.ts`）を **再利用**。新規 service_role クライアントは作成していない。

| 操作                              | テーブル                | 関数                         |
| --------------------------------- | ----------------------- | ---------------------------- |
| 冪等性 claim / release / finalize | `stripe_webhook_events` | `claimWebhookEvent` 等       |
| breeder 課金列 UPDATE             | `breeders`              | `updateBreederWebhookFields` |
| breeder 参照                      | `breeders`              | `getBreederWebhookRowBy*`    |

Step 1 billing 列 protection trigger（authenticated / admin 直 UPDATE 拒否）は **維持**。

---

## 6. Customer / Subscription 紐付け

### checkout.session.completed

- `session.mode === "subscription"` を確認
- `metadata.breeder_id`（署名検証済み）から breeder 特定
- `customer` / `subscription` 存在確認（string ID / expanded 両対応）
- subscription が string ID のみの場合は `subscriptions.retrieve` で取得
- `assertCustomerIdMatches` — 既存 `stripe_customer_id` がある場合は一致必須
- `assertSubscriptionIdReplaceAllowed` — 別 subscription への上書きは、`membership_status === 'canceled'` または `subscription_status === 'canceled'` の再契約時のみ許可

### customer.subscription.updated / deleted

breeder 特定優先順位（`resolveBreederForSubscription`）:

1. `subscription.metadata.breeder_id`（存在時は resolved breeder と一致必須）
2. DB `stripe_subscription_id`
3. DB `stripe_customer_id`

曖昧な状態で別 breeder を更新しない。

### invoice.payment_failed

`resolveBreederForInvoice`:

1. `invoice.parent.subscription_details.subscription` → DB `stripe_subscription_id`
2. `invoice.customer` → DB `stripe_customer_id`

---

## 7. Product 検証方針（レビュー後改訂）

WithTama 方針: **Price ID / 金額一致だけで正規ブリーダー契約と判定しない** → Subscription Product 所属を検証。

### env 設計（Step 2 整合）

| env                         | Step 2                        | Step 3 Checkout             | Step 4 Webhook                  |
| --------------------------- | ----------------------------- | --------------------------- | ------------------------------- |
| `STRIPE_BREEDER_PRODUCT_ID` | `.env.example` に任意コメント | **未使用**（Price ID のみ） | **Subscription handler で検証** |

Step 3 への影響: **なし**（Checkout は `STRIPE_BREEDER_PRICE_ID` + Tax Rate のみ。Product 検証は Webhook 側で実施）。

### 必須化方針

| 環境                                    | `STRIPE_BREEDER_PRODUCT_ID`    | 挙動                                                                                    |
| --------------------------------------- | ------------------------------ | --------------------------------------------------------------------------------------- |
| **production**（`NODE_ENV=production`） | **必須**                       | 未設定 → handler 内 `product_validation_config` → **500** → claim release → Stripe 再送 |
| **非 production**（local / test）       | 任意                           | 未設定 → 検証 **スキップ**（既存テスト・ローカル dev を維持）                           |
| **Test Mode（Stripe）**                 | env に設定すれば本番同様に検証 | Dashboard の Product ID を env に設定（実値は Git / 報告書に記載しない）                |

実装: `resolveStripeBreederProductIdForValidation()` / `isStripeBreederProductIdRequired()`（`src/lib/stripe/env.ts`）。

**本番デプロイ前チェック:** Vercel 等に `STRIPE_BREEDER_PRODUCT_ID` を必ず設定すること。

---

## 8. イベント別 DB 更新項目（`membership_status` 除く）

| イベント                        | 更新列                                                                                                                                              |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `checkout.session.completed`    | `stripe_customer_id`, `stripe_subscription_id`, `stripe_price_id`, `subscription_status`, `subscription_current_period_end`, `cancel_at_period_end` |
| `customer.subscription.updated` | 同上                                                                                                                                                |
| `customer.subscription.deleted` | 同上（`subscription_status` は Stripe 側 status）                                                                                                   |
| `invoice.payment_failed`        | `last_payment_failed_at` のみ                                                                                                                       |

### `last_payment_failed_at` の時刻

Stripe Invoice に単一の「失敗時刻」フィールドが明確でないため、**`event.created`（Unix → ISO）** を採用。Webhook 受信時刻ベースで一貫性を確保。

### Stripe SDK v22 型対応

- `Subscription.current_period_end` は Subscription Item 側に移動 → `items.data[0].current_period_end` を使用
- `Invoice.subscription` トップレベル廃止 → `parent.subscription_details.subscription` を使用

---

## 9. membership_status を変更していないこと

- 全 handler の `updateBreederWebhookFields` は `BreederWebhookUpdate` 型で **`membership_status` を除外**
- Step 4 テスト（静的 + 型）で更新コード不在を確認

---

## 10. 個人情報 / Secret 非保存

- `stripe_webhook_events` に payload 保存なし
- ログは dev 時も `eventId` / `eventType` のみ（email / Customer 全文 / Invoice 全文なし）
- API レスポンスに Secret / Stripe オブジェクト全文 / カード情報なし
- 開発報告書・Git に Secret 実値なし

---

## 11. 変更ファイル一覧

### 新規

| ファイル                                                              | 概要                                  |
| --------------------------------------------------------------------- | ------------------------------------- |
| `src/app/api/webhooks/stripe/route.ts`                                | Webhook Route Handler                 |
| `src/features/billing/webhook/constants.ts`                           | パス・メッセージ・対象イベント定数    |
| `src/features/billing/webhook/errors.ts`                              | `WebhookHandlerError`                 |
| `src/features/billing/webhook/types.ts`                               | breeder 行 / update 型                |
| `src/features/billing/webhook/stripe-refs.ts`                         | Stripe ID 解決・同期フィールド抽出    |
| `src/features/billing/webhook/product-validation.ts`                  | Product 検証                          |
| `src/features/billing/webhook/repository.ts`                          | claim/release/finalize + breeder CRUD |
| `src/features/billing/webhook/resolve-breeder.ts`                     | breeder 特定・不一致ガード            |
| `src/features/billing/webhook/process-webhook-event.ts`               | イベントルーティング                  |
| `src/features/billing/webhook/handle-stripe-webhook-request.ts`       | 署名検証 + 冪等性オーケストレーション |
| `src/features/billing/webhook/handlers/checkout-session-completed.ts` | Checkout 完了 handler                 |
| `src/features/billing/webhook/handlers/subscription-events.ts`        | subscription updated/deleted          |
| `src/features/billing/webhook/handlers/invoice-payment-failed.ts`     | 支払い失敗 handler                    |
| `scripts/test-stripe-step4-webhook.mts`                               | Step 4 専用テスト                     |
| `scripts/mock-server-only.mts`                                        | テスト用 server-only スタブ           |

### 変更

| ファイル                   | 概要                             |
| -------------------------- | -------------------------------- |
| `package.json`             | `test:stripe-step4-webhook` 追加 |
| `src/lib/stripe/env.ts`    | Product ID 必須化ヘルパー追加    |
| `src/lib/stripe/config.ts` | 上記 re-export                   |
| `.env.example`             | Product ID 本番必須コメント更新  |

---

## 12. テスト結果

### Step 4 専用

```
npm run test:stripe-step4-webhook
→ 48 passed / 0 failed / 0 skipped
```

カバー: 署名なし/不正 → 400、**in-progress → 503**、finalize 済み duplicate → 200、`isWebhookEventFinalized`、production Product ID fail-closed、constructEvent、対象外 no-op、4 イベント登録、customer/subscription 不一致ガード、membership_status 非更新、Secret 非露出、DB UNIQUE 冪等性（integration）

### 回帰

| テスト                                 | 結果                       | 備考                                |
| -------------------------------------- | -------------------------- | ----------------------------------- |
| `test:stripe-step3-checkout`           | **37 PASS**                |                                     |
| `test:stripe-step2-server-config`      | **14 PASS**                |                                     |
| `test:stripe-step1-billing`            | **21 PASS / 1 SKIP**       | SKIP は RPC 別途実行推奨（既存）    |
| `test:breeder-application-submit-rpcs` | **41 PASS**                |                                     |
| `test:public-pet-read`                 | **22 PASS / 5 unverified** | 正規 prepare 後 PASS（下記）        |
| `lint`                                 | **PASS**                   |                                     |
| `typecheck`                            | **PASS**                   |                                     |
| `build`                                | **PASS**                   | `/api/webhooks/stripe` ルート確認済 |
| Prettier                               | 変更ファイル適用済         |                                     |

### public-pet-read 再確認

| 項目                | 結果                                                                                             |
| ------------------- | ------------------------------------------------------------------------------------------------ |
| 初回 FAIL 原因      | `prepare:sec-test-public-read` 実行時、`SEC_TEST_REVIEW_BREEDER` の `review_status !== approved` |
| Step 4 変更との関連 | **なし**（Stripe / Webhook コード未接触）                                                        |
| 正規手順            | `npm run prepare:sec-test-review-breeder` → `npm run test:public-pet-read`                       |
| 再実行結果          | **22 PASS / 0 FAIL / 5 unverified**（従来どおり optional env 未設定分）                          |

---

## 13. Stripe CLI

| 項目               | 状態                                                 |
| ------------------ | ---------------------------------------------------- |
| `stripe --version` | **未インストール**（OS PATH に `stripe` なし）       |
| 本 Cursor 作業     | **インストールしていない**（ユーザーと後日設定予定） |

---

## 14. 未決定事項

| 項目                              | 内容                                       |
| --------------------------------- | ------------------------------------------ |
| `processed_at` nullable Migration | 任意改善（§4 提案）。Step 4 では未適用     |
| `suspended` + Checkout            | Step 3 同様 Step 5 / Portal と合わせて確定 |
| Step 3 への Product 検証追加      | 任意（現状 Webhook 側で担保）              |

---

## 15. Step 5 へ送る事項

1. **`membership_status` 状態遷移マッピング**
   - `subscription_status`（`active` / `past_due` / `canceled` 等）→ `membership_status`（`active` / `suspended` / `canceled`）
2. **`invoice.payment_failed` → `suspended` 化**（Step 4 では `last_payment_failed_at` のみ）
3. **`customer.subscription.deleted` → `membership_status = canceled`**
4. **`checkout.session.completed` 完了時 → `membership_status = active`**（Product 検証 + Subscription 有効性確認後）
5. **再契約フロー** — Step 4 で `canceled` 時 subscription 上書き許可済。Step 5 で membership 遷移と整合
6. **Stripe CLI Test Mode 実通信** — Webhook forwarding 設定後 E2E 確認

---

## 16. 結論

Step 4（Webhook + 冪等性 + 4 イベント handler 基盤）は **レビュー指摘反映済み**。同時競合は **503**、本番 Product ID は **fail-closed**。Migration 追加なし（nullable 化は任意提案）。Secret 漏洩なし。`membership_status` 未変更。**commit 可能な状態**（Step 5 には未着手）。
