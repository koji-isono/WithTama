import Link from "next/link";
import { CheckCircle2, Info } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";

import { BILLING_PLAN_NAME, BILLING_PLAN_PRICE_LABEL } from "../billing-display";
import type { BreederBillingPageData } from "../types";
import { BillingCheckoutButton } from "./billing-checkout-button";

type BreederBillingViewProps = BreederBillingPageData;

function statusAccentClass(variant: BreederBillingPageData["presentation"]["variant"]): string {
  switch (variant) {
    case "active":
      return "text-emerald-700";
    case "active_cancel_scheduled":
      return "text-amber-700";
    case "suspended":
      return "text-red-700";
    case "canceled":
      return "text-neutral-700";
    case "pending":
    default:
      return "text-[var(--primary)]";
  }
}

export function BreederBillingView({ presentation, periodEndLabel }: BreederBillingViewProps) {
  const accentClass = statusAccentClass(presentation.variant);

  return (
    <div className="mx-auto max-w-lg px-4 py-6 sm:py-10">
      <header className="space-y-2">
        <p className="text-xs font-semibold tracking-widest text-[var(--primary)]">BR-13</p>
        <h1 className="text-2xl font-bold sm:text-3xl">月額会費</h1>
      </header>

      <Card className="mt-8 border-[var(--border)] bg-white shadow-sm">
        <CardContent className="space-y-6 p-5 sm:p-6">
          <div className="space-y-1">
            <p className="text-sm font-medium text-neutral-500">プラン</p>
            <p className="text-lg font-bold text-neutral-900">{BILLING_PLAN_NAME}</p>
            <p className="text-base text-neutral-700">{BILLING_PLAN_PRICE_LABEL}</p>
          </div>

          <div className="space-y-2 border-t border-[var(--border)] pt-5">
            <p className="text-sm font-medium text-neutral-500">現在の状態</p>
            <p className={`text-xl font-bold ${accentClass}`}>{presentation.headline}</p>
            <p className="text-sm leading-relaxed text-neutral-700">{presentation.description}</p>
            {presentation.auxiliaryMessage ? (
              <p className="flex items-start gap-2 text-sm leading-relaxed text-neutral-600">
                <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
                <span>{presentation.auxiliaryMessage}</span>
              </p>
            ) : null}
          </div>

          {presentation.showNextRenewalDate && periodEndLabel ? (
            <div className="space-y-1 border-t border-[var(--border)] pt-5">
              <p className="text-sm font-medium text-neutral-500">次回更新予定日</p>
              <p className="text-base font-semibold text-neutral-900">{periodEndLabel}</p>
            </div>
          ) : null}

          {presentation.showEndScheduledDate && periodEndLabel ? (
            <div className="space-y-1 border-t border-[var(--border)] pt-5">
              <p className="text-sm font-medium text-neutral-500">利用終了予定日</p>
              <p className="text-base font-semibold text-neutral-900">{periodEndLabel}</p>
            </div>
          ) : null}

          {presentation.showCheckoutCta && presentation.checkoutCtaLabel ? (
            <div className="border-t border-[var(--border)] pt-5">
              <BillingCheckoutButton label={presentation.checkoutCtaLabel} />
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

type CheckoutResultBannerProps = {
  variant: "success" | "cancel";
};

export function CheckoutResultBanner({ variant }: CheckoutResultBannerProps) {
  const isSuccess = variant === "success";

  return (
    <Alert
      className={
        isSuccess
          ? "border-emerald-200 bg-emerald-50 text-emerald-950"
          : "border-amber-200 bg-amber-50 text-amber-950"
      }
    >
      <CheckCircle2
        className={`size-4 ${isSuccess ? "text-emerald-700" : "text-amber-700"}`}
        aria-hidden
      />
      <AlertTitle className="text-base font-semibold">
        {isSuccess ? "お支払いを受け付けました" : "お支払い手続きは完了していません"}
      </AlertTitle>
      <AlertDescription className="space-y-3">
        <p>
          {isSuccess
            ? "現在、利用状態を確認しています。反映まで少し時間がかかる場合があります。"
            : "必要であれば、月額会費画面からもう一度お手続きください。"}
        </p>
        <Link
          href="/breeder/billing"
          className="inline-flex text-sm font-semibold text-[var(--primary)] underline-offset-4 hover:underline"
        >
          月額会費を確認
        </Link>
      </AlertDescription>
    </Alert>
  );
}
