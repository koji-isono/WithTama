import "server-only";

import { getStripeServerClient } from "@/lib/stripe/server";

import { buildBreederPortalReturnUrl } from "./portal-urls";

export async function createBreederPortalSessionUrl(stripeCustomerId: string): Promise<string> {
  const stripe = getStripeServerClient();

  const session = await stripe.billingPortal.sessions.create({
    customer: stripeCustomerId,
    return_url: buildBreederPortalReturnUrl(),
  });

  if (!session.url) {
    throw new Error("Stripe Portal Session missing url");
  }

  return session.url;
}
