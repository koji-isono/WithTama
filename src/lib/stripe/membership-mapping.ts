/**
 * Decision No.144 — Stripe Subscription status → WithTama membership_status.
 * Pure functions (no server-only) for unit tests.
 */

export type MembershipStatus = "pending" | "active" | "suspended" | "canceled";

export type StripeSubscriptionStatus =
  | "active"
  | "past_due"
  | "unpaid"
  | "canceled"
  | "trialing"
  | "incomplete"
  | "incomplete_expired"
  | "paused"
  | (string & {});

export type MembershipMappingResult =
  { action: "set"; membershipStatus: MembershipStatus } | { action: "unchanged" };

export type MembershipTransitionFields = {
  membership_status: MembershipStatus;
  suspended_at?: string | null;
};

const CHECKOUT_ACTIVATION_MEMBERSHIP: readonly MembershipStatus[] = ["pending", "canceled"];

export function isMembershipStatus(value: string): value is MembershipStatus {
  return value === "pending" || value === "active" || value === "suspended" || value === "canceled";
}

/** Stripe statuses that map to a WithTama membership change (Decision No.144). */
export function mapStripeSubscriptionStatusToMembership(
  stripeStatus: string,
): MembershipMappingResult {
  switch (stripeStatus) {
    case "active":
    case "past_due":
      return { action: "set", membershipStatus: "active" };
    case "unpaid":
      return { action: "set", membershipStatus: "suspended" };
    case "canceled":
      return { action: "set", membershipStatus: "canceled" };
    case "trialing":
    case "incomplete":
    case "incomplete_expired":
    case "paused":
      return { action: "unchanged" };
    default:
      return { action: "unchanged" };
  }
}

/**
 * Checkout / re-contract activation: Subscription must be active (not session alone).
 * Only pending (初回) or canceled (再契約) may become active.
 */
export function resolveMembershipForCheckoutSuccess(input: {
  currentMembershipStatus: MembershipStatus;
  stripeSubscriptionStatus: string;
}): MembershipMappingResult {
  if (!CHECKOUT_ACTIVATION_MEMBERSHIP.includes(input.currentMembershipStatus)) {
    return { action: "unchanged" };
  }

  if (input.stripeSubscriptionStatus !== "active") {
    return { action: "unchanged" };
  }

  return { action: "set", membershipStatus: "active" };
}

/** Subscription sync (updated / deleted / payment_failed after retrieve). */
export function resolveMembershipFromSubscriptionSync(input: {
  stripeSubscriptionStatus: string;
}): MembershipMappingResult {
  return mapStripeSubscriptionStatusToMembership(input.stripeSubscriptionStatus);
}

/** Guard against out-of-order subscription.updated re-activating a canceled subscription. */
export function isStaleActiveEventAfterCancellation(input: {
  currentMembershipStatus: MembershipStatus;
  breederStripeSubscriptionId: string | null;
  eventSubscriptionId: string;
  mappedMembershipStatus: MembershipStatus;
}): boolean {
  if (input.mappedMembershipStatus !== "active") {
    return false;
  }

  if (input.currentMembershipStatus !== "canceled") {
    return false;
  }

  return (
    input.breederStripeSubscriptionId != null &&
    input.breederStripeSubscriptionId === input.eventSubscriptionId
  );
}

/**
 * suspended_at: Decision No.149 — set on suspend, clear on recovery, unchanged on cancel.
 */
export function buildMembershipTransitionFields(
  currentMembershipStatus: MembershipStatus,
  nextMembershipStatus: MembershipStatus,
  suspendedAtIso: string,
): MembershipTransitionFields | null {
  if (currentMembershipStatus === nextMembershipStatus) {
    return null;
  }

  const fields: MembershipTransitionFields = {
    membership_status: nextMembershipStatus,
  };

  if (nextMembershipStatus === "suspended" && currentMembershipStatus !== "suspended") {
    fields.suspended_at = suspendedAtIso;
  }

  if (nextMembershipStatus === "active" && currentMembershipStatus === "suspended") {
    fields.suspended_at = null;
  }

  return fields;
}

export function applyMembershipMappingResult(input: {
  currentMembershipStatus: MembershipStatus;
  mapping: MembershipMappingResult;
  suspendedAtIso: string;
  staleAfterCancellation?: boolean;
}): MembershipTransitionFields | null {
  if (input.staleAfterCancellation) {
    return null;
  }

  if (input.mapping.action === "unchanged") {
    return null;
  }

  return buildMembershipTransitionFields(
    input.currentMembershipStatus,
    input.mapping.membershipStatus,
    input.suspendedAtIso,
  );
}
