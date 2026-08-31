import type Stripe from "stripe";

import { buildBreederUpdateFromSubscription } from "../apply-subscription-webhook-update";
import { WebhookHandlerError } from "../errors";
import { assertBreederSubscriptionProduct } from "../product-validation";
import { updateBreederWebhookFields } from "../repository";
import { resolveBreederForSubscription } from "../resolve-breeder";
import { resolveStripeId } from "../stripe-refs";

export async function handleCustomerSubscriptionUpdated(event: Stripe.Event): Promise<void> {
  const subscription = event.data.object as Stripe.Subscription;

  assertBreederSubscriptionProduct(subscription);

  const customerId = resolveStripeId(subscription.customer);
  if (!customerId) {
    throw new WebhookHandlerError("missing_customer", "Subscription has no customer");
  }

  const breeder = await resolveBreederForSubscription({
    metadataBreederId: subscription.metadata?.breeder_id ?? null,
    stripeSubscriptionId: subscription.id,
    stripeCustomerId: customerId,
  });

  const fields = buildBreederUpdateFromSubscription({
    breeder,
    subscription,
    context: "sync",
    now: new Date(event.created * 1000),
  });

  await updateBreederWebhookFields(breeder.id, fields);
}

export async function handleCustomerSubscriptionDeleted(event: Stripe.Event): Promise<void> {
  const subscription = event.data.object as Stripe.Subscription;

  const customerId =
    typeof subscription.customer === "string" ? subscription.customer : subscription.customer?.id;
  if (!customerId) {
    throw new WebhookHandlerError("missing_customer", "Deleted subscription has no customer");
  }

  const breeder = await resolveBreederForSubscription({
    metadataBreederId: subscription.metadata?.breeder_id ?? null,
    stripeSubscriptionId: subscription.id,
    stripeCustomerId: customerId,
  });

  const fields = buildBreederUpdateFromSubscription({
    breeder,
    subscription,
    context: "sync",
    now: new Date(event.created * 1000),
  });

  await updateBreederWebhookFields(breeder.id, fields);
}
