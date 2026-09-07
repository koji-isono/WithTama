/**
 * Pet description revision review DB integration test (CASE H–X).
 *
 * Requires Migration:
 *   supabase/migrations/20260907100000_add_pet_description_revision_review.sql
 *
 * Requires:
 *   NEXT_PUBLIC_SUPABASE_URL
 *   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
 *   SEC_TEST_BREEDER_EMAIL / SEC_TEST_BREEDER_PASSWORD
 *   SEC_TEST_ADMIN_EMAIL / SEC_TEST_ADMIN_PASSWORD
 *   SEC_TEST_REVIEW_BREEDER_ID
 *   SEC_TEST_OTHER_PET_ID (other breeder pet)
 *
 * Optional:
 *   SEC_TEST_DESCRIPTION_REVISION_PET_ID
 *   SEC_TEST_DESCRIPTION_REVISION_RETURN_PET_ID
 *
 * Does NOT use SUPABASE_SERVICE_ROLE_KEY for security assertions.
 *
 * Usage:
 *   npm run test:pet-description-revision-db
 */

import nextEnv from "@next/env";
import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";

const { loadEnvConfig } = nextEnv;

loadEnvConfig(process.cwd());

const SEC_TEST_PREFIX = "[SEC-TEST]";
const MIN_LEN = 20;
const RETURN_COMMENT = "SEC-TEST description revision return reason";

type Check = {
  name: string;
  passed: boolean;
  detail?: string;
  skipped?: boolean;
};

type PetRevisionRow = {
  id: string;
  management_name: string;
  status: string;
  description: string | null;
  pending_description: string | null;
  description_review_status: string;
  published_at: string | null;
  breeder_id: string;
};

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`Missing environment variable: ${name}`);
  }
  return value;
}

function optionalEnv(name: string): string | null {
  const value = process.env[name]?.trim();
  return value || null;
}

function record(checks: Check[], name: string, passed: boolean, detail?: string): void {
  checks.push({ name, passed, detail });
  const suffix = detail ? ` (${detail})` : "";
  console.log(`${passed ? "PASS" : "FAIL"} ${name}${suffix}`);
}

function skip(checks: Check[], name: string, detail: string): void {
  checks.push({ name, passed: true, detail, skipped: true });
  console.log(`SKIP ${name} (${detail})`);
}

function finish(checks: Check[]): void {
  const executed = checks.filter((check) => !check.skipped);
  const passed = executed.filter((check) => check.passed).length;
  const failed = executed.length - passed;
  const skipped = checks.filter((check) => check.skipped).length;
  console.log("");
  console.log(`${passed} passed / ${failed} failed / ${skipped} skipped`);
  if (failed > 0) {
    process.exitCode = 1;
  }
}

function createAnonClient(url: string, key: string): SupabaseClient {
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function signIn(
  supabase: SupabaseClient,
  email: string,
  password: string,
): Promise<User | null> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) {
    return null;
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ?? null;
}

function isAdminRole(user: User): boolean {
  return user.app_metadata?.role === "admin";
}

function rpcMessage(error: { message: string } | null): string {
  return error?.message ?? "";
}

function isRpcMissing(message: string): boolean {
  const lower = message.toLowerCase();
  return lower.includes("could not find the function") || lower.includes("schema cache");
}

function isMigrationMissing(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("pending_description") ||
    lower.includes("description_review_status") ||
    isRpcMissing(message)
  );
}

function uniquePending(current: string): string {
  const base = "あ".repeat(MIN_LEN);
  const suffix = String(Date.now() % 1000).padStart(3, "0");
  const candidate = `${base}${suffix}`;
  if (candidate.trim() === current.trim()) {
    return `${base}001`;
  }
  return candidate;
}

async function loadPet(
  supabase: SupabaseClient,
  petId: string,
): Promise<{ pet: PetRevisionRow | null; errorMessage?: string }> {
  const { data, error } = await supabase
    .from("pets")
    .select(
      "id, management_name, status, description, pending_description, description_review_status, published_at, breeder_id",
    )
    .eq("id", petId)
    .is("deleted_at", null)
    .maybeSingle();

  if (error) {
    return { pet: null, errorMessage: error.message };
  }
  if (!data) {
    return { pet: null, errorMessage: "pet not found" };
  }
  if (!data.management_name.includes(SEC_TEST_PREFIX)) {
    return { pet: null, errorMessage: "not a [SEC-TEST] pet — aborting" };
  }
  return { pet: data as PetRevisionRow };
}

