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
import { logStripeWebhookProcessingFailure } from "./webhook-diagnostics";

export type StripeWebhookRequestResult =
  | { success: true; duplicate: boolean }
  | { success: false; httpStatus: number; error: string };

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
  } catch (error) {
    logStripeWebhookProcessingFailure("signature verification", error);
    return { success: false, httpStatus: 400, error: STRIPE_WEBHOOK_INVALID_SIGNATURE_MESSAGE };
  }

  let claim: Awaited<ReturnType<typeof claimWebhookEvent>>;
  try {
    claim = await claimWebhookEvent(event.id, event.type);
  } catch (error) {
    logStripeWebhookProcessingFailure("webhook event insert", error);
    throw error;
  }

  if (claim === "duplicate") {
    return { success: true, duplicate: true };
  }
  if (claim === "in_progress") {
    return { success: false, httpStatus: 503, error: STRIPE_WEBHOOK_IN_PROGRESS_MESSAGE };
  }

  try {
    await processStripeWebhookEvent(event);
  } catch (error) {
    await releaseWebhookEventClaim(event.id).catch(() => {
      // Best-effort release; original error takes precedence for Stripe retry.
    });
    throw error;
  }

  try {
    await finalizeWebhookEvent(event.id);
  } catch (error) {
    await releaseWebhookEventClaim(event.id).catch(() => {
      // Best-effort release; original error takes precedence for Stripe retry.
    });
    logStripeWebhookProcessingFailure("webhook event insert", error);
    throw error;
  }

  return { success: true, duplicate: false };
}
