import type Stripe from "stripe";

import { WebhookHandlerError } from "../errors";
import { assertBreederSubscriptionProduct } from "../product-validation";
import { updateBreederWebhookFields } from "../repository";
import { resolveBreederForSubscription } from "../resolve-breeder";
import { extractSubscriptionSyncFields, resolveSubscriptionCurrentPeriodEnd } from "../stripe-refs";

export async function handleCustomerSubscriptionUpdated(event: Stripe.Event): Promise<void> {
  const subscription = event.data.object as Stripe.Subscription;

  assertBreederSubscriptionProduct(subscription);

  const syncFields = extractSubscriptionSyncFields(subscription);
  const breeder = await resolveBreederForSubscription({
    metadataBreederId: subscription.metadata?.breeder_id ?? null,
    stripeSubscriptionId: syncFields.stripe_subscription_id,
    stripeCustomerId: syncFields.stripe_customer_id,
  });

  await updateBreederWebhookFields(breeder.id, syncFields);
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

  await updateBreederWebhookFields(breeder.id, {
    stripe_subscription_id: subscription.id,
    stripe_customer_id: customerId,
    subscription_status: subscription.status,
    cancel_at_period_end: subscription.cancel_at_period_end ?? false,
    subscription_current_period_end: resolveSubscriptionCurrentPeriodEnd(subscription),
  });
}
