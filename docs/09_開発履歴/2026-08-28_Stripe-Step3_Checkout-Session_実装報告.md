# Stripe Step 3 — Checkout Session 実装報告

**日付:** 2026-08-28  
**範囲:** 承認済みブリーダー向け Checkout Session 作成 API（Webhook / membership 更新なし）  
**commit / push:** 実施予定（2026-08-28 Step 3 完了）

**正本:** [Stripe 第1期実装計画 Step 3](./2026-08-26_Stripe第1期実装計画.md) / Decision No.143, No.144, No.146

---

## 1. サマリー

| 項目                      | 結果                               |
| ------------------------- | ---------------------------------- |
| API                       | **`POST /api/billing/checkout`**   |
| Checkout Session 作成     | **実装済**（`mode: subscription`） |
| membership_status 更新    | **未実装**（Step 4 / 5）           |
| Webhook                   | **未実装**（Step 4）               |
| 課金列 DB UPDATE          | **なし**（Step 1 trigger 維持）    |
| Migration / RLS / RPC     | **変更なし**                       |
| Step 3 静的テスト         | **37 PASS / 0 FAIL**               |
| Step 3 live テスト        | **PASS**（Test Mode Session 作成） |
| Test Mode E2E（ブラウザ） | **PASS**（2026-08-28 確認済）      |

---

## 2. API

### Path / Method

| 項目   | 値                        |
| ------ | ------------------------- |
| Path   | `/api/billing/checkout`   |
| Method | **POST のみ**（GET なし） |

### 認証・認可

| 条件                         | HTTP | エラーメッセージ（概要）       |
| ---------------------------- | ---- | ------------------------------ |
| 未ログイン                   | 401  | ログインが必要です             |
| admin                        | 403  | ブリーダーアカウント専用       |
| buyer 等 breeder 以外        | 403  | ブリーダーアカウント専用       |
| breeder レコードなし         | 404  | ブリーダー情報が見つかりません |
| `review_status !== approved` | 403  | 審査承認後に手続き可能         |

### membership_status（Decision No.144 準拠 + Step 3 安全側）

| 状態        | Checkout | 備考                               |
| ----------- | -------- | ---------------------------------- |
| `pending`   | **可**   | 初回契約                           |
| `canceled`  | **可**   | 再契約                             |
| `active`    | **不可** | 403「すでに有効な契約があります…」 |
| `suspended` | **不可** | 403（**未決定** — 下記参照）       |

**suspended 未決定:** Decision No.144 では再契約可能と読めるが、既存 Stripe Subscription の状態（`past_due` / Portal 要否等）を Step 3 では検証できない。推測で Checkout 可能にせず 403 とした。Step 4 以降（Subscription 状態取得 / Portal）で確定する。

### リクエスト body

- 空 body `{}` または body なし → **許可**
- 以下のクライアント指定キーは **400 拒否:**  
  `price_id`, `priceId`, `amount`, `breeder_id`, `breederId`, `line_items`, `lineItems`, `success_url`, `successUrl`, `cancel_url`, `cancelUrl`

### レスポンス

成功:

```json
{ "url": "https://checkout.stripe.com/..." }
```

失敗:

```json
{ "error": "ユーザー向け日本語メッセージ" }
```

Stripe Secret / Session 内部情報 / 生 Stripe エラーは返さない。

---

## 3. Stripe Checkout Session 設定

| 項目                                    | 値 / 方針                                                           |
| --------------------------------------- | ------------------------------------------------------------------- |
| `mode`                                  | `subscription`                                                      |
| `line_items`                            | `[{ price, quantity: 1, tax_rates: [STRIPE_BREEDER_TAX_RATE_ID] }]` |
| Price ID 取得元                         | **`STRIPE_BREEDER_PRICE_ID`**（`getStripeBreederPriceId()`）        |
| Tax Rate ID 取得元                      | **`STRIPE_BREEDER_TAX_RATE_ID`**（`getStripeBreederTaxRateId()`）   |
| 金額ハードコード                        | **なし**（Stripe Price / Tax Rate が正本）                          |
| `metadata.breeder_id`                   | **あり** — 認証ユーザーから解決した DB `breeders.id`                |
| `subscription_data.metadata.breeder_id` | **あり** — 同上                                                     |
| 税                                      | **手動 Tax Rate**（`automatic_tax` 不使用）                         |

