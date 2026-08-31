import type Stripe from "stripe";

import { getStripeServerClient } from "@/lib/stripe/server";

import { WebhookHandlerError } from "../errors";
import { assertBreederSubscriptionProduct } from "../product-validation";
import { getBreederWebhookRowById, updateBreederWebhookFields } from "../repository";
import { assertCustomerIdMatches, assertSubscriptionIdReplaceAllowed } from "../resolve-breeder";
import { extractSubscriptionSyncFields, resolveStripeId } from "../stripe-refs";

async function loadSubscription(session: Stripe.Checkout.Session): Promise<Stripe.Subscription> {
  const subscriptionRef = session.subscription;
  if (!subscriptionRef) {
    throw new WebhookHandlerError(
      "missing_stripe_refs",
      "Checkout session subscription is missing",
    );
  }

  if (typeof subscriptionRef !== "string") {
    return subscriptionRef;
  }

  return getStripeServerClient().subscriptions.retrieve(subscriptionRef);
}

export async function handleCheckoutSessionCompleted(event: Stripe.Event): Promise<void> {
  const session = event.data.object as Stripe.Checkout.Session;

  if (session.mode !== "subscription") {
    throw new WebhookHandlerError(
      "invalid_session_mode",
      "Checkout session mode is not subscription",
    );
  }

  const breederId = session.metadata?.breeder_id?.trim();
  if (!breederId) {
    throw new WebhookHandlerError(
      "missing_breeder_id",
      "Checkout session metadata.breeder_id is missing",
    );
  }

  const customerId = resolveStripeId(session.customer);
  if (!customerId) {
    throw new WebhookHandlerError("missing_stripe_refs", "Checkout session customer is missing");
  }

  const breeder = await getBreederWebhookRowById(breederId);
  if (!breeder) {
    throw new WebhookHandlerError(
      "breeder_not_found",
      "Breeder row not found for metadata.breeder_id",
    );
  }

  const subscription = await loadSubscription(session);

  assertCustomerIdMatches(breeder, customerId);
  assertSubscriptionIdReplaceAllowed(breeder, subscription.id);
  assertBreederSubscriptionProduct(subscription);

  const fields = extractSubscriptionSyncFields(subscription);
  await updateBreederWebhookFields(breeder.id, fields);
}
