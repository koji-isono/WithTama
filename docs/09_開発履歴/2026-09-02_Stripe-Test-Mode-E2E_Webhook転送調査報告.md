# Stripe Test Mode E2E — Webhook 転送調査報告

| 項目   | 内容                                                                                                                                                            |
| ------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 調査日 | 2026-09-02                                                                                                                                                      |
| 種別   | **調査のみ**（コード変更 / Migration / commit / push / 新規決済 / Subscription 変更 **なし**）                                                                  |
| ベース | `origin/main` = **`0859705`**（CI **#60 PASS**）                                                                                                                |
| 関連   | [Step 4 Webhook 実装報告](./2026-08-31_Stripe-Step4_Webhook冪等性_実装報告.md) / [Step 7 E2E 事前調査](./2026-08-31_Stripe-Step7_Test-Mode-E2E_事前調査報告.md) |

**機密:** `STRIPE_WEBHOOK_SECRET` / `whsec_...` / Stripe Secret / Customer ID 等の **実値は本報告書に記載しない**。

---

## 1. 背景・症状

| 項目                         | 状態                                             |
| ---------------------------- | ------------------------------------------------ |
| テストユーザー               | `test_3@ssci.co.jp`                              |
| Stripe Checkout（Test Mode） | **成功**（Customer 作成済み、Subscription 有効） |
| 初回決済                     | 5,500円（税込）成功                              |
| 次回請求                     | 設定済み                                         |
| WithTama BR-13               | **「お支払い手続きが必要です」のまま**           |
| `membership_status`          | **`active` に未反映**（`pending` 想定）          |
| Stripe Workbench             | **Webhook 送信先 未設定**                        |

**解釈:** 決済は Stripe 側で完了しているが、**Webhook が WithTama に届いていない**ため Step 4/5 の DB 同期が実行されていない。

---

## 2. 原因

| 層           | 内容                                                             |
| ------------ | ---------------------------------------------------------------- |
| Stripe       | Workbench に Webhook endpoint 未設定 → イベント未配送            |
| WithTama     | `checkout.session.completed` 未処理 → `membership_status` 未更新 |
| ローカル dev | Stripe CLI `listen` 未使用 → localhost へ forward されていない   |

初回有効化の正本イベント: **`checkout.session.completed`**（`metadata.breeder_id` → Subscription 取得 → `membership_status = active` 等を Webhook handler が更新）。

---

## 3. Stripe CLI インストール状況

| 項目               | 結果                                         |
| ------------------ | -------------------------------------------- |
| `stripe --version` | **未インストール**（PATH に `stripe` なし）  |
| 調査時の作業       | **インストールは未実施**（ユーザー操作待ち） |

### Windows へのインストール方法（参考）

**方法 A — winget（推奨・1 コマンド）:**

```powershell
winget install --id Stripe.StripeCli -e
```

**方法 B — Scoop:**

```powershell
scoop bucket add stripe https://github.com/stripe/scoop-stripe-cli.git
```

```powershell
scoop install stripe
```

**方法 C — GitHub 直ダウンロード:**

https://github.com/stripe/stripe-cli/releases の Windows 用 zip を PATH の通った場所に展開。

---

## 4. WithTama Webhook エンドポイント（コード確認）

| 項目            | 値                                                           |
| --------------- | ------------------------------------------------------------ |
| HTTP            | **POST のみ**                                                |
| Path            | **`/api/webhooks/stripe`**                                   |
| Route           | `src/app/api/webhooks/stripe/route.ts`                       |
| 定数            | `STRIPE_WEBHOOK_API_PATH`（`webhook/constants.ts`）          |
| 署名検証        | `Stripe.webhooks.constructEvent(rawBody, signature, secret)` |
| Secret 環境変数 | **`STRIPE_WEBHOOK_SECRET`**（`src/lib/stripe/env.ts`）       |
| Secret 未設定   | HTTP **500** — `Webhook is not configured.`                  |
| 署名不正        | HTTP **400** — `Webhook signature verification failed.`      |

---

## 5. ローカル開発サーバー

| 項目     | 値                          |
| -------- | --------------------------- |
| コマンド | `npm run dev`               |
| URL      | **`http://localhost:3000`** |
| env      | `.env.local` を読込         |

---

## 6. Stripe CLI listen コマンド

