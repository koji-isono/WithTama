# 犬猫管理 API

## 概要

犬猫管理の保存処理は Next.js Server Actions 経由で Supabase を更新する（Decision No.82）。

## 実装構成

| レイヤー | ファイル | 責務 |
|---------|---------|------|
| UI | `src/app/breeder/pets/new/page.tsx` | 犬猫登録フォーム |
| UI | `src/app/breeder/pets/[petId]/edit/page.tsx` | 犬猫情報編集フォーム |
| Service | `src/features/pets/service.ts` | バリデーション → Repository 呼び出し |
| Repository | `src/features/pets/repository.ts` | Supabase INSERT / SELECT / UPDATE |
| Validation | `src/features/pets/validation.ts` | 入力チェック |

## createPetDraft

| 項目 | 内容 |
|------|------|
| 種別 | Server Action |
| 実装 | `src/features/pets/service.ts` |
| 認証 | Supabase Auth セッション（`auth.getUser()`） |

### リクエスト（CreatePetDraftInput）

| フィールド | 型 | 必須 |
|-----------|-----|------|
| `managementName` | string | はい |
| `publicDisplayName` | string | はい |
| `species` | `"dog"` \| `"cat"` | はい |
| `breed` | string | はい |
| `sex` | `"male"` \| `"female"` | はい |
| `birthday` | string | いいえ（未来日不可） |
| `color` | string | いいえ |
| `temperament` | string | いいえ（500 文字以内） |
| `price` | string | いいえ（0 以上の整数） |
| `priceComment` | string | いいえ（500 文字以内） |

### 更新対象テーブル

`public.pets`

| DB カラム | 内容 |
|-----------|------|
| `breeder_id` | サーバー側で `getBreederIdByUserId` により解決 |
| `management_name` | 管理名 |
| `public_display_name` | 公開表示名 |
| `species` | 犬猫種別 |
| `breed` | 犬種・猫種 |
| `sex` | 性別 |
| `birthday` | 誕生日 |
| `color` | 毛色 |
| `temperament` | 性格 |
| `price` | 価格 |
| `price_comment` | 価格補足 |
| `status` | 常に `draft` |
| `display_order` | `0` |
| `created_by` / `updated_by` | `auth.users.id` |

### 成功時の画面遷移

`/breeder/pets/{petId}/edit` へ遷移する。

## getPetEditData / loadPetEditPageData

| 項目 | 内容 |
|------|------|
| 種別 | Server 関数 / Loader |
| 実装 | `service.ts` / `loaders.ts` |
| 認証 | `auth.getUser()` |

### 取得条件

- `pets.id = petId`
- `pets.deleted_at IS NULL`
- `pets.breeder_id` = ログインユーザーの `breeders.id`

該当なしの場合は `null`（画面側で `notFound()`）。

## updatePetDraftAction

| 項目 | 内容 |
|------|------|
| 種別 | Server Action |
| 実装 | `src/features/pets/service.ts` |
| 認証 | Supabase Auth セッション（`auth.getUser()`） |

### リクエスト

- `petId`: string
- `input`: `CreatePetDraftInput`（`createPetDraft` と同一）

### 更新対象カラム

`management_name`, `public_display_name`, `species`, `breed`, `sex`, `birthday`, `color`, `temperament`, `price`, `price_comment`, `updated_by`, `updated_at`

`status` / `breeder_id` / `published_at` は更新しない。

### 成功時

同じ編集画面に留まり、「保存しました」を表示する。

## uploadPetPhotoAction

| 項目 | 内容 |
|------|------|
| 種別 | Server Action |
| 実装 | `src/features/pets/service.ts` |
| 認証 | `auth.getUser()` |

### リクエスト

- `petId`: string
- `formData`: `file` フィールドに画像（jpg / jpeg / png、10MB 以内）

### 処理

1. ペット所有者確認
2. ファイル検証（MIME・拡張子・サイズ）
3. 最大 10 枚チェック
4. Storage `pet-photos` へアップロード
5. `pet_photos` へ INSERT（`display_order` = 既存枚数、`is_main` = 初回のみ true、`alt_text` = `{公開表示名}の写真`）

### Storage パス

`breeders/{authUserId}/pets/{petId}/{uuid}.{ext}`

## setMainPetPhotoAction

