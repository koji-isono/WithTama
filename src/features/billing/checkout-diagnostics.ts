import "server-only";

import Stripe from "stripe";

function envValueStartsWith(envVar: string, prefix: string): boolean {
  const value = process.env[envVar]?.trim();
  return value != null && value.startsWith(prefix);
}

function asStripeError(error: unknown): Stripe.errors.StripeError | null {
  if (error instanceof Stripe.errors.StripeError) {
    return error;
  }

  return null;
}

/** Temporary Production-safe diagnostics for Checkout Session creation failures. */
export function logBreederCheckoutSessionFailure(error: unknown): void {
  const stripeError = asStripeError(error);

  console.error("[billing/checkout] Stripe Checkout Session creation failed", {
    errorName: error instanceof Error ? error.name : typeof error,
    errorMessage: error instanceof Error ? error.message : String(error),
    errorType: stripeError?.type ?? null,
    errorCode: stripeError?.code ?? null,
    errorStatusCode: stripeError?.statusCode ?? null,
    secretKeyIsLivePrefix: envValueStartsWith("STRIPE_SECRET_KEY", "sk_live_"),
    priceIdIsPricePrefix: envValueStartsWith("STRIPE_BREEDER_PRICE_ID", "price_"),
    taxRateIdIsTxrPrefix: envValueStartsWith("STRIPE_BREEDER_TAX_RATE_ID", "txr_"),
  });
}
