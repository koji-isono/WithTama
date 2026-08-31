import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { createAdminClient } from "@/lib/supabase/admin";

import type { BreederWebhookRow, BreederWebhookUpdate, WebhookClaimResult } from "./types";

const breederWebhookSelect =
  "id, stripe_customer_id, stripe_subscription_id, stripe_price_id, membership_status, subscription_status, subscription_current_period_end, cancel_at_period_end, last_payment_failed_at, suspended_at";

type WebhookEventTimestamps = {
  created_at: string;
  processed_at: string;
};

function getAdminClient(): SupabaseClient {
  return createAdminClient();
}

/** Finalize sets processed_at strictly after created_at; equal timestamps mean handler not finished. */
export function isWebhookEventFinalized(row: WebhookEventTimestamps): boolean {
  return new Date(row.processed_at).getTime() > new Date(row.created_at).getTime();
}

async function fetchWebhookEventTimestamps(
  stripeEventId: string,
  client: SupabaseClient,
): Promise<WebhookEventTimestamps | null> {
  const { data, error } = await client
    .from("stripe_webhook_events")
    .select("created_at, processed_at")
    .eq("stripe_event_id", stripeEventId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as WebhookEventTimestamps;
}

async function classifyExistingWebhookEvent(
  stripeEventId: string,
  client: SupabaseClient,
): Promise<"duplicate" | "in_progress" | "released"> {
  const row = await fetchWebhookEventTimestamps(stripeEventId, client);
  if (!row) {
    return "released";
  }

  return isWebhookEventFinalized(row) ? "duplicate" : "in_progress";
}

async function insertWebhookClaim(
  stripeEventId: string,
  eventType: string,
  client: SupabaseClient,
): Promise<"inserted" | "conflict"> {
  const { error } = await client.from("stripe_webhook_events").insert({
    stripe_event_id: stripeEventId,
    event_type: eventType,
  });

  if (error?.code === "23505") {
    return "conflict";
  }

  if (error) {
    throw error;
  }

  return "inserted";
}

export async function claimWebhookEvent(
  stripeEventId: string,
  eventType: string,
  client: SupabaseClient = getAdminClient(),
): Promise<WebhookClaimResult> {
  const firstAttempt = await insertWebhookClaim(stripeEventId, eventType, client);
  if (firstAttempt === "inserted") {
    return "claimed";
  }

  let classification = await classifyExistingWebhookEvent(stripeEventId, client);
  if (classification === "released") {
    const retryAttempt = await insertWebhookClaim(stripeEventId, eventType, client);
    if (retryAttempt === "inserted") {
      return "claimed";
    }
    classification = await classifyExistingWebhookEvent(stripeEventId, client);
  }

  if (classification === "released") {
    throw new Error("Webhook claim conflict could not be resolved");
  }

  return classification;
}

/** Removes claim so Stripe can retry after handler failure. */
export async function releaseWebhookEventClaim(
  stripeEventId: string,
  client: SupabaseClient = getAdminClient(),
): Promise<void> {
  const { error } = await client
    .from("stripe_webhook_events")
    .delete()
    .eq("stripe_event_id", stripeEventId);

  if (error) {
    throw error;
  }
}

/** Sets processed_at to handler completion time (success path only). */
export async function finalizeWebhookEvent(
  stripeEventId: string,
  client: SupabaseClient = getAdminClient(),
): Promise<void> {
  const { error } = await client
    .from("stripe_webhook_events")
    .update({ processed_at: new Date().toISOString() })
    .eq("stripe_event_id", stripeEventId);

  if (error) {
    throw error;
  }
}

export async function getBreederWebhookRowById(
  breederId: string,
  client: SupabaseClient = getAdminClient(),
): Promise<BreederWebhookRow | null> {
  const { data, error } = await client
    .from("breeders")
    .select(breederWebhookSelect)
    .eq("id", breederId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as BreederWebhookRow;
}

export async function getBreederWebhookRowBySubscriptionId(
  stripeSubscriptionId: string,
  client: SupabaseClient = getAdminClient(),
): Promise<BreederWebhookRow | null> {
  const { data, error } = await client
    .from("breeders")
    .select(breederWebhookSelect)
    .eq("stripe_subscription_id", stripeSubscriptionId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as BreederWebhookRow;
}

export async function getBreederWebhookRowByCustomerId(
  stripeCustomerId: string,
  client: SupabaseClient = getAdminClient(),
): Promise<BreederWebhookRow | null> {
  const { data, error } = await client
    .from("breeders")
    .select(breederWebhookSelect)
    .eq("stripe_customer_id", stripeCustomerId)
    .maybeSingle();

  if (error || !data) {
    return null;
  }

  return data as BreederWebhookRow;
}

export async function updateBreederWebhookFields(
  breederId: string,
  fields: BreederWebhookUpdate,
  client: SupabaseClient = getAdminClient(),
): Promise<void> {
  const { error } = await client.from("breeders").update(fields).eq("id", breederId);

  if (error) {
    throw error;
  }
}
