# pets status 遷移 Trigger セキュリティテスト手順

| 項目 | 内容 |
|------|------|
| 作成日 | 2026-08-07 |
| 対象 | `public.enforce_pets_status_transition()` / `pets_enforce_status_transition` |
| Migration | `20260807130000_enforce_pets_status_transition.sql` |
| 状態 | **第1〜第3段階 実施済み（2026-08-07 最終合格）** |

## 目的

適用済みの `public.enforce_pets_status_transition()` が、**ログイン中のブリーダー**による不正な `pets.status` 変更を DB 側で拒否できることを確認する。

## 現在の Trigger 仕様

### 許可

| 主体 | 遷移 | 条件 |
|------|------|------|
| breeder（本人） | `draft` → `under_review` | `pets.breeder_id` がログインユーザーの `breeders.id` |

### 拒否

- `draft` → `published`
- `under_review` → `published`
- `under_review` → `draft`
- その他、未許可の status 変更すべて

### status 変更なし

- `OLD.status = NEW.status`、または UPDATE 対象に `status` 列を含めない通常 UPDATE → **許可**

## テスト実行上の制約

| 使用可 | 使用禁止 |
|--------|---------|
| authenticated ユーザーの JWT（publishable key + ログイン） | SQL Editor の `postgres` 権限 UPDATE |
| ブラウザセッション / `signInWithPassword` | `SUPABASE_SERVICE_ROLE_KEY` |
| テスト専用に新規作成したデータ | 本番 pets の status をテスト目的で変更 |

---

## 実施結果サマリー（2026-08-07）

| 段階 | コマンド | 結果 | 判定 |
|------|---------|------|------|
| 第1段階 | デフォルト（第1のみ相当） | **7 passed / 0 failed** | 合格 |
| 第1・第2段階 | デフォルト | **13 passed / 0 failed** | 合格 |
| 第3段階 | `--phase3` | **6 passed / 0 failed** | 合格 |

実施日: 2026-08-07

### 第1・第2段階で確認したこと（Trigger）

- status 変更なしの通常 UPDATE は許可される
- `draft → published` は Trigger で拒否される
- `draft → under_review` は許可される
- `under_review → published` / `under_review → draft` は Trigger で拒否される

### 第3段階で確認したこと（RLS）

- ブリーダー A はブリーダー B 所有の draft pet を **SELECT できない**
- ブリーダー A はブリーダー B 所有の pet を **UPDATE できない**（0 件更新）
- UPDATE 試行後もブリーダー A から対象 pet は **SELECT できない**
- `pets` RLS によるブリーダー間データ分離が機能している

---

## 今後のテストルール（第3段階・RLS 分離）

pets RLS のブリーダー間分離テストでは、以下を守る。

| ルール | 理由 |
|--------|------|
| **admin ロールを持つアカウントを使用しない** | `pets_select_admin` により他ブリーダー pet も SELECT 可になる |
| **テスト対象 pet と同じ `breeder_id` のアカウントを使用しない** | 本人所有 pet として見えてしまい「他ブリーダー」テストにならない |
| **非 admin かつ別 breeder のテスト専用アカウントを使用する** | 第3段階の前提条件 |
| **Service Role Key を使用しない** | 本番と同じ authenticated 経路で検証する |

`SEC_TEST_BREEDER_*` は第3段階用に **非 admin・別 breeder** の専用アカウント（例: ブリーダー A2）を割り当てる。

---

## 第3段階 途中失敗と原因（2026-08-07）

初回および再試行前の `--phase3` 実行では **4 passed / 2 failed** となった。

```text
FAIL other breeder draft pet hidden by RLS (visible count 1)
FAIL other breeder pet still hidden after update attempt (visible count 1)
```

原因調査の結果、**RLS の不具合ではなくテストアカウントの前提条件**に問題があった。

| # | 事象 | 内容 |
|---|------|------|
| 1 | admin アカウント使用 | 当初のブリーダー A に `app_metadata.role = admin` が付いており、`pets_select_admin` により B 所有 pet を SELECT できた |
| 2 | 同一 breeder_id | 次に使用したアカウントがテスト対象 pet と同じ `breeder_id` に所属しており、「他ブリーダー pet」のテストになっていなかった |
| 3 | 最終再試験 | **非 admin・別 breeder** のテスト専用ブリーダー A2 を作成し、`SEC_TEST_BREEDER_*` を差し替えて再実行 → **6 passed / 0 failed** |

