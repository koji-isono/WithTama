import "server-only";

import Stripe from "stripe";

import { StripeConfigError, getStripeWebhookSecret } from "@/lib/stripe/config";

import {
  STRIPE_WEBHOOK_CONFIG_ERROR_MESSAGE,
  STRIPE_WEBHOOK_IN_PROGRESS_MESSAGE,
  STRIPE_WEBHOOK_INVALID_SIGNATURE_MESSAGE,
  STRIPE_WEBHOOK_MISSING_SIGNATURE_MESSAGE,
} from "./constants";
import { processStripeWebhookEvent } from "./process-webhook-event";
import { claimWebhookEvent, finalizeWebhookEvent, releaseWebhookEventClaim } from "./repository";

export type StripeWebhookRequestResult =
  { success: true; duplicate: boolean } | { success: false; httpStatus: number; error: string };

export async function handleStripeWebhookRequest(
  rawBody: string,
  signatureHeader: string | null,
): Promise<StripeWebhookRequestResult> {
  if (!signatureHeader) {
    return { success: false, httpStatus: 400, error: STRIPE_WEBHOOK_MISSING_SIGNATURE_MESSAGE };
  }

  let webhookSecret: string;
  try {
    webhookSecret = getStripeWebhookSecret();
  } catch (error) {
    if (error instanceof StripeConfigError) {
      return { success: false, httpStatus: 500, error: STRIPE_WEBHOOK_CONFIG_ERROR_MESSAGE };
    }
    throw error;
  }

  let event: Stripe.Event;
  try {
    event = Stripe.webhooks.constructEvent(rawBody, signatureHeader, webhookSecret);
  } catch {
    return { success: false, httpStatus: 400, error: STRIPE_WEBHOOK_INVALID_SIGNATURE_MESSAGE };
  }

  const claim = await claimWebhookEvent(event.id, event.type);
  if (claim === "duplicate") {
    return { success: true, duplicate: true };
  }
  if (claim === "in_progress") {
    return { success: false, httpStatus: 503, error: STRIPE_WEBHOOK_IN_PROGRESS_MESSAGE };
  }

  try {
    await processStripeWebhookEvent(event);
    await finalizeWebhookEvent(event.id);
    return { success: true, duplicate: false };
  } catch (error) {
    await releaseWebhookEventClaim(event.id).catch(() => {
      // Best-effort release; original error takes precedence for Stripe retry.
    });

    if (process.env.NODE_ENV === "development") {
      console.error("[webhooks/stripe] processing failed", {
        eventId: event.id,
        eventType: event.type,
      });
    }

    throw error;
  }
}
