# Stripe Step 2 — SDK / server config 実装報告

**日付:** 2026-08-27  
**範囲:** Stripe SDK 導入、サーバー専用クライアント、環境変数定義・検証（Checkout / Webhook / DB 変更なし）  
**commit / push:** 未実施

**正本:** [Stripe 第1期実装計画 Step 2](./2026-08-26_Stripe第1期実装計画.md) / Decision No.139, No.143

---

## 1. サマリー

| 項目                       | 結果                                                               |
| -------------------------- | ------------------------------------------------------------------ |
| Stripe SDK                 | **導入済**（`stripe@^22.6.0`）                                     |
| サーバー専用 client        | **`src/lib/stripe/server.ts`**                                     |
| env 検証                   | **`src/lib/stripe/env.ts` + `config.ts`（server-only 再 export）** |
| 料金ハードコード           | **なし**（Price ID は env、金額は Stripe 正本）                    |
| Checkout / Webhook         | **未実装**（Step 3 / 4）                                           |
| DB / Migration / RLS / RPC | **変更なし**                                                       |
| Step 2 テスト              | **13 PASS / 0 FAIL**                                               |

---

## 2. 実装内容

### npm

| パッケージ | バージョン |
| ---------- | ---------- |
| `stripe`   | `^22.6.0`  |

### ライブラリ構成

| ファイル                   | 役割                                                                          |
| -------------------------- | ----------------------------------------------------------------------------- |
| `src/lib/stripe/env.ts`    | env 読取・`StripeConfigError`。Secret 値はエラーに含めない                    |
| `src/lib/stripe/config.ts` | `import "server-only"` + `env.ts` 再 export（アプリからはこちらを import）    |
| `src/lib/stripe/server.ts` | `getStripeServerClient()` — 共有 Stripe インスタンス。API version は SDK 既定 |

### 環境変数（変数名のみ）

| 変数                                 | 用途                                   | Step                                     |
| ------------------------------------ | -------------------------------------- | ---------------------------------------- |
| `STRIPE_SECRET_KEY`                  | サーバー Stripe client                 | 2（必須）                                |
| `STRIPE_BREEDER_PRICE_ID`            | 新規契約用 Price ID（Decision No.143） | 2（必須）                                |
| `STRIPE_WEBHOOK_SECRET`              | Webhook 署名検証                       | 4（`.env.example` に定義済）             |
| `STRIPE_BREEDER_PRODUCT_ID`          | Product 所属検証（任意）               | 4（`.env.example` にコメント付きで追加） |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | 将来のクライアント用（Step 3 以降）    | —                                        |

**追加しないもの:** `NEXT_PUBLIC_STRIPE_SECRET_KEY` 等、Secret の `NEXT_PUBLIC_` 化

### 設計判断

| 項目                           | 判断                                                                            |
| ------------------------------ | ------------------------------------------------------------------------------- |
| API version                    | SDK 既定（古い version を固定しない）                                           |
| module import 時の全件強制検証 | **しない**（getter 呼び出し時に `StripeConfigError`）                           |
| `isStripeServerConfigured()`   | 存在チェックのみ（形式検証なし）                                                |
| `env.ts` と `server-only`      | Node テスト脚本から `env.ts` を import。アプリは `config.ts` / `server.ts` 経由 |

---

## 3. セキュリティ

| 確認項目                                         | 結果                        |
| ------------------------------------------------ | --------------------------- |
| `STRIPE_SECRET_KEY` が browser bundle に入らない | build PASS + grep 確認      |
| `NEXT_PUBLIC_STRIPE_SECRET` パターンなし         | PASS                        |
| Secret をログ / エラーに出力しない               | PASS（エラーは env 名のみ） |
| `.env.local` commit                              | **対象外**                  |
| Step 1 課金列保護 trigger                        | **未変更**                  |

---

## 4. テスト

### Step 2 専用

```bash
npm run test:stripe-step2-server-config
```

**13 PASS / 0 FAIL / 0 SKIP**

| #    | 内容                                          |
| ---- | --------------------------------------------- |
| 1    | stripe SDK importable                         |
| 2    | env module loadable                           |
| 2b   | config.ts server-only 再 export               |
| 3–4  | config.ts / server.ts が server-only          |
| 5    | 料金 5000 ハードコードなし                    |
| 6    | NEXT_PUBLIC_STRIPE_SECRET なし                |
| 7–8  | Secret / Price ID 未設定時に安全に失敗        |
| 9–10 | isStripeServerConfigured                      |
| 11   | getter が設定値を返す                         |
| 12   | Stripe インスタンス構築可能（API 実通信なし） |

### 回帰

| テスト                                 | 結果                                |
| -------------------------------------- | ----------------------------------- |
| `test:stripe-step1-billing`            | **21 PASS / 0 FAIL / 1 SKIP**       |
| `test:breeder-application-submit-rpcs` | **41 PASS**                         |
| `test:breeder-review-rpcs`             | **36 PASS**                         |
| `test:public-pet-read`                 | **22 PASS / 0 FAIL / 5 unverified** |

**public-pet-read 補足:** `test:breeder-review-rpcs` 実行後は breeder が `rejected` になるため、`prepare:sec-test-review-breeder` 後に `test:public-pet-read` を実行（既存 prepare/cleanup 方式どおり）。

### 品質チェック（2026-08-27 最終確認）

| チェック                            | 結果                    |
| ----------------------------------- | ----------------------- |
| lint                                | PASS                    |
| typecheck                           | PASS                    |
| build                               | PASS                    |
| format:check（Step 2 変更ファイル） | PASS                    |
| **format:check 全体**               | **FAIL**（17 ファイル） |

