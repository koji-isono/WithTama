import type Stripe from "stripe";

import { getStripeServerClient } from "@/lib/stripe/server";

import { buildBreederUpdateFromSubscription } from "../apply-subscription-webhook-update";
import { WebhookHandlerError } from "../errors";
import { assertBreederSubscriptionProduct } from "../product-validation";
import { getBreederWebhookRowById, updateBreederWebhookFields } from "../repository";
import { assertCustomerIdMatches, assertSubscriptionIdReplaceAllowed } from "../resolve-breeder";
import { resolveStripeId } from "../stripe-refs";
import type { BreederWebhookRow, BreederWebhookUpdate } from "../types";
import { logStripeWebhookProcessingFailure } from "../webhook-diagnostics";

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

  let breederId: string;
  let customerId: string;

  try {
    if (session.mode !== "subscription") {
      throw new WebhookHandlerError(
        "invalid_session_mode",
        "Checkout session mode is not subscription",
      );
    }

    const metadataBreederId = session.metadata?.breeder_id?.trim();
    if (!metadataBreederId) {
      throw new WebhookHandlerError(
        "missing_breeder_id",
        "Checkout session metadata.breeder_id is missing",
      );
    }
    breederId = metadataBreederId;

    const resolvedCustomerId = resolveStripeId(session.customer);
    if (!resolvedCustomerId) {
      throw new WebhookHandlerError("missing_stripe_refs", "Checkout session customer is missing");
    }
    customerId = resolvedCustomerId;
  } catch (error) {
    logStripeWebhookProcessingFailure("checkout.session.completed handling", error);
    throw error;
  }

  let breeder: BreederWebhookRow;
  try {
    const row = await getBreederWebhookRowById(breederId);
    if (!row) {
      throw new WebhookHandlerError(
        "breeder_not_found",
        "Breeder row not found for metadata.breeder_id",
      );
    }
    breeder = row;
  } catch (error) {
    logStripeWebhookProcessingFailure("breeder lookup", error);
    throw error;
  }

  let fields: BreederWebhookUpdate;
  try {
    const subscription = await loadSubscription(session);

    assertCustomerIdMatches(breeder, customerId);
    assertSubscriptionIdReplaceAllowed(breeder, subscription.id);
    assertBreederSubscriptionProduct(subscription);

    fields = buildBreederUpdateFromSubscription({
      breeder,
      subscription,
      context: "checkout",
      now: new Date(event.created * 1000),
    });
  } catch (error) {
    logStripeWebhookProcessingFailure("subscription update", error);
    throw error;
  }

  try {
    await updateBreederWebhookFields(breeder.id, fields);
  } catch (error) {
    logStripeWebhookProcessingFailure("billing status update", error);
    throw error;
  }
}
