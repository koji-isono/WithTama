---
project: WithTama
type: development-log
date: 2026-08-25
status: completed
tags:
  - WithTama
  - CI
  - Prettier
  - GitHub Actions
---

# GitHub Actions quality エラー調査・修正報告

## 作業目的

GitHub Actions `quality` ジョブの `npm run format:check` 失敗を解消する。機能変更・BR-09 着手は行わない。

---

## GitHub Actions 失敗原因

| 項目                   | 内容                                                                    |
| ---------------------- | ----------------------------------------------------------------------- |
| 失敗ステップ           | `npm run format:check`                                                  |
| 原因                   | Prettier の Code style issues（CI 報告: **29 ファイル**）               |
| ローカル再現（修正前） | **39 ファイル**（CI 差分: 未追跡 `.obsidian/` 3 件 + 未追跡報告 MD 等） |

### 修正前に warn された主なファイル（39 件）

**Obsidian（未追跡・CI 対象外）:** `.obsidian/app.json`, `appearance.json`, `core-plugins.json`

**設計・開発履歴 MD（tracked）:**  
`docs/00_WithTamaホーム.md`, `ProjectStructure.md`, `DecisionLog.md`, `03_業務フロー/README.md`,  
`AD-00`〜`AD-02`, `BY-06`〜`BY-09`, `PU-02`, `04_画面設計/README.md`,  
`05/06/07` README, 開発履歴 2026-08-24/25 系 15 件, `09_開発履歴/README.md`

**コード:** `scripts/test-visit-rpcs.mts`

**package.json:** warn あり（修正後は内容 diff なし・表示上 M のみ）

---

## 実施内容

1. `npm run format:check` — FAIL（39 warn）
2. `npm run format`（`prettier --write .`）— リポジトリ全体。`.prettierignore` は `.next` / `node_modules` / `package-lock.json` のみ
3. 修正後チェック — 下記結果
4. `git diff` 確認 — Prettier 整形 + **保留中混在ドキュメント 8 件の既存内容変更**（今回新規追加なし）
5. `tsconfig.tsbuildinfo` — build 生成 diff を **restore**（commit 対象外）
6. `.obsidian/*` — ローカルで format されたが **commit しない**

---

## 品質チェック結果

| コマンド               | 結果     |
| ---------------------- | -------- |
| `npm run format:check` | **PASS** |
| `npm run typecheck`    | **PASS** |
| `npm run build`        | **PASS** |

---

## 変更ファイル数

| 分類                          | 件数                                                            |
| ----------------------------- | --------------------------------------------------------------- |
| **tracked 変更（git diff）**  | **37 ファイル**（+1890 / -1782 行）                             |
| `package.json`                | M 表示だが **内容 diff なし**（改行/stat のみの可能性）         |
| `scripts/test-visit-rpcs.mts` | 1（Prettier 行折り返しのみ）                                    |
| 未追跡（commit しない）       | `.obsidian/`, `2026-08-25_BR-09着手前作業ツリー最終整理報告.md` |

---

## 変更内容の分類

### Prettier 整形のみ（CI 修正の本体・約 29 件相当）

HEAD から Prettier 未適用だった tracked ファイル。例:

- `docs/00_WithTamaホーム.md`
- `docs/01_設計変更管理/DecisionLog.md`
- `docs/03_業務フロー/README.md`
- `docs/04_画面設計/AD-00` / `AD-01` / `AD-02` / `BY-*` / `PU-02`
- `docs/09_開発履歴/` 内 2026-08-24/25 報告 15 件
- `scripts/test-visit-rpcs.mts`

### Prettier 整形 + 既存の混在ドキュメント内容変更（8 件）

今回の format 作業で**新規の仕様変更は追加していない**。作業前から残っていた内容更新 + Prettier 整形。

| ファイル                                     | 既存内容変更の概要           |
| -------------------------------------------- | ---------------------------- |
| `docs/00_アーキテクチャ/ProjectStructure.md` | BR-11/12/14/15 画面 ID 更新  |
| `docs/04_画面設計/AD-11_犬猫掲載審査詳細.md` | AD-02 / Decision 125 参照    |
| `docs/04_画面設計/README.md`                 | 見学・問い合わせ実装済み反映 |
| `docs/05_データベース設計/README.md`         | breeder_review_logs 等       |
| `docs/06_API設計/README.md`                  | 管理者ブリーダー審査 API     |
| `docs/07_権限設計/README.md`                 | breeder review RPC / Storage |
| `docs/DEVELOPMENT.md`                        | 開発履歴記録セクション追加   |
| `docs/README.md`                             | Obsidian ホーム・運用リンク  |

### ロジック / SQL / Migration

**変更なし**（`src/**`, `supabase/migrations/**` 未変更）

---

## git diff --check

**問題なし**（conflict marker 等なし。CRLF 警告のみ）

---

## commit 可否

| 判定            | 内容                                                                                      |
| --------------- | ----------------------------------------------------------------------------------------- |
| **commit 可能** | **YES**                                                                                   |
| 推奨            | CI 正常化のみなら Prettier-only ファイル + `scripts/test-visit-rpcs.mts` を先行 commit 可 |
| 注意            | 上記 8 混在ドキュメントを同時 commit すると、保留中の正式ドキュメント更新も含まれる       |
| 除外            | `.obsidian/*`, `tsconfig.tsbuildinfo`, 本報告 MD（未追跡）                                |

**今回は commit / push 未実施**（ユーザー指示どおり）

---

## 次工程

1. Prettier 修正の commit / push → GitHub Actions quality 確認
2. 混在ドキュメント 8 件は別 commit または同時 commit を判断
3. 未追跡報告 MD 2 件の docs commit

---

## 関連ノート

- [[docs/09_開発履歴/2026-08-10_CI_format-check調査]]
- [[docs/09_開発履歴/2026-08-10_CI修正完了報告]]
- [[docs/09_開発履歴/2026-08-25_BR-09着手前作業ツリー最終整理報告]]