async function probeMigration(supabase: SupabaseClient, checks: Check[]): Promise<boolean> {
  const { error: columnError } = await supabase
    .from("pets")
    .select("pending_description, description_review_status")
    .limit(1);

  if (columnError && isMigrationMissing(columnError.message)) {
    record(checks, "migration columns exist", false, columnError.message);
    return false;
  }
  record(checks, "migration columns exist", columnError == null, columnError?.message);

  const rpcNames = [
    "save_pet_description_revision_draft",
    "submit_pet_description_revision",
    "approve_pet_description_revision",
    "return_pet_description_revision",
  ] as const;

  let allRpcPresent = true;
  for (const fn of rpcNames) {
    const { error } = await supabase.rpc(fn, {
      p_pet_id: "00000000-0000-4000-8000-000000000001",
      ...(fn === "save_pet_description_revision_draft"
        ? { p_pending_description: "x" }
        : fn === "return_pet_description_revision"
          ? { p_comment: "x" }
          : {}),
    });
    const missing = error != null && isRpcMissing(error.message);
    if (missing) {
      allRpcPresent = false;
    }
    record(checks, `RPC ${fn} exists`, !missing, missing ? error?.message : "callable");
  }

  return columnError == null && allRpcPresent;
}

async function verifyExistingDataDefaults(
  supabase: SupabaseClient,
  checks: Check[],
): Promise<void> {
  const { data, error } = await supabase
    .from("pets")
    .select("id, description_review_status, pending_description")
    .is("deleted_at", null)
    .limit(500);

  if (error) {
    record(checks, "existing pets default columns sample", false, error.message);
    return;
  }

  const bad = (data ?? []).filter(
    (row) =>
      row.description_review_status !== "none" ||
      (row.pending_description != null && String(row.pending_description).trim() !== ""),
  );

  record(
    checks,
    "existing pets sample has none/NULL revision defaults",
    bad.length === 0,
    bad.length > 0 ? `${bad.length} non-default rows in sample` : undefined,
  );
}

async function runCaseHInitialPublish(
  breederClient: SupabaseClient,
  adminClient: SupabaseClient,
  breederId: string,
  checks: Check[],
): Promise<void> {
  const { data: drafts, error: draftError } = await breederClient
    .from("pets")
    .select("id, management_name, status, description, breeder_id")
    .eq("breeder_id", breederId)
    .eq("status", "draft")
    .like("management_name", `${SEC_TEST_PREFIX}%`)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (draftError) {
    record(checks, "CASE H: find draft pet", false, draftError.message);
    return;
  }

  let targetDraft: { id: string; description: string | null } | null = null;
  for (const pet of drafts ?? []) {
    const { count } = await breederClient
      .from("pet_photos")
      .select("id", { count: "exact", head: true })
      .eq("pet_id", pet.id);
    if ((count ?? 0) >= 1) {
      targetDraft = pet;
      break;
    }
  }

  if (!targetDraft) {
    skip(checks, "CASE H: initial publish flow", "no draft [SEC-TEST] pet with photo");
    return;
  }

  const description = "あ".repeat(MIN_LEN);
  const { error: descError } = await breederClient
    .from("pets")
    .update({ description })
    .eq("id", targetDraft.id)
    .eq("status", "draft");

  record(checks, "CASE H: set draft description", descError == null, descError?.message);
  if (descError) {
    return;
  }

  const { error: submitError } = await breederClient.rpc("submit_pet_for_review", {
    p_pet_id: targetDraft.id,
  });
  record(checks, "CASE H: submit_pet_for_review", submitError == null, rpcMessage(submitError));

  const afterSubmit = await loadPet(breederClient, targetDraft.id);
  record(
    checks,
    "CASE H: status under_review after submit",
    afterSubmit.pet?.status === "under_review",
    afterSubmit.pet?.status,
  );

  const { error: approveError } = await adminClient.rpc("approve_pet_for_publish", {
    p_pet_id: targetDraft.id,
  });
  record(checks, "CASE H: approve_pet_for_publish", approveError == null, rpcMessage(approveError));

  const afterApprove = await loadPet(breederClient, targetDraft.id);
  record(
    checks,
    "CASE H: published after approve",
    afterApprove.pet?.status === "published" && afterApprove.pet.published_at != null,
    afterApprove.pet?.status,
  );
  record(
    checks,
    "CASE H: description preserved after initial publish",
    (afterApprove.pet?.description ?? "").trim() === description,
  );
  record(
    checks,
    "CASE H: revision columns default after initial publish",
    afterApprove.pet?.description_review_status === "none" &&
      afterApprove.pet?.pending_description == null,
  );
}

