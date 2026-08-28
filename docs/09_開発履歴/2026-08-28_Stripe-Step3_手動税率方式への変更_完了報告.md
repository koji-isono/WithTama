# Stripe Step 3 — 手動 Tax Rate 方式への変更 完了報告

**日付:** 2026-08-28  
**範囲:** Checkout Session の税率適用を Stripe Tax（automatic_tax）から Dashboard 手動 Tax Rate へ変更  
**commit / push:** 2026-08-28 Step 3 完了コミット予定

**正本:** [Stripe Step 3 Checkout Session 実装報告](./2026-08-28_Stripe-Step3_Checkout-Session_実装報告.md)

---

## 1. 変更目的

WithTama 第1期ブリーダー月額会費について、Stripe Tax（`automatic_tax`）を使用せず、Stripe Dashboard で作成した **日本・消費税 10%・外税** の手動 Tax Rate を Checkout / Subscription に適用する方式へ変更した。

| 項目                | 方針                                                                                |
| ------------------- | ----------------------------------------------------------------------------------- |
| 本体価格            | 5,000 円（税抜）— **Stripe Price が正本**（コードへハードコードしない）             |
| 消費税              | 10% 外税 — **Stripe Tax Rate が正本**（コードへ 10% / 500 円 / 5,500 円を書かない） |
| Checkout 請求予定額 | 5,500 円（Stripe 側で計算）                                                         |
| Stripe Tax          | **不採用**（`automatic_tax` 削除）                                                  |
| 犬猫代金            | Stripe 不使用（変更なし）                                                           |

---

## 2. 実装概要

### 新規環境変数

| 変数                         | 用途                                    | 必須                    |
| ---------------------------- | --------------------------------------- | ----------------------- |
| `STRIPE_BREEDER_TAX_RATE_ID` | Dashboard 作成 Tax Rate ID（`txr_...`） | **必須**（Checkout 時） |

Secret ではないが、課金ルールを決定するため **サーバー env のみ** を正本とし、クライアントから受け取らない。

### Checkout Session params

| 項目       | 変更前                             | 変更後                                           |
| ---------- | ---------------------------------- | ------------------------------------------------ |
| 税         | `automatic_tax: { enabled: true }` | **削除**                                         |
| line_items | `price` + `quantity: 1`            | `tax_rates: [STRIPE_BREEDER_TAX_RATE_ID]` を追加 |

概念的構成:

```typescript
line_items: [
  {
    price: STRIPE_BREEDER_PRICE_ID,
    quantity: 1,
    tax_rates: [STRIPE_BREEDER_TAX_RATE_ID],
  },
];
```

### 維持したもの

- `POST /api/billing/checkout` のみ
- 認証・認可（401 / 403 / 404）
- membership gate（pending / canceled 可、active / suspended 不可）
- `metadata.breeder_id` / `subscription_data.metadata.breeder_id`
- Customer 方針（既存 `stripe_customer_id` or `customer_email`、DB 書込なし）
- success / cancel URL（サーバー管理）

### クライアント拒否キー追加

`tax_rate`, `taxRate`, `tax_rate_id`, `taxRateId`, `automatic_tax`, `automaticTax`

---

## 3. 変更ファイル一覧

| パス                                              | 変更内容                                                            |
| ------------------------------------------------- | ------------------------------------------------------------------- |
| `src/lib/stripe/env.ts`                           | `getStripeBreederTaxRateId()` 追加、`isStripeServerConfigured` 更新 |
| `src/lib/stripe/config.ts`                        | Tax Rate getter 再 export                                           |
| `src/features/billing/checkout-session-params.ts` | `automatic_tax` 削除、`tax_rates` 追加                              |
| `src/features/billing/create-checkout-session.ts` | env から Tax Rate ID 取得                                           |
| `src/features/billing/checkout-request.ts`        | 税率関連クライアントキー拒否                                        |
| `.env.example`                                    | `STRIPE_BREEDER_TAX_RATE_ID` 追加                                   |
| `scripts/test-stripe-step3-checkout.mts`          | 手動 Tax Rate 方式テスト                                            |
| `scripts/test-stripe-step3-checkout-live.mts`     | live テスト更新                                                     |
| `scripts/test-stripe-step2-server-config.mts`     | Tax Rate env テスト追加                                             |

**変更なし:** Webhook / DB / Migration / RLS / RPC / membership 更新 / BR-13

---

## 4. セキュリティ確認

