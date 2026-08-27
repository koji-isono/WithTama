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

/** True when core Stripe server env vars needed for billing flows are present. Does not validate key format. */
export function isStripeServerConfigured(): boolean {
  return Boolean(
    process.env.STRIPE_SECRET_KEY?.trim() && process.env.STRIPE_BREEDER_PRICE_ID?.trim(),
  );
}