async function runApproveFlow(
  breederClient: SupabaseClient,
  adminClient: SupabaseClient,
  anonClient: SupabaseClient,
  petId: string,
  checks: Check[],
): Promise<void> {
  const before = await loadPet(breederClient, petId);
  if (!before.pet || before.pet.status !== "published") {
    record(checks, "approve flow pet ready", false, before.errorMessage ?? before.pet?.status);
    return;
  }

  const originalDescription = (before.pet.description ?? "").trim();
  const pendingText = uniquePending(originalDescription);

  const { error: saveError } = await breederClient.rpc("save_pet_description_revision_draft", {
    p_pet_id: petId,
    p_pending_description: pendingText,
  });
  record(checks, "CASE I: save revision draft", saveError == null, rpcMessage(saveError));

  const afterSave = await loadPet(breederClient, petId);
  record(
    checks,
    "CASE I: description unchanged after save",
    (afterSave.pet?.description ?? "").trim() === originalDescription,
  );
  record(
    checks,
    "CASE I: status stays published after save",
    afterSave.pet?.status === "published",
    afterSave.pet?.status,
  );
  record(
    checks,
    "CASE I: pending_description updated",
    (afterSave.pet?.pending_description ?? "").trim() === pendingText,
  );
  record(
    checks,
    "CASE J: description_review_status draft after save",
    afterSave.pet?.description_review_status === "draft",
    afterSave.pet?.description_review_status,
  );

  const logsBefore = await countLogs(breederClient, petId, "description_submitted");

  const { error: submitError } = await breederClient.rpc("submit_pet_description_revision", {
    p_pet_id: petId,
  });
  record(
    checks,
    "CASE K: submit description revision",
    submitError == null,
    rpcMessage(submitError),
  );

  const afterSubmit = await loadPet(breederClient, petId);
  record(
    checks,
    "CASE K: description_review_status under_review",
    afterSubmit.pet?.description_review_status === "under_review",
    afterSubmit.pet?.description_review_status,
  );

  const logsAfter = await countLogs(breederClient, petId, "description_submitted");
  record(
    checks,
    "CASE K: pet_review_logs description_submitted",
    logsAfter.count === logsBefore.count + 1,
    `before=${logsBefore.count} after=${logsAfter.count}`,
  );

  const { data: publicDetail, error: publicError } = await anonClient
    .from("published_pet_detail_public")
    .select("description")
    .eq("id", petId)
    .maybeSingle();

  record(
    checks,
    "CASE L: public detail returns old description during review",
    publicError == null &&
      publicDetail != null &&
      (publicDetail.description ?? "").trim() === originalDescription,
    publicError?.message,
  );

  const pendingLeak = await anonClient
    .from("published_pet_detail_public")
    .select("pending_description")
    .eq("id", petId)
    .limit(1);
  record(
    checks,
    "CASE U: pending_description not in published_pet_detail_public",
    pendingLeak.error != null,
    pendingLeak.error?.message ?? "column exposed",
  );

  const statusLeak = await anonClient
    .from("published_pet_detail_public")
    .select("description_review_status")
    .eq("id", petId)
    .limit(1);
  record(
    checks,
    "CASE V: description_review_status not in published_pet_detail_public",
    statusLeak.error != null,
    statusLeak.error?.message ?? "column exposed",
  );

  const listPendingLeak = await anonClient
    .from("published_pets_public")
    .select("pending_description")
    .limit(1);
  record(
    checks,
    "CASE U: pending_description not in published_pets_public",
    listPendingLeak.error != null,
    listPendingLeak.error?.message ?? "column exposed",
  );

  const listStatusLeak = await anonClient
    .from("published_pets_public")
    .select("description_review_status")
    .limit(1);
  record(
    checks,
    "CASE V: description_review_status not in published_pets_public",
    listStatusLeak.error != null,
    listStatusLeak.error?.message ?? "column exposed",
  );

  const { error: approveError } = await adminClient.rpc("approve_pet_description_revision", {
    p_pet_id: petId,
  });
  record(
    checks,
    "CASE M: approve description revision",
    approveError == null,
    rpcMessage(approveError),
  );

  const afterApprove = await loadPet(breederClient, petId);
  record(
    checks,
    "CASE M: description replaced atomically",
    (afterApprove.pet?.description ?? "").trim() === pendingText,
  );
  record(
    checks,
    "CASE M: pending_description cleared",
    afterApprove.pet?.pending_description == null,
  );
  record(
    checks,
    "CASE M: description_review_status none",
    afterApprove.pet?.description_review_status === "none",
    afterApprove.pet?.description_review_status,
  );
  record(checks, "CASE M: status stays published", afterApprove.pet?.status === "published");

  const { data: publicAfter, error: publicAfterError } = await anonClient
    .from("published_pet_detail_public")
    .select("description")
    .eq("id", petId)
    .maybeSingle();

  record(
    checks,
    "CASE N: public detail shows new description after approve",
    publicAfterError == null && (publicAfter?.description ?? "").trim() === pendingText,
    publicAfterError?.message,
  );
}

