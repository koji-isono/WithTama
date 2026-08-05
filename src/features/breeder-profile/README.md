# breeder-profile

ブリーダープロフィール入力ウィザード（BR-09）の保存・バリデーションを担当する。

## 責務

- Step 1 基本情報のバリデーションと DB 更新
- プロフィール共通 UI（`ProfileWizardShell`）
- Step 2 以降は段階的に本モジュールへ追加

## ファイル構成

| ファイル | 内容 |
|---------|------|
| `types.ts` | 入力型、`SaveBasicProfileResult` |
| `validation.ts` | `validateBasicProfile` |
| `repository.ts` | `updateBasicProfile`（Supabase UPDATE） |
| `service.ts` | `saveBasicProfile`（Server Action） |
| `constants.ts` | Step 定義・URL |
| `components/` | フォーム、共通フィールド |
| `index.ts` | 公開 export |

## 関連 URL

| Step | URL |
|------|-----|
| 入口 | `/breeder/profile` → `/breeder/profile/basic` |
| 1 基本情報 | `/breeder/profile/basic` |
| 2 所在地 | `/breeder/profile/location` |
| 3 第一種動物取扱業 | `/breeder/profile/license` |
| 4 ブリーダー紹介 | `/breeder/profile/introduction` |
| 5 本人確認 | `/breeder/profile/verification` |

## 関連テーブル

- `public.breeders`

## 関連ドキュメント

- [BR-09 ブリーダープロフィール](../../docs/04_画面設計/BR-09_ブリーダープロフィール.md)
- [ブリーダープロフィール API](../../docs/06_API設計/breeder-profile.md)
