# pets status Trigger 第3段階 RLS テスト失敗 原因調査

| 項目 | 内容 |
|------|------|
| 調査日 | 2026-08-07 |
| 対象 | `scripts/test-pets-status-trigger.mts` 第3段階（`--phase3`） |
| 状態 | 原因調査記録。最終再試験 **6 passed / 0 failed（合格）** |

## 背景

`--phase3` 実行結果:

```text
PASS authentication
PASS user lookup
PASS breeder lookup
FAIL other breeder draft pet hidden by RLS (visible count 1)
PASS other breeder pet update blocked by RLS
FAIL other breeder pet still hidden after update attempt (visible count 1)

4 passed / 2 failed
```

### 対象 Pet（ブリーダー B 所有）

| 項目 | 値 |
|------|-----|
| id | `663f174b-7c07-40af-b635-100a0342b179` |
| management_name | `[SEC-TEST-B] RLS Other Breeder Pet` |
| status | `draft` |

### 適用済み pets RLS Policy

- `pets_select_breeder_own`
- `pets_select_public_published`
- `pets_select_admin`
- `pets_update_breeder_own`

### その他のテスト Pet

- ブリーダー A 所有: `[SEC-TEST] Trigger Test Pet`（第2段階後 `under_review` の可能性あり）

---

## 1. visible count 1 の原因

`visible count 1` は、第3段階の SELECT が **1 行返している** ことを `hiddenPets.length` で数えた結果。

返っている行は、ほぼ確実に **ブリーダー B 所有の `[SEC-TEST-B] RLS Other Breeder Pet`** である。

`[SEC-TEST] Trigger Test Pet` を誤って数えている可能性は **低い**（後述）。

UPDATE が 0 件（PASS）なのに SELECT で 1 件見える組み合わせは、現在の RLS 定義と整合する。

| Policy | SELECT | UPDATE |
|--------|--------|--------|
| `pets_select_breeder_own` | 本人のみ | — |
| `pets_select_admin` | **admin なら全件** | — |
| `pets_update_breeder_own` | — | 本人のみ |

**最も有力な原因:** `SEC_TEST_BREEDER_EMAIL` のユーザーに `app_metadata.role = "admin"` が付いており、`pets_select_admin` 経由で **B の draft pet も SELECT できる** 一方、`pets_update_admin` が無いため **B の pet への UPDATE は 0 件** になる。

これは RLS の不具合ではなく、**「非 admin ブリーダー A」前提のテストに、admin 兼ブリーダーアカウントを使っている** 可能性が高い。

---

## 2. 実際の SELECT 条件

第3段階の SELECT（2 箇所とも同じ）:

```typescript
const { data: hiddenPets, error: hiddenError } = await supabase
  .from("pets")
  .select("id")
  .like("management_name", `${SEC_TEST_B_PREFIX}%`)  // '[SEC-TEST-B]%'
  .is("deleted_at", null);
```

| 項目 | 内容 |
|------|------|
| SELECT カラム | `id` のみ |
| WHERE | `management_name LIKE '[SEC-TEST-B]%'` |
| 追加条件 | `deleted_at IS NULL` |
| `SEC_TEST_OTHER_PET_ID` | **SELECT では未使用**（UPDATE の `.eq('id', otherPetId)` のみ） |
| RLS | クエリ側に breeder フィルタなし。PostgREST が JWT + RLS で行を絞る |

`visible count` の算出:

```typescript
const hiddenOk = hiddenError == null && (hiddenPets?.length ?? 0) === 0;
// FAIL 時: `visible count ${hiddenPets?.length ?? 0}`
```

### `[SEC-TEST]` の誤マッチについて

| 比較 | 内容 |
|------|------|
| パターン | `[SEC-TEST-B]%`（定数 `SEC_TEST_B_PREFIX`） |
| 比較対象例 | `[SEC-TEST] Trigger Test Pet` |
| PostgreSQL `LIKE` | `[` はメタ文字ではない |
| 9 文字目 | パターン `-` vs 文字列 `]` → **不一致** |

→ **`[SEC-TEST]` pet を LIKE で誤カウントしている可能性は低い。**

---

## 3. テストコードの問題か RLS の問題か

**結論: RLS 自体は想定どおり動いている可能性が高く、第3段階の「期待値・前提」の問題が主因。**

| 観察 | 解釈 |
|------|------|
| UPDATE 0 件 PASS | 他ブリーダー pet への UPDATE 拒否は **RLS 正常** |
| SELECT 1 件 FAIL | 「非 admin なら見えない」前提が満たされていない（admin SELECT が効いている） |
| 2 つの FAIL が同じ `visible count 1` | 同じ LIKE SELECT の結果。UPDATE 前後で見え方は変わらない（UPDATE も 0 件のため） |

RLS が壊れている（誰でも他人の pet が見える）なら、UPDATE も通る可能性がある。今回 UPDATE が拒否されているので、**所有者分離は UPDATE 側では機能している** と判断できる。

---

## 4. 推奨する最小修正（未実施）

### A. テストアカウント確認（コード変更なし）

- `SEC_TEST_BREEDER_EMAIL` ユーザーの `app_metadata.role` が `admin` でないか Dashboard で確認
- 第3段階は **非 admin のブリーダー専用アカウント** を使う

### B. テストコードの最小修正（将来）

1. **「非 admin」前提を明示** — ログイン後に admin なら第3段階を SKIP / FAIL（理由: `pets_select_admin` により全件 SELECT 可）
2. **SELECT 条件を LIKE から ID 指定へ変更** — 「B の pet が見えない」確認に直結:

   ```typescript
   .eq("id", otherPetId).maybeSingle()
   // 期待: data === null
   ```

   LIKE `[SEC-TEST-B]%` は補助確認に留める

### C. ドキュメント追記（将来）

- `SEC_TEST_BREEDER_*` は **admin ロールを付けない**
- admin 兼ブリーダーでは第3段階の「hidden by RLS」は **失敗が正しい挙動**

---

## 確認事項

Dashboard → Authentication → `SEC_TEST_BREEDER_EMAIL` ユーザー → **`app_metadata.role` が `"admin"` かどうか**。

ここが `admin` なら、今回の FAIL は RLS バグではなく **テスト前提との不一致** である。

---

## 関連ドキュメント

- [pets status Trigger セキュリティテスト](../10_運用手順/pets_status_trigger_セキュリティテスト.md)
- [権限設計 — pets RLS](../07_権限設計/README.md)
- [harden pets RLS Migration](../../supabase/migrations/20260807120000_harden_pets_rls.sql)

---

## 最終結果（2026-08-07 追記）

原因調査後、**非 admin・別 breeder** のテスト専用ブリーダー A2 を `SEC_TEST_BREEDER_*` に設定し、`--phase3` を再実行した。

```bash
npx tsx scripts/test-pets-status-trigger.mts --phase3
```

```text
PASS authentication
PASS user lookup
PASS breeder lookup
PASS other breeder draft pet hidden by RLS
PASS other breeder pet update blocked by RLS
PASS other breeder pet still hidden after update attempt

6 passed / 0 failed
```

**判定: 第3段階 合格。** RLS によるブリーダー間データ分離が機能していることを確認した。