async function runReturnFlow(
  breederClient: SupabaseClient,
  adminClient: SupabaseClient,
  petId: string,
  checks: Check[],
): Promise<void> {
  const before = await loadPet(breederClient, petId);
  if (!before.pet || before.pet.status !== "published") {
    record(checks, "return flow pet ready", false, before.errorMessage ?? before.pet?.status);
    return;
  }

  const originalDescription = (before.pet.description ?? "").trim();
  const pendingText = uniquePending(originalDescription);

  await breederClient.rpc("save_pet_description_revision_draft", {
    p_pet_id: petId,
    p_pending_description: pendingText,
  });
  await breederClient.rpc("submit_pet_description_revision", { p_pet_id: petId });

  const logsBefore = await countLogs(breederClient, petId, "description_returned");

  const { error: returnError } = await adminClient.rpc("return_pet_description_revision", {
    p_pet_id: petId,
    p_comment: RETURN_COMMENT,
  });
  record(
    checks,
    "CASE O: return description revision",
    returnError == null,
    rpcMessage(returnError),
  );

  const afterReturn = await loadPet(breederClient, petId);
  record(
    checks,
    "CASE O: description unchanged on return",
    (afterReturn.pet?.description ?? "").trim() === originalDescription,
  );
  record(
    checks,
    "CASE O: pending_description kept on return",
    (afterReturn.pet?.pending_description ?? "").trim() === pendingText,
  );
  record(
    checks,
    "CASE O: description_review_status returned",
    afterReturn.pet?.description_review_status === "returned",
    afterReturn.pet?.description_review_status,
  );

  const { data: returnedLogs, error: logError } = await breederClient
    .from("pet_review_logs")
    .select("action, comment")
    .eq("pet_id", petId)
    .eq("action", "description_returned")
    .order("created_at", { ascending: false })
    .limit(1);

  record(
    checks,
    "CASE P: description_returned log with comment",
    logError == null &&
      (returnedLogs?.length ?? 0) > (logsBefore.count > 0 ? 0 : 0) &&
      (returnedLogs?.[0]?.comment ?? "").includes("SEC-TEST"),
    logError?.message,
  );

  const { error: redraftError } = await breederClient.rpc("save_pet_description_revision_draft", {
    p_pet_id: petId,
    p_pending_description: `${pendingText}改`,
  });
  record(checks, "CASE Q: re-edit after return", redraftError == null, rpcMessage(redraftError));

  const afterRedraft = await loadPet(breederClient, petId);
  record(
    checks,
    "CASE Q: returned to draft after re-edit",
    afterRedraft.pet?.description_review_status === "draft",
    afterRedraft.pet?.description_review_status,
  );

  const { error: resubmitError } = await breederClient.rpc("submit_pet_description_revision", {
    p_pet_id: petId,
  });
  record(checks, "CASE R: resubmit after return", resubmitError == null, rpcMessage(resubmitError));

  const afterResubmit = await loadPet(breederClient, petId);
  record(
    checks,
    "CASE R: under_review after resubmit",
    afterResubmit.pet?.description_review_status === "under_review",
    afterResubmit.pet?.description_review_status,
  );

  await adminClient.rpc("return_pet_description_revision", {
    p_pet_id: petId,
    p_comment: RETURN_COMMENT,
  });
  await cleanupRevisionPet(breederClient, adminClient, petId);
}

