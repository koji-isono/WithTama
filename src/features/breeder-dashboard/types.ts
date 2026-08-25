export type ResubmissionBannerData = {
  comment: string | null;
};

export type BreederDashboardPageData = {
  resubmissionBanner: ResubmissionBannerData | null;
};

export type BreederReviewSummaryRow = {
  id: string;
  review_status: string;
};
