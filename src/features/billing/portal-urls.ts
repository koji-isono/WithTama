import { BREEDER_BILLING_PATH } from "./billing-display";
import { getAppBaseUrl } from "./checkout-urls";

/** Server-managed Portal return URL. Does not trust request Host header. */
export function buildBreederPortalReturnUrl(): string {
  return `${getAppBaseUrl()}${BREEDER_BILLING_PATH}`;
}
