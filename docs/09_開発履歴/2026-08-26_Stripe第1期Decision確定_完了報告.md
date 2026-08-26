# Stripe 第1期 Decision 確定 — 完了報告

| 項目   | 内容                                                             |
| ------ | ---------------------------------------------------------------- |
| 作業日 | 2026-08-26                                                       |
| 種別   | DecisionLog 更新・関連設計書反映・実装計画書作成                 |
| 未実施 | コード / DB / Migration / RPC / RLS / Stripe API / commit / push |

**正本:** [DecisionLog No.139–148](../01_設計変更管理/DecisionLog.md) / [Stripe 第1期実装計画](./2026-08-26_Stripe第1期実装計画.md)

**事前調査:** [Stripe 第1期課金設計事前調査](./2026-08-26_Stripe第1期課金設計事前調査.md) / [価格監査・課金ルール整理](./2026-08-26_StripeDecision確定前_価格監査課金ルール整理.md)

---

## 1. サマリー

| 項目            | 結果                                                    |
| --------------- | ------------------------------------------------------- |
| Stripe 第1期    | **正式 Decision 化**                                    |
| 価格正本        | **税抜**                                                |
| `pets.price`    | **税抜へ改定**（No.34 本文は未改変、No.141 で意味更新） |
| 開発データ移行  | **案C**（再投入＋以降税抜統一）                         |
| 月額基本料金    | **5,000円（税抜・可変）**                               |
| 無料期間        | **なし**                                                |
| 初回課金        | **管理者承認後**                                        |
| 支払い失敗      | **Stripe Smart Retry**                                  |
| `past_due`      | **`membership_status = active` 維持**                   |
| `unpaid`        | **`membership_status = suspended`**                     |
| 明示解約        | **期間末 → `canceled`**                                 |
| 再契約          | **可能**                                                |
| Customer Portal | **採用**                                                |
| 課金列保護      | **BEFORE UPDATE trigger + Webhook service_role**        |
| Webhook 冪等性  | **必須**                                                |
| 実装状態        | **設計確定 / 実装未着手**                               |

---

## 2. 追加 Decision 一覧（No.139–148）

| No.     | タイトル                                                     | 追跡キーワード                        |
| ------- | ------------------------------------------------------------ | ------------------------------------- |
| **139** | Stripe を第1期正式スコープに含める（ブリーダー月額会費のみ） | Stripe 第1期採用                      |
| **140** | WithTama で管理する価格は原則として税抜価格を正本とする      | 税抜統一                              |
| **141** | `pets.price` の意味を税込から税抜へ改定（No.34 更新）        | No.34 改定                            |
| **142** | 開発環境 `pets.price` 移行は案 C を採用                      | 開発データ移行                        |
| **143** | ブリーダー月額会費・Stripe Price 正本・料金可変              | 5,000 税抜 / Stripe Price             |
| **144** | `membership_status` の意味と Stripe 課金ライフサイクル       | 課金状態遷移 / Smart Retry / 公開条件 |
| **145** | 第1期で Stripe Customer Portal を利用                        | Customer Portal                       |
| **146** | 消費税率をコードに固定せず Stripe Tax 等で対応               | 消費税                                |
| **147** | ブリーダー本人による Stripe / 課金列の直接 UPDATE 禁止       | 課金列保護                            |
| **148** | Stripe Webhook 署名検証と event ID 冪等性                    | Webhook 冪等性                        |

### 参照のみ（新規 Decision なし）

| No. | 内容                                                              |
| --- | ----------------------------------------------------------------- |
| 34  | `price` / `price_comment` 分離（price の **税抜意味** は No.141） |
| 45  | Stripe 請求情報正本・DB 保持範囲                                  |
| 96  | 犬猫審査 RPC 思想（課金都合で pets 状態を変えない）               |
| 122 | サイト外成約・運営は販売主体にならない・犬猫代金 Stripe 不使用    |
| 129 | 承認時 `membership_status` 変更しない                             |
| 130 | 承認と `active` 分離                                              |
| 138 | BR-09 メール通知なし                                              |

---

## 3. 課金ルール（確定内容）

### 3.1 Stripe スコープ（No.139）

- **使用:** ブリーダー月額会費のみ
- **不使用:** 犬猫代金、預かり・分配、成約手数料
- **参照:** No.122（販売主体・代金決済）

### 3.2 価格管理（No.140, 141, 142）

