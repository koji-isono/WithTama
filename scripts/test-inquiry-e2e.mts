/**
 * Inquiry feature E2E integration test (Supabase RLS, no Service Role).
 *
 * Requires:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
 *   SEC_TEST_BREEDER_EMAIL
 *   SEC_TEST_BREEDER_PASSWORD
 *   SEC_TEST_BUYER_EMAIL
 *   SEC_TEST_BUYER_PASSWORD
 *
 * Optional:
 *   SEC_TEST_INQUIRY_PET_ID — published pet for new inquiry (auto-discovered if omitted)
 *
 * Usage:
 *   npm run test:inquiry-e2e
 */

import nextEnv from "@next/env";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { getInquiryMessageSenderLabel } from "../src/features/inquiries/format";

const { loadEnvConfig } = nextEnv;

loadEnvConfig(process.cwd());

type CheckStatus = "pass" | "fail" | "skip";

type Check = {
  name: string;
  status: CheckStatus;
  detail?: string;
};

const E2E_PREFIX = `[INQ-E2E ${Date.now()}]`;

function optionalEnv(name: string): string | null {
  const value = process.env[name]?.trim();
  return value || null;
}

function record(checks: Check[], name: string, status: CheckStatus, detail?: string): void {
  checks.push({ name, status, detail });
  const suffix = detail ? ` (${detail})` : "";
  const label = status === "pass" ? "PASS" : status === "fail" ? "FAIL" : "SKIP";
  console.log(`${label} ${name}${suffix}`);
}

function summarize(checks: Check[]): void {
  const passed = checks.filter((check) => check.status === "pass").length;
  const failed = checks.filter((check) => check.status === "fail").length;
  const skipped = checks.filter((check) => check.status === "skip").length;
  console.log("");
  console.log(`${passed} passed / ${failed} failed / ${skipped} skipped`);
}

function finish(checks: Check[]): void {
  summarize(checks);
  if (checks.some((check) => check.status === "fail")) {
    process.exitCode = 1;
  }
}

