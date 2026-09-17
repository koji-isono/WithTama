import type Stripe from "stripe";

import { buildBreederUpdateFromSubscription } from "../apply-subscription-webhook-update";
import { WebhookHandlerError } from "../errors";
import { assertBreederSubscriptionProduct } from "../product-validation";
import { updateBreederWebhookFields } from "../repository";
import { resolveBreederForSubscription } from "../resolve-breeder";
import { resolveStripeId } from "../stripe-refs";
import type { BreederWebhookRow, BreederWebhookUpdate } from "../types";
import { logStripeWebhookProcessingFailure } from "../webhook-diagnostics";

export async function handleCustomerSubscriptionUpdated(event: Stripe.Event): Promise<void> {
  const subscription = event.data.object as Stripe.Subscription;

  try {
    assertBreederSubscriptionProduct(subscription);
  } catch (error) {
    logStripeWebhookProcessingFailure("subscription update", error);
    throw error;
  }

  let breeder: BreederWebhookRow;
  try {
    const customerId = resolveStripeId(subscription.customer);
    if (!customerId) {
      throw new WebhookHandlerError("missing_customer", "Subscription has no customer");
    }

    breeder = await resolveBreederForSubscription({
      metadataBreederId: subscription.metadata?.breeder_id ?? null,
      stripeSubscriptionId: subscription.id,
      stripeCustomerId: customerId,
    });
  } catch (error) {
    logStripeWebhookProcessingFailure("breeder lookup", error);
    throw error;
  }

  let fields: BreederWebhookUpdate;
  try {
    fields = buildBreederUpdateFromSubscription({
      breeder,
      subscription,
      context: "sync",
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

export async function handleCustomerSubscriptionDeleted(event: Stripe.Event): Promise<void> {
  const subscription = event.data.object as Stripe.Subscription;

  let breeder: BreederWebhookRow;
  try {
    const customerId =
      typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id;
    if (!customerId) {
      throw new WebhookHandlerError("missing_customer", "Deleted subscription has no customer");
    }

    breeder = await resolveBreederForSubscription({
      metadataBreederId: subscription.metadata?.breeder_id ?? null,
      stripeSubscriptionId: subscription.id,
      stripeCustomerId: customerId,
    });
  } catch (error) {
    logStripeWebhookProcessingFailure("breeder lookup", error);
    throw error;
  }

  let fields: BreederWebhookUpdate;
  try {
    fields = buildBreederUpdateFromSubscription({
      breeder,
      subscription,
      context: "sync",
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
