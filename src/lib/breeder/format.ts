/**
 * Shared breeder display name formatting (admin + breeder layout).
 * Priority: business_name → representative_name → fallback label.
 */
export function formatBreederDisplayName(
  businessName: string | null,
  representativeName: string | null,
): string {
  const trimmedBusiness = businessName?.trim();
  if (trimmedBusiness) {
    return trimmedBusiness;
  }

  const trimmedRepresentative = representativeName?.trim();
  if (trimmedRepresentative) {
    return trimmedRepresentative;
  }

  return "（名称未設定）";
}
