# buyers

購入希望者プロフィール（BY-01）のデータ層。

## 責務

- ログイン中 buyer の `public.buyers` プロフィール取得
- BY-01 入力値バリデーション
- 本人プロフィール更新（RLS 準拠）
- `profile_completed` の Server 側判定
- `saveBuyerProfileAction` Server Action

## ファイル構成

| ファイル                            | 内容                                         |
| ----------------------------------- | -------------------------------------------- |
| `constants.ts`                      | BY-01 設計値（最大長等）                     |
| `types.ts`                          | 入出力型                                     |
| `form-data.ts`                      | FormData パース（PII ID 無視）               |
| `validation.ts`                     | バリデーション・UPDATE ペイロード生成        |
| `profile-completion.ts`             | `profile_completed` 判定                     |
| `repository.ts`                     | Supabase READ/UPDATE（server-only）          |
| `service.ts`                        | Server Action                                |
| `loaders.ts`                        | ページ用 Loader（Auth email + プロフィール） |
| `components/buyer-profile-form.tsx` | BY-01 フォーム UI                            |

## セキュリティ

- 更新対象は `auth.uid()` → `buyers.user_id` のみ
- `buyer_id` / `user_id` / `profile_completed` のクライアント入力は無視
- Service Role 不使用

## 関連

- [BY-01 画面設計](../../../docs/04_画面設計/BY-01_購入希望者プロフィール.md)
- `/buyer/profile`（データ層 + UI 実装済み）
