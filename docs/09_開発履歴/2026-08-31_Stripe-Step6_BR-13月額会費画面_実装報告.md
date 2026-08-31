# Stripe Step 6 — BR-13「月額会費」画面 実装報告

**日付:** 2026-08-31  
**範囲:** ブリーダー向け月額会費状態確認画面 + Checkout 導線  
**commit / push:** **未実施**

**正本:** [Stripe 第1期実装計画 Step 6](./2026-08-26_Stripe第1期実装計画.md) / [BR-13 設計](./../04_画面設計/BR-13_ブリーダー課金設定.md) / Decision No.143〜149

---

## 1. 画面 URL

| 項目     | 内容                                                                                                                                      |
| -------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| URL      | **`/breeder/billing`**                                                                                                                    |
| 根拠     | Step 6 指示のメニュー構成（「月額会費」を設定と分離）。設計書の `/breeder/settings/billing` は案のため、第1期はシンプルな独立ルートを採用 |
| ファイル | `src/app/breeder/billing/page.tsx`                                                                                                        |

---

## 2. 画面目的

ブリーダーが **自分の WithTama 月額会費の現在状態** を一目で理解し、必要時のみ Step 3 Checkout へ進める。Stripe 管理画面のような複雑な請求 UI は作らない。

---

## 3. UI 構成

```
月額会費（BR-13）

[ WithTama ブリーダー会員 ]
月額 5,000円（税別）

現在の状態
● （status 別見出し）

（説明文 / 補助メッセージ）
（次回更新予定日 or 利用終了予定日）
（CTA — 条件付き）
```

- スマホ優先（`max-w-lg` 単一カード）
- 状態は **文字ラベル必須**（色のみに依存しない）

---

## 4. status 別表示

| `membership_status`               | 見出し                   | CTA                       |
| --------------------------------- | ------------------------ | ------------------------- |
| `pending`                         | お支払い手続きが必要です | 月額会費のお支払いへ      |
| `active`                          | 利用中                   | なし                      |
| `active` + `cancel_at_period_end` | 解約予定                 | なし                      |
| `suspended`                       | お支払いの確認が必要です | なし（Portal 準備中案内） |
| `canceled`                        | 解約済み                 | もう一度申し込む          |

**補助:** `membership_status=active` + `subscription_status=past_due` → 「利用停止」表示 **しない**。確認中メッセージのみ。

---

## 5. CTA 表示条件

| 状態                        | Checkout CTA |
| --------------------------- | ------------ |
| `pending`（審査 approved）  | 表示         |
| `canceled`（審査 approved） | 表示         |
| `active` / `suspended`      | **非表示**   |

---

## 6. Checkout 連携

- **API:** 既存 `POST /api/billing/checkout`（空 body `{}`）
- **レスポンス:** `{ url }` → `window.location.href` で Stripe Checkout へ
- **禁止:** クライアントから `amount` / `price_id` / `tax_rate_id` 等を送信しない
- **二重送信防止:** `disabled` + 「お支払い画面を開いています…」
- **エラー:** サーバー返却の `error` または汎用メッセージ（内部エラー全文非表示）

---

## 7. checkout success / cancel の扱い

| 項目              | 方針                                                                                 |
| ----------------- | ------------------------------------------------------------------------------------ |
| Step 3 return URL | **変更なし**（`/breeder/dashboard?checkout=success\|cancel`）                        |
| ダッシュボード    | `CheckoutResultBanner` を追加 — success/cancel メッセージ + 「月額会費を確認」リンク |
| success 時        | **「利用中」「月額会員になりました」と断定しない** — Webhook 反映待ちを案内          |

---

## 8. Webhook 反映待ち

`checkout=success` だけを根拠に active 断定しない。DB の `membership_status` を BR-13 の正本とする。

---

## 9. 日付表示

- 列: `subscription_current_period_end`（timestamptz）
- 表示: `formatBillingPeriodEnd()` — `Asia/Tokyo` / `2026年9月30日` 形式
- `cancel_at_period_end=true` 時は「次回更新予定日」非表示、「利用終了予定日」を表示

---

## 10. 認証 / 権限

- `requireBreeder()` — ブリーダー本人のみ
- `user_id` からサーバー側で breeder 特定（クライアント `breeder_id` 不可）
- buyer / admin / 未ログインは既存 guard で拒否

---

## 11. クライアントへ渡す課金情報

サーバー loader が presentation（見出し・説明・CTA 可否）と `periodEndLabel` のみ生成。以下は **クライアント非露出**:

