import type Stripe from "stripe";

import { getStripeServerClient } from "@/lib/stripe/server";

import { buildBreederUpdateFromSubscription } from "../apply-subscription-webhook-update";
import { WebhookHandlerError } from "../errors";
import { assertBreederSubscriptionProduct } from "../product-validation";
import { updateBreederWebhookFields } from "../repository";
import { resolveBreederForInvoice } from "../resolve-breeder";
import { eventCreatedAtIso, resolveInvoiceSubscriptionId, resolveStripeId } from "../stripe-refs";
import type { BreederWebhookRow, BreederWebhookUpdate } from "../types";
import { logStripeWebhookProcessingFailure } from "../webhook-diagnostics";

export async function handleInvoicePaymentFailed(event: Stripe.Event): Promise<void> {
  const invoice = event.data.object as Stripe.Invoice;

  const stripeSubscriptionId = resolveInvoiceSubscriptionId(invoice);
  const stripeCustomerId = resolveStripeId(invoice.customer);

  let breeder: BreederWebhookRow;
  try {
    const resolvedBreeder = await resolveBreederForInvoice({
      stripeSubscriptionId,
      stripeCustomerId,
    });

    if (!resolvedBreeder) {
      throw new WebhookHandlerError(
        "breeder_not_found",
        "Breeder could not be resolved for invoice.payment_failed",
      );
    }

    breeder = resolvedBreeder;
  } catch (error) {
    logStripeWebhookProcessingFailure("breeder lookup", error);
    throw error;
  }

  const failedAt = eventCreatedAtIso(event);

  if (!stripeSubscriptionId) {
    try {
      await updateBreederWebhookFields(breeder.id, {
        last_payment_failed_at: failedAt,
      });
    } catch (error) {
      logStripeWebhookProcessingFailure("billing status update", error);
      throw error;
    }
    return;
  }

  let fields: BreederWebhookUpdate;
  try {
    const subscription =
      await getStripeServerClient().subscriptions.retrieve(stripeSubscriptionId);
    assertBreederSubscriptionProduct(subscription);

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
    await updateBreederWebhookFields(breeder.id, {
      ...fields,
      last_payment_failed_at: failedAt,
    });
  } catch (error) {
    logStripeWebhookProcessingFailure("billing status update", error);
    throw error;
  }
}
