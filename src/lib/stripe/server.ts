import "server-only";

import Stripe from "stripe";

import { getStripeSecretKey } from "./env";

let stripeServerClient: Stripe | null = null;

/**
 * Shared Stripe server client. Uses SDK default API version (not pinned).
 * Call only from server contexts (Route Handlers, Server Actions, server scripts via service layer).
 */
export function getStripeServerClient(): Stripe {
  if (!stripeServerClient) {
    stripeServerClient = new Stripe(getStripeSecretKey(), {
      typescript: true,
    });
  }
  return stripeServerClient;
}

/** Reset cached client (tests only). */
export function resetStripeServerClientForTests(): void {
  stripeServerClient = null;
}