| 項目 | 内容 |
|------|------|
| 種別 | Server Action |
| 実装 | `src/features/pets/service.ts` |
| 認証 | `auth.getUser()` |

PostgreSQL 関数 `set_main_pet_photo` により、対象 pet の全写真を `is_main = false` にした後、指定写真のみ `is_main = true` にする。

## deletePetPhotoAction

| 項目 | 内容 |
|------|------|
| 種別 | Server Action |
| 実装 | `src/features/pets/service.ts` |
| 認証 | `auth.getUser()` |

### 削除順序

1. 所有者確認
2. Storage ファイル削除
3. `pet_photos` レコード削除
4. 削除対象がメイン写真だった場合、残存写真の先頭をメインに設定

## loadBreederPets

| 項目 | 内容 |
|------|------|
| 種別 | Server 関数 |
| 実装 | `src/features/pets/service.ts` |
| 認証 | `auth.getUser()` |

### 取得条件

- `pets.breeder_id` = ログインユーザーの `breeders.id`
- `pets.deleted_at IS NULL`

### レスポンス（BreederPetListItem[]）

メイン写真 Signed URL、公開表示名、管理名、種別、品種、性別、誕生日、価格、status、updatedAt

### Repository

`listPetsWithMainPhotoByBreederUserId` — pets 一覧 + メイン写真をバッチ取得

## submitPetForReviewAction

| 項目 | 内容 |
|------|------|
| 種別 | Server Action |
| 実装 | `src/features/pets/service.ts` |
| 認証 | `auth.getUser()` |

### 状態遷移

`draft` → `under_review` のみ（汎用 status 更新は不可）

### 申請条件

1. 本人所有（`pets.breeder_id` = ログインユーザーの `breeders.id`）
2. `status = draft`
3. 犬猫登録と同じ必須項目（`validatePetForReviewSubmit`）
4. `pet_photos` が 1 件以上

### Repository

`submitPetForReview` — UPDATE 条件: `id`, `breeder_id`, `status = draft`

### 将来改修（Decision No.105）

公開申請時に `pet_review_logs` へ `action = submitted` を同時 INSERT する。詳細: [pet_review_logs テーブル](../05_データベース設計/pet_review_logs.md)

## 今後追加予定 — 管理者審査（Decision No.96〜105）

| アクション | 状態遷移 | ログ |
|-----------|---------|------|
| `approvePetForPublishAction` | `under_review` → `published` | `action = approved` |
| `returnPetReviewAction` | `under_review` → `draft` | `action = returned`（comment 必須） |

公開承認時はブリーダー承認済み・登録有効をサーバー側で再検証する（Decision No.101）。具体条件は実 DB 定義確認後に実装。

## 関連ドキュメント

- [BR-10 犬猫登録](../04_画面設計/BR-10_犬猫登録.md)
- [BR-10 犬猫一覧](../04_画面設計/BR-10_犬猫一覧.md)
- [BR-11 犬猫情報編集](../04_画面設計/BR-11_犬猫情報編集.md)
- [AD-10 犬猫掲載審査一覧](../04_画面設計/AD-10_犬猫掲載審査一覧.md)
- [AD-11 犬猫掲載審査詳細](../04_画面設計/AD-11_犬猫掲載審査詳細.md)
- [pets テーブル](../05_データベース設計/pets.md)
- [pet_review_logs テーブル](../05_データベース設計/pet_review_logs.md)
- [Decision No.83](../01_設計変更管理/DecisionLog.md#decision-no83)
- [Decision No.84](../01_設計変更管理/DecisionLog.md#decision-no84)
- [Decision No.87](../01_設計変更管理/DecisionLog.md#decision-no87)
- [Decision No.88](../01_設計変更管理/DecisionLog.md#decision-no88)
- [Decision No.92](../01_設計変更管理/DecisionLog.md#decision-no92)
- [Decision No.93](../01_設計変更管理/DecisionLog.md#decision-no93)
- [Decision No.94](../01_設計変更管理/DecisionLog.md#decision-no94)
- [Decision No.95](../01_設計変更管理/DecisionLog.md#decision-no95)
- [Decision No.96](../01_設計変更管理/DecisionLog.md#decision-no96)
- [Decision No.105](../01_設計変更管理/DecisionLog.md#decision-no105)
