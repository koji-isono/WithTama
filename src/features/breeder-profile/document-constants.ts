export const BREEDER_DOCUMENTS_BUCKET = "breeder-documents";

export const BREEDER_DOCUMENT_MAX_BYTES = 10 * 1024 * 1024;

export const BREEDER_DOCUMENT_ALLOWED_EXTENSIONS = ["jpg", "jpeg", "png", "pdf"] as const;

export const BREEDER_DOCUMENT_ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "application/pdf",
] as const;

export type BreederDocumentAllowedExtension = (typeof BREEDER_DOCUMENT_ALLOWED_EXTENSIONS)[number];

export type BreederDocumentAllowedMimeType = (typeof BREEDER_DOCUMENT_ALLOWED_MIME_TYPES)[number];

export const BREEDER_DOCUMENT_TYPE_LABELS = {
  identity: "本人確認書類",
  license: "第一種動物取扱業登録証",
} as const;

export type BreederDocumentType = keyof typeof BREEDER_DOCUMENT_TYPE_LABELS;

export const IDENTITY_DOCUMENT_DESCRIPTION =
  "運転免許証、マイナンバーカード等を想定しています。利用可能書類の正式な範囲については、弁護士または運営責任者への確認が必要です。";

export const BUSINESS_LICENSE_DESCRIPTION =
  "Step3で入力した登録番号、有効期限等と管理者が照合します。";

export const VERIFICATION_PRIVACY_NOTICE =
  "提出書類は一般公開されません。運営会社による本人確認・登録内容確認にのみ使用します。";
