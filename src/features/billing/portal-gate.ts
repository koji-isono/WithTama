import {
  BILLING_PORTAL_INVALID_MEMBERSHIP_MESSAGE,
  PORTAL_ALLOWED_MEMBERSHIP_STATUSES,
  type PortalAllowedMembershipStatus,
} from "./portal-constants";

export type PortalMembershipGateResult =
  | { allowed: true; membershipStatus: PortalAllowedMembershipStatus }
  | { allowed: false; httpStatus: 403; error: string };

export function isPortalAllowedMembershipStatus(
  value: string,
): value is PortalAllowedMembershipStatus {
  return (PORTAL_ALLOWED_MEMBERSHIP_STATUSES as readonly string[]).includes(value);
}

/** active / suspended のみ Portal 可。pending / canceled は Checkout 導線。 */
export function evaluatePortalMembershipGate(membershipStatus: string): PortalMembershipGateResult {
  if (isPortalAllowedMembershipStatus(membershipStatus)) {
    return { allowed: true, membershipStatus };
  }

  return {
    allowed: false,
    httpStatus: 403,
    error: BILLING_PORTAL_INVALID_MEMBERSHIP_MESSAGE,
  };
}

/** BR-13 UI: Portal CTA 表示可否（review approved は別途） */
export function shouldShowPortalCta(membershipStatus: string): boolean {
  return isPortalAllowedMembershipStatus(membershipStatus);
}
