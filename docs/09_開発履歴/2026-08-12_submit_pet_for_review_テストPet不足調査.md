# submit_pet_for_review セキュリティテスト — draft+写真 Pet 不足 調査

| 項目     | 内容                                                         |
| -------- | ------------------------------------------------------------ |
| 調査日   | 2026-08-12                                                   |
| 対象     | `npm run test:submit-pet-for-review` の失敗原因調査          |
| 種別     | **調査・提案のみ**（コード・Migration・DB 変更なし）         |

## 概要

`npm run test:submit-pet-for-review` 実行時、**11 passed / 1 failed** となった。  
唯一の失敗は `draft test pet with photo lookup` で、**draft かつ写真 1 枚以上の `[SEC-TEST]` Pet が DB に存在しない**ことが原因。

---

## 1. 失敗内容

```
FAIL draft test pet with photo lookup
(no draft pet with management_name like '[SEC-TEST]%' and at least one photo)
```

### テストが成功系で要求する条件

`scripts/test-submit-pet-for-review.mts` の `findSecTestDraftPetWithPhoto()` は以下を **すべて** 満たす Pet を探す。

| 条件 | 内容 |
| ---- | ---- |
| `management_name` | `[SEC-TEST]%` |
| `status` | `draft` |
| `pet_photos` | **1 枚以上** |
| 所有者 | `SEC_TEST_BREEDER` の breeder |

現状、この組み合わせを満たす Pet が **0 件** のため、成功系テスト（draft→under_review、submitted log 等）以降が実行されず早期終了した。

---

## 2. 11 passed の内訳（参考）

RPC 適用済みの環境では、失敗前に以下は合格している。

| 区分 | 内容 |
| ---- | ---- |
| 前提 | RPC 存在確認、breeder サインイン、breeder id |
| 写真 0 枚 | 拒否、status draft 維持、log 不変、ロールバック確認 |
| admin | 実行拒否（admin サインイン成功時） |

**失敗はデータ準備不足のみ** で、RPC ロジック自体の問題ではない。

---

## 3. 既存 SEC-TEST データの状態（推定）

| Pet 名 | 想定 status | 写真 | submit テストへの利用 |
| ------ | ----------- | ---- | --------------------- |
| `[SEC-TEST] Trigger Test Pet` | `under_review` 等 | 不明 | **不可**（第1〜4段階用・変更禁止） |
| `[SEC-TEST] Review RPC Approve Pet` | `under_review` | **なし** | **不可**（第5段階 approve 用） |
| `[SEC-TEST] Review RPC Return Pet` | `under_review` | **なし** | **不可**（第5段階 return 用） |
| `[SEC-TEST] Submit RPC No Photo Pet` | `draft` | **0 枚** | 写真拒否テスト専用（テスト内自動作成） |
| 以前の submit テスト消費分 | `under_review` | なしの可能性大 | draft ではない |

**結論:** 既存 SEC-TEST Pet をそのまま再利用して成功系を満たすことはできない。

---

## 4. 復旧ロジックが効かなかった理由

テストには `SEC_TEST_ADMIN_RETURN_PET_ID`（任意）から admin `return_pet_review` で draft に戻す `recoverDraftPetWithPhotoViaAdminReturn()` がある。

```typescript
// recoverDraftPetWithPhotoViaAdminReturn 内
if (photoCount < 1) {
  return null;  // ← ここで失敗
}
```

### 原因

`prepare-sec-test-review-pets.mts` は **Pet 作成 + draft→under_review** のみ行い、**写真アップロードは行わない**。

そのため Return Pet を admin return で draft に戻しても **写真 0 枚のまま** となり、復旧は `null` になる。  
`.env.local` に `SEC_TEST_ADMIN_RETURN_PET_ID` が設定されていても、写真不足で成功系 Pet にはならない。

---

## 5. 既存準備スクリプトとのギャップ

