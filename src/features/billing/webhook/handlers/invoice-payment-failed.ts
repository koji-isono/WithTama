import type Stripe from "stripe";

import { WebhookHandlerError } from "../errors";
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

  // Stripe Invoice has no single canonical "failed at"; use event.created (Unix) for consistency.
  const failedAt = eventCreatedAtIso(event);

  await updateBreederWebhookFields(breeder.id, {
    last_payment_failed_at: failedAt,
  });
}
