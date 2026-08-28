import {
  BREEDER_CHECKOUT_CANCEL_QUERY,
  BREEDER_CHECKOUT_RETURN_PATH,
  BREEDER_CHECKOUT_SUCCESS_QUERY,
} from "./constants";

/** Server-managed app origin. Does not trust request Host header. */
export function getAppBaseUrl(): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured) {
    return configured.replace(/\/$/, "");
  }
  return "http://localhost:3000";
}

export function buildBreederCheckoutSuccessUrl(): string {
  return `${getAppBaseUrl()}${BREEDER_CHECKOUT_RETURN_PATH}?${BREEDER_CHECKOUT_SUCCESS_QUERY}`;
}

export function buildBreederCheckoutCancelUrl(): string {
  return `${getAppBaseUrl()}${BREEDER_CHECKOUT_RETURN_PATH}?${BREEDER_CHECKOUT_CANCEL_QUERY}`;
}
