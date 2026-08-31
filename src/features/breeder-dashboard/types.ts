export type ResubmissionBannerData = {
  comment: string | null;
};

export type BreederDashboardPageData = {
  resubmissionBanner: ResubmissionBannerData | null;
  checkoutReturn: "success" | "cancel" | null;
};

export type BreederReviewSummaryRow = {
  id: string;
  review_status: string;
};