function createAuthClient(url: string, key: string): SupabaseClient {
  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

async function signIn(
  client: SupabaseClient,
  email: string,
  password: string,
): Promise<{ userId: string }> {
  const { data, error } = await client.auth.signInWithPassword({ email, password });

  if (error || !data.user) {
    throw new Error(error?.message ?? "sign in failed");
  }

  return { userId: data.user.id };
}

function mapMessagesForViewer(
  rows: Array<{ sender_type: string; message: string }>,
  viewerRole: "buyer" | "breeder",
  buyerDisplayName: string | null,
) {
  return rows.map((row) => ({
    senderLabel: getInquiryMessageSenderLabel(row.sender_type, {
      viewerRole,
      buyerDisplayName,
    }),
    senderType: row.sender_type,
    message: row.message,
    isOwnMessage:
      viewerRole === "buyer" ? row.sender_type === "buyer" : row.sender_type === "breeder",
  }));
}

async function runBreederFallbackE2E(
  checks: Check[],
  url: string,
  key: string,
  breederEmail: string,
  breederPassword: string,
): Promise<void> {
  const breederClient = createAuthClient(url, key);

  let userId: string;

  try {
    ({ userId } = await signIn(breederClient, breederEmail, breederPassword));
    record(checks, "F1. breeder sign in", "pass");
  } catch (error) {
    record(checks, "F1. breeder sign in", "fail", String(error));
    return;
  }

  const { data: breederRow } = await breederClient
    .from("breeders")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  if (!breederRow?.id) {
    record(checks, "F2. breeder profile", "fail", "not found");
    return;
  }

  record(checks, "F2. breeder profile", "pass");

  const { data: inquiry } = await breederClient
    .from("inquiries")
    .select("id, status")
    .eq("breeder_id", breederRow.id)
    .is("deleted_at", null)
    .order("last_message_at", { ascending: false, nullsFirst: false })
    .limit(1)
    .maybeSingle();

  if (!inquiry?.id) {
    record(checks, "F3. existing inquiry for fallback", "skip", "no inquiries");
    return;
  }

  record(checks, "F3. existing inquiry for fallback", "pass", inquiry.id as string);

  const { data: rpcName, error: rpcError } = await breederClient.rpc(
    "get_inquiry_buyer_display_name",
    { p_inquiry_id: inquiry.id },
  );

  if (rpcError) {
    record(checks, "F4. RPC display_name", "fail", rpcError.message);
    return;
  }

  const expectedBuyerLabel =
    typeof rpcName === "string" && rpcName.trim() ? rpcName.trim() : "購入希望者";

  record(checks, "F4. RPC display_name", "pass", expectedBuyerLabel);

  const { data: messages } = await breederClient
    .from("inquiry_messages")
    .select("sender_type, message")
    .eq("inquiry_id", inquiry.id)
    .order("created_at", { ascending: true });

  const mapped = mapMessagesForViewer(messages ?? [], "breeder", expectedBuyerLabel);
  const buyerLabelOk = mapped
    .filter((message) => message.senderType === "buyer")
    .every((message) => message.senderLabel === expectedBuyerLabel);

  record(
    checks,
    "F5. BR-12 buyer labels not あなた",
    buyerLabelOk && !mapped.some((m) => m.senderType === "buyer" && m.senderLabel === "あなた")
      ? "pass"
      : "fail",
    mapped.map((m) => `${m.senderType}:${m.senderLabel}`).join(" | "),
  );
}

async function main(): Promise<void> {
  const checks: Check[] = [];

  record(
    checks,
    "A1. buyer view labels",
    getInquiryMessageSenderLabel("buyer", { viewerRole: "buyer" }) === "あなた" &&
      getInquiryMessageSenderLabel("breeder", { viewerRole: "buyer" }) === "ブリーダー"
      ? "pass"
      : "fail",
  );
  record(
    checks,
    "A2. breeder view buyer label uses display_name",
    getInquiryMessageSenderLabel("buyer", {
      viewerRole: "breeder",
      buyerDisplayName: "テスト花子",
    }) === "テスト花子"
      ? "pass"
      : "fail",
  );
  record(
    checks,
    "A3. breeder view buyer label fallback",
    getInquiryMessageSenderLabel("buyer", { viewerRole: "breeder" }) === "購入希望者"
      ? "pass"
      : "fail",
  );

  const url = optionalEnv("NEXT_PUBLIC_SUPABASE_URL");
  const key = optionalEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  const buyerEmail = optionalEnv("SEC_TEST_BUYER_EMAIL");
  const buyerPassword = optionalEnv("SEC_TEST_BUYER_PASSWORD");
  const breederEmail = optionalEnv("SEC_TEST_BREEDER_EMAIL");
  const breederPassword = optionalEnv("SEC_TEST_BREEDER_PASSWORD");

  if (!url || !key || !breederEmail || !breederPassword) {
    record(
      checks,
      "B. DB E2E prerequisites",
      "skip",
      "Set NEXT_PUBLIC_SUPABASE_* and SEC_TEST_BREEDER credentials in .env.local",
    );
    finish(checks);
    return;
  }

  if (!buyerEmail || !buyerPassword) {
    record(
      checks,
      "B0. full buyer flow credentials",
      "skip",
      "SEC_TEST_BUYER_EMAIL/PASSWORD not set — running breeder fallback on existing inquiry",
    );
    await runBreederFallbackE2E(checks, url, key, breederEmail, breederPassword);
    finish(checks);
    return;
  }

  const buyerClient = createAuthClient(url, key);
  const breederClient = createAuthClient(url, key);

  let buyerUserId: string;
  let breederUserId: string;

  try {
    ({ userId: buyerUserId } = await signIn(buyerClient, buyerEmail, buyerPassword));
    record(checks, "B1. buyer sign in", "pass");
  } catch (error) {
    record(checks, "B1. buyer sign in", "fail", String(error));
    finish(checks);
    return;
  }

  try {
    ({ userId: breederUserId } = await signIn(breederClient, breederEmail, breederPassword));
    record(checks, "B2. breeder sign in", "pass");
  } catch (error) {
    record(checks, "B2. breeder sign in", "fail", String(error));
    finish(checks);
    return;
  }

  const { data: buyerRow, error: buyerRowError } = await buyerClient
    .from("buyers")
    .select("id, display_name, profile_completed")
    .eq("user_id", buyerUserId)
    .maybeSingle();

  if (buyerRowError || !buyerRow?.id) {
    record(checks, "B3. buyer profile exists", "fail", buyerRowError?.message ?? "not found");
    finish(checks);
    return;
  }

  record(checks, "B3. buyer profile exists", "pass");

  const { data: breederRow, error: breederRowError } = await breederClient
    .from("breeders")
    .select("id")
    .eq("user_id", breederUserId)
    .maybeSingle();

  if (breederRowError || !breederRow?.id) {
    record(checks, "B4. breeder profile exists", "fail", breederRowError?.message ?? "not found");
    finish(checks);
    return;
  }

  record(checks, "B4. breeder profile exists", "pass");

  let petId = optionalEnv("SEC_TEST_INQUIRY_PET_ID");

  if (!petId) {
    const { data: publishedPet } = await buyerClient
      .from("published_pets_public")
      .select("id, breeder_id")
      .eq("breeder_id", breederRow.id)
      .limit(1)
      .maybeSingle();

    petId = (publishedPet?.id as string | undefined) ?? null;

    if (!petId) {
      const { data: anyPublishedPet } = await buyerClient
        .from("published_pets_public")
        .select("id")
        .limit(1)
        .maybeSingle();

      petId = (anyPublishedPet?.id as string | undefined) ?? null;
    }
  }

  if (!petId) {
    record(checks, "B5. published pet for inquiry", "fail", "no published pet found");
    finish(checks);
    return;
  }

  record(checks, "B5. published pet for inquiry", "pass", petId);

  const initialMessage = `${E2E_PREFIX} initial message`;
  const additionalMessage = `${E2E_PREFIX} additional message`;
  const breederReplyMessage = `${E2E_PREFIX} breeder reply`;

  const { data: petContext } = await buyerClient
    .from("published_pet_detail_public")
    .select("breeder_id, public_display_name")
    .eq("id", petId)
    .maybeSingle();

  if (!petContext?.breeder_id) {
    record(checks, "B6. pet context", "fail", "breeder_id missing");
    finish(checks);
    return;
  }

  const subject = petContext.public_display_name
    ? `${petContext.public_display_name}についてのお問い合わせ`
    : "犬猫についてのお問い合わせ";

  const { data: createdInquiry, error: createInquiryError } = await buyerClient
    .from("inquiries")
    .insert({
      buyer_id: buyerRow.id,
      breeder_id: petContext.breeder_id,
      pet_id: petId,
      subject,
      status: "open",
    })
    .select("id, status")
    .single();

  if (createInquiryError || !createdInquiry) {
    record(checks, "B7. create inquiry", "fail", createInquiryError?.message ?? "insert failed");
    finish(checks);
    return;
  }

  const inquiryId = createdInquiry.id as string;
  record(checks, "B7. create inquiry", "pass", inquiryId);

  const { error: firstMessageError } = await buyerClient.from("inquiry_messages").insert({
    inquiry_id: inquiryId,
    sender_type: "buyer",
    sender_user_id: buyerUserId,
    message: initialMessage,
  });

  if (firstMessageError) {
    record(checks, "B8. buyer initial message", "fail", firstMessageError.message);
    finish(checks);
    return;
  }

  await buyerClient
    .from("inquiries")
    .update({ last_message_at: new Date().toISOString() })
    .eq("id", inquiryId);

  record(checks, "B8. buyer initial message", "pass");

  const { error: additionalMessageError } = await buyerClient.from("inquiry_messages").insert({
    inquiry_id: inquiryId,
    sender_type: "buyer",
    sender_user_id: buyerUserId,
    message: additionalMessage,
  });

  record(
    checks,
    "B9. buyer additional message",
    additionalMessageError ? "fail" : "pass",
    additionalMessageError?.message,
  );

  if (additionalMessageError) {
    finish(checks);
    return;
  }

  await buyerClient
    .from("inquiries")
    .update({ last_message_at: new Date().toISOString() })
    .eq("id", inquiryId);

  const { data: buyerRpcName, error: buyerRpcError } = await buyerClient.rpc(
    "get_inquiry_buyer_display_name",
    { p_inquiry_id: inquiryId },
  );

  record(
    checks,
    "B10. buyer RPC display_name (buyer session)",
    buyerRpcError ? "fail" : "pass",
    buyerRpcError?.message ?? String(buyerRpcName ?? "null"),
  );

  const { data: buyerMessages } = await buyerClient
    .from("inquiry_messages")
    .select("sender_type, message")
    .eq("inquiry_id", inquiryId)
    .order("created_at", { ascending: true });

  const buyerViewMessages = mapMessagesForViewer(buyerMessages ?? [], "buyer", null);
  const buyerOwnLabelsOk = buyerViewMessages
    .filter((message) => message.senderType === "buyer")
    .every((message) => message.senderLabel === "あなた");

  record(
    checks,
    "B11. BY-06 buyer message labels",
    buyerOwnLabelsOk ? "pass" : "fail",
    buyerViewMessages.map((message) => message.senderLabel).join(", "),
  );

  const { data: buyerList } = await buyerClient
    .from("inquiries")
    .select("id")
    .eq("buyer_id", buyerRow.id)
    .eq("id", inquiryId)
    .is("deleted_at", null)
    .maybeSingle();

  record(checks, "B12. buyer inquiry list contains inquiry", buyerList ? "pass" : "fail");

  const { data: breederRpcName, error: breederRpcError } = await breederClient.rpc(
    "get_inquiry_buyer_display_name",
    { p_inquiry_id: inquiryId },
  );

  if (breederRpcError) {
    record(
      checks,
      "B13. buyer RPC display_name (breeder session)",
      "fail",
      breederRpcError.message,
    );
    finish(checks);
    return;
  }

  const expectedBuyerLabel =
    typeof breederRpcName === "string" && breederRpcName.trim()
      ? breederRpcName.trim()
      : "購入希望者";

  record(checks, "B13. buyer RPC display_name (breeder session)", "pass", expectedBuyerLabel);

  const { data: breederMessagesBeforeReply } = await breederClient
    .from("inquiry_messages")
    .select("sender_type, message")
    .eq("inquiry_id", inquiryId)
    .order("created_at", { ascending: true });

  const breederViewBeforeReply = mapMessagesForViewer(
    breederMessagesBeforeReply ?? [],
    "breeder",
    expectedBuyerLabel,
  );

  const buyerLabelsBeforeReplyOk = breederViewBeforeReply
    .filter((message) => message.senderType === "buyer")
    .every((message) => message.senderLabel === expectedBuyerLabel);

  record(
    checks,
    "B14. BR-12 buyer message labels before reply",
    buyerLabelsBeforeReplyOk &&
      !breederViewBeforeReply.some(
        (message) => message.senderLabel === "あなた" && message.senderType === "buyer",
      )
      ? "pass"
      : "fail",
    breederViewBeforeReply
      .map((message) => `${message.senderType}:${message.senderLabel}`)
      .join(" | "),
  );

  const { error: breederReplyError } = await breederClient.from("inquiry_messages").insert({
    inquiry_id: inquiryId,
    sender_type: "breeder",
    sender_user_id: breederUserId,
    message: breederReplyMessage,
  });

  if (breederReplyError) {
    record(checks, "B15. breeder reply message", "fail", breederReplyError.message);
    finish(checks);
    return;
  }

  await breederClient
    .from("inquiries")
    .update({
      last_message_at: new Date().toISOString(),
      status: "replied",
    })
    .eq("id", inquiryId)
    .eq("status", "open");

  record(checks, "B15. breeder reply message", "pass");

  const { data: inquiryAfterReply } = await breederClient
    .from("inquiries")
    .select("status")
    .eq("id", inquiryId)
    .maybeSingle();

  record(
    checks,
    "B16. status updated to replied",
    inquiryAfterReply?.status === "replied" ? "pass" : "fail",
    String(inquiryAfterReply?.status ?? "null"),
  );

  const { data: breederList } = await breederClient
    .from("inquiries")
    .select("id, status")
    .eq("breeder_id", breederRow.id)
    .eq("id", inquiryId)
    .is("deleted_at", null)
    .maybeSingle();

  record(
    checks,
    "B17. breeder inquiry list contains inquiry",
    breederList ? "pass" : "fail",
    breederList?.status as string | undefined,
  );

  const { data: allMessages } = await buyerClient
    .from("inquiry_messages")
    .select("sender_type, message")
    .eq("inquiry_id", inquiryId)
    .order("created_at", { ascending: true });

  const hasInitial = (allMessages ?? []).some((row) => row.message === initialMessage);
  const hasAdditional = (allMessages ?? []).some((row) => row.message === additionalMessage);
  const hasReply = (allMessages ?? []).some((row) => row.message === breederReplyMessage);

  record(
    checks,
    "B18. message history contains all messages",
    hasInitial && hasAdditional && hasReply ? "pass" : "fail",
  );

  const buyerViewFinal = mapMessagesForViewer(allMessages ?? [], "buyer", null);
  record(
    checks,
    "B19. BY-06 breeder reply label",
    buyerViewFinal.some(
      (message) => message.senderType === "breeder" && message.senderLabel === "ブリーダー",
    )
      ? "pass"
      : "fail",
  );

  const breederViewFinal = mapMessagesForViewer(allMessages ?? [], "breeder", expectedBuyerLabel);
  record(
    checks,
    "B20. BR-12 breeder own reply label",
    breederViewFinal.some(
      (message) => message.senderType === "breeder" && message.senderLabel === "あなた",
    )
      ? "pass"
      : "fail",
  );

  finish(checks);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
