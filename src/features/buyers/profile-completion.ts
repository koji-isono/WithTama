import type { NormalizedBuyerProfileInput } from "./types";

export function isBuyerProfileComplete(normalized: NormalizedBuyerProfileInput): boolean {
  return (
    normalized.fullName.length > 0 &&
    normalized.displayName.length > 0 &&
    normalized.phone.length > 0 &&
    normalized.prefecture.length > 0 &&
    normalized.city.length > 0
  );
}
