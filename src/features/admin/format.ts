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

export function formatAdminPetReviewSubmittedAt(isoString: string): string {
  const date = new Date(isoString);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
