# 業務フロー

## 概要

WithTama における主要な業務フローを定義します。

## ブリーダー：犬猫登録〜掲載

```
ログイン
  → ダッシュボード（BR-06）
  → 犬猫管理一覧（BR-07 / BR-10）
  → 新規登録（BR-08 / BR-10）
  → 写真アップロード
  → 公開申請（draft → under_review）
  → 管理者審査待ち
  → 承認後 published / 差戻し後 draft で修正・再申請
```

## 購入希望者：犬猫探索

```
トップページ
  → 犬猫一覧
  → 犬猫詳細
  → 問い合わせ（ご縁）
```

## 管理者：犬猫掲載審査

```
管理画面（AD-00）
  → 犬猫掲載審査一覧（AD-10）
  → 犬猫掲載審査詳細（AD-11）
  → 承認して公開 / 差戻し
```

### 犬猫掲載ステータス遷移（Decision No.96, No.97, No.98, No.105）

```
draft
  ↓ ブリーダー公開申請
  │   pets.status: draft → under_review
  │   pet_review_logs: action = submitted
under_review
  ├─ 管理者承認
  │   pets.status: under_review → published
  │   pet_review_logs: action = approved
  │   ↓
  │ published
  │
  └─ 管理者差戻し（理由必須）
      pets.status: under_review → draft
      pet_review_logs: action = returned, comment = 差戻し理由
      ↓ ブリーダー修正
     draft
      ↓ 再申請
     under_review
      pet_review_logs: action = submitted（再追記）
```

公開申請・承認・差戻しのたびに `pet_review_logs` へ追記する。申請日時は最新の `action = submitted` の `created_at` を使用する（Decision No.98）。

### 公開承認の前提（Decision No.101）

犬猫を `published` にできるのは、当該ブリーダーが管理者審査で承認済みかつ、第一種動物取扱業登録が有効な場合に限る。具体条件は実 DB 定義確認後に実装する。

## 関連ドキュメント

- [画面設計](../04_画面設計/README.md)
- [AD-10 犬猫掲載審査一覧](../04_画面設計/AD-10_犬猫掲載審査一覧.md)
- [AD-11 犬猫掲載審査詳細](../04_画面設計/AD-11_犬猫掲載審査詳細.md)
- [pet_review_logs テーブル](../05_データベース設計/pet_review_logs.md)
- [要件定義](../02_要件定義/第1期要件定義.md)
