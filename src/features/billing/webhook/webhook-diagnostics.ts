import "server-only";

/** Fixed stage labels for Production-safe webhook failure diagnostics. */
export type StripeWebhookFailureStage =
  | "signature verification"
  | "webhook event insert"
  | "checkout.session.completed handling"
  | "breeder lookup"
  | "subscription update"
  | "billing status update";

type PostgrestErrorFields = {
  postgrestCode: string | null;
  postgrestDetails: string | null;
  postgrestHint: string | null;
};

function extractPostgrestErrorFields(error: unknown): PostgrestErrorFields {
  if (typeof error !== "object" || error === null) {
    return { postgrestCode: null, postgrestDetails: null, postgrestHint: null };
  }

  const candidate = error as Record<string, unknown>;
  if (typeof candidate.code !== "string" || typeof candidate.message !== "string") {
    return { postgrestCode: null, postgrestDetails: null, postgrestHint: null };
  }

  return {
    postgrestCode: candidate.code,
    postgrestDetails: typeof candidate.details === "string" ? candidate.details : null,
    postgrestHint: typeof candidate.hint === "string" ? candidate.hint : null,
  };
}

/** Temporary Production-safe diagnostics for Stripe webhook processing failures. */
export function logStripeWebhookProcessingFailure(
  stage: StripeWebhookFailureStage,
  error: unknown,
): void {
  const postgrest = extractPostgrestErrorFields(error);

  console.error("[webhooks/stripe] processing failed", {
    stage,
    errorName: error instanceof Error ? error.name : typeof error,
    errorMessage: error instanceof Error ? error.message : String(error),
    postgrestCode: postgrest.postgrestCode,
    postgrestDetails: postgrest.postgrestDetails,
    postgrestHint: postgrest.postgrestHint,
  });
}
