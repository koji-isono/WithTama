# auth

認証と初回ログイン時のプロフィール bootstrap、管理者認証ガードを担当する。

## 責務

- 会員種別（`buyer` / `breeder`）の解釈（`user_metadata.role`）
- 管理者判定（`app_metadata.role === "admin"`、Decision No.102）
- 初回ログイン時の `buyers` / `breeders` 仮レコード作成（admin は対象外）
- ログイン後の入口 URL 決定
- ロール別入口 URL からのリダイレクト（`profile_completed` 判定）
- `/admin/*` Server 側ガード

## ファイル構成

| ファイル            | 内容                                                         |
| ------------------- | ------------------------------------------------------------ |
| `types.ts`          | ロール型、`isAdminUser`, `parseMemberUserRole`, 行型         |
| `admin-auth.ts`     | `getCurrentAdmin`, `requireAdmin`（Server 専用）             |
| `repository.ts`     | `buyers` / `breeders` の SELECT・INSERT                      |
| `service.ts`        | `ensureUserProfile`                                          |
| `entry-redirect.ts` | `getBreederEntryPath`, `getBuyerEntryPath`                   |
| `index.ts`          | 公開 export（Server 専用は `admin-auth.ts` から直接 import） |

## 関連画面

- `/login`, `/signup`
- `/breeder`, `/buyer`（入口リダイレクト）
- `/admin`（AD-00）

## 関連テーブル

- `auth.users`
- `public.buyers`
- `public.breeders`