```powershell
stripe listen --forward-to localhost:3000/api/webhooks/stripe
```

起動前に **`stripe login`**（Test mode アカウント連携）が必要。

---

## 7. Webhook signing secret の設定

| 項目         | 内容                                                                    |
| ------------ | ----------------------------------------------------------------------- |
| 環境変数名   | **`STRIPE_WEBHOOK_SECRET`**                                             |
| 設定ファイル | **`.env.local`**（commit しない）                                       |
| 値の取得元   | `stripe listen` 起動時に表示される **`whsec_...`**                      |
| 注意         | Dashboard Workbench の endpoint secret とは **別**（listen 出力を使う） |
| 反映         | `.env.local` 更新後 **`npm run dev` を再起動**                          |
| 本報告書     | secret **実値は記載しない**                                             |

---

## 8. Step 4/5 対象 Webhook イベント

`src/features/billing/webhook/constants.ts` — **HANDLED_STRIPE_WEBHOOK_EVENT_TYPES**:

| イベント                        | 役割（概要）                                      |
| ------------------------------- | ------------------------------------------------- |
| `checkout.session.completed`    | **初回 Checkout 完了 → active 化・Stripe 列同期** |
| `customer.subscription.updated` | 契約変更・`cancel_at_period_end` 等の同期         |
| `customer.subscription.deleted` | 解約完了 → `membership_status = canceled`         |
| `invoice.payment_failed`        | 支払失敗記録・Step 5 連携                         |

**今回の active 化に必須:** `checkout.session.completed`

**変更していない設計:** Product ID 検証（`assertBreederSubscriptionProduct`）、Customer/Subscription ID 整合チェック、冪等性（`stripe_webhook_events`）。

---

## 9. 既存決済の安全な再送手順

**禁止:** 新規 Checkout / 新 Subscription 作成 / 既存 Subscription の変更・削除 / `stripe trigger checkout.session.completed`（合成イベントで `metadata.breeder_id` が合わない可能性）。

### 推奨フロー

1. Stripe CLI をインストール
2. `stripe login`
3. `.env.local` の `STRIPE_WEBHOOK_SECRET` を `stripe listen` 出力の `whsec_...` に更新
4. `npm run dev` を再起動
5. 別ターミナルで `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
6. Stripe Dashboard **Test mode** → **Developers → Events** で、該当 Checkout の **`checkout.session.completed`** を特定
7. イベントを **Resend**（CLI: `stripe events resend evt_...`）
8. listen ターミナル / Next.js dev ログで **200 `{ received: true }`** を確認
9. `/breeder/billing` が「**利用中**」、`membership_status = active` を確認

### 冪等性

- イベント ID は `stripe_webhook_events` に記録
- **未処理** → DB 更新実行
- **処理済み** → 200 で重複スキップ（再送しても安全）

---

## 10. 推奨操作順序（チェックリスト）

| #   | 操作                                                                 | 状態       |
| --- | -------------------------------------------------------------------- | ---------- |
| 1   | Stripe CLI インストール（`winget install --id Stripe.StripeCli -e`） | **未実施** |
| 2   | `stripe login`                                                       | 未実施     |
| 3   | `STRIPE_WEBHOOK_SECRET` を `.env.local` に設定（listen の whsec）    | 未実施     |
| 4   | `npm run dev` 再起動                                                 | 未実施     |
| 5   | `stripe listen --forward-to localhost:3000/api/webhooks/stripe`      | 未実施     |
| 6   | 既存 `checkout.session.completed` を Resend                          | 未実施     |
| 7   | BR-13 / DB で active 確認                                            | 未実施     |

---

## 11. 未実施・制約（今回の調査）

| 項目                        | 状態     |
| --------------------------- | -------- |
| コード変更                  | **なし** |
| Migration                   | **なし** |
| commit / push               | **なし** |
| 新規 Stripe 決済            | **なし** |
| Subscription 変更・削除     | **なし** |
| secret 実値のログ・Git 記録 | **なし** |

---

## 12. 次のアクション（ユーザー操作）

**Step 1:** PowerShell で Stripe CLI をインストールする。

```powershell
winget install --id Stripe.StripeCli -e
```

`winget` が使えない、またはパッケージが見つからない場合は Scoop または GitHub 直ダウンロードに切り替える。
