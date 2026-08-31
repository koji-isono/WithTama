"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

import { BILLING_CHECKOUT_API_PATH, BILLING_CHECKOUT_GENERIC_ERROR_MESSAGE } from "../constants";
import { BILLING_CHECKOUT_LOADING_LABEL } from "../billing-display";

type BillingCheckoutButtonProps = {
  label: string;
};

export function BillingCheckoutButton({ label }: BillingCheckoutButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCheckout() {
    if (loading) {
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(BILLING_CHECKOUT_API_PATH, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });

      const data = (await response.json()) as { url?: string; error?: string };

      if (!response.ok || !data.url) {
        setError(data.error ?? BILLING_CHECKOUT_GENERIC_ERROR_MESSAGE);
        setLoading(false);
        return;
      }

      window.location.href = data.url;
    } catch {
      setError(BILLING_CHECKOUT_GENERIC_ERROR_MESSAGE);
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      {error ? (
        <Alert variant="destructive" className="border-red-200 bg-red-50 text-red-800">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}
      <Button
        type="button"
        onClick={handleCheckout}
        disabled={loading}
        aria-busy={loading}
        className="h-11 w-full rounded-full bg-[var(--primary)] px-6 hover:bg-[var(--primary)]/90 sm:w-auto"
      >
        {loading ? BILLING_CHECKOUT_LOADING_LABEL : label}
      </Button>
    </div>
  );
}
