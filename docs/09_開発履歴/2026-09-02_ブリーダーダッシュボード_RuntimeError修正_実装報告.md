# ブリーダーダッシュボード Runtime Error 修正 — 実装報告

**日付:** 2026-09-02  
**範囲:** `/breeder/dashboard` 表示時の Next.js 開発エラーオーバーレイ（`Runtime Error Server {message: ...}`）の調査・修正  
**commit / push:** **未実施**（ローカル修正のみ）

**関連:** [BR-06 ブリーダーダッシュボード](../04_画面設計/BR-06_ブリーダーダッシュボード.md) / [BR-09 ブリーダープロフィール](../04_画面設計/BR-09_ブリーダープロフィール.md)

---

## 1. 問題

`http://localhost:3000/breeder/dashboard` 自体は表示されるが、Next.js 開発エラーオーバーレイに次が表示される。

```
Runtime Error
Server
{message: ...}
```

左下にも「1 Issue」が出る。再現ユーザー: `test_3@ssci.co.jp`（新規会員登録 → メール確認 → ログイン直後、プロフィール未完成の可能性あり）。

---

## 2. 調査結果

### 2.1 開発サーバーログ

| ログ | 内容 |
| ---- | ---- |
| `⨯ Error: {"message":"Internal server error."}` | Supabase `PostgrestError` がそのまま throw された痕跡 |
| `[getBasicProfileByUserId] { message: 'Internal server error.' }` | layout ヘッダー表示名取得時の DB エラー（dev ログ） |
| `[getBreederProfileContextByUserId] { message: 'Internal server error.' }` | プロフィール context 取得時の DB エラー |
| `POST /breeder/profile/introduction 500` | 紹介ステップ保存時、Client 側 `catch` なしによる unhandled rejection |
| `GET /breeder/dashboard 200` | ページ自体は 200 だが、throw された非 `Error` オブジェクトが overlay を起こす |

### 2.2 コード追跡（Server Component / layout / 認証 / Supabase）

```
/breeder/dashboard
  └─ src/app/breeder/dashboard/page.tsx
       └─ loadBreederDashboardPageData()
            ├─ requireBreeder()          … auth OK
            └─ getBreederReviewSummaryByUserId()  … **旧: error 時 throw**

/breeder/* layout
  └─ src/app/breeder/layout.tsx
       └─ loadBreederHeaderDisplayName()
            └─ getBasicProfileByUserId()  … **旧: error 時 throw**

/breeder/profile/* layout
  └─ loadBreederProfilePageContext()
       └─ getBreederProfileContextByUserId()
            └─ **旧: !context → redirect /breeder/dashboard（ループリスク）**
```

### 2.3 `{message: ...}` の正体

Supabase JS クライアントが返す **`PostgrestError`（plain object）** を `throw error` していた。Next.js は `Error` インスタンス以外を `{message: ...}` 形式で Runtime Error として表示する。

Server Component から Client Component へ **エラーオブジェクトを prop で渡している経路はなし**。

### 2.4 新規ブリーダー（プロフィール未完成）の状態

| 項目 | 内容 |
| ---- | ---- |
| `breeders` 行 | メール認証直後は **存在しない場合あり**（正常） |
| RLS | `breeders_insert_own` / `breeders_select_own` で本人 INSERT/SELECT 可 |
| `.maybeSingle()` | 行なし → `data: null`（エラーではない） |
| 旧 dashboard loader | 行なし + DB エラー時に throw → Runtime Error |
| 旧 profile layout | `!context` → dashboard へ redirect → サイドバーから dashboard に来ると不整合 |

### 2.5 DB Migration

**不要。** 既存 `breeders.profile_completed` / RLS / draft 行 INSERT で対応可能。Migration の勝手な適用は行っていない。

---

## 3. 原因（まとめ）

