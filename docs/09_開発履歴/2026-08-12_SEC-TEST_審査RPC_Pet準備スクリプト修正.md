# SEC-TEST 審査RPC Pet 準備スクリプト修正

| 項目   | 内容                                                             |
| ------ | ---------------------------------------------------------------- |
| 作業日 | 2026-08-12                                                       |
| 対象   | `scripts/prepare-sec-test-review-pets.mts`                       |
| 種別   | テストデータ準備スクリプト修正（Migration / RLS / RPC 変更なし） |

---

## 1. 作業目的

`npm run prepare:sec-test-review-pets` 実行時、承認テスト用 Pet が **published** 済みだと準備が失敗し、`npm run test:pet-review-rpcs` を繰り返し実行できない問題を解消する。

**方針:** published Pet を draft / under_review に巻き戻さず、**新しい `[SEC-TEST]` 承認用 Pet を安全に作成**する。

---

## 2. 調査内容

### 2.1 失敗原因（事実）

| 項目         | 内容                                                                                 |
| ------------ | ------------------------------------------------------------------------------------ |
| 失敗チェック | `prepare approve pet`                                                                |
| 既存 Pet     | `[SEC-TEST] Review RPC Approve Pet`（`SEC_TEST_ADMIN_APPROVE_PET_ID`）               |
| 状態         | `published`（前回 `test:pet-review-rpcs` の admin approve 成功後）                   |
| 旧ロジック   | `status !== draft` かつ `under_review` でない場合 **FAIL**（巻き戻し禁止メッセージ） |

### 2.2 参照したコード

| ファイル                                   | 内容                                                                 |
| ------------------------------------------ | -------------------------------------------------------------------- |
| `scripts/prepare-sec-test-review-pets.mts` | `ensureUnderReviewPet` — 同名 Pet の draft / under_review のみ再利用 |
| `scripts/test-pet-review-rpcs.mts`         | テスト後 approve Pet → `published`、return Pet → `draft`             |
| `supabase/migrations/20260810120000_*.sql` | RPC 仕様（変更なし）                                                 |

### 2.3 制約確認

| 制約                         | 対応                                                   |
| ---------------------------- | ------------------------------------------------------ |
| published を直接巻き戻さない | ✅ 旧 Pet は untouched                                 |
| Service Role 不使用          | ✅ breeder JWT + RLS / Trigger のみ                    |
| 本番データ保護               | ✅ `[SEC-TEST]` プレフィックス・指定 breeder のみ      |
| return Pet 処理維持          | ✅ `ensureUnderReviewPet`（return 専用）をそのまま使用 |

---

## 3. 修正内容

### 3.1 承認用 Pet 準備（新関数 `ensureUnderReviewApprovePet`）

| 順序 | 処理                                                                            |
| ---- | ------------------------------------------------------------------------------- |
| 1    | `[SEC-TEST] Review RPC Approve Pet%` で **既存 under_review** があれば再利用    |
| 2    | スロット 1〜50: 管理名 `… Approve Pet` / `… Approve Pet #2` / `#3` … を順に確認 |
| 3    | 未作成スロット                                                                  | draft INSERT → `draft → under_review`（既存 Trigger 経由 UPDATE） |
| 4    | draft スロット                                                                  | 既存 draft を `under_review` へ                                   |
| 5    | **published スロット**                                                          | **スキップ**（触らない）→ 次スロットへ                            |
| 6    | 最終検証                                                                        | `verifyFinalPetState` を **petId ベース**に変更                   |

### 3.2 差戻し用 Pet（変更なし）

- `[SEC-TEST] Review RPC Return Pet` — 従来の `ensureUnderReviewPet` を継続使用
- テスト後 `draft` → 準備時に `under_review` へ昇格（**事実:** 2 回目 prepare で確認）

### 3.3 Migration / DB スキーマ

| 項目      | 変更     |
| --------- | -------- |
| Migration | **なし** |
| RLS       | **なし** |
| Trigger   | **なし** |
| RPC       | **なし** |

---

## 4. 変更ファイル一覧

| ファイル                                   | 操作                                                                              |
| ------------------------------------------ | --------------------------------------------------------------------------------- |
| `scripts/prepare-sec-test-review-pets.mts` | 修正                                                                              |
| `.env.local`                               | `SEC_TEST_ADMIN_APPROVE_PET_ID` を prepare 出力値に更新（検証用・**git 対象外**） |

---

## 5. 実行結果

### 5.1 prepare（修正後・1 回目）

```
PASS prepare approve pet (created fresh approve pet ([SEC-TEST] Review RPC Approve Pet #2))
PASS prepare return pet (reused existing under_review pet)
Preparation completed
SEC_TEST_ADMIN_APPROVE_PET_ID=6721b2ed-b786-49cf-938b-6347d051df8a
SEC_TEST_ADMIN_RETURN_PET_ID=079d446b-4303-460b-957b-7830cc08e69e
```

### 5.2 test:pet-review-rpcs（.env.local 更新後）

**29 passed / 0 failed**

### 5.3 prepare（test 実行後・繰り返し確認）

```
PASS prepare approve pet (created fresh approve pet ([SEC-TEST] Review RPC Approve Pet #3))
PASS prepare return pet (reused draft pet -> under_review)
Preparation completed
SEC_TEST_ADMIN_APPROVE_PET_ID=519b0992-091e-4b09-80ec-10789baa5335
```

**所見（事実）:** published 済み canonical / #2 を触らず #3 を新規作成。return Pet は draft から under_review へ復旧。

### 5.4 品質チェック

| コマンド               | 結果     |
| ---------------------- | -------- |
| `npm run lint`         | **成功** |
| `npm run typecheck`    | **成功** |
| `npm run format:check` | **成功** |
| `npm run build`        | **成功** |

---

## 6. 運用上の注意

| 項目              | 内容                                                                                                                                      |
| ----------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| `.env.local` 更新 | 新規 approve Pet 作成時は **出力された `SEC_TEST_ADMIN_APPROVE_PET_ID` を `.env.local` に反映**してから `test:pet-review-rpcs` を実行する |
| return Pet ID     | 通常は固定（`SEC_TEST_ADMIN_RETURN_PET_ID`）                                                                                              |
| SEC-TEST Pet 増加 | テスト繰り返しごとに approve 用 numbered Pet が増える（published 履歴として残る）                                                         |
| 本番              | 本スクリプトは開発 / セキュリティテスト専用                                                                                               |

---

## 7. git

| 操作                    | 実施       |
| ----------------------- | ---------- |
| git add / commit / push | **未実施** |

---

## 8. 次に実施すべき最小 1 ステップ

1. prepare 実行後、出力 ID を `.env.local` に反映（approve Pet が新規作成された場合）
2. `npm run test:pet-review-rpcs` を実行
3. AD-11 承認・差戻しの手動ブラウザ確認（別 Pet を使用し SEC-TEST テスト Pet と競合しないよう注意）

---

## 関連ドキュメント

- [第5段階審査RPCセキュリティテスト完了報告](./2026-08-10_第5段階審査RPCセキュリティテスト完了報告.md)
- [AD-11 承認・差戻し実装完了報告](./2026-08-12_AD-11_犬猫掲載審査_承認差戻し実装完了報告.md)
- [pets_status_trigger セキュリティテスト](../10_運用手順/pets_status_trigger_セキュリティテスト.md)