詳細: [2026-08-07_pets_status_第3段階RLSテスト_原因調査](../09_開発履歴/2026-08-07_pets_status_第3段階RLSテスト_原因調査.md)

### 第3段階 最終実行結果（2026-08-07）

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

**判定: 第3段階 合格**

---

## 1. 推奨テスト方法

**ハイブリッド方式**（UI でデータ準備 + 認証済み JS クライアントで攻撃系テスト）を推奨する。

| フェーズ | 手段 | 目的 |
|---------|------|------|
| 準備 | 既存 UI（`/signup`, `/breeder/pets/new`） | テスト専用ブリーダー・pets を新規作成 |
| 正常系（1〜3） | UI または Server Action 経由 | 既存アプリフローが Trigger と両立することを確認 |
| 攻撃系（4〜7） | **ログイン済み publishable key クライアント**で `.from('pets').update()` を直接実行 | アプリ層を迂回した DB 防御（RLS + Trigger）を確認 |

### 攻撃系テストの実行手段

#### A. スタンドアロン Node スクリプト（第1〜第3段階・実装済み）

`scripts/test-pets-status-trigger.mts`

```bash
# 第1〜第3段階（デフォルト）
npm run test:pets-status-trigger

# 第3段階のみ（ブリーダーAの [SEC-TEST] pet が under_review でも実行可）
npx tsx scripts/test-pets-status-trigger.mts --phase3
```

Node.js 22.6 以降を推奨（`--experimental-strip-types` 使用）。Node 20 の場合:

```bash
node --env-file=.env.local node_modules/tsx/dist/cli.mjs scripts/test-pets-status-trigger.mts
```

または `npx tsx --env-file=.env.local scripts/test-pets-status-trigger.mts`

- `@supabase/supabase-js` + publishable key
- `signInWithPassword()` でテスト用ブリーダー A にログイン
- Service Role を使用しない
- `[SEC-TEST]` プレフィックス付き draft pet のみ対象

#### B. ブラウザ DevTools（コード不要の代替）

1. `/login` でブリーダーログイン
2. DevTools Console で `@supabase/supabase-js` + publishable key を使い直接 UPDATE
3. 同じ JWT / Cookie セッションで PostgREST に到達

### 使用しないもの

- SQL Editor の `postgres` 権限 UPDATE
- `SUPABASE_SERVICE_ROLE_KEY` / `createAdminClient()`（`src/lib/supabase/admin.ts`）
- `repository.ts` を Next.js 外から直接 import（`server-only` + cookies 依存のため不可）

---

## 2. 使用する既存ファイル

| ファイル | 用途 |
|---------|------|
| `src/lib/supabase/client.ts` | ブラウザセッション（DevTools 方式の参考） |
| `src/lib/supabase/server.ts` | Server Action 経由テストのセッション取得 |
| `src/features/pets/repository.ts` | `getBreederIdByUserId`, `updatePetDraft`, `submitPetForReview`, `createPet` |
| `src/features/pets/service.ts` | `createPetDraft`, `updatePetDraftAction`, `submitPetForReviewAction` |
| `src/app/(auth)/login/page.tsx` | ブリーダーログイン |
| `src/app/breeder/pets/new/page.tsx` + `pet-registration-form.tsx` | テスト用 draft 作成 |
| `src/app/breeder/pets/[petId]/edit/page.tsx` | 通常 UPDATE（status なし）確認 |
| `src/app/breeder/pets/page.tsx` | 公開申請 UI（`draft → under_review` 正常系） |
| `scripts/test-pets-status-trigger.mts` | 第1〜第3段階自動テスト（authenticated 直接 UPDATE / SELECT） |
| `.env.local` | Supabase URL / publishable key / テスト用ブリーダー認証情報 |
| `supabase/migrations/20260807130000_enforce_pets_status_transition.sql` | 期待エラーメッセージの参照 |

---

## 3. 自動テストスクリプト（第1段階）

| 項目 | 内容 |
|------|------|
| ファイル | `scripts/test-pets-status-trigger.mts` |
| npm script | `npm run test:pets-status-trigger` |
| 認証 | `signInWithPassword()`（publishable key のみ） |
| 対象 pet | `management_name LIKE '[SEC-TEST]%'` かつ `status = 'draft'` かつ本人所有 |

### 必要な環境変数（`.env.local`）

| 変数 | 用途 |
|------|------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase プロジェクト URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | anon / publishable key |
| `SEC_TEST_BREEDER_EMAIL` | テスト用ブリーダー A の email |
| `SEC_TEST_BREEDER_PASSWORD` | テスト用ブリーダー A の password |
| `SEC_TEST_OTHER_PET_ID` | テスト用ブリーダー B の `[SEC-TEST-B]` pet UUID（第3段階） |