| 確認項目                                                       | 結果                 |
| -------------------------------------------------------------- | -------------------- |
| クライアント Price / 金額 / Tax Rate 指定不可                  | PASS                 |
| Secret をエラー / レスポンスに含めない                         | PASS（既存方針維持） |
| 課金列 DB UPDATE なし                                          | PASS                 |
| `txr_...` 実値のコード / テスト / ドキュメントハードコードなし | PASS                 |

---

## 5. テスト結果

| テスト                                 | 結果                                                 |
| -------------------------------------- | ---------------------------------------------------- |
| `test:stripe-step3-checkout`           | **37 PASS / 0 FAIL**                                 |
| `test:stripe-step2-server-config`      | **14 PASS / 0 FAIL**（8b Tax Rate 追加）             |
| `test:stripe-step1-billing`            | **21 PASS / 0 FAIL / 1 SKIP**                        |
| `test:breeder-application-submit-rpcs` | **41 PASS**                                          |
| `test:breeder-review-rpcs`             | **36 PASS**                                          |
| `test:public-pet-read`                 | **22 PASS / 5 unverified**                           |
| lint / typecheck / build               | **PASS**                                             |
| 変更ファイル Prettier                  | **PASS**                                             |
| `test:stripe-step3-checkout-live`      | **PASS**（Test Mode Session 作成・Price / Tax 検証） |
| live テスト修正（2026-08-28 追記）     | expand 不可問題を修正                                |

**live テスト修正（追記）:** 初版 live テストは `sessions.retrieve({ expand: ['line_items.data.tax_rates'] })` を使用していたが、Stripe API では **当該 expand が不可**（`This property cannot be expanded`）。`listLineItems` 側の `data.tax_rates` expand も同様に不可。修正後は `listLineItems` + `expand: ['data.price']`、`taxRates.retrieve`、create params の `tax_rates`、line item の `amount_tax` で手動 Tax Rate 適用を検証。

**分類:** 初回 live 失敗は **live テスト実装起因**（expand 指定誤り）。アプリ Checkout 実装は変更なし。

---

## 6. Test Mode Checkout

| 項目                | 状態                                                                              |
| ------------------- | --------------------------------------------------------------------------------- |
| live テスト         | **PASS** — Test Mode で Checkout Session 1 件作成成功                             |
| Session             | `mode: subscription`、`metadata.breeder_id` 付与、`automatic_tax` 未使用          |
| Price               | `STRIPE_BREEDER_PRICE_ID` と line item price 一致                                 |
| Tax Rate            | create params に `tax_rates` 設定、`taxRates.retrieve` で active / exclusive 確認 |
| 金額（Stripe 返却） | subtotal 5,000 / tax 500 / total 5,500（Stripe 計算値。コードへハードコードなし） |
| Checkout URL        | **取得済**                                                                        |
| ブラウザ決済完了    | **PASS**（2026-08-28 E2E 確認済）                                                 |

---

## 6b. ブラウザ E2E 確認（2026-08-28）

Stripe Sandbox / Test Mode。

| 確認項目      | 結果                                                                                                                                         |
| ------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Checkout 画面 | 商品 WithTama ブリーダー月額会費、本体 5,000 円、税 500 円、合計 5,500 円、月次継続                                                          |
| 税方式        | 手動 Tax Rate（`automatic_tax` 不使用）                                                                                                      |
| テスト決済    | 4242 カードで 5,500 円成功。Dashboard 取引「成功」、Description: Subscription creation                                                       |
| Subscription  | Dashboard で有効・自動回収・税額計算手動・Price 5,000 円/月・初回 5,500 円                                                                   |
| success_url   | 完了後 `/login` 表示。**推測:** live test 直作成のため未ログイン状態で dashboard へ戻り認証ガードでリダイレクト。**Step 3 決済失敗ではない** |
| DB            | `membership_status` 等は pending のまま（Webhook 未実装のため正常）                                                                          |

---

## 7. 残課題

1. **ログイン済みブリーダー実導線 E2E** — BR-13 等 UI 実装後に success_url 戻りを再確認
2. `suspended` 時の再契約仕様（Step 3 既存どおり未決定）
3. Step 4 Webhook で Customer / Subscription 正式紐付け

---

## 8. Step 3 完了判定

- [x] Checkout Session 作成成功
- [x] Stripe Price 利用
- [x] 手動 Tax Rate 利用
- [x] `automatic_tax` 不使用
- [x] 5,000 + 税 500 = 5,500（Stripe 計算）
- [x] Test Mode 決済成功
- [x] Subscription 作成成功
- [x] Secret 漏洩なし
- [x] DB / Migration / RLS / RPC 変更なし

---

## 9. Git

| 項目          | 状態       |
| ------------- | ---------- |
| commit / push | **未実施** |
| Secret 漏洩   | **なし**   |