| スクリプト | 目的 | draft + 写真 |
| ---------- | ---- | ------------ |
| `prepare-sec-test-review-pets.mts` | 第5段階 Approve/Return Pet（`under_review`） | ❌ 写真なし |
| `prepare-sec-test-review-breeder.mts` | breeder 資格整備 | Pet 作成なし |
| `test-submit-pet-for-review.mts` | 写真 **なし** Pet のみ自動作成 | ❌ 写真あり Pet は作らない |

**submit RPC 用の「draft + 写真 1 枚以上」Pet を用意する専用準備が存在しない。**

---

## 6. 安全な準備方法の提案

### 方針

- **新規専用 Pet** を使う（既存 Approve / Return / Trigger Test Pet には触れない）
- 固定名: **`[SEC-TEST] Submit RPC With Photo Pet`**
- breeder JWT のみ（Service Role 不使用）
- 写真は既存 RLS 経由（Storage upload + `pet_photos` INSERT）

### 推奨: 専用 prepare スクリプト（将来実装）

`scripts/prepare-sec-test-submit-pet.mts`（新規）の想定手順:

1. `SEC_TEST_BREEDER_*` でサインイン（非 admin）
2. `[SEC-TEST] Submit RPC With Photo Pet` を **draft で find or insert**
3. 写真 0 枚なら、最小 JPEG フィクスチャを Storage + `pet_photos` に登録（アプリと同経路）
4. `status = draft`・写真 ≥ 1 を確認
5. `.env.local` 用に `SEC_TEST_SUBMIT_DRAFT_PET_ID=<uuid>` を出力

### 手動での代替（スクリプト未作成時）

1. `SEC_TEST_BREEDER` でログイン
2. 管理名 **`[SEC-TEST] Submit RPC With Photo Pet`** で draft 新規登録
3. 写真を 1 枚アップロード
4. `npm run test:submit-pet-for-review` を再実行

### 避けるべき方法

| 方法 | 理由 |
| ---- | ---- |
| Approve / Return Pet の再利用 | 第5段階テスト（`test:pet-review-rpcs`）を壊す |
| Trigger Test Pet の変更 | 第1〜4段階用・運用手順で変更禁止 |
| admin return のみ | draft には戻るが **写真不足** で不十分 |
| Service Role / SQL Editor 直接 UPDATE | 要件違反 |
| 本番用 Pet（`[SEC-TEST]` 以外）の変更 | 要件違反 |

---

## 7. テスト改善案（参考・今回未実施）

| 案 | 内容 |
| -- | ---- |
| env 明示 | `SEC_TEST_SUBMIT_DRAFT_PET_ID` を env で指定し lookup を固定 |
| prepare 連携 | `prepare-sec-test-submit-pet.mts` を `test:submit-pet-for-review` 前段に組み込む |
| テスト後復旧 | 成功系実行後、admin return で draft に戻す（第5段階との兼ね合いに注意） |

---

## 8. 実施しなかったこと

- コード変更
- Migration 作成・適用
- DB 更新（Pet / 写真の作成・削除）
- テスト再実行
- 本番用 Pet データへの接触

---

## 9. 次に実施すべき最小の 1 ステップ

~~**`SEC_TEST_BREEDER` アカウントで、管理名 `[SEC-TEST] Submit RPC With Photo Pet` の draft Pet を 1 件新規作成し、写真を 1 枚アップロードする**~~

### 解決（2026-08-12）

上記手順により `[SEC-TEST] Submit RPC With Photo Pet`（draft + 写真 1 枚以上）を準備。  
`npm run test:submit-pet-for-review` — **25 passed / 0 failed**。

---

## 10. 関連ドキュメント

- [submit_pet_for_review RPC 実装完了報告](./2026-08-12_submit_pet_for_review_RPC実装完了報告.md)
- [pets status Trigger セキュリティテスト](../10_運用手順/pets_status_trigger_セキュリティテスト.md)
- `scripts/test-submit-pet-for-review.mts`
- `scripts/prepare-sec-test-review-pets.mts`
