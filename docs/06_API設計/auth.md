# 認証 API

## 概要

認証・ロール判定・管理者ガード（Decision No.102）。

## ロール型

| 型 | 定義 | 用途 |
|----|------|------|
| `PublicSignupRole` | `"buyer" \| "breeder"` | `/signup` |
| `MemberUserRole` | `"buyer" \| "breeder"` | `user_metadata.role` |
| `AuthenticatedUserRole` | `"buyer" \| "breeder" \| "admin"` | ログイン済み全体 |

## isAdminUser

| 項目 | 内容 |
|------|------|
| 実装 | `src/features/auth/types.ts` |
| 判定 | `user.app_metadata?.role === "admin"` のみ |
| 使用禁止 | `user_metadata.role` で admin 判定しない |

Client / Server 両方から利用可（純関数）。

## getCurrentAdmin

| 項目 | 内容 |
|------|------|
| 実装 | `src/features/auth/admin-auth.ts` |
| 種別 | Server 専用（`server-only`） |
| 戻り値 | admin ユーザーまたは `null` |

## requireAdmin

| 項目 | 内容 |
|------|------|
| 実装 | `src/features/auth/admin-auth.ts` |
| 種別 | Server 専用 |
| 用途 | `/admin/*` layout ガード |

### リダイレクト

| 状態 | 遷移先 |
|------|--------|
| 未ログイン | `/login` |
| admin | 処理続行（`User` を返す） |
| buyer | `/buyer` |
| breeder | `/breeder` |
| ロール不明 | `/login` |

## ログイン後遷移

| 条件 | 遷移先 | 備考 |
|------|--------|------|
| `app_metadata.role === "admin"` | `/admin` | `ensureUserProfile` を呼ばない |
| `user_metadata.role === "buyer"` | `/buyer` | 既存フロー |
| `user_metadata.role === "breeder"` | `/breeder` | 既存フロー |

## ensureUserProfile

admin ユーザーには適用しない。buyer / breeder のみ `buyers` / `breeders` レコードを bootstrap する。

## 関連ドキュメント

- [権限設計](../07_権限設計/README.md)
- [AD-00 管理者ダッシュボード](../04_画面設計/AD-00_管理者ダッシュボード.md)
- [Decision No.102](../01_設計変更管理/DecisionLog.md#decision-no102)