1. **Repository 層が `PostgrestError` をそのまま throw** — Next.js overlay の直接原因
2. **新規ブリーダーの `breeders` 行未作成を異常系扱い** — draft 行の ensure がなく、dashboard / profile 間の導線が不整合
3. **紹介ステップ Client 側の unhandled rejection** — 保存失敗時に overlay が残る副次要因

---

## 4. 修正内容

| ファイル | 変更 |
| -------- | ---- |
| `src/features/breeder-profile/repository.ts` | 読み取り系は throw せず `null` + dev ログ。`ensureBreederProfileContextByUserId()` 追加（draft 行 INSERT、23505 競合時は再取得） |
| `src/features/breeder-profile/types.ts` | `BreederProfileContextRow` に `profile_completed` 追加 |
| `src/features/breeder-profile/loaders.ts` | `ensure` 利用。`!context` 時の dashboard 誤 redirect 削除 |
| `src/features/breeder-profile/service-auth.ts` | 保存前認可でも `ensure` 利用 |
| `src/features/breeder-dashboard/loaders.ts` | `ensure` + 未完成 draft は `/breeder/profile` へ redirect |
| `src/features/breeder-dashboard/repository.ts` | エラー時 throw → `null` |
| `src/features/breeder-profile/components/introduction-step-form.tsx` | server action の `catch` 追加 |
| `scripts/test-breeder-dashboard-page.mts` | 新 loader 仕様に合わせて更新 |

### 4.1 触っていないもの

- Stripe Step 7 等の未コミット変更
- `.env.local`
- DB Migration / RLS 緩和
- `service_role` のブラウザ公開

---

## 5. 修正後の挙動

### 5.1 新規ブリーダー（`profile_completed = false` / `review_status = draft`）

| 操作 | 挙動 |
| ---- | ---- |
| `/breeder` 入口 | 従来どおり `/breeder/profile` へ |
| `/breeder/dashboard` 直接 | **`/breeder/profile` へ redirect**（Runtime Error なし） |
| プロフィール wizard | `ensure` で draft 行を確保してから編集 |
| 紹介ステップ保存失敗 | フォーム内エラー表示（overlay なし） |

### 5.2 既存ブリーダー

| 状態 | 挙動 |
| ---- | ---- |
| `submitted` / `under_review` / `approved` | 従来どおり dashboard 表示 |
| `resubmission_required` | 差戻しバナー表示（`context.id` ベース、変更なし） |
| ヘッダー表示名 | DB エラー時は `（名称未設定）` にフォールバック（クラッシュしない） |

---

## 6. 検証結果

| 項目 | 結果 |
| ---- | ---- |
| `npm run lint` | PASS |
| `npm run typecheck` | PASS |
| `npm run build` | PASS |
| `npm run test:breeder-dashboard-page` | **17 / 17 PASS** |
| `npm run test:breeder-profile-initial-values` | **33 / 33 PASS** |
| `npm run test:breeder-profile-edit-guard` | **28 / 28 PASS** |
| `npm run test:breeder-header-display-name` | **25 / 25 PASS** |

### 6.1 ブラウザ / dev サーバー

- 修正後: `GET /breeder/dashboard 200` が PostgrestError ログなしで返ることを dev ログで確認
- `test_3@ssci.co.jp`（調査時点の DB）: `profile_completed: true` / `review_status: submitted` — ダッシュボード正常表示想定

---

## 7. データフロー（修正後）

```
/breeder/dashboard
  └─ requireBreeder()
  └─ ensureBreederProfileContextByUserId(user.id)
       ├─ 行あり → context 返却
       └─ 行なし → INSERT draft → context 返却
  └─ !profile_completed && review_status === "draft"
       └─ redirect("/breeder/profile")
  └─ review_status !== "resubmission_required"
       └─ { resubmissionBanner: null }
  └─ resubmission_required
       └─ loadLatestReturnedCommentForBreederSafely(context.id)
```

---

## 8. 残タスク

- [ ] commit / push（ユーザー指示待ち）
- [ ] 未完成 draft ユーザーの実ブラウザ E2E（任意）
