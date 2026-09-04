import type Stripe from "stripe";

/** Stripe expandable ID fields (string or object with id). */
export type StripeIdRef = string | { id: string } | null | undefined;

export function resolveStripeId(value: StripeIdRef): string | null {
  if (!value) {
    return null;
  }
  return typeof value === "string" ? value : value.id;
}

export function resolveInvoiceSubscriptionId(invoice: Stripe.Invoice): string | null {
  const subscriptionRef = invoice.parent?.subscription_details?.subscription;
  return resolveStripeId(subscriptionRef);
}

/** Unix seconds from first subscription item (Stripe SDK: number). */
export function resolveSubscriptionCurrentPeriodEndUnix(
  subscription: Stripe.Subscription,
): number | null {
  const periodEnd = subscription.items.data[0]?.current_period_end;
  if (periodEnd == null) {
    return null;
  }
  return periodEnd;
}

export function resolveSubscriptionCurrentPeriodEnd(
  subscription: Stripe.Subscription,
): string | null {
  const periodEnd = resolveSubscriptionCurrentPeriodEndUnix(subscription);
  if (periodEnd == null) {
    return null;
  }
  return new Date(periodEnd * 1000).toISOString();
}

/** Terminal Stripe statuses — do not infer period-end cancel schedule from cancel_at alone. */
const SUBSCRIPTION_STATUSES_INELIGIBLE_FOR_PERIOD_END_CANCEL: ReadonlySet<Stripe.Subscription.Status> =
  new Set(["canceled", "unpaid", "incomplete_expired", "incomplete"]);

/**
 * Maps Stripe Subscription → WithTama cancel_at_period_end (DB flag).
 * CASE A: cancel_at_period_end=true. CASE B: cancel_at equals item current_period_end.
 */
export function resolveSubscriptionCancelAtPeriodEnd(subscription: Stripe.Subscription): boolean {
  if (subscription.cancel_at_period_end === true) {
    return true;
  }

  if (SUBSCRIPTION_STATUSES_INELIGIBLE_FOR_PERIOD_END_CANCEL.has(subscription.status)) {
    return false;
  }

  const cancelAt = subscription.cancel_at;
  if (cancelAt == null) {
    return false;
  }

  const periodEnd = resolveSubscriptionCurrentPeriodEndUnix(subscription);
  if (periodEnd == null) {
    return false;
  }

  return cancelAt === periodEnd;
}

export type SubscriptionSyncFields = {
  stripe_customer_id: string;
  stripe_subscription_id: string;
  stripe_price_id: string | null;
  subscription_status: string;
  subscription_current_period_end: string | null;
  cancel_at_period_end: boolean;
};

export function extractSubscriptionSyncFields(
  subscription: Stripe.Subscription,
): SubscriptionSyncFields {
  const customerId = resolveStripeId(subscription.customer);
  if (!customerId) {
    throw new Error("Subscription customer is missing");
  }

  const price = subscription.items.data[0]?.price;

  return {
    stripe_customer_id: customerId,
    stripe_subscription_id: subscription.id,
    stripe_price_id: price?.id ?? null,
    subscription_status: subscription.status,
    subscription_current_period_end: resolveSubscriptionCurrentPeriodEnd(subscription),
    cancel_at_period_end: resolveSubscriptionCancelAtPeriodEnd(subscription),
  };
}

export function eventCreatedAtIso(event: Stripe.Event): string {
  return new Date(event.created * 1000).toISOString();
}
