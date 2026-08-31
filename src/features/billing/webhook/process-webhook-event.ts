import type Stripe from "stripe";

import { HANDLED_STRIPE_WEBHOOK_EVENT_TYPES } from "./constants";
import { handleCheckoutSessionCompleted } from "./handlers/checkout-session-completed";
import { handleInvoicePaymentFailed } from "./handlers/invoice-payment-failed";
import {
  handleCustomerSubscriptionDeleted,
  handleCustomerSubscriptionUpdated,
} from "./handlers/subscription-events";

function isHandledEventType(
  type: string,
): type is (typeof HANDLED_STRIPE_WEBHOOK_EVENT_TYPES)[number] {
  return (HANDLED_STRIPE_WEBHOOK_EVENT_TYPES as readonly string[]).includes(type);
}

export async function processStripeWebhookEvent(event: Stripe.Event): Promise<void> {
  if (!isHandledEventType(event.type)) {
    return;
  }

  switch (event.type) {
    case "checkout.session.completed":
      await handleCheckoutSessionCompleted(event);
      return;
    case "customer.subscription.updated":
      await handleCustomerSubscriptionUpdated(event);
      return;
    case "customer.subscription.deleted":
      await handleCustomerSubscriptionDeleted(event);
      return;
    case "invoice.payment_failed":
      await handleInvoicePaymentFailed(event);
      return;
    default:
      return;
  }
}
