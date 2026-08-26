"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import { Progress } from "@/components/ui/progress";

import {
  BREEDER_PROFILE_TOTAL_STEPS,
  getBreederProfileProgressPercent,
  getBreederProfileStepFromPathname,
} from "../constants";
import { ProfileResubmissionNotice } from "./profile-resubmission-notice";
import type { ProfileResubmissionNoticeData } from "../types";

type ProfileWizardShellProps = {
  children: ReactNode;
  resubmissionNotice?: ProfileResubmissionNoticeData | null;
};

export function ProfileWizardShell({
  children,
  resubmissionNotice = null,
}: ProfileWizardShellProps) {
  const pathname = usePathname();
  const currentStep = getBreederProfileStepFromPathname(pathname);
  const progressPercent = getBreederProfileProgressPercent(currentStep.step);

  return (
    <div className="mx-auto max-w-3xl px-4 py-6 pb-28 sm:py-10 sm:pb-10">
      <header className="space-y-4">
        <div className="space-y-2">
          <p className="text-xs font-semibold tracking-widest text-[var(--primary)]">BR-09</p>
          <h1 className="text-2xl font-bold sm:text-3xl">ブリーダープロフィール</h1>
          <p className="text-sm text-neutral-600 sm:text-base">
            掲載に必要な情報を順番に入力してください。
          </p>
        </div>

        {resubmissionNotice ? <ProfileResubmissionNotice {...resubmissionNotice} /> : null}

        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <p className="font-medium text-neutral-800">
              Step {currentStep.step} / {BREEDER_PROFILE_TOTAL_STEPS}
              <span className="mx-2 text-neutral-300">·</span>
              {currentStep.label}
            </p>
            <p className="text-neutral-500">{progressPercent}%</p>
          </div>
          <Progress value={progressPercent} aria-label={`入力進捗 ${progressPercent}%`} />
        </div>
      </header>

      <div className="mt-8">{children}</div>
    </div>
  );
}
