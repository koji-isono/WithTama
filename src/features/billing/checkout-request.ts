import { BILLING_CHECKOUT_CLIENT_INPUT_FORBIDDEN_MESSAGE } from "./constants";
import type { CheckoutClientInputValidationResult } from "./types";

const FORBIDDEN_CLIENT_KEYS = [
  "price_id",
  "priceId",
  "amount",
  "breeder_id",
  "breederId",
  "line_items",
  "lineItems",
  "success_url",
  "successUrl",
  "cancel_url",
  "cancelUrl",
  "tax_rate",
  "taxRate",
  "tax_rate_id",
  "taxRateId",
  "automatic_tax",
  "automaticTax",
] as const;

/**
 * Checkout API はサーバー側組み立てのみ。クライアント指定の Price / 金額 / breeder_id を拒否する。
 */
export function validateCheckoutClientInput(body: unknown): CheckoutClientInputValidationResult {
  if (body === null || body === undefined) {
    return { valid: true };
  }

  if (typeof body !== "object" || Array.isArray(body)) {
    return {
      valid: false,
      httpStatus: 400,
      error: BILLING_CHECKOUT_CLIENT_INPUT_FORBIDDEN_MESSAGE,
    };
  }

  for (const key of FORBIDDEN_CLIENT_KEYS) {
    if (key in body) {
      return {
        valid: false,
        httpStatus: 400,
        error: BILLING_CHECKOUT_CLIENT_INPUT_FORBIDDEN_MESSAGE,
      };
    }
  }

  return { valid: true };
}
