import { NextResponse } from "next/server";

import { STRIPE_WEBHOOK_PROCESSING_FAILED_MESSAGE } from "@/features/billing/webhook/constants";
import { handleStripeWebhookRequest } from "@/features/billing/webhook/handle-stripe-webhook-request";

export async function POST(request: Request) {
  const signature = request.headers.get("stripe-signature");
  const rawBody = await request.text();

  try {
    const result = await handleStripeWebhookRequest(rawBody, signature);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: result.httpStatus });
    }

    return NextResponse.json({ received: true });
  } catch {
    return NextResponse.json({ error: STRIPE_WEBHOOK_PROCESSING_FAILED_MESSAGE }, { status: 500 });
  }
}
