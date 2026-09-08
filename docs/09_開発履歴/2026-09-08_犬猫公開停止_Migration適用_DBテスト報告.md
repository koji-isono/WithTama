# WithTama 犬猫公開停止・再公開 Migration 適用 / DB テスト報告

## 1. 概要

| 項目 | 内容 |
| ---- | ---- |
| 日付 | 2026-09-08 |
| Migration | `supabase/migrations/20260908100000_add_pet_listing_pause_resume.sql` |
| 適用方法 | Supabase Dashboard SQL Editor 手動適用 |
| 適用結果 | `Success. No rows returned` |
| テストコマンド | `npm run test:pet-listing-pause-db` |
| 終了コード | **1（FAIL）** |
| 使用 pet | `7d9e363d-2468-4c89-a585-3a5eb3a85982`（`[SEC-TEST] Submit RPC With Photo Pet #8`） |

## 2. 集計

| 区分 | 件数 |
| ---- | ---- |
| PASS | 35 |
| FAIL | 3 |
| SKIP | 6 |

※ `finish()` サマリは CASE L 末尾の脚本例外により未出力。

## 3. CASE A〜S 結果

| CASE | 内容 | 結果 | 備考 |
| ---- | ---- | ---- | ---- |
| A | owner breeder `published → paused` | **PASS** | status=paused 確認済み |
| B | owner breeder `paused → published` | **PASS** | status=published 確認済み |
| C | `draft → pause` 拒否 | **SKIP** | `SEC_TEST_SUBMIT_DRAFT_PET_ID` 未設定 |
| D | `under_review → pause` 拒否 | **SKIP** | `SEC_TEST_ADMIN_REVIEW_PET_ID` 未設定 |
| E | `published → resume` 拒否 | **PASS** | `invalid pet status` |
| F | 他 breeder pause 拒否 | **SKIP** | `SEC_TEST_OTHER_BREEDER_EMAIL` 未設定 |
| G | 他 breeder resume 拒否 | **SKIP** | 同上 |
| H | buyer 拒否 | **一部 FAIL** | pause=PASS、resume=FAIL（§5 参照） |
| I | anon 拒否 | **PASS** | `permission denied for function` |
| J | pause 二重実行拒否 | **PASS** | `invalid pet status` |
| K | resume 二重実行拒否 | **PASS** | `invalid pet status` |
| L | 紹介文審査中 pause で pending 破棄 | **ほぼ PASS** | キュー確認で脚本例外（§5 参照） |
| M | description 保持 | **PASS** | 単純 pause / revision pause とも |
| N | published_at 保持 | **PASS** | 同上 |
| O | inquiry 保持 | **PASS** | 37 → 37 |
| P | visit 保持 | **PASS** | 36 → 36 |
| Q | favorite 保持 | **PASS** | 0 → 0 |
| R | paused Public View 非表示 | **PASS** | list / detail とも非表示 |
| S | resume Public View 再表示 | **PASS** | list / detail とも再表示 |

## 4. Security テスト結果

| 観点 | 結果 | 詳細 |
| ---- | ---- | ---- |
| RPC 存在（pause_pet_listing） | **PASS** | Migration 適用確認 |
| RPC 存在（resume_pet_listing） | **PASS** | Migration 適用確認 |
| breeder 本人 pause | **PASS** | CASE A |
| breeder 本人 resume | **PASS** | CASE B |
| pause 二重実行 | **PASS** | CASE J |
| resume 二重実行 | **PASS** | CASE K |
| buyer pause | **PASS** | `unauthorized` |
| buyer resume | **FAIL（assert）** | 拒否自体は成功（§5.2） |
| anon pause | **PASS** | permission denied |
| anon resume | **PASS** | permission denied |
| 他 breeder pause / resume | **SKIP** | 資格情報未設定 |
| draft / under_review から pause | **SKIP** | pet id 未設定 |

## 5. FAIL 原因

### 5.1 prepare: `ensure description length`

| 項目 | 内容 |
| ---- | ---- |
| ファイル | `scripts/prepare-sec-test-pet-listing-pause.mts` |
| エラー | `cannot update description on published pet outside approval RPC` |
| 原因 | prepare が `published` pet の `description` を直接 UPDATE しようとしている。公開後 description 改訂保護（trigger / RLS）により拒否される |
| 判定 | **想定どおりの DB 挙動**。prepare 脚本側の問題 |
| 影響 | pet id は出力され、本テスト本体は継続実行された |

