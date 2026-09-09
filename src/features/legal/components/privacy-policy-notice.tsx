import Link from "next/link";

import { LEGAL_PRIVACY_PATH } from "../constants";

export function PrivacyPolicyNotice() {
  return (
    <p className="text-sm leading-relaxed text-neutral-600">
      個人情報の取扱いについては
      <Link
        href={LEGAL_PRIVACY_PATH}
        className="mx-1 font-medium text-[var(--primary)] underline-offset-4 hover:underline"
      >
        プライバシーポリシー
      </Link>
      をご確認ください。
    </p>
  );
}
