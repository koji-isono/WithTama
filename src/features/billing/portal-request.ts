import { BILLING_PORTAL_CLIENT_INPUT_FORBIDDEN_MESSAGE } from "./portal-constants";

export type PortalClientInputValidationResult =
  { valid: true } | { valid: false; httpStatus: 400; error: string };

const FORBIDDEN_CLIENT_KEYS = [
  "customer",
  "customer_id",
  "customerId",
  "stripe_customer_id",
  "stripeCustomerId",
  "breeder_id",
  "breederId",
  "return_url",
  "returnUrl",
] as const;

/** Portal API はサーバー側組み立てのみ。クライアント指定の customer / return_url を拒否する。 */
export function validatePortalClientInput(body: unknown): PortalClientInputValidationResult {
  if (body === null || body === undefined) {
    return { valid: true };
  }

  if (typeof body !== "object" || Array.isArray(body)) {
    return {
      valid: false,
      httpStatus: 400,
      error: BILLING_PORTAL_CLIENT_INPUT_FORBIDDEN_MESSAGE,
    };
  }

  for (const key of FORBIDDEN_CLIENT_KEYS) {
    if (key in body) {
      return {
        valid: false,
        httpStatus: 400,
        error: BILLING_PORTAL_CLIENT_INPUT_FORBIDDEN_MESSAGE,
      };
    }
  }

  return { valid: true };
}
