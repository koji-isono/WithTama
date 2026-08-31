import type Stripe from "stripe";

import { getStripeServerClient } from "@/lib/stripe/server";

import { buildBreederUpdateFromSubscription } from "../apply-subscription-webhook-update";
import { WebhookHandlerError } from "../errors";
import { assertBreederSubscriptionProduct } from "../product-validation";
import { updateBreederWebhookFields } from "../repository";
import { resolveBreederForInvoice } from "../resolve-breeder";
import { eventCreatedAtIso, resolveInvoiceSubscriptionId, resolveStripeId } from "../stripe-refs";

export async function handleInvoicePaymentFailed(event: Stripe.Event): Promise<void> {
  const invoice = event.data.object as Stripe.Invoice;

  const stripeSubscriptionId = resolveInvoiceSubscriptionId(invoice);
  const stripeCustomerId = resolveStripeId(invoice.customer);

  const breeder = await resolveBreederForInvoice({
    stripeSubscriptionId,
    stripeCustomerId,
  });

  if (!breeder) {
    throw new WebhookHandlerError(
      "breeder_not_found",
      "Breeder could not be resolved for invoice.payment_failed",
    );
  }

  const failedAt = eventCreatedAtIso(event);

  if (!stripeSubscriptionId) {
    await updateBreederWebhookFields(breeder.id, {
      last_payment_failed_at: failedAt,
    });
    return;
  }

  const subscription = await getStripeServerClient().subscriptions.retrieve(stripeSubscriptionId);
  assertBreederSubscriptionProduct(subscription);

  const fields = buildBreederUpdateFromSubscription({
    breeder,
    subscription,
    context: "sync",
    now: new Date(event.created * 1000),
  });

  await updateBreederWebhookFields(breeder.id, {
    ...fields,
    last_payment_failed_at: failedAt,
  });
}
