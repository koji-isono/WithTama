# breeder-profile

ブリーダープロフィール入力ウィザード（BR-09）の保存・バリデーションを担当する。

## 責務

- Step 1〜5 のバリデーション、DB 更新、書類アップロード、プロフィール完了処理
- プロフィール共通 UI（`ProfileWizardShell`）

## ファイル構成

| ファイル | 内容 |
|---------|------|
| `types.ts` | 入力型、Verification 関連型 |
| `validation.ts` | 各 Step の入力チェック |
| `repository.ts` | Supabase UPDATE / Storage アップロード |
| `loaders.ts` | 各 Step の初期表示用ローダー |
| `service.ts` | Server Actions |
| `document-constants.ts` / `document-utils.ts` | 書類アップロード定数・検証 |
| `profile-completion.ts` | Step1〜5 必須項目チェック |
| `introduction-fields.ts` | Step 4 入力項目定義 |
| `constants.ts` | Step 定義・URL |
| `components/` | フォーム、書類アップロード UI |
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

## 関連テーブル / Storage

- `public.breeders`
- Supabase Storage `breeder-documents`（private）

## 関連ドキュメント

- [BR-09 ブリーダープロフィール](../../docs/04_画面設計/BR-09_ブリーダープロフィール.md)
- [ブリーダープロフィール API](../../docs/06_API設計/breeder-profile.md)