**使用しない:** `SUPABASE_SERVICE_ROLE_KEY`（スクリプト内で参照しない）

### 第1段階で自動実行するチェック

| # | チェック名 | 合格条件 |
|---|-----------|---------|
| 1 | authentication | `signInWithPassword` 成功 |
| 2 | user lookup | ログインユーザー取得 |
| 3 | breeder lookup | 本人 `breeders` レコード取得 |
| 4 | test pet lookup | `[SEC-TEST]` draft pet が 1 件存在 |
| 5 | normal update | `management_name` 同値 UPDATE 成功（1 件） |
| 6 | draft -> published rejected by trigger | `error.message` に `invalid status transition` |
| 7 | status remained draft | 再 SELECT で `status === 'draft'` |

対象 pet が見つからない場合は **UPDATE を実行せず終了**する。

第1段階完了後、**同一 pet** に対して第2段階を続行する。

---

## 4. 自動テストスクリプト（第2段階）

| 項目 | 内容 |
|------|------|
| 前提 | 第1段階の 7 チェックの直後に実行 |
| 対象 pet | 第1段階と同じ `[SEC-TEST]` draft pet |
| 終了時 status | `under_review` のまま残してよい |

### 第2段階で自動実行するチェック

| # | チェック名 | 合格条件 |
|---|-----------|---------|
| 8 | draft -> under_review | UPDATE 成功（1 件） |
| 9 | status became under_review | 再 SELECT で `status === 'under_review'` |
| 10 | under_review -> published rejected by trigger | `error.message` に `invalid status transition` |
| 11 | status remained under_review after published attempt | 再 SELECT で `status === 'under_review'` |
| 12 | under_review -> draft rejected by trigger | `error.message` に `invalid status transition` |
| 13 | status remained under_review after draft attempt | 再 SELECT で `status === 'under_review'` |

### 第2段階で未実装（将来）

（なし — 第3段階で RLS テストを実装済み）

### 出力例（第1・第2段階）

```text
PASS authentication
PASS user lookup
PASS breeder lookup
PASS test pet lookup (pet id ...)
PASS normal update
PASS draft -> published rejected by trigger
PASS status remained draft
PASS draft -> under_review
PASS status became under_review
PASS under_review -> published rejected by trigger
PASS status remained under_review after published attempt
PASS under_review -> draft rejected by trigger
PASS status remained under_review after draft attempt

13 passed / 0 failed
```

パスワード・JWT・publishable key は出力しない。

### 事前準備

1. UI でテスト用ブリーダー A を `/signup` 登録
2. `/breeder/pets/new` で `management_name` を `[SEC-TEST] ...` として **draft** を 1 件以上作成
3. `.env.local` に上記 4 変数を設定

**注意:** 第2段階実行後、対象 pet は `under_review` になる。再実行する場合は新しい `[SEC-TEST]` draft pet を作成するか、Dashboard で `draft` に戻す（本番 pets には触れない）。

---

**注意:** 第2段階実行後、対象 pet は `under_review` になる。第1・第2段階を再実行する場合は新しい `[SEC-TEST]` draft pet を作成する。第3段階のみ再実行する場合は `--phase3` を使用する。

---

## 5. 自動テストスクリプト（第3段階）

| 項目 | 内容 |
|------|------|
| 目的 | 他ブリーダー所有 pet への UPDATE が **RLS** で拒否されることを確認 |
| ログイン | ブリーダー A のみ（B としてログインし直さない） |
| 対象 pet | ブリーダー B が作成した `management_name LIKE '[SEC-TEST-B]%'` |
| 実行方法 | デフォルト（第1〜3一括）または `--phase3`（第3のみ） |
| **最終結果（2026-08-07）** | **`--phase3` → 6 passed / 0 failed（合格）** |

### テストアカウント条件（必須）

第3段階を正しく検証するには、`SEC_TEST_BREEDER_*` が以下を満たすこと。

- `app_metadata.role` が **admin ではない**
- `SEC_TEST_OTHER_PET_ID` の pet 所有者（ブリーダー B）と **別の `breeder_id`**

---

