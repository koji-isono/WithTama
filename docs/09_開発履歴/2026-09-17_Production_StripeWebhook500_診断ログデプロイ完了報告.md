# Production Stripe Webhook 500 診断ログ デプロイ完了報告

| 項目   | 内容                                                                                                                       |
| ------ | -------------------------------------------------------------------------------------------------------------------------- |
| 作業日 | 2026-09-17                                                                                                                 |
| 種別   | **Production デプロイ完了報告**                                                                                            |
| 背景   | [2026-09-17_Production_StripeWebhook500_診断ログ追加報告.md](./2026-09-17_Production_StripeWebhook500_診断ログ追加報告.md) |

**機密:** Secret Key / Webhook Secret / Session ID / Customer ID / Subscription ID 実値は記載しない。

---

## 1. 機能デプロイ commit（診断ログ）

| 項目       | 値                                                   |
| ---------- | ---------------------------------------------------- |
| 短縮 SHA   | **`1ea302d`**                                        |
| 完全 SHA   | **`1ea302d9e5606404a02a7edc97cedbd4fc2a0cfa`**       |
| メッセージ | `chore(billing): add production webhook diagnostics` |
| 親 commit  | `46e02f9`                                            |

---

## 2. push 結果（機能 commit）

| 項目     | 結果                             |
| -------- | -------------------------------- |
| ブランチ | `main`                           |
| remote   | `origin`                         |
| 結果     | **成功**                         |
| 反映範囲 | `46e02f9..1ea302d  main -> main` |

---

## 3. GitHub Actions 結果（機能 commit）

| 項目       | 値                                                              |
| ---------- | --------------------------------------------------------------- |
| Workflow   | **CI**                                                          |
| Run 番号   | **#107**                                                        |
| Run ID     | **35170947862**                                                 |
| URL        | https://github.com/koji-isono/WithTama/actions/runs/35170947862 |
| head SHA   | `1ea302d9e5606404a02a7edc97cedbd4fc2a0cfa`                      |
| status     | **completed**                                                   |
| conclusion | **failure**（`format:check` — webhook handler 3 ファイル）      |

**対応:** Prettier 適用 commit `0810dcb` を push。

---

## 4. Prettier 修正 commit（最終 HEAD）

| 項目       | 値                                                                         |
| ---------- | -------------------------------------------------------------------------- |
| 短縮 SHA   | **`0810dcb`**                                                              |
| 完全 SHA   | **`0810dcbdf8bd3ac5644da64adb1ecc9828b65647`**                             |
| メッセージ | `style: apply Prettier after webhook diagnostics change`                   |
| push 結果  | **成功** — `1ea302d..0810dcb  main -> main`                                |
| CI Run     | **#108** — https://github.com/koji-isono/WithTama/actions/runs/35171256832 |
| CI 結果    | **success**                                                                |

---

## 5. Vercel Production デプロイ（最終 HEAD）

| 項目              | 値                                                |
| ----------------- | ------------------------------------------------- |
| 対象 commit       | **`0810dcbdf8bd3ac5644da64adb1ecc9828b65647`**    |
| GitHub Deployment | **6493781462**（environment: **Production**）     |
| デプロイ status   | **success**（`Deployment has completed`）         |
| Production 状態   | **Ready**                                         |
| Preview URL       | https://with-tama-iw7o5lhe3-koji-isono.vercel.app |
| Production URL    | https://withtama.jp                               |

---

## 6. Production へ反映された変更ファイル

| ファイル                                                                      | 変更内容                                     |
| ----------------------------------------------------------------------------- | -------------------------------------------- |
| `src/features/billing/webhook/webhook-diagnostics.ts`                         | **新規** — Webhook 失敗時の安全な診断ログ    |
| `src/features/billing/webhook/handle-stripe-webhook-request.ts`               | signature / claim / finalize の catch でログ |
| `src/features/billing/webhook/handlers/checkout-session-completed.ts`         | stage ラベル付き catch ログ                  |
| `src/features/billing/webhook/handlers/subscription-events.ts`                | 同上                                         |
| `src/features/billing/webhook/handlers/invoice-payment-failed.ts`             | 同上                                         |
| `scripts/test-stripe-step4-webhook.mts`                                       | production-safe diagnostics チェック更新     |
| `docs/09_開発履歴/2026-09-17_Production_StripeWebhook500_診断ログ追加報告.md` | 実装報告                                     |

**含まれないもの:** DB / Migration / RLS / Stripe Dashboard / Webhook 設定 / 課金ロジック変更。

---

## 7. Production での確認手順（Webhook 再送前）

1. Stripe Dashboard で `checkout.session.completed` を **再送**（本報告書作成時点では **未実施**）
2. Vercel Production Logs で `[webhooks/stripe] processing failed` を検索
3. **`stage`** / `errorMessage` / `postgrestCode` を記録し原因特定へ

---

## 8. 最終 HEAD / GitHub Actions

| 項目              | 値                                             |
| ----------------- | ---------------------------------------------- |
| 最終 HEAD（短縮） | **`0810dcb`**                                  |
| 最終 HEAD（完全） | **`0810dcbdf8bd3ac5644da64adb1ecc9828b65647`** |
| 最終 CI Run       | **#108**                                       |
| 最終 CI 結果      | **success**                                    |
| Vercel Production | **Ready**（Deployment `6493781462` success）   |