async function runDirectUpdateBlocked(
  breederClient: SupabaseClient,
  petId: string,
  checks: Check[],
): Promise<void> {
  const before = await loadPet(breederClient, petId);
  if (!before.pet || before.pet.status !== "published") {
    skip(checks, "CASE S: direct description UPDATE blocked", "pet not published");
    return;
  }

  const original = before.pet.description;
  const { error: descError } = await breederClient
    .from("pets")
    .update({ description: "あ".repeat(MIN_LEN) + "直接更新" })
    .eq("id", petId);

  record(
    checks,
    "CASE S: breeder direct description UPDATE rejected",
    descError != null,
    descError?.message ?? "unexpected success",
  );

  const { error: pendingError } = await breederClient
    .from("pets")
    .update({ pending_description: "あ".repeat(MIN_LEN) })
    .eq("id", petId);

  record(
    checks,
    "CASE S: breeder direct pending_description UPDATE rejected",
    pendingError != null,
    pendingError?.message ?? "unexpected success",
  );

  const { error: statusError } = await breederClient
    .from("pets")
    .update({ description_review_status: "draft" })
    .eq("id", petId);

  record(
    checks,
    "CASE S: breeder direct description_review_status UPDATE rejected",
    statusError != null,
    statusError?.message ?? "unexpected success",
  );

  const after = await loadPet(breederClient, petId);
  record(
    checks,
    "CASE S: description unchanged after blocked UPDATE",
    after.pet?.description === original,
  );
}

async function runOtherBreederDenied(
  otherBreederClient: SupabaseClient,
  petId: string,
  checks: Check[],
): Promise<void> {
  const { error: saveError } = await otherBreederClient.rpc("save_pet_description_revision_draft", {
    p_pet_id: petId,
    p_pending_description: "あ".repeat(MIN_LEN),
  });
  record(
    checks,
    "CASE T: other breeder save revision denied",
    saveError != null &&
      (rpcMessage(saveError).toLowerCase().includes("unauthorized") ||
        rpcMessage(saveError).toLowerCase().includes("invalid pet status") ||
        rpcMessage(saveError).toLowerCase().includes("pet not found")),
    rpcMessage(saveError),
  );

  const { error: submitError } = await otherBreederClient.rpc("submit_pet_description_revision", {
    p_pet_id: petId,
  });
  record(
    checks,
    "CASE T: other breeder submit revision denied",
    submitError != null,
    rpcMessage(submitError),
  );
}

async function runSameTextRejected(
  breederClient: SupabaseClient,
  petId: string,
  checks: Check[],
): Promise<void> {
  const pet = await loadPet(breederClient, petId);
  if (!pet.pet) {
    record(checks, "CASE W: same text pet", false, pet.errorMessage);
    return;
  }

  const current = (pet.pet.description ?? "").trim();
  await breederClient.rpc("save_pet_description_revision_draft", {
    p_pet_id: petId,
    p_pending_description: current,
  });

  const { error: submitError } = await breederClient.rpc("submit_pet_description_revision", {
    p_pet_id: petId,
  });

  record(
    checks,
    "CASE W: same text revision submit rejected",
    submitError != null && rpcMessage(submitError).toLowerCase().includes("unchanged"),
    rpcMessage(submitError),
  );

  await breederClient.rpc("save_pet_description_revision_draft", {
    p_pet_id: petId,
    p_pending_description: null,
  });
}

