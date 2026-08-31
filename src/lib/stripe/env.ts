/** Raised when a required Stripe server env var is missing or empty. Never includes secret values. */
export class StripeConfigError extends Error {
  readonly envVar: string;

  constructor(envVar: string) {
    super(`Missing or empty environment variable: ${envVar}`);
    this.name = "StripeConfigError";
    this.envVar = envVar;
  }
}

function readRequiredEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new StripeConfigError(name);
  }
  return value;
}

function readOptionalEnv(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value || undefined;
}

/** Stripe Secret Key — server only. Used by {@link getStripeServerClient}. */
export function getStripeSecretKey(): string {
  return readRequiredEnv("STRIPE_SECRET_KEY");
}

/** Current new-subscription Price ID (Decision No.143). Amount is canonical on Stripe, not in app code. */
export function getStripeBreederPriceId(): string {
  return readRequiredEnv("STRIPE_BREEDER_PRICE_ID");
}

/** Manual Tax Rate ID for breeder monthly fee (Dashboard-created, exclusive tax). Not a secret; server-only. */
export function getStripeBreederTaxRateId(): string {
  return readRequiredEnv("STRIPE_BREEDER_TAX_RATE_ID");
}

/** Webhook signing secret (Step 4). Optional until webhook route exists. */
export function getStripeWebhookSecret(): string {
  return readRequiredEnv("STRIPE_WEBHOOK_SECRET");
}

export function getOptionalStripeWebhookSecret(): string | undefined {
  return readOptionalEnv("STRIPE_WEBHOOK_SECRET");
}

/** Optional Product ID for Checkout/Webhook ownership validation (Step 4). */
export function getOptionalStripeBreederProductId(): string | undefined {
  return readOptionalEnv("STRIPE_BREEDER_PRODUCT_ID");
}

/** Required in production; used when strict Product validation is enforced. */
export function getStripeBreederProductId(): string {
  return readRequiredEnv("STRIPE_BREEDER_PRODUCT_ID");
}

/** True when Product ID must be present (production webhook hardening). */
export function isStripeBreederProductIdRequired(): boolean {
  return process.env.NODE_ENV === "production";
}

/**
 * Resolves Product ID for subscription validation.
 * - production + unset → StripeConfigError (fail closed)
 * - non-production + unset → null (skip validation for local dev / tests)
 */
export function resolveStripeBreederProductIdForValidation(): string | null {
  const configured = getOptionalStripeBreederProductId();
  if (configured) {
    return configured;
  }
  if (isStripeBreederProductIdRequired()) {
    throw new StripeConfigError("STRIPE_BREEDER_PRODUCT_ID");
  }
  return null;
}

/** True when core Stripe server env vars needed for billing flows are present. Does not validate key format. */
export function isStripeServerConfigured(): boolean {
  return Boolean(
    process.env.STRIPE_SECRET_KEY?.trim() &&
    process.env.STRIPE_BREEDER_PRICE_ID?.trim() &&
    process.env.STRIPE_BREEDER_TAX_RATE_ID?.trim(),
  );
}
