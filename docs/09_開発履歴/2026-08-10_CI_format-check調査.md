# GitHub Actions CI format:check 調査

日付：2026-08-10

## 背景

CI 修正（lint error / warning 7 件）後のローカル実行結果:

| コマンド               | 結果                           |
| ---------------------- | ------------------------------ |
| `npm run lint`         | 成功                           |
| `npm run typecheck`    | 成功                           |
| `npm run build`        | 成功                           |
| `npm run format:check` | **失敗**（118 ファイル未整形） |

---

## 1. 現在の CI 実行順

`.github/workflows/ci.yml`（workflow 1 件: `CI` / job: `quality`）:

| 順  | ステップ             | コマンド               |
| --- | -------------------- | ---------------------- |
| 1   | checkout             | `actions/checkout@v4`  |
| 2   | Node セットアップ    | Node 22 + npm cache    |
| 3   | 依存インストール     | `npm ci`               |
| 4   | Lint                 | `npm run lint`         |
| 5   | 型チェック           | `npm run typecheck`    |
| 6   | フォーマットチェック | `npm run format:check` |
| 7   | ビルド               | `npm run build`        |

トリガー: `pull_request` および `push`（`main` ブランチ）

---

## 2. `format:check` は CI 必須か

**はい。** step 6 で必ず実行される。1 ファイルでも未整形なら exit code 1 で CI 失敗し、以降の `build` は実行されない。

以前は step 4 の lint error で止まっていたため、`format:check` まで到達していなかった可能性が高い。

---

## 3. `package.json` の定義

```json
"format": "prettier --write .",
"format:check": "prettier --check ."
```

- 対象: リポジトリルートの `.`（Prettier が処理する全ファイル）
- `lint-staged` で Prettier は設定済みだが、**`.husky/pre-commit` 等のフックはリポジトリに存在しない**（`prepare` → husky は動くが、コミット時自動整形は効いていない）

---

## 4. `.prettierignore`

**存在する。** 除外は次の 3 つのみ:

```
.next
node_modules
package-lock.json
```

`docs/`、`scripts/`、`supabase/` 等は **すべて CI 対象**。

---

## 5. 118 ファイルは CI 対象か

**はい。** ただし重要な点:

| 環境                                            | `format:check` 失敗数 |
| ----------------------------------------------- | --------------------- |
| ローカル作業ツリー（現状）                      | **118 ファイル**      |
| **コミット済み HEAD のクリーン状態**（CI 相当） | **181 ファイル**      |

`git worktree` で `HEAD`（`1e3291a` = `origin/main`）のみを checkout して `npm run format:check` を実行した結果、**181 ファイル**で失敗。

CI は push されたコミット内容を検査するため、実際の CI 失敗規模は **118 より多い（約 181）** と考えるべき。

---

## 6. 未整形になっている理由（推定）

1. **リポジトリ全体が Prettier 未適用のまま積み上がっている**（コミット済みコードベースでも 181 件）
2. **`lint-staged` が pre-commit フック未設定**のため、コミット時に自動整形されない
3. **`format:check` は CI にあるが、lint 失敗で先に止まっていた**ため、問題が表面化していなかった
4. Windows の CRLF 警告はあるが、クリーン worktree でも 181 件失敗 → **主因は Prettier 未実行のフォーマット差分**

---

## 7. 今回変更 7 ファイルだけ整形すれば CI は通るか

**通らない。**

| ファイル                     | 結果      |
| ---------------------------- | --------- |
| `postcss.config.mjs`         | ✅ OK     |
| `pet-photo-manager.tsx`      | ❌ 未整形 |
| `document-utils.ts`          | ❌ 未整形 |
| `repository.ts`              | ❌ 未整形 |
| `service.ts`                 | ❌ 未整形 |
| `verification-step-form.tsx` | ❌ 未整形 |
| `pet-registration-form.tsx`  | ❌ 未整形 |

7 ファイル中 **6 ファイルが未整形**。それらを整形しても、`prettier --check .` は残り **175 ファイル前後**（181 − 6）で失敗する。

---

## 8. CI を通すために必要な最小修正

### 現行 CI 設定を維持する場合（推奨）

**`prettier --write .` を 1 回実行し、全対象ファイルを整形したコミットが必要**（コミット済み HEAD 基準で約 **181 ファイル**）。

部分的な整形では `format:check` は通らない。

### 代替案（CI 設定変更が必要）

| 案  | 内容                                                           | 最小性 | リスク                       |
| --- | -------------------------------------------------------------- | ------ | ---------------------------- |
| B   | CI から `format:check` を削除                                  | 最小   | フォーマット担保がなくなる   |
| C   | 対象を狭める（例: `prettier --check "src/**/*.{ts,tsx,mjs}"`） | 中     | docs 等は未整形のまま        |
| D   | `docs/` 等を `.prettierignore` に追加                          | 中     | ポリシー変更、src は依然多数 |

---

## 9. 推奨対応

1. **CI 修正（lint）コミット** — 今回の 7 ファイル変更（案 A + warning 修正）を先にコミット
2. **別コミットで Prettier 全量整形** — `npm run format`（= `prettier --write .`）を実行し、約 181 ファイルを **1 コミット**（例: `chore: apply prettier formatting`）として分離
3. **整形後に CI 4 コマンド再確認** — `lint` / `typecheck` / `format:check` / `build`
4. **（任意）Husky pre-commit 追加** — `lint-staged` を有効化し、再発防止

**今回の CI 修正だけでは `format:check` は通らない。** lint ブロッカーは解消済みだが、次の CI 失敗ポイントは `format:check`。

---

## 10. スコープ外・未実施

- コード修正・`prettier --write`・git commit/push は調査時点では未実施
- DB / Migration / RLS / Trigger / RPC への変更なし
