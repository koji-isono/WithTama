"use client";

import Link from "next/link";

import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

import { LEGAL_PRIVACY_PATH, LEGAL_TERMS_PATH } from "../constants";

type TermsConsentFieldProps = {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  id?: string;
  breeder?: boolean;
};

export function TermsConsentField({
  checked,
  onCheckedChange,
  disabled = false,
  id = "terms-consent",
  breeder = false,
}: TermsConsentFieldProps) {
  return (
    <div className="flex items-start gap-3 rounded-xl border border-[var(--border)] bg-neutral-50/80 p-4">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(event) => onCheckedChange(event.target.checked)}
        disabled={disabled}
        required
        className="mt-1 size-4 shrink-0 rounded border-neutral-300 text-[var(--primary)] focus-visible:ring-2 focus-visible:ring-[var(--primary)]"
      />
      <Label htmlFor={id} className="cursor-pointer text-sm leading-relaxed text-neutral-800">
        <Link
          href={LEGAL_TERMS_PATH}
          className="font-medium text-[var(--primary)] underline-offset-4 hover:underline"
        >
          利用規約
        </Link>
        {breeder ? "（ブリーダー関連条項を含む）" : null}
        および
        <Link
          href={LEGAL_PRIVACY_PATH}
          className="font-medium text-[var(--primary)] underline-offset-4 hover:underline"
        >
          プライバシーポリシー
        </Link>
        を確認し、同意します。
      </Label>
    </div>
  );
}

export function TermsConsentError({ message }: { message?: string | null }) {
  if (!message) return null;

  return <p className={cn("text-sm text-red-600")}>{message}</p>;
}