| # | チェック名 | 合格条件 |
|---|-----------|---------|
| — | authentication / user lookup / breeder lookup | 第3段階でもブリーダー A として認証 |
| 14 | other breeder draft pet hidden by RLS | `[SEC-TEST-B]%` SELECT が 0 件、`error === null` |
| 15 | other breeder pet update blocked by RLS | `SEC_TEST_OTHER_PET_ID` への UPDATE が 0 件、`error === null` |
| 16 | other breeder pet still hidden after update attempt | UPDATE 後も `[SEC-TEST-B]%` SELECT が 0 件 |

UPDATE は status を変更しない安全な `management_name` 更新のみ:

```text
management_name: '[SEC-TEST-B] RLS Other Breeder Pet'
```

### SEC_TEST_OTHER_PET_ID の設定方法

1. ブリーダー B で `/signup` 登録
2. B で `/breeder/pets/new` から `management_name` を `[SEC-TEST-B] ...` として pet を 1 件作成
3. Supabase Dashboard → Table Editor → `pets` で該当行の `id`（UUID）を確認
4. `.env.local` に `SEC_TEST_OTHER_PET_ID=<uuid>` を追加

**注意:**

- Service Role や B のパスワードは不要
- pet ID をソースコードに固定しない
- スクリプトは `SEC_TEST_OTHER_PET_ID` の値をログ出力しない

### 出力例（第3段階のみ）

```text
PASS authentication
PASS user lookup
PASS breeder lookup
PASS other breeder draft pet hidden by RLS
PASS other breeder pet update blocked by RLS
PASS other breeder pet still hidden after update attempt

6 passed / 0 failed
```

### 出力例（第1〜第3段階一括）

```text
...（第1・第2段階 13 チェック）...
PASS other breeder draft pet hidden by RLS
PASS other breeder pet update blocked by RLS
PASS other breeder pet still hidden after update attempt

16 passed / 0 failed
```

**注意:** 第3段階の「hidden by RLS」は **非 admin・別 breeder** のブリーダー A 前提。admin または同一 `breeder_id` では失敗する（[原因調査](../09_開発履歴/2026-08-07_pets_status_第3段階RLSテスト_原因調査.md)）。2026-08-07 に非 admin・別 breeder アカウント（A2）で再試験し **合格**。

---

**DevTools 手動実行**で第1段階以外も含めた全項目をカバー可能。

再現性のため、将来はスクリプトを拡張する。

`.env.local` から URL / publishable key を読み、テスト用ブリーダーの email / password は `SEC_TEST_*` 環境変数で渡す。**Service Role は読み込まない。**

---

## 7. テストデータ

**必要。** 本番 pets の status をテスト目的で変更しないため、**専用テストデータを新規作成**する。

### 推奨構成

| 主体 | 作成方法 | 用途 |
|------|---------|------|
| ブリーダー A（テスト用） | `/signup` で新規登録 | 本人 pets のテスト |
| ブリーダー B（テスト用） | 同上（別アカウント） | 他ブリーダー UPDATE 拒否 |
| Pet-A（A 所有・draft） | `/breeder/pets/new` | テスト 2, 3, 5, 6 |
| Pet-B（A 所有・draft） | 同上 | テスト 4（draft のまま維持） |
| Pet-C（B 所有・`[SEC-TEST-B]`） | B で 1 件作成 | 第3段階 RLS テスト（`SEC_TEST_OTHER_PET_ID`） |

命名例: `management_name` を `[SEC-TEST] Pet-A` のようにして識別する。

### 実行順序（データを壊さない）

```text
Pet-A (draft)
  → テスト2: 通常 UPDATE（draft のまま）
  → テスト3: draft → under_review（under_review になる）
  → テスト5: under_review → published（拒否・status 不変）
  → テスト6: under_review → draft（拒否・status 不変）

Pet-B (draft)
  → テスト4: draft → published（拒否・status 不変）

Pet-C (B 所有)
  → テスト7: A が UPDATE 試行（RLS 拒否）
```

Pet-A を先に `under_review` にしても、Pet-B が draft のまま残るため本番データへの影響はない。

---

## 8. 各テストの期待結果

| # | テスト | 操作 | 期待結果 |
|---|--------|------|---------|
| 1 | 本人 pets 取得 | `.select()` + 本人 `breeder_id` でフィルタ | 成功。Pet-A, Pet-B が見える |
| 2 | status 変更なし UPDATE | `.update({ management_name: '...' })`（status 含めない） | **成功**。Trigger 非発火（`OF status`） |
| 3 | `draft → under_review` | `.update({ status: 'under_review' }).eq('status','draft')` | **成功**。status が `under_review` に変わる |
| 4 | `draft → published` | Pet-B に `.update({ status: 'published' })` | **拒否**。Trigger 例外 |
| 5 | `under_review → published` | Pet-A に `.update({ status: 'published' })` | **拒否**。Trigger 例外 |
| 6 | `under_review → draft` | Pet-A に `.update({ status: 'draft' })` | **拒否**。Trigger 例外 |
| 7 | 他ブリーダーの pets | A の JWT で Pet-C を UPDATE | **拒否**。RLS（0 行更新） |