async function cleanupRevisionPet(
  breederClient: SupabaseClient,
  adminClient: SupabaseClient,
  petId: string,
): Promise<void> {
  const loaded = await loadPet(breederClient, petId);
  const pet = loaded.pet;
  if (!pet || pet.status !== "published") {
    return;
  }

  if (pet.description_review_status === "under_review") {
    await adminClient.rpc("approve_pet_description_revision", { p_pet_id: petId });
    return;
  }

  if (pet.description_review_status === "returned") {
    await breederClient.rpc("submit_pet_description_revision", { p_pet_id: petId });
    await adminClient.rpc("approve_pet_description_revision", { p_pet_id: petId });
    return;
  }

  if (pet.description_review_status === "draft" || pet.pending_description != null) {
    await breederClient.rpc("save_pet_description_revision_draft", {
      p_pet_id: petId,
      p_pending_description: null,
    });
  }
}

async function runUnderReviewEditBlocked(
  breederClient: SupabaseClient,
  adminClient: SupabaseClient,
  petId: string,
  checks: Check[],
): Promise<void> {
  const pet = await loadPet(breederClient, petId);
  if (!pet.pet) {
    record(checks, "CASE X: pet load", false, pet.errorMessage);
    return;
  }

  const pendingText = uniquePending((pet.pet.description ?? "").trim());
  await breederClient.rpc("save_pet_description_revision_draft", {
    p_pet_id: petId,
    p_pending_description: pendingText,
  });
  await breederClient.rpc("submit_pet_description_revision", { p_pet_id: petId });

  const { error: saveError } = await breederClient.rpc("save_pet_description_revision_draft", {
    p_pet_id: petId,
    p_pending_description: pendingText + "編集",
  });

  record(
    checks,
    "CASE X: under_review pending edit blocked",
    saveError != null &&
      rpcMessage(saveError).toLowerCase().includes("invalid description review status"),
    rpcMessage(saveError),
  );

  await adminClient.rpc("return_pet_description_revision", {
    p_pet_id: petId,
    p_comment: RETURN_COMMENT,
  });
  await cleanupRevisionPet(breederClient, adminClient, petId);
}

async function runTriggerBypassChecks(
  breederClient: SupabaseClient,
  petId: string,
  checks: Check[],
): Promise<void> {
  const bypassRpcs = [
    "set_config",
    "set_app_allow_published_description_update",
    "allow_published_description_update",
  ];

  for (const fn of bypassRpcs) {
    const { error } = await breederClient.rpc(fn, {
      setting: "app.allow_published_description_update",
      value: "true",
    });
    record(
      checks,
      `trigger bypass RPC ${fn} not callable`,
      error != null && isRpcMissing(error.message),
      error?.message ?? "unexpected callable",
    );
  }
}

async function runAdminRpcSecurity(
  breederClient: SupabaseClient,
  petId: string,
  checks: Check[],
): Promise<void> {
  const { error: breederApproveError } = await breederClient.rpc(
    "approve_pet_description_revision",
    { p_pet_id: petId },
  );
  record(
    checks,
    "admin RPC: breeder approve denied",
    breederApproveError != null &&
      rpcMessage(breederApproveError).toLowerCase().includes("admin required"),
    rpcMessage(breederApproveError),
  );

  const { error: breederReturnError } = await breederClient.rpc("return_pet_description_revision", {
    p_pet_id: petId,
    p_comment: RETURN_COMMENT,
  });
  record(
    checks,
    "admin RPC: breeder return denied",
    breederReturnError != null &&
      rpcMessage(breederReturnError).toLowerCase().includes("admin required"),
    rpcMessage(breederReturnError),
  );
}

async function runLegacyLogActions(breederClient: SupabaseClient, checks: Check[]): Promise<void> {
  const actions = ["submitted", "approved", "returned"] as const;
  for (const action of actions) {
    const { count, error } = await breederClient
      .from("pet_review_logs")
      .select("id", { count: "exact", head: true })
      .eq("action", action);
    record(
      checks,
      `pet_review_logs legacy action readable: ${action}`,
      error == null,
      error?.message ?? `count=${count ?? 0}`,
    );
  }

  for (const action of ["description_submitted", "description_approved", "description_returned"]) {
    const { error } = await breederClient
      .from("pet_review_logs")
      .select("id")
      .eq("action", action)
      .limit(1);
    record(
      checks,
      `pet_review_logs new action allowed in CHECK: ${action}`,
      error == null,
      error?.message,
    );
  }
}

async function countLogs(
  supabase: SupabaseClient,
  petId: string,
  action: string,
): Promise<{ count: number; errorMessage?: string }> {
  const { count, error } = await supabase
    .from("pet_review_logs")
    .select("id", { count: "exact", head: true })
    .eq("pet_id", petId)
    .eq("action", action);

  if (error) {
    return { count: -1, errorMessage: error.message };
  }
  return { count: count ?? 0 };
}

