export type BreederWebhookRow = {
  id: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  stripe_price_id: string | null;
  membership_status: string;
  subscription_status: string | null;
  subscription_current_period_end: string | null;
  cancel_at_period_end: boolean;
  last_payment_failed_at: string | null;
  suspended_at: string | null;
};

export type BreederWebhookUpdate = Partial<
  Pick<
    BreederWebhookRow,
    | "stripe_customer_id"
    | "stripe_subscription_id"
    | "stripe_price_id"
    | "membership_status"
    | "subscription_status"
    | "subscription_current_period_end"
    | "cancel_at_period_end"
    | "last_payment_failed_at"
    | "suspended_at"
  >
>;

export type WebhookClaimResult = "claimed" | "duplicate" | "in_progress";
