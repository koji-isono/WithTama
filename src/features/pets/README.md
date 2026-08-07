# pets

ブリーダー向け犬猫管理（BR-07 / BR-10 / BR-11）の Repository / Service / Validation を担当する。

## 責務

- ログインブリーダーに紐づく犬猫の取得・下書き登録・基本情報編集
- 犬猫一覧・新規登録・編集画面
- 登録・更新のバリデーションと Server Actions

## ファイル構成

| ファイル | 内容 |
|---------|------|
| `types.ts` | 犬猫ドメイン型 |
| `validation.ts` | `validateCreatePetDraftInput`（登録・編集共通） |
| `repository.ts` | `getBreederIdByUserId`, `createPet`, `getPetByIdForBreeder`, `updatePetDraft` |
| `service.ts` | `createPetDraft`, `updatePetDraftAction`, `getPetEditData` |
| `loaders.ts` | `loadPetEditPageData` |
| `constants.ts` | URL・選択肢・ステータスラベル |
| `components/pet-draft-form-fields.tsx` | 登録・編集共通フォーム |
| `components/pet-registration-form.tsx` | 新規登録 UI |
| `components/pet-edit-form.tsx` | 編集 UI |
| `index.ts` | 公開 export |

## 関連 URL

| 画面 | URL |
|------|-----|
| 犬猫一覧 | `/breeder/pets` |
| 犬猫登録 | `/breeder/pets/new` |
| 犬猫情報編集 | `/breeder/pets/[petId]/edit` |

## 関連テーブル

- `public.pets`
- `public.breeders`（`user_id` → `breeder_id` 解決）

## 関連ドキュメント

- [BR-10 犬猫登録](../../docs/04_画面設計/BR-10_犬猫登録.md)
- [BR-11 犬猫情報編集](../../docs/04_画面設計/BR-11_犬猫情報編集.md)
- [犬猫管理 API](../../docs/06_API設計/pets.md)
