/**
 * BY-01 buyer profile validation / payload tests (no DB).
 *
 * Usage:
 *   npm run test:buyer-profile-validation
 */

import { BUYER_PROFILE_TEXT_MAX_LENGTH } from "../src/features/buyers/constants";
import { parseBuyerProfileInputFromRecord } from "../src/features/buyers/form-data";
import { isBuyerProfileComplete } from "../src/features/buyers/profile-completion";
import {
  BUYER_PROFILE_UPDATABLE_COLUMNS,
  buildUpdateBuyerProfileData,
  hasValidationErrors,
  normalizeBuyerProfileInput,
  validateBuyerProfile,
} from "../src/features/buyers/validation";

type Check = {
  name: string;
  passed: boolean;
  detail?: string;
};

const checks: Check[] = [];

function record(name: string, passed: boolean, detail?: string): void {
  checks.push({ name, passed, detail });
  const suffix = detail ? ` (${detail})` : "";
  console.log(`${passed ? "PASS" : "FAIL"} ${name}${suffix}`);
}

function validInput() {
  return {
    full_name: "山田 花子",
    display_name: "はなこ",
    phone: "090-1234-5678",
    prefecture: "東京都",
    city: "渋谷区",
    profile_text: "よろしくお願いします",
    preferred_species: "dog",
    preferred_breed: "トイプードル",
    notification_enabled: "true",
  };
}

function main(): void {
  const base = validInput();
  const baseInput = parseBuyerProfileInputFromRecord(base);
  const baseErrors = validateBuyerProfile(baseInput);

  record("1. required 5 fields valid → validation success", !hasValidationErrors(baseErrors));

  const noFullName = parseBuyerProfileInputFromRecord({ ...base, full_name: "   " });
  record("2. full_name empty → error", Boolean(validateBuyerProfile(noFullName).fullName));

  const noDisplayName = parseBuyerProfileInputFromRecord({ ...base, display_name: "" });
  record("3. display_name empty → error", Boolean(validateBuyerProfile(noDisplayName).displayName));

  const noPhone = parseBuyerProfileInputFromRecord({ ...base, phone: "" });
  record("4. phone empty → error", Boolean(validateBuyerProfile(noPhone).phone));

  const noPrefecture = parseBuyerProfileInputFromRecord({ ...base, prefecture: "" });
  record("5. prefecture empty → error", Boolean(validateBuyerProfile(noPrefecture).prefecture));

  const noCity = parseBuyerProfileInputFromRecord({ ...base, city: "" });
  record("6. city empty → error", Boolean(validateBuyerProfile(noCity).city));

  const badSpecies = parseBuyerProfileInputFromRecord({
    ...base,
    preferred_species: "rabbit",
  });
  record(
    "7. invalid preferred_species → error",
    Boolean(validateBuyerProfile(badSpecies).preferredSpecies),
  );

  const longProfileText = parseBuyerProfileInputFromRecord({
    ...base,
    profile_text: "あ".repeat(BUYER_PROFILE_TEXT_MAX_LENGTH + 1),
  });
  record(
    "8. profile_text max length exceeded → error",
    Boolean(validateBuyerProfile(longProfileText).profileText),
  );

  const trimmedInput = parseBuyerProfileInputFromRecord({
    ...base,
    full_name: "  山田 花子  ",
    city: "  渋谷区 ",
  });
  const normalized = normalizeBuyerProfileInput(trimmedInput);
  record("9. trim whitespace", normalized.fullName === "山田 花子" && normalized.city === "渋谷区");

  const maliciousRecord = {
    ...base,
    profile_completed: "true",
    user_id: "00000000-0000-0000-0000-000000000001",
    membership_status: "suspended",
    id: "00000000-0000-0000-0000-000000000002",
  };
  const parsedMalicious = parseBuyerProfileInputFromRecord(maliciousRecord);
  const updatePayload = buildUpdateBuyerProfileData(normalizeBuyerProfileInput(parsedMalicious));

  record(
    "10. profile_completed from client record ignored in parser",
    !("profileCompleted" in parsedMalicious),
  );

  record(
    "10b. profile_completed computed server-side when valid",
    updatePayload.profile_completed === true,
  );

  const incompletePayload = buildUpdateBuyerProfileData(
    normalizeBuyerProfileInput(parseBuyerProfileInputFromRecord({ ...base, phone: "" })),
  );
  record(
    "10c. incomplete required fields → profile_completed false in payload builder",
    incompletePayload.profile_completed === false,
  );

  const payloadKeys = Object.keys(updatePayload).sort();
  const allowedKeys = [...BUYER_PROFILE_UPDATABLE_COLUMNS].sort();
  record("11. update payload has no user_id", !("user_id" in updatePayload));
  record("12. update payload has no membership_status", !("membership_status" in updatePayload));
  record(
    "12b. update payload keys match allowed columns only",
    JSON.stringify(payloadKeys) === JSON.stringify(allowedKeys),
    `keys=${payloadKeys.join(",")}`,
  );

  const emptySpecies = parseBuyerProfileInputFromRecord({
    ...base,
    preferred_species: "",
  });
  record(
    "optional preferred_species empty allowed",
    !hasValidationErrors(validateBuyerProfile(emptySpecies)),
  );

  record(
    "isBuyerProfileComplete matches normalized required fields",
    isBuyerProfileComplete(normalized) === true,
  );

  const passed = checks.filter((check) => check.passed).length;
  const failed = checks.length - passed;

  console.log("");
  console.log(`${passed} passed / ${failed} failed`);

  if (failed > 0) {
    process.exitCode = 1;
  }
}

main();
