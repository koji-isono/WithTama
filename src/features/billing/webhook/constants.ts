export const STRIPE_WEBHOOK_API_PATH = "/api/webhooks/stripe";

export const HANDLED_STRIPE_WEBHOOK_EVENT_TYPES = [
  "checkout.session.completed",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "invoice.payment_failed",
] as const;

export type HandledStripeWebhookEventType = (typeof HANDLED_STRIPE_WEBHOOK_EVENT_TYPES)[number];

export const STRIPE_WEBHOOK_MISSING_SIGNATURE_MESSAGE = "Stripe-Signature header is required.";
export const STRIPE_WEBHOOK_INVALID_SIGNATURE_MESSAGE = "Webhook signature verification failed.";
export const STRIPE_WEBHOOK_CONFIG_ERROR_MESSAGE = "Webhook is not configured.";
export const STRIPE_WEBHOOK_PROCESSING_FAILED_MESSAGE = "Webhook processing failed.";
export const STRIPE_WEBHOOK_IN_PROGRESS_MESSAGE = "Webhook event is still being processed.";
