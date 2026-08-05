# auth

認証と初回ログイン時のプロフィール bootstrap を担当する。

## 責務

- 会員種別（`buyer` / `breeder`）の解釈
- 初回ログイン時の `buyers` / `breeders` 仮レコード作成
- ログイン後の入口 URL 決定
- ロール別入口 URL からのリダイレクト（`profile_completed` 判定）

## ファイル構成

| ファイル | 内容 |
|---------|------|
| `types.ts` | `UserRole`, `getPostLoginPath`, 行型 |
| `repository.ts` | `buyers` / `breeders` の SELECT・INSERT |
| `service.ts` | `ensureUserProfile` |
| `entry-redirect.ts` | `getBreederEntryPath`, `getBuyerEntryPath` |
| `index.ts` | 公開 export |

## 関連画面

- `/login`, `/signup`
- `/breeder`, `/buyer`（入口リダイレクト）

## 関連テーブル

- `auth.users`
- `public.buyers`
- `public.breeders`