### Trigger 拒否時のエラーメッセージ（目安）

Migration 定義より:

- `invalid status transition (from draft to published)`
- `invalid status transition (from under_review to published)`
- `invalid status transition (from under_review to draft)`

---

## 9. テスト後のデータ削除方法

| 方法 | 内容 | 備考 |
|------|------|------|
| **A. 論理削除（推奨）** | 認証済み A で `.update({ deleted_at: now() })` | status 変更ではないため Trigger 非発火 |
| **B. Dashboard 手動削除** | Supabase Table Editor で `[SEC-TEST]` 行を削除 | テスト実行は authenticated 経路。片付けのみ Dashboard 利用可 |
| **C. 放置** | `[SEC-TEST]` プレフィックスで識別し dev 環境に残す | 繰り返しテスト向け |

テスト用 Auth ユーザー（A, B）も Dashboard → Authentication から削除可能。

**注意:** テスト 3 で Pet-A は `under_review` になるが、セキュリティ確認としては問題なし。本番 pets には `[SEC-TEST]` 命名で混同を避ける。

---

## 10. RLS 拒否 vs Trigger 拒否の判別

| 観点 | RLS 拒否 | Trigger 拒否 |
|------|---------|-------------|
| 典型シナリオ | 他ブリーダーの pet（テスト 7） | 本人 pet の不正 status 変更（テスト 4〜6） |
| Supabase JS `error` | **`null`**（例外なし） | **非 null**（PostgreSQL 例外） |
| 更新行数 / `data` | **空配列 / 0 行** | 更新前に失敗 |
| `error.code` | なし | 多くは `P0001`（RAISE EXCEPTION） |
| `error.message` | なし | `invalid status transition (from X to Y)` 等 |
| DB 上の status | 変わらない | 変わらない |

### 判別手順

```javascript
const { data, error } = await supabase
  .from('pets')
  .update({ status: 'published' })
  .eq('id', petId)
  .select('id, status');

// Trigger 拒否
if (error) {
  // error.message に "invalid status transition" → Trigger
  // error.message に "status change requires authentication" → Trigger（未ログイン時）
}

// RLS 拒否
if (!error && (!data || data.length === 0)) {
  // USING / WITH CHECK で対象行なし → RLS
}
```

### テスト 7 を RLS と判定するコツ

1. **Breeder A** で Pet-C（B 所有）を UPDATE → `error: null`, `data: []` → **RLS**
2. 続けて **Breeder A** で Pet-B（A 所有・draft）を `draft → published` → `error` あり → **Trigger**
3. 同一 JWT・同一テーブルで拒否パターンが異なるため切り分け可能

### アプリ経由 vs 直接 API

| 経路 | テスト 4〜6 で確認できること |
|------|------------------------------|
| UI / Server Action | アプリが不正遷移を呼ばない（防御はアプリ層） |
| 直接 `.update({ status })` | **Trigger が DB 層で拒否**（今回の主目的） |

Trigger の検証には **必ず直接 UPDATE** が必要。UI だけではテスト 4〜6 は実行できない。

---

## DevTools 用スニペット（参考）

ログイン済みブラウザで、publishable key を使う例。URL / key は `.env.local` の値に置き換える。

```javascript
const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');

const supabase = createClient(
  '<NEXT_PUBLIC_SUPABASE_URL>',
  '<NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY>'
);

// 未ログインの場合のみ（通常は Cookie セッションを使う）
// await supabase.auth.signInWithPassword({ email: '...', password: '...' });

const petId = '<pet-id>';

const { data, error } = await supabase
  .from('pets')
  .update({ status: 'published' })
  .eq('id', petId)
  .select('id, status');

console.log({ data, error });
```

---

## 関連ドキュメント

- [pets status トリガー設計](../09_開発履歴/2026-08-07_pets_status_トリガー設計案.md)
- [pets status セキュリティレビュー](../09_開発履歴/2026-08-07_pets_status_セキュリティレビュー.md)
- [権限設計](../07_権限設計/README.md)
- [pets テーブル](../05_データベース設計/pets.md)
