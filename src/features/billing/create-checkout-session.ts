import "server-only";

import { getStripeBreederPriceId, getStripeBreederTaxRateId } from "@/lib/stripe/config";
import { getStripeServerClient } from "@/lib/stripe/server";

import { buildBreederCheckoutCancelUrl, buildBreederCheckoutSuccessUrl } from "./checkout-urls";
import { buildCheckoutSessionCreateParams } from "./checkout-session-params";
import type { BreederBillingRow } from "./types";

export async function createBreederCheckoutSessionUrl(
  breeder: BreederBillingRow,
  customerEmail: string | null,
): Promise<string> {
  const stripe = getStripeServerClient();
  const priceId = getStripeBreederPriceId();
  const taxRateId = getStripeBreederTaxRateId();

  const params = buildCheckoutSessionCreateParams({
    breederId: breeder.id,
    priceId,
    taxRateId,
    stripeCustomerId: breeder.stripe_customer_id,
    customerEmail: breeder.stripe_customer_id ? null : customerEmail,
    successUrl: buildBreederCheckoutSuccessUrl(),
    cancelUrl: buildBreederCheckoutCancelUrl(),
  });

  const session = await stripe.checkout.sessions.create(params);

  if (!session.url) {
    throw new Error("Stripe Checkout Session URL was not returned");
  }

  return session.url;
}