#### format:check 全体 — FAIL 対象（Step 2 関連: **なし**）

| #   | ファイル                                                                             | tracked / untracked | Step 2 との関係                          |
| --- | ------------------------------------------------------------------------------------ | ------------------- | ---------------------------------------- |
| 1   | `docs/00_プロジェクト全体設計/README.md`                                             | tracked（`M`）      | 無関係                                   |
| 2   | `docs/02_要件定義/第1期要件定義.md`                                                  | tracked（`M`）      | 無関係                                   |
| 3   | `docs/04_画面設計/BR-07_犬猫管理一覧.md`                                             | tracked（`M`）      | 無関係                                   |
| 4   | `docs/04_画面設計/BR-08_犬猫新規登録.md`                                             | tracked（`M`）      | 無関係                                   |
| 5   | `docs/04_画面設計/BR-10_犬猫一覧.md`                                                 | tracked（`M`）      | 無関係                                   |
| 6   | `docs/04_画面設計/BR-10_所在地.md`                                                   | tracked（`M`）      | 無関係                                   |
| 7   | `docs/04_画面設計/BR-11_犬猫編集.md`                                                 | tracked（`M`）      | 無関係                                   |
| 8   | `docs/05_データベース設計/ER図.md`                                                   | tracked（`M`）      | 無関係                                   |
| 9   | `docs/05_データベース設計/favorites.md`                                              | tracked（`M`）      | 無関係                                   |
| 10  | `docs/05_データベース設計/inquiry_messages.md`                                       | tracked（`M`）      | 無関係                                   |
| 11  | `docs/05_データベース設計/pet_photos.md`                                             | tracked（`M`）      | 無関係                                   |
| 12  | `docs/06_API設計/auth.md`                                                            | tracked（`M`）      | 無関係                                   |
| 13  | `docs/06_API設計/breeder-profile.md`                                                 | tracked（`M`）      | 無関係                                   |
| 14  | `docs/08_デザインシステム/README.md`                                                 | tracked（`M`）      | 無関係                                   |
| 15  | `docs/09_開発履歴/2026-08-06_開発日報.md`                                            | tracked（`M`）      | 無関係                                   |
| 16  | `docs/09_開発履歴/2026-08-07_管理者機能調査.md`                                      | tracked（`M`）      | 無関係                                   |
| 17  | `docs/09_開発履歴/2026-08-27_Stripe-Step1_billing-protection_commit_push完了報告.md` | **untracked**       | 無関係（Step 1 報告・ローカル未 commit） |

#### Step 2 変更ファイルの format 再確認

以下は `prettier --check` **PASS**（Step 2 実装分）:

- `package.json`
- `package-lock.json`
- `.env.example`（`npm run format:check` 全体でも WARN なし）
- `src/lib/stripe/env.ts`
- `src/lib/stripe/config.ts`
- `src/lib/stripe/server.ts`
- `scripts/test-stripe-step2-server-config.mts`
- `docs/09_開発履歴/2026-08-26_Stripe第1期実装計画.md`
- `docs/09_開発履歴/2026-08-27_Stripe-Step2_SDK-server-config_実装報告.md`

#### なぜ Step 1 CI #45 PASS 後にローカルで FAIL するか

| 要因          | 説明                                                                                                                                                                              |
| ------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| commit 対象外 | 上記 16 tracked docs は Step 1 commit（`1161216`）**前から** working tree で `M` だったが、**commit に含めていない**。CI #45 は `origin/main` の committed tree を Linux 上で評価 |
| 内容 diff     | `git diff HEAD` で Step 2 実装分以外の docs に**内容差分なし**（`M` は index stat / 改行等）。Prettier はワーキングツリー上のファイルを直接評価                                   |
| Step 2 非起因 | FAIL 17 件に Step 2 変更ファイルは**含まれない**                                                                                                                                  |

**対応方針（本 Step）:** 無関係 docs への `prettier --write` は**未実施**（指示どおり）。

---

## 5. 変更ファイル

| ファイル                                             | 変更                                                  |
| ---------------------------------------------------- | ----------------------------------------------------- |
| `package.json`                                       | `stripe` 依存、`test:stripe-step2-server-config` 追加 |
| `package-lock.json`                                  | lock 更新                                             |
| `.env.example`                                       | `STRIPE_BREEDER_PRODUCT_ID` コメント追加              |
| `src/lib/stripe/env.ts`                              | 新規                                                  |
| `src/lib/stripe/config.ts`                           | 新規                                                  |
| `src/lib/stripe/server.ts`                           | 新規                                                  |
| `scripts/test-stripe-step2-server-config.mts`        | 新規                                                  |
| `docs/09_開発履歴/2026-08-26_Stripe第1期実装計画.md` | Step 2 完了追記                                       |

---

## 6. 今回実装していないもの

- Checkout Session API / BR-13 UI
- Webhook API Route / イベント処理
- Customer / Subscription 作成
- Customer Portal
- membership_status 更新
- Supabase Migration / RLS / RPC 変更
- Stripe Tax / automatic_tax
- Stripe Test Mode への Price retrieve 実通信

---

## 7. 次工程

**Stripe Step 3 — Checkout Session**

- `POST /api/stripe/checkout`（ breeder JWT ）
- `STRIPE_BREEDER_PRICE_ID` を参照した Subscription mode Checkout
- automatic_tax（Decision No.146）は Step 3 範囲

---

## 関連リンク

- [Stripe 第1期実装計画](./2026-08-26_Stripe第1期実装計画.md)
- [Stripe Step 1 DB 課金列保護 実装報告](./2026-08-26_Stripe-Step1_DB課金列保護_実装報告.md)
- [DecisionLog No.139–148](../01_設計変更管理/DecisionLog.md)
