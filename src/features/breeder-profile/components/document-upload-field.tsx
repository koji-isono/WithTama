"use client";

import { CheckCircle2, Loader2, Upload } from "lucide-react";
import { useRef, useState } from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

import { BREEDER_DOCUMENT_MAX_BYTES, type BreederDocumentType } from "../document-constants";
import { formatDocumentFileSize, validateBreederDocumentFile } from "../document-utils";
import { uploadBreederDocument } from "../service";

type DocumentUploadFieldProps = {
  documentType: BreederDocumentType;
  label: string;
  description: string;
  initiallySubmitted: boolean;
  disabled?: boolean;
  onUploaded: () => void;
};

type UploadStatus = "idle" | "uploading" | "success" | "error";

export function DocumentUploadField({
  documentType,
  label,
  description,
  initiallySubmitted,
  disabled = false,
  onUploaded,
}: DocumentUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [status, setStatus] = useState<UploadStatus>(initiallySubmitted ? "success" : "idle");
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [selectedFileSize, setSelectedFileSize] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [submittedFromDb, setSubmittedFromDb] = useState(initiallySubmitted);

  const inputId = `${documentType}_document`;

  async function handleFileChange(file: File | null) {
    if (!file) {
      return;
    }

    setError(null);
    setSelectedFileName(file.name);
    setSelectedFileSize(formatDocumentFileSize(file.size));

    const validationError = validateBreederDocumentFile(file);

    if (validationError) {
      setStatus("error");
      setError(validationError);
      return;
    }

    setStatus("uploading");

    const formData = new FormData();
    formData.append("documentType", documentType);
    formData.append("file", file);

    try {
      const result = await uploadBreederDocument(formData);

      if (!result.success) {
        setStatus("error");
        setError(result.error ?? "アップロードに失敗しました。");
        return;
      }

      setStatus("success");
      setSubmittedFromDb(true);
      onUploaded();
    } catch {
      setStatus("error");
      setError(
        process.env.NODE_ENV === "production"
          ? "アップロードに失敗しました。"
          : "アップロードに失敗しました。\nmessage: Unexpected client error",
      );
    }
  }

  function handleInputChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    void handleFileChange(file);
  }

  function handleReselect() {
    setError(null);
    inputRef.current?.click();
  }

  const isUploading = status === "uploading";
  const showSuccess = status === "success" && (submittedFromDb || selectedFileName);

  return (
    <div className="space-y-3 rounded-xl border border-[var(--border)] bg-neutral-50/50 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <Label htmlFor={inputId}>{label}</Label>
        <Badge className="border-transparent bg-[var(--primary)]/10 px-2 py-0 text-[10px] font-semibold text-[var(--primary)] hover:bg-[var(--primary)]/10">
          必須
        </Badge>
      </div>

      <p className="text-sm text-neutral-600">{description}</p>

      <input
        ref={inputRef}
        id={inputId}
        type="file"
        accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
        className="sr-only"
        disabled={disabled || isUploading}
        onChange={handleInputChange}
      />

      <div className="space-y-2">
        {showSuccess && submittedFromDb && !selectedFileName ? (
          <div className="flex items-center gap-2 text-sm text-emerald-700">
            <CheckCircle2 className="size-4 shrink-0" />
            <span>提出済み</span>
          </div>
        ) : null}

        {selectedFileName ? (
          <div className="text-sm text-neutral-700">
            <p>
              選択ファイル: <span className="font-medium">{selectedFileName}</span>
            </p>
            {selectedFileSize ? (
              <p className="text-neutral-500">サイズ: {selectedFileSize}</p>
            ) : null}
          </div>
        ) : null}

        {isUploading ? (
          <div className="flex items-center gap-2 text-sm text-neutral-600">
            <Loader2 className="size-4 animate-spin" />
            <span>アップロード中...</span>
          </div>
        ) : null}

        {showSuccess && selectedFileName ? (
          <div className="flex items-center gap-2 text-sm text-emerald-700">
            <CheckCircle2 className="size-4 shrink-0" />
            <span>アップロード完了</span>
          </div>
        ) : null}

        {error ? (
          <p role="alert" className="whitespace-pre-line text-sm text-red-600">
            {error}
          </p>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        {!selectedFileName && !submittedFromDb ? (
          <Button
            type="button"
            variant="outline"
            className={cn("h-10 rounded-full border-[var(--border)] px-4")}
            disabled={disabled || isUploading}
            onClick={() => inputRef.current?.click()}
          >
            <Upload className="mr-2 size-4" />
            ファイルを選択
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            className="h-10 rounded-full border-[var(--border)] px-4"
            disabled={disabled || isUploading}
            onClick={handleReselect}
          >
            ファイルを再選択
          </Button>
        )}
      </div>

      <p className="text-xs text-neutral-500">
        jpg / jpeg / png / pdf（各 {formatDocumentFileSize(BREEDER_DOCUMENT_MAX_BYTES)} まで）
      </p>
    </div>
  );
}
