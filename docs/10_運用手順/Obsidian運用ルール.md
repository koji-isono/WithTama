---
project: WithTama
type: operations-guide
status: active
updated: 2026-08-24
tags:
  - WithTama
  - Obsidian
  - 運用
---

# Obsidian運用ルール

## 基本方針

- **WithTama プロジェクトルート**を Obsidian Vault として使用する
- Cursor と Obsidian で **同じ Markdown ファイル**（主に `docs/`）を参照する
- Obsidian 専用のドキュメント複製は **作らない**
- **Git 管理対象の Markdown を正**とする
- 既存の `docs/` フォルダ構成（00〜10）を維持する
- 開発ポータル: [[docs/00_WithTamaホーム]]

## 開発完了報告の保存先

```
docs/09_開発履歴/
```

月次サマリーは従来どおり [[docs/09_開発履歴/2026-08]] 等に追記してよい。  
個別の機能・画面単位の報告は **日付付きファイル** を優先する。

## ファイル命名規則

**原則:**

```
YYYY-MM-DD_画面IDまたは機能名_内容.md
```

**例:**

- `2026-08-24_BY-08見学予定一覧実装完了報告.md`
- `2026-08-24_見学機能_RPC実装完了報告.md`

既存ファイルの命名と矛盾する場合は **既存規則を優先**する（無理なリネームはしない）。

## YAML Frontmatter

**今後、新規作成する開発完了報告**には原則として以下を付ける。

```yaml
---
project: WithTama
type: development-log
date: YYYY-MM-DD
screen: BY-08
status: completed
tags:
  - WithTama
  - 開発履歴
---
```

| フィールド | 説明                                                                     |
| ---------- | ------------------------------------------------------------------------ |
| `project`  | 固定: `WithTama`                                                         |
| `type`     | 固定: `development-log`（調査のみの場合は `investigation-log` 等でも可） |
| `date`     | 作業日（`YYYY-MM-DD`）                                                   |
| `screen`   | 画面 ID（`BY-08` 等）。画面に紐づかない DB/RPC/運用タスクでは **省略可** |
| `status`   | 例: `completed` / `investigation` / `blocked`                            |
| `tags`     | Obsidian 検索用                                                          |

**既存の開発履歴 Markdown** は一括書き換えしない（新規から適用）。

## Obsidian 内部リンク

Vault ルートがプロジェクトルートのため、リンクは **`docs/` からのパス**を含める。

```markdown
[[docs/04_画面設計/BY-08_見学予定一覧]]
[[docs/05_データベース設計/visits]]
[[docs/01_設計変更管理/DecisionLog]]
```

拡張子 `.md` は省略する（Obsidian 標準）。

## 関連ノート

各完了報告の末尾（または冒頭）に、可能な限り以下を設ける。

```markdown
## 関連ノート

- 画面設計: [[docs/04_画面設計/...]]
- DB設計: [[docs/05_データベース設計/...]]
- API設計: [[docs/06_API設計/...]]
- 設計判断: [[docs/01_設計変更管理/DecisionLog]]
- 前工程: [[docs/09_開発履歴/...]]
- 次工程: （テキストまたはリンク）
```

## 実装完了時の必須記録

最低限、以下のセクションを含める。該当しない項目は **「変更なし」「該当なし」** と明記する。

1. 目的
2. 実装内容
3. 変更ファイル
4. DB変更
5. セキュリティ確認
6. テスト内容
7. テスト結果
8. 品質チェック（lint / typecheck / build 等）
9. 残課題
10. 次工程
11. 関連ノート

## Cursor との役割分担

| ツール       | 役割                                       |
| ------------ | ------------------------------------------ |
| **Cursor**   | 実装・調査・テスト実行・開発履歴 MD の作成 |
| **Obsidian** | 設計書・開発履歴の俯瞰・リンク探索・メモ   |
| **GitHub**   | 設計書・開発履歴の正本・履歴管理           |

Cursor で作業した結果は、必要に応じて `docs/09_開発履歴/` に記録する（[[docs/DEVELOPMENT]] 参照）。

## Git 管理方針

- `docs/` 配下の Markdown は **コミット対象**
- `.env.local` 等の秘密情報は **コミットしない**
- Obsidian の `.obsidian/` 設定は個人環境に応じて `.gitignore` する（チームで共有する場合は別途合意）

## 関連ドキュメント

- [[docs/00_WithTamaホーム]]
- [[docs/README]]
- [[docs/DEVELOPMENT]]
- [[docs/09_開発履歴/README]]
