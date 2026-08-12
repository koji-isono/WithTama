export type AdminPetReviewListItem = {
  id: string;
  publicDisplayName: string | null;
  breed: string;
  breederDisplayName: string;
  submittedAt: string | null;
  mainPhotoSignedUrl: string | null;
};

export type AdminPetReviewListPageData = {
  items: AdminPetReviewListItem[];
};
