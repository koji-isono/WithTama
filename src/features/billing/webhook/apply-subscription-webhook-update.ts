import type Stripe from "stripe";

import {
  applyMembershipMappingResult,
  isMembershipStatus,
  isStaleActiveEventAfterCancellation,
  resolveMembershipForCheckoutSuccess,
  resolveMembershipFromSubscriptionSync,
  type MembershipStatus,
} from "@/lib/stripe/membership-mapping";

import type { BreederWebhookRow, BreederWebhookUpdate } from "./types";
import { extractSubscriptionSyncFields } from "./stripe-refs";

function toMembershipStatus(value: string): MembershipStatus {
  if (!isMembershipStatus(value)) {
    throw new Error(`Invalid membership_status on breeder row: ${value}`);
  }
  return value;
}

function resolveMembershipFields(input: {
  breeder: BreederWebhookRow;
  subscription: Stripe.Subscription;
  context: "checkout" | "sync";
  nowIso: string;
}): Pick<BreederWebhookUpdate, "membership_status" | "suspended_at"> {
  const current = toMembershipStatus(input.breeder.membership_status);

  const mapping =
    input.context === "checkout"
      ? resolveMembershipForCheckoutSuccess({
          currentMembershipStatus: current,
          stripeSubscriptionStatus: input.subscription.status,
        })
      : resolveMembershipFromSubscriptionSync({
          stripeSubscriptionStatus: input.subscription.status,
        });

  const staleAfterCancellation =
    input.context === "sync" &&
    mapping.action === "set" &&
    isStaleActiveEventAfterCancellation({
      currentMembershipStatus: current,
      breederStripeSubscriptionId: input.breeder.stripe_subscription_id,
      eventSubscriptionId: input.subscription.id,
      mappedMembershipStatus: mapping.membershipStatus,
    });

  const transition = applyMembershipMappingResult({
    currentMembershipStatus: current,
    mapping,
    suspendedAtIso: input.nowIso,
    staleAfterCancellation,
  });

  if (!transition) {
    return {};
  }

  return transition;
}

export function buildBreederUpdateFromSubscription(input: {
  breeder: BreederWebhookRow;
  subscription: Stripe.Subscription;
  context: "checkout" | "sync";
  now?: Date;
}): BreederWebhookUpdate {
  const nowIso = (input.now ?? new Date()).toISOString();
  const syncFields = extractSubscriptionSyncFields(input.subscription);
  const membershipFields = resolveMembershipFields({
    breeder: input.breeder,
    subscription: input.subscription,
    context: input.context,
    nowIso,
  });

  return {
    ...syncFields,
    ...membershipFields,
  };
}
