# signup メール確認フロー — Recovery 分離 実装報告

**日付:** 2026-09-01  
**範囲:** 新規会員登録メール確認とパスワード Recovery の認証経路分離  
**正本:** [調査報告](./2026-09-01_ブリーダー新規登録_メール確認リンク不具合_調査報告.md)

**実施内容:** 実装 + 専用テスト + 回帰（commit / push / 実ブラウザ E2E **未実施**）

---

## 発生現象

| 項目          | 内容                                              |
| ------------- | ------------------------------------------------- |
| signup UI     | 「確認メールを送信しました」— 正常                |
| メール配送    | Resend 経由 — **成功**                            |
| Supabase Auth | **Confirmed at 入り** — メール確認自体は成功      |
| 確認後遷移    | **`/reset-password?error=invalid_link`** — 誤遷移 |
| UI            | 「パスワード再設定」「確認中...」で停止           |

---

## Supabase Dashboard 確認結果（ユーザー確認済み）

| 項目                        | 状態                                                |
| --------------------------- | --------------------------------------------------- |
| Confirm signup テンプレート | `{{ .ConfirmationURL }}` — recovery 誤設定 **なし** |
| Site URL                    | `http://localhost:3000`                             |
| Redirect URLs               | Recovery 用 2 件のみ。**signup 用未登録**           |
| テスト Auth user            | Confirmed at **入り**（削除・変更しない）           |

---

## 根本原因

1. **`signUp` に `emailRedirectTo` 未指定** → Site URL 着地 + `type` なし `code` が Recovery 扱い
2. **`type === "recovery" \|\| !type` → `/reset-password`**（`page.tsx` / `RecoveryLinkHandler`）
3. **`/auth/callback` 失敗 + `next=/reset-password` → `invalid_link`**
4. **`/auth/confirm` パラメータ欠落時も reset-password へ**（signup 誤誘導）
5. **reset-password UI** — `error=invalid_link` 時 `isCheckingSession=true` のまま

メール確認（Supabase 側）は成功していたが、**WithTama の post-confirm ルーティングが Recovery 経路に混線**していた。

---

## 修正内容

### 1. signUp `emailRedirectTo`

`src/lib/supabase/sign-up.ts`:

```typescript
emailRedirectTo: getSignupEmailRedirectUrl(),
// → {NEXT_PUBLIC_APP_URL}/auth/callback?next=/login
```

buyer / breeder 共通（`signUpWithRole`）。

### 2. 認証 next 解決の共通化

新規 `src/lib/auth/auth-callback-next.ts`:

| 関数                            | 役割                                                                 |
| ------------------------------- | -------------------------------------------------------------------- |
| `resolveAuthNextFromEmailType`  | `recovery` のみ reset-password、**それ以外（type 欠落含む）→ login** |
| `buildAuthLandingRedirectPath`  | `/` 着地 query → callback / confirm へ転送                           |
| `sanitizeAuthCallbackNext`      | allowlist: `/login`, `/reset-password` のみ                          |
| `resolveAuthConfirmSuccessNext` | confirm 成功後: recovery → reset-password、signup 等 → login         |

### 3. 各 route / コンポーネント

| ファイル                    | 変更                                             |
| --------------------------- | ------------------------------------------------ |
| `src/app/(public)/page.tsx` | 共有 helper 利用。`!type` → login                |
| `recovery-link-handler.tsx` | 同上                                             |
| `auth/callback/route.ts`    | allowlist + 失敗時 signup/login vs recovery 分岐 |
| `auth/confirm/route.ts`     | 欠落 → login error。成功/失敗を type で分岐      |
| `reset-password-form.tsx`   | invalid_link 即エラー表示 + forgot-password 導線 |
| `auth-redirect.ts`          | `getSignupEmailRedirectUrl()` 追加               |

### 4. signup / recovery フロー（修正後）

**Signup:**

```
/signup → signUp(emailRedirectTo=/auth/callback?next=/login)
  ↓ 確認メール
/auth/callback?code=...&next=/login
  ↓ exchangeCodeForSession 成功
/login（既存 ensureUserProfile はログイン時）
  ↓ 失敗
/login?error=auth_callback_error
```

**Recovery（既存維持）:**

