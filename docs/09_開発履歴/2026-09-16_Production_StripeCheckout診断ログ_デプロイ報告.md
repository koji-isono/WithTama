# Production Stripe Checkout 診断ログ デプロイ報告

| 項目   | 内容                                                                                                                           |
| ------ | ------------------------------------------------------------------------------------------------------------------------------ |
| 作業日 | 2026-09-16                                                                                                                     |
| 種別   | **Production デプロイ完了報告**                                                                                                |
| 背景   | [2026-09-16_Production_StripeCheckout失敗_診断ログ追加報告.md](./2026-09-16_Production_StripeCheckout失敗_診断ログ追加報告.md) |

**機密:** Stripe Secret Key / Price ID / Tax Rate ID 実値 / 顧客情報は記載しない。

---

## 1. 機能デプロイ commit（診断ログ）

| 項目       | 値                                                    |
| ---------- | ----------------------------------------------------- |
| 短縮 SHA   | **`54c9c6a`**                                         |
| 完全 SHA   | **`54c9c6a573b6be46d2dffc129aa6a1c1c44c1874`**        |
| メッセージ | `chore(billing): add production checkout diagnostics` |
| 親 commit  | `1c86587`                                             |

---

## 2. push 結果（機能 commit）

| 項目     | 結果                             |
| -------- | -------------------------------- |
| ブランチ | `main`                           |
| remote   | `origin`                         |
| 結果     | **成功**                         |
| 反映範囲 | `1c86587..54c9c6a  main -> main` |

---

## 3. GitHub Actions 結果（機能 commit）

| 項目       | 値                                                              |
| ---------- | --------------------------------------------------------------- |
| Workflow   | **CI**                                                          |
| Run 番号   | **#97**                                                         |
| Run ID     | **35068965113**                                                 |
| URL        | https://github.com/koji-isono/WithTama/actions/runs/35068965113 |
| head SHA   | `54c9c6a573b6be46d2dffc129aa6a1c1c44c1874`                      |
| status     | **completed**                                                   |
| conclusion | **success**                                                     |

---

## 4. Vercel Production デプロイ（機能 commit）

| 項目              | 値                                                |
| ----------------- | ------------------------------------------------- |
| 対象 commit       | **`54c9c6a573b6be46d2dffc129aa6a1c1c44c1874`**    |
| GitHub Deployment | **6475991694**（environment: **Production**）     |
| デプロイ status   | **success**（`Deployment has completed`）         |
| Preview URL       | https://with-tama-abf5exa1r-koji-isono.vercel.app |
| Production URL    | https://withtama.jp                               |

---

## 5. Production へ反映された変更ファイル（機能 commit）

| ファイル                                       | 変更内容                                                                         |
| ---------------------------------------------- | -------------------------------------------------------------------------------- |
| `src/features/billing/checkout-diagnostics.ts` | **新規** — Checkout 失敗時の安全な診断ログ                                       |
| `src/features/billing/checkout-handler.ts`     | catch で `logBreederCheckoutSessionFailure(error)` を呼出（Production でもログ） |

**含まれないもの:** DB / Migration / Stripe Dashboard / Webhook / 課金ロジック変更。

---

## 6. Production での確認手順

1. 審査承認済みブリーダーで「月額会費のお支払いへ」を再現
2. Vercel Production Logs で `[billing/checkout] Stripe Checkout Session creation failed` を検索
3. `errorMessage` / prefix boolean 3 件を記録し原因特定へ

---

## 7. 最終 HEAD / GitHub Actions

| 項目              | 値                                                              |
| ----------------- | --------------------------------------------------------------- |
| 最終 HEAD（短縮） | **`cc1aa58`**                                                   |
| 最終 HEAD（完全） | **`cc1aa582eff39ce7330e97a95754caaccc974e12`**                  |
| 最終 CI Run       | **#99**                                                         |
| 最終 CI Run ID    | **35069874467**                                                 |
| 最終 CI URL       | https://github.com/koji-isono/WithTama/actions/runs/35069874467 |
| 最終 CI 結果      | **success**                                                     |

---

## 8. 本報告書の commit / push

| 項目       | 値                                                                        |
| ---------- | ------------------------------------------------------------------------- |
| 短縮 SHA   | **`ff55b0f`**（初回報告書 commit）                                        |
| 完全 SHA   | **`ff55b0f783ed4a223202deabbb134e8b96de9840`**                            |
| メッセージ | `docs: Production Stripe Checkout diagnostics deploy report`              |
| push 結果  | **成功** — `54c9c6a..ff55b0f  main -> main`                               |
| CI Run     | **#98** — https://github.com/koji-isono/WithTama/actions/runs/35069416771 |
| CI 結果    | **success**                                                               |

### Vercel Production（報告書 commit）

| 項目              | 値                                                |
| ----------------- | ------------------------------------------------- |
| 対象 commit       | **`ff55b0f783ed4a223202deabbb134e8b96de9840`**    |
| GitHub Deployment | **6476067841**（environment: **Production**）     |
| デプロイ status   | **success**（`Deployment has completed`）         |
| Preview URL       | https://with-tama-ip2z8ls5w-koji-isono.vercel.app |
| Production URL    | https://withtama.jp                               |

### 報告書完成 commit（§7 最終 HEAD）

| 項目       | 値                                                                        |
| ---------- | ------------------------------------------------------------------------- |
| 短縮 SHA   | **`cc1aa58`**                                                             |
| 完全 SHA   | **`cc1aa582eff39ce7330e97a95754caaccc974e12`**                            |
| メッセージ | `docs: complete stripe checkout deploy report with final CI status`       |
| push 結果  | **成功** — `ff55b0f..cc1aa58  main -> main`                               |
| CI Run     | **#99** — https://github.com/koji-isono/WithTama/actions/runs/35069874467 |
| CI 結果    | **success**                                                               |

### Vercel Production（報告書完成 commit）

| 項目              | 値                                                |
| ----------------- | ------------------------------------------------- |
| 対象 commit       | **`cc1aa582eff39ce7330e97a95754caaccc974e12`**    |
| GitHub Deployment | **6476149237**（environment: **Production**）     |
| デプロイ status   | **success**（`Deployment has completed`）         |
| Preview URL       | https://with-tama-cpgc1rlbx-koji-isono.vercel.app |
| Production URL    | https://withtama.jp                               |
