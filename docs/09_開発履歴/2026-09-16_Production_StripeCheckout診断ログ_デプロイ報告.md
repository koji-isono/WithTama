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
| 最終 HEAD（短縮） | **`2809582`**                                                   |
| 最終 HEAD（完全） | **`28095821615e7b9d18223c6d5f6707fa9613ef58`**                  |
| 最終 CI Run       | **#105**                                                        |
| 最終 CI Run ID    | **35073580408**                                                 |
| 最終 CI URL       | https://github.com/koji-isono/WithTama/actions/runs/35073580408 |
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

### 報告書完成 commit

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

### 報告書 HEAD 修正 commit

| 項目       | 値                                                                         |
| ---------- | -------------------------------------------------------------------------- |
| 短縮 SHA   | **`dae5ccd`**                                                              |
| 完全 SHA   | **`dae5ccda828631cce43534b44ed19aabd26f63d4`**                             |
| メッセージ | `docs: fix final HEAD and CI #99 in stripe checkout deploy report`         |
| push 結果  | **成功** — `cc1aa58..dae5ccd  main -> main`                                |
| CI Run     | **#100** — https://github.com/koji-isono/WithTama/actions/runs/35070374598 |
| CI 結果    | **success**                                                                |

### 本報告書完成 commit（初回 push）

| 項目       | 値                                                                         |
| ---------- | -------------------------------------------------------------------------- |
| 短縮 SHA   | **`af909f1`**                                                              |
| 完全 SHA   | **`af909f1455f5f91fae97465e93ec1e19417c656a`**                             |
| メッセージ | `docs: finalize stripe checkout deploy report with final HEAD and CI`      |
| push 結果  | **成功** — `dae5ccd..af909f1  main -> main`                                |
| CI Run     | **#101** — https://github.com/koji-isono/WithTama/actions/runs/35071229191 |
| CI 結果    | **failure**（`format:check` — 本報告書 MD の Prettier 未適用）             |

### Prettier 修正 commit

| 項目       | 値                                                                         |
| ---------- | -------------------------------------------------------------------------- |
| 短縮 SHA   | **`c37d926`**                                                              |
| 完全 SHA   | **`c37d926ea0ebb3a8b99da0dcc3d8b3181be0b99e`**                             |
| メッセージ | `style: apply Prettier to stripe checkout deploy report`                   |
| push 結果  | **成功** — `af909f1..c37d926  main -> main`                                |
| CI Run     | **#102** — https://github.com/koji-isono/WithTama/actions/runs/35071959224 |
| CI 結果    | **success**                                                                |

### Vercel Production（Prettier 修正 commit）

| 項目              | 値                                                |
| ----------------- | ------------------------------------------------- |
| 対象 commit       | **`c37d926ea0ebb3a8b99da0dcc3d8b3181be0b99e`**    |
| GitHub Deployment | **6476508966**（environment: **Production**）     |
| デプロイ status   | **success**（`Deployment has completed`）         |
| Preview URL       | https://with-tama-c5kael97d-koji-isono.vercel.app |
| Production URL    | https://withtama.jp                               |

### 報告書確定 commit

| 項目       | 値                                                                         |
| ---------- | -------------------------------------------------------------------------- |
| 短縮 SHA   | **`ad07e9a`**                                                              |
| 完全 SHA   | **`ad07e9a8f896a9b2d8d4fb127e4ef643349d2ea6`**                             |
| メッセージ | `docs: record final HEAD and CI #102 in stripe checkout deploy report`     |
| push 結果  | **成功** — `c37d926..ad07e9a  main -> main`                                |
| CI Run     | **#103** — https://github.com/koji-isono/WithTama/actions/runs/35072574871 |
| CI 結果    | **success**                                                                |

### Vercel Production（報告書確定 commit）

| 項目              | 値                                                |
| ----------------- | ------------------------------------------------- |
| 対象 commit       | **`ad07e9a8f896a9b2d8d4fb127e4ef643349d2ea6`**    |
| GitHub Deployment | **6476625593**（environment: **Production**）     |
| デプロイ status   | **success**（`Deployment has completed`）         |
| Preview URL       | https://with-tama-6mptnq2d3-koji-isono.vercel.app |
| Production URL    | https://withtama.jp                               |

### 本報告書 sync commit

| 項目       | 値                                                                         |
| ---------- | -------------------------------------------------------------------------- |
| 短縮 SHA   | **`1c09bc2`**                                                              |
| 完全 SHA   | **`1c09bc2636b6a5892b6eb90b8d8cb26029e2246e`**                             |
| メッセージ | `docs: align section 7 final HEAD with ad07e9a and CI #103`                |
| push 結果  | **成功** — `ad07e9a..1c09bc2  main -> main`                                |
| CI Run     | **#104** — https://github.com/koji-isono/WithTama/actions/runs/35073157609 |
| CI 結果    | **success**                                                                |

### 本報告書 最終 sync commit（§7 最終 HEAD）

| 項目       | 値                                                                         |
| ---------- | -------------------------------------------------------------------------- |
| 短縮 SHA   | **`2809582`**                                                              |
| 完全 SHA   | **`28095821615e7b9d18223c6d5f6707fa9613ef58`**                             |
| メッセージ | `docs: set section 7 final HEAD to 1c09bc2 and CI #104`                    |
| push 結果  | **成功** — `1c09bc2..2809582  main -> main`                                |
| CI Run     | **#105** — https://github.com/koji-isono/WithTama/actions/runs/35073580408 |
| CI 結果    | **success**                                                                |