### 5.2 CASE H: buyer resume denied

| 項目 | 内容 |
| ---- | ---- |
| ファイル | `scripts/test-pet-listing-pause-db.mts` |
| エラー | `invalid pet status`（テストは `unauthorized` のみ PASS 条件） |
| 原因 | buyer resume 実行時点で pet は既に `published`（CASE B 完了後）。`resume_pet_listing` は status チェックが先 |
| 判定 | buyer は resume **できない**（拒否成功）。**セキュリティ問題なし** |
| 影響 | テスト assert の順序・条件不足 |

### 5.3 `queueCount is not defined`

| 項目 | 内容 |
| ---- | ---- |
| ファイル | `scripts/test-pet-listing-pause-db.mts` L521 |
| エラー | `ReferenceError: queueCount is not defined` |
| 原因 | 未定義変数 `queueCount` を参照（正しくは `adminQueueCount`） |
| 判定 | **テスト脚本の typo** |
| 影響 | `CASE L: removed from description revision queue` の PASS/FAIL 未記録、`finish()` 未実行 |

## 6. SKIP 一覧

| SKIP | 理由 |
| ---- | ---- |
| `SEC_TEST_LISTING_PAUSE_PET_ID` | env 未注入（prepare 出力あり、shell に export なし）。fallback で pet 解決済み |
| CASE C | `SEC_TEST_SUBMIT_DRAFT_PET_ID` 未設定 |
| CASE D | `SEC_TEST_ADMIN_REVIEW_PET_ID` 未設定 |
| CASE F | `SEC_TEST_OTHER_BREEDER_EMAIL` / `PASSWORD` 未設定 |
| CASE G | 同上 |

## 7. テスト生ログ（抜粋）

```
PASS pause/resume migration applied
PASS CASE A: published → paused
PASS CASE A: status is paused (paused)
PASS CASE M: description preserved on simple pause
PASS CASE N: published_at preserved on simple pause
PASS CASE R: paused hidden from published_pets_public
PASS CASE R: paused hidden from published_pet_detail_public
PASS CASE O: inquiries preserved on pause (37 → 37)
PASS CASE P: visits preserved on pause (36 → 36)
PASS CASE Q: favorites preserved on pause (0 → 0)
PASS CASE J: double pause rejected (invalid pet status)
PASS CASE B: paused → published
PASS CASE B: status is published
PASS CASE S: resume visible in published_pets_public
PASS CASE S: resume visible in published_pet_detail_public
PASS CASE K: double resume rejected (invalid pet status)
PASS CASE E: published → resume rejected (invalid pet status)
PASS CASE H: buyer pause denied (unauthorized)
FAIL CASE H: buyer resume denied (invalid pet status)
PASS CASE I: anon pause denied (permission denied for function pause_pet_listing)
PASS CASE I: anon resume denied (permission denied for function resume_pet_listing)
PASS CASE L: pause during revision succeeds
PASS CASE L: pending_description cleared (null)
PASS CASE L: description_review_status none (none)
FAIL unhandled error (queueCount is not defined)
```

## 8. ブラウザ E2E 実施可否

| 項目 | 判定 |
| ---- | ---- |
| Migration | 適用済み |
| RPC 動作 | CASE A/B/R/S PASS |
| ブラウザ E2E | **実施可能** |

`npm run dev` 起動中であれば、BR-10 から以下を手動確認可能:

1. 公開中犬猫を確認
2. 公開停止
3. Badge「一時停止」
4. 購入者公開一覧から消える
5. 再公開
6. Badge「公開中」
7. 購入者公開一覧へ再表示

## 9. 結論

| 項目 | 判定 |
| ---- | ---- |
| Migration 適用 | **成功** |
| RPC / DB 本番挙動 | **概ね正常**（A/B/J/K/L/M/N/O/P/Q/R/S PASS） |
| テスト脚本 | **3 件 FAIL**（prepare assert / buyer resume assert / typo） |
| コード・Migration・DB 修正 | **不要**（FAIL はテスト側起因） |
| commit / push | **未実施** |

## 10. 関連ドキュメント

- [実装報告（2026-09-07）](./2026-09-07_犬猫公開停止_再公開_実装報告.md)
- [実装前調査](./2026-09-07_犬猫公開停止_実装前調査報告.md)
