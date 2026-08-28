# Stripe Step 3 — Test Mode 実動確認報告

**日付:** 2026-08-28  
**範囲:** Step 3 完了条件 — Stripe Test Mode Checkout Session 作成・ブラウザ E2E  
**状態:** **完了**

**関連:**

- [Stripe Step 3 Checkout Session 実装報告](./2026-08-28_Stripe-Step3_Checkout-Session_実装報告.md)
- [手動 Tax Rate 方式への変更 完了報告](./2026-08-28_Stripe-Step3_手動税率方式への変更_完了報告.md)

---

## 1. 最終報告

| 項目                       | 結果                                        |
| -------------------------- | ------------------------------------------- |
| **Step 3 Test Mode**       | **PASS（完了）**                            |
| **Checkout Session**       | **作成成功**                                |
| **mode**                   | **subscription**                            |
| **税方式**                 | **手動 Tax Rate**（`automatic_tax` 不使用） |
| **Checkout URL**           | **取得成功**                                |
| **ブラウザ E2E 決済**      | **PASS**（5,500 円・Subscription 作成）     |
| **DB 変更**                | **なし**                                    |
| **membership_status 変更** | **なし**（Webhook 未実装のため正常）        |
| **Webhook**                | **未実装**                                  |
| **Secret 漏洩**            | **なし**                                    |

---

## 2. 経緯

### 初回（env 未設定）

| 分類 | 内容                             |
| ---- | -------------------------------- |
| A    | `STRIPE_SECRET_KEY` 未設定       |
| C    | `STRIPE_BREEDER_PRICE_ID` 未設定 |

→ `.env.local` 設定後に再実行。

### live テスト expand エラー

`line_items.data.tax_rates` / `data.tax_rates` は Stripe API で expand 不可。live テストを `listLineItems` + `taxRates.retrieve` 方式に修正 → **PASS**。

### ブラウザ E2E（2026-08-28 最終）

Stripe Sandbox / Test Mode で以下を確認。

#### Checkout 画面

- 商品: WithTama ブリーダー月額会費
- 本体: 5,000 円 / 消費税（10%）: 500 円 / 合計: 5,500 円
- 1 ヶ月ごとの継続課金
- 手動 Tax Rate 方式（`automatic_tax` 不使用）

#### テスト決済

- Stripe テストカード 4242
- 5,500 円決済成功
- Stripe Dashboard「取引」: ステータス「成功」、Description: Subscription creation

#### Subscription

- Stripe Dashboard > Billing > サブスクで作成確認
- 商品: WithTama ブリーダー月額会費 / ステータス: 有効 / 回収: 自動
- 税額計算: 手動 / Price: 5,000 円/月 / 初回請求: 5,500 円

#### success_url

Checkout 完了後、`localhost:3000/login` が表示された。

**推測:** live test スクリプトから直接 Session を作成したため、WithTama ログインセッションを持たないブラウザで `/breeder/dashboard?checkout=success` へ戻り、認証ガードで `/login` へリダイレクトされた可能性。

**判定:** Step 3 Stripe 決済失敗とは **扱わない**。ログイン済みブリーダー実導線 E2E は BR-13 等実装後の残課題。

---

## 3. Step 3 完了判定

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

## 4. 残課題

1. ログイン済みブリーダー実導線 E2E（BR-13 等 UI 後）
2. Step 4 Webhook 実装

---

## 5. 次工程

**Step 4 — Webhook**（署名検証、`stripe_webhook_events`、membership / Customer / Subscription 紐付け）