### 税（手動 Tax Rate 方式）

- WithTama 料金正本は **税抜**（No.143）
- 消費税は Stripe Dashboard 手動 Tax Rate（日本・10%・外税）
- Checkout 請求額は Stripe 側計算（E2E: 5,000 + 500 = 5,500 円を確認済）
- `automatic_tax` は **不採用**（[手動 Tax Rate 方式への変更](./2026-08-28_Stripe-Step3_手動税率方式への変更_完了報告.md) 参照）

---

## 4. Customer 方針

| 状況                               | 実装                                                                     |
| ---------------------------------- | ------------------------------------------------------------------------ |
| `breeders.stripe_customer_id` あり | Stripe `customer` パラメータに使用                                       |
| なし                               | 認証ユーザーの `email` を `customer_email` に使用                        |
| 新規 Customer 事前作成             | **Step 3 では行わない**（Checkout が Customer 作成可）                   |
| DB への `stripe_customer_id` 保存  | **Step 3 では行わない** — Step 4 Webhook で正式紐付け（Step 1 保護維持） |

email 未設定かつ `stripe_customer_id` なし → **400**

---

## 5. success_url / cancel_url

| 項目         | 値                                                                            |
| ------------ | ----------------------------------------------------------------------------- |
| ベース URL   | `NEXT_PUBLIC_APP_URL`（末尾スラッシュ除去）。未設定時 `http://localhost:3000` |
| Host ヘッダ  | **信用しない**                                                                |
| success      | `{base}/breeder/dashboard?checkout=success`                                   |
| cancel       | `{base}/breeder/dashboard?checkout=cancel`                                    |
| BR-13 未実装 | 既存 **ブリーダーダッシュボード** へ戻す（存在確認済みルート）                |

---

## 6. 重複 Checkout 対策

| 対策                         | Step 3 の判断                                              |
| ---------------------------- | ---------------------------------------------------------- |
| 固定 Idempotency Key         | **採用しない** — 将来の再契約までブロックするリスク        |
| membership_status ゲート     | `active` / `suspended` で新規 Session 拒否                 |
| 未完了 Checkout Session 追跡 | **DB 列追加なし** — Step 3 範囲外                          |
| 連打による複数 Session       | **完全防止不可** — Step 4 以降（Webhook + 状態管理）で緩和 |

---

## 7. 変更ファイル

| パス                                              | 概要                               |
| ------------------------------------------------- | ---------------------------------- |
| `src/app/api/billing/checkout/route.ts`           | POST ルート                        |
| `src/features/billing/checkout-handler.ts`        | 認証・ゲート・オーケストレーション |
| `src/features/billing/checkout-request.ts`        | クライアント入力拒否               |
| `src/features/billing/membership-gate.ts`         | membership_status 判定             |
| `src/features/billing/checkout-session-params.ts` | Stripe Session パラメータ組立      |
| `src/features/billing/create-checkout-session.ts` | Stripe API 呼び出し                |
| `src/features/billing/checkout-urls.ts`           | success / cancel URL               |
| `src/features/billing/repository.ts`              | breeder 行取得                     |
| `src/features/billing/constants.ts`               | メッセージ・定数                   |
| `src/features/billing/types.ts`                   | 型定義                             |
| `scripts/test-stripe-step3-checkout.mts`          | 静的テスト                         |
| `scripts/test-stripe-step3-checkout-live.mts`     | Test Mode 実通信（1 Session）      |
| `package.json`                                    | test スクリプト追加                |

---

## 8. テスト

### Step 3 静的

```bash
npm run test:stripe-step3-checkout
```

**37 PASS / 0 FAIL / 0 SKIP**

主な検証: 401/403 条件、pending/canceled 可・active/suspended 不可、client price/amount/breeder_id/tax_rate 拒否、metadata、手動 tax_rates、automatic_tax 不使用、URL サーバー管理、Secret 非露出、課金列 UPDATE なし

### Step 3 Test Mode live + ブラウザ E2E

```bash
npm run test:stripe-step3-checkout-live
```

