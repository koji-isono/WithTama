import type Stripe from "stripe";

export type BuildCheckoutSessionParamsInput = {
  breederId: string;
  priceId: string;
  taxRateId: string;
  stripeCustomerId: string | null;
  customerEmail: string | null;
  successUrl: string;
  cancelUrl: string;
};

/**
 * Stripe Checkout Session create params — server-built only (Decision No.143).
 * Manual Dashboard Tax Rate (exclusive); does not use Stripe Tax automatic_tax.
 */
export function buildCheckoutSessionCreateParams(
  input: BuildCheckoutSessionParamsInput,
): Stripe.Checkout.SessionCreateParams {
  const metadata = { breeder_id: input.breederId };

  const params: Stripe.Checkout.SessionCreateParams = {
    mode: "subscription",
    line_items: [
      {
        price: input.priceId,
        quantity: 1,
        tax_rates: [input.taxRateId],
      },
    ],
    metadata,
    subscription_data: {
      metadata,
    },
    success_url: input.successUrl,
    cancel_url: input.cancelUrl,
  };

  if (input.stripeCustomerId) {
    params.customer = input.stripeCustomerId;
  } else if (input.customerEmail) {
    params.customer_email = input.customerEmail;
  }

  return params;
}