| 対象               | 正本                 |
| ------------------ | -------------------- |
| ブリーダー月額会費 | 税抜（Stripe Price） |
| `pets.price`       | 税抜（integer / 円） |
| 将来の有料サービス | 税抜                 |

- 購入希望者向け表示: **表示レイヤーで税込総額**
- 法令・表記: **弁護士、税理士または専門家への確認が必要**
- 開発環境移行: **案C**（`/1.10` 一括変換しない）。本番移行は別 Decision

### 3.3 月額会費（No.143）

| 項目           | 内容                                                 |
| -------------- | ---------------------------------------------------- |
| 現在の基本料金 | 5,000円（税抜）                                      |
| 無料期間       | なし                                                 |
| 初回課金       | 管理者承認後                                         |
| 料金固定       | コード・DB・Webhook に **固定しない**                |
| 正本           | **Stripe Price**（immutable。改定時は新 Price 作成） |
| 既存契約       | 旧料金維持 / 新料金移行は **運営判断**               |

### 3.4 `membership_status`（No.144）

| 値          | 意味                       |
| ----------- | -------------------------- |
| `pending`   | 承認前または初回課金前     |
| `active`    | WithTama 利用可能          |
| `suspended` | 支払不良等の一時利用停止   |
| `canceled`  | 明示解約が期間終了した状態 |

**フロー（承認〜公開）:**

```
review_status = approved
membership_status = pending（維持）
  ↓ Stripe 初回課金成功
membership_status = active
  ↓
公開条件成立（+ pets.status = published 等）
```

**支払い失敗（Smart Retry）:**

| Stripe 状態 | `membership_status`     |
| ----------- | ----------------------- |
| `past_due`  | `active` 維持（猶予中） |
| `unpaid`    | `suspended`             |

- アプリ独自の 7日 / 14日固定猶予 **なし**
- Smart Retry 設定は **運用開始前に確認**

**解約・再契約:**

| 操作       | 動作                                                     |
| ---------- | -------------------------------------------------------- |
| 解約       | 期間末（`cancel_at_period_end`）。期間中は `active` 維持 |
| 期間終了   | Stripe `canceled` → `membership_status = canceled`       |
| 再契約     | `suspended` / `canceled` から可能 → 成功後 `active`      |
| 犬猫データ | 削除しない。`pets.status` は課金都合で **変更しない**    |

### 3.5 `subscription_status` マッピング（No.144）

Stripe 状態と `membership_status` を **1:1 コピーしない**。

| 条件              | `membership_status`        |
| ----------------- | -------------------------- |
| 未契約            | `pending`                  |
| Stripe `active`   | `active`                   |
| Stripe `past_due` | `active`                   |
| Stripe `unpaid`   | `suspended`                |
| Stripe `canceled` | `canceled`                 |
| `trialing`        | 第1期では **発生させない** |

### 3.6 公開条件（維持）

```sql
breeders.review_status = 'approved'
AND breeders.membership_status = 'active'
AND pets.status = 'published'
AND deleted_at IS NULL
```

| `membership_status` | 公開     |
| ------------------- | -------- |
| `pending`           | 非公開   |
| `active`            | 公開可能 |
| `suspended`         | 非公開   |
| `canceled`          | 非公開   |

### 3.7 Customer Portal（No.145）

- 支払い方法管理、解約、請求関連確認
- 請求書・領収書は可能な範囲で Stripe 委譲（No.45 整合）

### 3.8 消費税（No.146）

- 消費税率を **アプリケーションコードに固定しない**
- Stripe Tax / Tax Rate 等を利用
- 税区分・インボイス・総額表示等: **税理士、弁護士または専門家への確認が必要**

### 3.9 セキュリティ（No.147, 148）

**課金列保護（No.147）:**

- BEFORE UPDATE trigger + Webhook service_role 更新
- 保護列: `membership_status`, `stripe_*`, `subscription_*`, `last_payment_failed_at`, `suspended_at` 等

**Webhook 冪等性（No.148）:**

- 署名検証必須
- `stripe_webhook_events` で event ID 重複処理禁止

**DB 追加候補（実装フェーズで最終確定）:**

| オブジェクト                               | 分類 |
| ------------------------------------------ | ---- |
| `stripe_webhook_events`                    | 必須 |
| `breeders.stripe_price_id`                 | 必須 |
| `breeders.subscription_current_period_end` | 必須 |
| `breeders.last_payment_failed_at`          | 推奨 |
| `breeders.cancel_at_period_end`            | 推奨 |