- Test Mode（`sk_test_` プレフィックス）で Session 1 件作成 **PASS**
- 手動 Tax Rate 適用（subtotal 5,000 / tax 500 / total 5,500）**PASS**
- **ブラウザ E2E 確認済（2026-08-28）** — 下記 §12

### 回帰（commit 前最終確認）

| テスト                                 | 結果                                     |
| -------------------------------------- | ---------------------------------------- |
| `test:stripe-step2-server-config`      | **14 PASS**                              |
| `test:stripe-step1-billing`            | **21 PASS / 1 SKIP**                     |
| `test:breeder-application-submit-rpcs` | **41 PASS**                              |
| `test:breeder-review-rpcs`             | **36 PASS**                              |
| `test:public-pet-read`                 | **22 PASS / 5 unverified**（prepare 後） |
| lint / typecheck / build               | **PASS**                                 |
| Step 3 変更ファイル Prettier           | **PASS**                                 |

---

## 9. セキュリティ確認

| 確認項目                                | 結果 |
| --------------------------------------- | ---- |
| Secret が API レスポンスに含まれない    | PASS |
| Stripe 生エラーをクライアントに返さない | PASS |
| クライアント Price / 金額指定不可       | PASS |
| 課金列クライアント UPDATE なし          | PASS |
| Migration 追加なし                      | PASS |

---

## 10. 未決定事項

1. **`suspended` 時の Checkout 開始条件** — Subscription 状態確認 / Portal 連携待ち
2. **未完了 Checkout Session の扱い** — DB 列または Stripe 側照会の設計（Step 4 以降）
3. **Checkout 連打対策の完全化** — Webhook + 状態管理後
4. **ログイン済みブリーダー実導線 E2E** — BR-13 等 UI 実装後に success_url 戻りを再確認

---

## 11. Test Mode ブラウザ E2E 確認（2026-08-28）

Stripe Sandbox / Test Mode で確認済。

### Checkout 画面

| 項目          | 確認内容                                |
| ------------- | --------------------------------------- |
| 商品          | WithTama ブリーダー月額会費             |
| 本体価格      | 5,000 円                                |
| 消費税（10%） | 500 円                                  |
| 合計          | 5,500 円                                |
| 課金形式      | 1 ヶ月ごとの継続課金                    |
| 税方式        | 手動 Tax Rate（`automatic_tax` 不使用） |

### テスト決済

| 項目                  | 確認内容                                               |
| --------------------- | ------------------------------------------------------ |
| カード                | Stripe テストカード 4242                               |
| 決済                  | 5,500 円 成功                                          |
| Stripe Dashboard 取引 | ステータス「成功」、Description: Subscription creation |

### Subscription

| 項目       | 確認内容                                    |
| ---------- | ------------------------------------------- |
| 作成       | Stripe Dashboard > Billing > サブスクで確認 |
| 商品       | WithTama ブリーダー月額会費                 |
| ステータス | 有効                                        |
| 回収方法   | 自動                                        |
| 税額計算   | 手動                                        |
| Price 表示 | 5,000 円/月                                 |
| 初回請求   | 税 500 円加算の 5,500 円                    |

### success_url について

Checkout 完了後、最終表示は `localhost:3000/login` だった。

**推測（記録）:** 今回の Session は live test スクリプトから直接作成したため、WithTama ログインセッションを持たないブラウザ状態で `/breeder/dashboard?checkout=success` へ戻り、認証ガードにより `/login` へリダイレクトされた可能性がある。

**判定:** Step 3 Stripe 決済失敗とは **扱わない**。通常のログイン済みブリーダー実導線 E2E は BR-13 等実装後に残課題。

### Step 3 完了判定

- [x] Checkout Session 作成成功
- [x] Stripe Price 利用
- [x] 手動 Tax Rate 利用
- [x] `automatic_tax` 不使用
- [x] 5,000 + 税 500 = 5,500 を Stripe が計算
- [x] Test Mode 決済成功
- [x] Subscription 作成成功
- [x] Secret 漏洩なし
- [x] DB / Migration / RLS / RPC 変更なし

---

## 12. 次工程

**Step 4 — Webhook**（署名検証、`stripe_webhook_events`、membership 反映）
