# ブリーダープロフィール API

## 概要

ブリーダープロフィールの保存処理は Next.js Server Actions 経由で Supabase を更新する（Decision No.69）。Route Handler は使用しない。

## 実装構成

| レイヤー | ファイル | 責務 |
|---------|---------|------|
| UI | `src/app/breeder/profile/basic/page.tsx` | Step 1 フォーム表示 |
| Service | `src/features/breeder-profile/service.ts` | バリデーション → Repository 呼び出し |
| Repository | `src/features/breeder-profile/repository.ts` | Supabase UPDATE |
| Validation | `src/features/breeder-profile/validation.ts` | 入力チェック |

## saveBasicProfile

| 項目 | 内容 |
|------|------|
| 種別 | Server Action |
| 実装 | `src/features/breeder-profile/service.ts` |
| 認証 | Supabase Auth セッション（`auth.getUser()`） |

### リクエスト（BasicProfileInput）

| フィールド | 型 | 必須 |
|-----------|-----|------|
| `businessName` | string | はい |
| `representativeName` | string | はい |
| `phone` | string | はい |
| `publicEmail` | string | いいえ |
| `websiteUrl` | string | いいえ |

### レスポンス（SaveBasicProfileResult）

**成功**

```json
{ "success": true }
```

**バリデーションエラー**

```json
{
  "success": false,
  "fieldErrors": {
    "businessName": "屋号・事業所名を入力してください。"
  }
}
```

**その他エラー**

```json
{
  "success": false,
  "error": "保存に失敗しました。"
}
```

### 更新対象テーブル

`public.breeders`（`user_id = auth.uid()` のレコード）

| DB カラム | 内容 |
|-----------|------|
| `business_name` | 屋号・事業所名 |
| `representative_name` | 代表者氏名 |
| `phone` | 電話番号 |
| `public_email` | 公開用メール（空の場合 NULL） |
| `website_url` | Web サイト URL（空の場合 NULL） |
| `updated_at` | 更新日時 |

### 成功時の画面遷移

`/breeder/profile/location` へ遷移する。

## 関連ドキュメント

- [breeders テーブル](../05_データベース設計/breeders.md)
- [BR-09 ブリーダープロフィール](../04_画面設計/BR-09_ブリーダープロフィール.md)
- [Decision No.69](../01_設計変更管理/DecisionLog.md#decision-no69)
