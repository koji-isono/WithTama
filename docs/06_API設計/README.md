# API設計

## 概要

WithTama の API は Next.js App Router の Route Handlers および Supabase クライアント経由で提供します。

## 現状

| エンドポイント / アクション | メソッド      | 説明                                                   | 状態     |
| --------------------------- | ------------- | ------------------------------------------------------ | -------- |
| `/api/health`               | GET           | ヘルスチェック                                         | 実装済み |
| `saveBasicProfile`          | Server Action | ブリーダープロフィール Step 1 基本情報保存             | 実装済み |
| `saveLocationProfile`       | Server Action | ブリーダープロフィール Step 2 所在地保存               | 実装済み |
| `saveLicenseProfile`        | Server Action | ブリーダープロフィール Step 3 第一種動物取扱業情報保存 | 実装済み |
| `saveIntroductionProfile`   | Server Action | ブリーダープロフィール Step 4 ブリーダー紹介保存       | 実装済み |
| `uploadBreederDocument`     | Server Action | ブリーダープロフィール Step 5 書類アップロード         | 実装済み |
| `completeBreederProfile`    | Server Action | ブリーダープロフィール Step 5 提出完了                 | 実装済み |
| `createPetDraft`            | Server Action | 犬猫登録（下書き保存）                                 | 実装済み |
| `updatePetDraftAction`      | Server Action | 犬猫情報編集（基本情報更新）                           | 実装済み |
| `uploadPetPhotoAction`      | Server Action | 犬猫写真アップロード                                   | 実装済み |
| `setMainPetPhotoAction`     | Server Action | 犬猫メイン写真設定                                     | 実装済み |
| `deletePetPhotoAction`      | Server Action | 犬猫写真削除                                           | 実装済み |
| `loadBreederPets`           | Server 関数   | ブリーダー犬猫一覧取得                                 | 実装済み |
| `submitPetForReviewAction`  | Server Action | 犬猫公開申請（RPC `submit_pet_for_review`）            | 実装済み |
| `isAdminUser`               | 関数          | 管理者判定（`app_metadata.role`）                      | 実装済み |
| `getCurrentAdmin`           | Server 関数   | 現在の admin ユーザー取得                              | 実装済み |
| `requireAdmin`              | Server 関数   | admin 必須ガード（redirect）                           | 実装済み |

詳細: [ブリーダープロフィール API](./breeder-profile.md) / [犬猫管理 API](./pets.md) / [認証](./auth.md)

## 今後追加予定 — 管理者審査（Decision No.96〜105）

| エンドポイント / アクション  | 種別           | 説明                                                           |
| ---------------------------- | -------------- | -------------------------------------------------------------- |
| 審査待ち一覧取得             | Server 関数    | AD-10。`under_review` pets + breeder JOIN                      |
| `submit_pet_for_review`      | PostgreSQL RPC | breeder 公開申請（`draft` → `under_review` + `submitted` log） | 実装済み |
| `approvePetForPublishAction` | Server Action  | AD-11。`under_review` → `published` + `pet_review_logs`        | 実装済み |
| `returnPetReviewAction`      | Server Action  | AD-11。`under_review` → `draft` + 差戻し理由                   | 実装済み |

## 今後追加予定 — 管理者ブリーダー審査（Decision No.125〜134）

| エンドポイント / アクション  | 種別           | 説明                                                          |
| ---------------------------- | -------------- | ------------------------------------------------------------- |
| 審査待ち一覧取得             | Server 関数    | AD-01。`submitted` / `under_review` / `resubmission_required` |
| 審査詳細取得                 | Server 関数    | AD-02。breeders + Signed URL                                  |
| `start_breeder_review`       | PostgreSQL RPC | 審査開始 + `breeder_review_logs(review_started)`              |
| `approve_breeder_review`     | PostgreSQL RPC | 承認 + verification verified + `approved_at`                  |
| `return_breeder_review`      | PostgreSQL RPC | 差戻し → `resubmission_required` + comment 必須               |
| `reject_breeder_review`      | PostgreSQL RPC | 却下 → `rejected` + comment 必須                              |
| `startBreederReviewAction`   | Server Action  | AD-02（将来）                                                 |
| `approveBreederReviewAction` | Server Action  | AD-02（将来）                                                 |
| `returnBreederReviewAction`  | Server Action  | AD-02（将来）                                                 |
| `rejectBreederReviewAction`  | Server Action  | AD-02（将来）                                                 |

## 今後追加予定 — その他

| エンドポイント             | メソッド           | 説明                                         |
| -------------------------- | ------------------ | -------------------------------------------- |
| `/api/pets`                | GET, POST          | 犬猫一覧・登録                               |
| `/api/pets/[petId]`        | GET, PATCH, DELETE | 犬猫詳細・更新・削除                         |
| `/api/pets/[petId]/photos` | POST               | 写真アップロード（Server Action で代替済み） |

## 関連ドキュメント

- [データベース設計](../05_データベース設計/README.md)
- [権限設計](../07_権限設計/README.md)
