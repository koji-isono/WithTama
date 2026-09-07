/**
 * Pet description validation unit tests (no DB).
 *
 * Usage: npx tsx scripts/test-pet-description-validation.mts
 */

import {
  PET_DESCRIPTION_MAX_LENGTH,
  PET_DESCRIPTION_MIN_LENGTH_FOR_REVIEW,
} from "../src/features/pets/constants.ts";
import {
  validateCreatePetDraftInput,
  validateDescriptionForReviewSubmit,
  validatePendingDescriptionDraft,
  validatePendingDescriptionForRevisionSubmit,
} from "../src/features/pets/validation.ts";

type Check = { name: string; passed: boolean; detail?: string };

const checks: Check[] = [];

function record(name: string, passed: boolean, detail?: string): void {
  checks.push({ name, passed, detail });
  console.log(`${passed ? "PASS" : "FAIL"} ${name}${detail ? ` (${detail})` : ""}`);
}

const valid20 = "あ".repeat(20);
const valid2000 = "あ".repeat(2000);
const invalid2001 = "あ".repeat(2001);

record(
  "CASE B: draft save without description allowed",
  Object.keys(
    validateCreatePetDraftInput({
      managementName: "管理名",
      publicDisplayName: "公開名",
      species: "cat",
      breed: "ラグドール",
      sex: "female",
      birthday: "",
      color: "",
      temperament: "",
      description: "",
      price: "",
      priceComment: "",
    }),
  ).length === 0,
);

record(
  "CASE C: submit without description rejected",
  validateDescriptionForReviewSubmit(null) !== null,
);

record("CASE D: 19 chars rejected", validateDescriptionForReviewSubmit("あ".repeat(19)) !== null);

record("CASE E: 20 chars accepted", validateDescriptionForReviewSubmit(valid20) === null);

record("CASE F: 2000 chars accepted", validateDescriptionForReviewSubmit(valid2000) === null);

record("CASE G: 2001 chars rejected", validateDescriptionForReviewSubmit(invalid2001) !== null);

record(
  "CASE W: same text revision rejected",
  validatePendingDescriptionForRevisionSubmit(valid20, valid20) !== null,
);

record("draft pending max length", validatePendingDescriptionDraft(invalid2001) !== null);

record(
  "constants min/max",
  PET_DESCRIPTION_MIN_LENGTH_FOR_REVIEW === 20 && PET_DESCRIPTION_MAX_LENGTH === 2000,
);

const failed = checks.filter((check) => !check.passed).length;
console.log("");
console.log(`${checks.length - failed} passed / ${failed} failed`);

if (failed > 0) {
  process.exitCode = 1;
}
