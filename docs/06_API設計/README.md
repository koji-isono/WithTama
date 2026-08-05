# API設計

## 概要

WithTama の API は Next.js App Router の Route Handlers および Supabase クライアント経由で提供します。

## 現状

| エンドポイント / アクション | メソッド | 説明 | 状態 |
|---------------------------|---------|------|------|
| `/api/health` | GET | ヘルスチェック | 実装済み |
| `saveBasicProfile` | Server Action | ブリーダープロフィール Step 1 基本情報保存 | 実装済み |

詳細: [ブリーダープロフィール API](./breeder-profile.md)

## 今後追加予定

| エンドポイント | メソッド | 説明 |
|---------------|---------|------|
| `/api/pets` | GET, POST | 犬猫一覧・登録 |
| `/api/pets/[petId]` | GET, PATCH, DELETE | 犬猫詳細・更新・削除 |
| `/api/pets/[petId]/photos` | POST | 写真アップロード |

## 関連ドキュメント

- [データベース設計](../05_データベース設計/README.md)
- [権限設計](../07_権限設計/README.md)