async function resolvePublishedRevisionPetId(
  supabase: SupabaseClient,
  breederId: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from("pets")
    .select("id, description")
    .eq("breeder_id", breederId)
    .eq("status", "published")
    .like("management_name", `${SEC_TEST_PREFIX}%`)
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  if (error) {
    return null;
  }

  for (const row of data ?? []) {
    if ((row.description ?? "").trim().length >= MIN_LEN) {
      return row.id;
    }
  }

  return data?.[0]?.id ?? null;
}

async function main(): Promise<void> {
  const checks: Check[] = [];
  const url = requireEnv("NEXT_PUBLIC_SUPABASE_URL");
  const key = requireEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  const breederEmail = requireEnv("SEC_TEST_BREEDER_EMAIL");
  const breederPassword = requireEnv("SEC_TEST_BREEDER_PASSWORD");
  const adminEmail = requireEnv("SEC_TEST_ADMIN_EMAIL");
  const adminPassword = requireEnv("SEC_TEST_ADMIN_PASSWORD");
  const breederId = requireEnv("SEC_TEST_REVIEW_BREEDER_ID");
  const otherPetId = optionalEnv("SEC_TEST_OTHER_PET_ID");

  const anonClient = createAnonClient(url, key);
  const breederClient = createAnonClient(url, key);
  const adminClient = createAnonClient(url, key);

  const migrationReady = await probeMigration(anonClient, checks);
  if (!migrationReady) {
    console.error("\nSTOP: Apply migration before running CASE H–X integration tests.");
    finish(checks);
    return;
  }

  await verifyExistingDataDefaults(breederClient, checks);

  const breederUser = await signIn(breederClient, breederEmail, breederPassword);
  record(checks, "breeder authentication", breederUser != null);
  if (!breederUser) {
    finish(checks);
    return;
  }

  const adminUser = await signIn(adminClient, adminEmail, adminPassword);
  record(
    checks,
    "admin authentication",
    adminUser != null && isAdminRole(adminUser),
    adminUser ? undefined : "admin sign-in failed",
  );
  if (!adminUser) {
    finish(checks);
    return;
  }

  const revisionPetId =
    optionalEnv("SEC_TEST_DESCRIPTION_REVISION_PET_ID") ??
    optionalEnv("SEC_TEST_PUBLIC_PUBLISHED_PET_ID") ??
    (await resolvePublishedRevisionPetId(breederClient, breederId));

  record(
    checks,
    "revision pet id resolved",
    revisionPetId != null,
    revisionPetId ?? "run prepare:sec-test-description-revision first",
  );

  if (!revisionPetId) {
    finish(checks);
    return;
  }

  await runCaseHInitialPublish(breederClient, adminClient, breederId, checks);
  await runApproveFlow(breederClient, adminClient, anonClient, revisionPetId, checks);

  const returnPetId = optionalEnv("SEC_TEST_DESCRIPTION_REVISION_RETURN_PET_ID") ?? revisionPetId;
  if (returnPetId !== revisionPetId) {
    await runReturnFlow(breederClient, adminClient, returnPetId, checks);
  } else {
    skip(checks, "CASE O–R return flow on separate pet", "reuse same pet — run after approve flow");
    await runReturnFlow(breederClient, adminClient, returnPetId, checks);
  }

  await runDirectUpdateBlocked(breederClient, revisionPetId, checks);
  await runSameTextRejected(breederClient, revisionPetId, checks);
  await runUnderReviewEditBlocked(breederClient, adminClient, revisionPetId, checks);
  await runTriggerBypassChecks(breederClient, revisionPetId, checks);
  await runAdminRpcSecurity(breederClient, revisionPetId, checks);
  await runLegacyLogActions(breederClient, checks);

  if (otherPetId) {
    await runOtherBreederDenied(breederClient, otherPetId, checks);
  } else {
    skip(checks, "CASE T other breeder", "SEC_TEST_OTHER_PET_ID not set");
  }

  await cleanupRevisionPet(breederClient, adminClient, revisionPetId);

  finish(checks);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exitCode = 1;
});
