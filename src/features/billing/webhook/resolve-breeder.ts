import type { SupabaseClient } from "@supabase/supabase-js";

import { WebhookHandlerError } from "./errors";
import {
  getBreederWebhookRowByCustomerId,
  getBreederWebhookRowById,
  getBreederWebhookRowBySubscriptionId,
} from "./repository";
import type { BreederWebhookRow } from "./types";

export function assertCustomerIdMatches(breeder: BreederWebhookRow, customerId: string): void {
  if (breeder.stripe_customer_id && breeder.stripe_customer_id !== customerId) {
    throw new WebhookHandlerError(
      "customer_mismatch",
      "Existing stripe_customer_id does not match Stripe customer",
    );
  }
}

export function assertSubscriptionIdReplaceAllowed(
  breeder: BreederWebhookRow,
  subscriptionId: string,
): void {
  if (!breeder.stripe_subscription_id || breeder.stripe_subscription_id === subscriptionId) {
    return;
  }

  const recontractAllowed =
    breeder.membership_status === "canceled" || breeder.subscription_status === "canceled";

  if (!recontractAllowed) {
    throw new WebhookHandlerError(
      "subscription_mismatch",
      "Existing stripe_subscription_id does not match and re-contract is not allowed",
    );
  }
}

export async function resolveBreederForSubscription(
  input: {
    metadataBreederId?: string | null;
    stripeSubscriptionId: string;
    stripeCustomerId: string;
  },
  client?: SupabaseClient,
): Promise<BreederWebhookRow> {
  let breeder: BreederWebhookRow | null = null;

  if (input.metadataBreederId) {
    breeder = await getBreederWebhookRowById(input.metadataBreederId, client);
  }

  if (!breeder) {
    breeder = await getBreederWebhookRowBySubscriptionId(input.stripeSubscriptionId, client);
  }

  if (!breeder) {
    breeder = await getBreederWebhookRowByCustomerId(input.stripeCustomerId, client);
  }

  if (!breeder) {
    throw new WebhookHandlerError(
      "breeder_not_found",
      "Breeder could not be resolved for subscription",
    );
  }

  if (input.metadataBreederId && breeder.id !== input.metadataBreederId) {
    throw new WebhookHandlerError(
      "breeder_metadata_mismatch",
      "subscription.metadata.breeder_id does not match resolved breeder",
    );
  }

  assertCustomerIdMatches(breeder, input.stripeCustomerId);
  assertSubscriptionIdReplaceAllowed(breeder, input.stripeSubscriptionId);

  return breeder;
}

export async function resolveBreederForInvoice(
  input: {
    stripeSubscriptionId: string | null;
    stripeCustomerId: string | null;
  },
  client?: SupabaseClient,
): Promise<BreederWebhookRow | null> {
  if (input.stripeSubscriptionId) {
    const bySubscription = await getBreederWebhookRowBySubscriptionId(
      input.stripeSubscriptionId,
      client,
    );
    if (bySubscription) {
      if (
        input.stripeCustomerId &&
        bySubscription.stripe_customer_id &&
        bySubscription.stripe_customer_id !== input.stripeCustomerId
      ) {
        throw new WebhookHandlerError(
          "customer_mismatch",
          "Invoice customer does not match breeder stripe_customer_id",
        );
      }
      return bySubscription;
    }
  }

  if (input.stripeCustomerId) {
    return getBreederWebhookRowByCustomerId(input.stripeCustomerId, client);
  }

  return null;
}