---

## 4. 既存 `pets.price` 監査（参考）

| 項目             | 値                      |
| ---------------- | ----------------------- |
| 全件             | 15                      |
| price あり       | 13                      |
| price なし       | 2                       |
| 本番利用者データ | 0 件（開発 / SEC-TEST） |

詳細: [価格監査・課金ルール整理 §2](./2026-08-26_StripeDecision確定前_価格監査課金ルール整理.md)

---

## 5. 実装計画 Step 一覧

正本: [2026-08-26_Stripe第1期実装計画.md](./2026-08-26_Stripe第1期実装計画.md)

| Step   | 内容                        | 依存        |
| ------ | --------------------------- | ----------- |
| **1**  | DB / Migration / 課金列保護 | —           |
| **2**  | Stripe SDK / server config  | 1           |
| **3**  | Checkout Session            | 2           |
| **4**  | Webhook + 冪等性            | 1, 2        |
| **5**  | membership_status 連携      | 4           |
| **6**  | BR-13 課金画面              | 3, 5        |
| **7**  | Customer Portal             | 6           |
| **8**  | 公開 View 連携確認          | 5           |
| **9**  | pets.price 税抜対応         | 1（並行可） |
| **10** | 自動テスト                  | 4, 5, 8, 9  |
| **11** | Stripe Test Mode E2E        | 7, 8, 10    |

---

## 6. 作成・更新ドキュメント

### 新規

| ファイル                                                               | 内容                 |
| ---------------------------------------------------------------------- | -------------------- |
| [DecisionLog No.139–148](../01_設計変更管理/DecisionLog.md)            | 正式 Decision        |
| [Stripe 第1期実装計画](./2026-08-26_Stripe第1期実装計画.md)            | 11 Step 計画         |
| [BR-13 ブリーダー課金設定](../04_画面設計/BR-13_ブリーダー課金設定.md) | 設計確定・実装未着手 |
| 本報告                                                                 | 完了報告             |

### 更新

| ファイル                                   | 反映内容                       |
| ------------------------------------------ | ------------------------------ |
| `docs/05_データベース設計/pets.md`         | `price` 税抜、Decision 参照    |
| `docs/05_データベース設計/breeders.md`     | membership 意味、Stripe 列候補 |
| `docs/04_画面設計/BR-06`                   | 課金 CTA バナー（未着手）      |
| `docs/04_画面設計/BR-10`, `BR-11`          | 入力税抜                       |
| `docs/04_画面設計/PU-01`, `PU-02`, `BY-03` | 税込表示レイヤー（未着手）     |
| `docs/04_画面設計/AD-11`                   | 審査画面税抜                   |
| `docs/06_API設計/pets.md`                  | price 意味                     |
| `docs/07_権限設計/README.md`               | 課金列 trigger 方針            |
| 事前調査 2 件                              | Decision 確定済み注記          |

---

## 7. 品質確認

| チェック               | 結果     | 備考                                                                                      |
| ---------------------- | -------- | ----------------------------------------------------------------------------------------- |
| `npm run format:check` | **FAIL** | 今回未編集の `2026-08-26_BR-09完了後_第1期残機能調査.md` のみ警告。編集分は Prettier 済み |
| `git diff --check`     | **PASS** |                                                                                           |

---

## 8. 変更禁止確認

| 対象                   | 状態         |
| ---------------------- | ------------ |
| `src/`                 | **変更なし** |
| `supabase/migrations/` | **変更なし** |
| Stripe API 接続        | **なし**     |
| git commit / push      | **未実施**   |

---

## 9. 次工程

1. **Decision レビュー**（本報告・DecisionLog No.139–148）
2. **docs commit / push**
3. **Stripe Step 1 実装**（Migration / trigger / `stripe_webhook_events`）

---

## 関連リンク

- [DecisionLog](../01_設計変更管理/DecisionLog.md)
- [Stripe 第1期実装計画](./2026-08-26_Stripe第1期実装計画.md)
- [Stripe 第1期課金設計事前調査](./2026-08-26_Stripe第1期課金設計事前調査.md)
- [Stripe Decision 確定前 価格監査](./2026-08-26_StripeDecision確定前_価格監査課金ルール整理.md)