- `stripe_customer_id`
- `stripe_subscription_id`
- `stripe_price_id`

---

## 12. 内部 Stripe ID 非露出

`getBreederBillingDisplayByUserId` の select は表示用列のみ。View / コンポーネントに内部 ID 文字列なし。

---

## 13. スマホ対応

`max-w-lg` 単一カード、CTA 全幅（sm 以上で auto）、既存 breeder layout（sidebar + mobile nav）再利用。

---

## 14. DB / Migration / RLS / RPC

| 種別                     | 変更     |
| ------------------------ | -------- |
| Migration                | **なし** |
| RLS                      | **なし** |
| RPC                      | **なし** |
| Webhook / mapping        | **なし** |
| Stripe Product/Price/Tax | **なし** |

---

## 15. 変更ファイル一覧

### 新規

- `src/app/breeder/billing/page.tsx`
- `src/features/billing/billing-display.ts`
- `src/features/billing/format.ts`
- `src/features/billing/loaders.ts`
- `src/features/billing/index.ts`
- `src/features/billing/components/breeder-billing-view.tsx`
- `src/features/billing/components/billing-checkout-button.tsx`
- `scripts/test-stripe-step6-billing-ui.mts`

### 変更

- `src/features/billing/repository.ts` — display 用 select 追加
- `src/features/billing/types.ts`
- `src/components/layout/breeder-nav-items.ts` — 「月額会費」追加
- `src/app/breeder/dashboard/page.tsx` — checkout query 処理
- `src/features/breeder-dashboard/loaders.ts` / `types.ts` / `breeder-dashboard-view.tsx`
- `scripts/test-breeder-dashboard-page.mts`
- `package.json`

---

## 16. テスト結果

### Step 6

```
npm run test:stripe-step6-billing-ui → 33 PASS / 0 FAIL
```

### Step 1〜5 回帰

| テスト                                    | 結果                   |
| ----------------------------------------- | ---------------------- |
| `test:stripe-step5-membership-status`     | 33 PASS                |
| `test:stripe-step4-webhook`               | 48 PASS                |
| `test:stripe-step3-checkout`              | 37 PASS                |
| `test:stripe-step2-server-config`         | 14 PASS                |
| `test:stripe-step1-billing`               | 21 PASS / 1 SKIP       |
| `test:breeder-application-submit-rpcs`    | 41 PASS                |
| `test:public-pet-read`（正規 prepare 後） | 22 PASS / 5 unverified |
| `test:breeder-dashboard-page`             | 16 PASS                |

### lint / typecheck / build / format

| 項目                                | 結果                                          |
| ----------------------------------- | --------------------------------------------- |
| lint                                | **PASS**                                      |
| typecheck                           | **PASS**                                      |
| build                               | **PASS**（`/breeder/billing` ルート生成確認） |
| format:check（Step 6 対象ファイル） | **PASS**                                      |

---

## 17. 未決定事項

| 項目                            | 内容                                                                       |
| ------------------------------- | -------------------------------------------------------------------------- |
| BR-06 課金 CTA バナー           | 設計書に記載あるが Step 6 スコープ外（BR-13 へのリンクバナーは未実装）     |
| `/breeder/settings`             | 既存 nav の「設定」ルートは未実装のまま                                    |
| Stripe Price 動的 retrieve 表示 | 第1期は指示どおり固定表示「5,000円（税別）」を採用（**運用注意事項**参照） |

---

## 17b. 運用注意事項（価格表示）

第1期 BR-13 の **「月額 5,000円（税別）」固定表示は承認済み**。

Stripe Price を将来変更する場合、**BR-13 の固定料金表示（`BILLING_PLAN_PRICE_LABEL`）も同時に変更する必要がある**。Checkout 本体は env の `STRIPE_BREEDER_PRICE_ID` が正本のため、UI 表示だけが古い料金のまま残る不整合に注意。

今回 Step 6 では Stripe API から Price を retrieve する実装には変更していない。

## 18. Step 7 へ送る事項

1. **Customer Portal リンク** — `suspended` / `active` 向け「支払い方法の確認・変更」
2. **Portal Session API** — server-side のみ
3. BR-13 の suspended 案内を Portal リンクに差し替え
4. active ユーザーのカード変更・解約導線

---

## 19. 結論

Step 6（BR-13 月額会費画面）は **実装・テスト完了**。Step 7（Portal）・Step 8（公開 View 正式確認）には未着手。**commit 可能な状態**（commit / push は未実施）。
