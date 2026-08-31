import type Stripe from "stripe";

import { resolveStripeBreederProductIdForValidation } from "@/lib/stripe/env";

import { WebhookHandlerError } from "./errors";
import { resolveStripeId } from "./stripe-refs";

/**
 * Verify Subscription belongs to WithTama breeder Product (Decision: not price/amount alone).
 * - production: STRIPE_BREEDER_PRODUCT_ID required; unset → StripeConfigError → 500
 * - non-production: unset → skip (local dev / tests without Product env)
 */
export function assertBreederSubscriptionProduct(subscription: Stripe.Subscription): void {
  let expectedProductId: string | null;
  try {
    expectedProductId = resolveStripeBreederProductIdForValidation();
  } catch {
    throw new WebhookHandlerError(
      "product_validation_config",
      "Breeder product validation is not configured",
    );
  }

  if (!expectedProductId) {
    return;
  }

  const price = subscription.items.data[0]?.price;
  if (!price) {
    throw new WebhookHandlerError("product_validation_failed", "Subscription has no price item");
  }

  const actualProductId = resolveStripeId(price.product);
  if (!actualProductId) {
    throw new WebhookHandlerError("product_validation_failed", "Subscription price has no product");
  }

  if (actualProductId !== expectedProductId) {
    throw new WebhookHandlerError("product_validation_failed", "Subscription product mismatch");
  }
}