```
/forgot-password → resetPasswordForEmail
  ↓
/auth/callback?next=/reset-password または /auth/confirm?type=recovery
  ↓ 成功
/reset-password
  ↓ 失敗
/reset-password?error=invalid_link
```

### 5. reset-password UX

- `error=invalid_link` 時: 初期 state で確認中をスキップ
- エラー文言 + 「パスワード再設定メールを再送する」（`/forgot-password`）+ ログイン導線

### 6. 第1期方針

- signup 確認後の **自動 /breeder 入場は追加しない**
- 確認成功 → `/login` → 通常ログイン → `ensureUserProfile` → role 別 entry

---

## Security

| 項目               | 状態                                 |
| ------------------ | ------------------------------------ |
| Open Redirect      | `sanitizeAuthCallbackNext` allowlist |
| service_role       | 不使用                               |
| Secret / token log | なし                                 |
| PKCE               | Supabase 公式 API のみ               |

---

## buyer / breeder 共通性

`signUpWithRole` は buyer / breeder 双方に同一 `emailRedirectTo` と role metadata を適用。

---

## DB / Migration / RLS / RPC

**変更なし**

---

## Stripe Step 7

**変更なし**（Portal / billing / webhook 未タッチ）

---

## 変更ファイル

| 種別 | パス                                                            |
| ---- | --------------------------------------------------------------- |
| 新規 | `src/lib/auth/auth-callback-next.ts`                            |
| 新規 | `scripts/test-signup-email-confirmation-routing.mts`            |
| 新規 | 本報告書                                                        |
| 修正 | `src/lib/supabase/sign-up.ts`                                   |
| 修正 | `src/lib/supabase/auth-redirect.ts`                             |
| 修正 | `src/app/(public)/page.tsx`                                     |
| 修正 | `src/components/auth/recovery-link-handler.tsx`                 |
| 修正 | `src/app/auth/callback/route.ts`                                |
| 修正 | `src/app/auth/confirm/route.ts`                                 |
| 修正 | `src/app/(auth)/reset-password/reset-password-form.tsx`         |
| 修正 | `package.json`（`test:signup-email-confirmation-routing` のみ） |

---

## 専用テスト

```bash
npm run test:signup-email-confirmation-routing
```

**結果: 31 passed / 0 failed**

---

## 回帰テスト

| コマンド                                 | 結果                      |
| ---------------------------------------- | ------------------------- |
| `test:signup-email-confirmation-routing` | **31 PASS**               |
| `test:breeder-header-actions`            | **22 PASS**               |
| `npm run lint`                           | **PASS**                  |
| `npm run typecheck`                      | **PASS**（前回 build 時） |
| `npm run build`                          | **PASS**（前回）          |
| 変更ファイル Prettier                    | **PASS**                  |

---

## Supabase Dashboard — ユーザーが行う手動設定

### Redirect URLs に追加（必須）

```
http://localhost:3000/auth/callback?next=/login
```

本番では `{NEXT_PUBLIC_APP_URL}/auth/callback?next=/login` を同等に追加。

既存 Recovery 用 2 件は **維持**。

### Confirm signup Email Template

**推奨 A（今回のコード修正と組み合わせ）:** 現状維持

```html
<a href="{{ .ConfirmationURL }}">メールアドレスを確認する</a>
```

`emailRedirectTo` 設定後、`ConfirmationURL` は signup 用 callback を含む。

**推奨 B（任意・Recovery と同方式）:** より明示的

```html
<a href="{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup&next=/login">
  メールアドレスを確認する
</a>
```

Dashboard 変更は **ユーザー手動**。Cursor からは変更しない。

---

## 実ブラウザ E2E

**未実施** — ユーザーが Dashboard 設定後、**新しいテストメール**で実施予定。

既存 Confirmed ユーザーは削除・変更しない。

---

## commit 状態

| 項目        | 状態                                     |
| ----------- | ---------------------------------------- |
| commit      | **未実施**                               |
| push        | **未実施**                               |
| Step 7 分離 | package.json は test script 1 行のみ追加 |

**commit 可能か:** Dashboard Redirect URL 追加 + 実ブラウザ E2E PASS 後

---

## 次のアクション

- [ ] Supabase Redirect URL 追加（ユーザー）
- [ ] 新規テストメールで signup E2E（ユーザー）
- [ ] Recovery E2E 回帰（ユーザー任意）
- [ ] commit / push（別指示後）
