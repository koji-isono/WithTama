/**
 * Pet price display tests (Decision No.153 — tax-exclusive, no calculation).
 *
 * Usage: npx tsx scripts/test-pet-price-display.mts
 */

import { readFileSync } from "node:fs";
import { join } from "node:path";

import { formatAdminPetPrice } from "../src/features/admin/format.ts";
import { formatPetPrice } from "../src/features/pets/list-format.ts";
import { normalizeCreatePetDraftInput } from "../src/features/pets/validation.ts";

type Check = { name: string; passed: boolean; detail?: string };

const checks: Check[] = [];
const root = join(import.meta.dirname, "..");

function record(name: string, passed: boolean, detail?: string): void {
  checks.push({ name, passed, detail });
  console.log(`${passed ? "PASS" : "FAIL"} ${name}${detail ? ` (${detail})` : ""}`);
}

function readSrc(relativePath: string): string {
  return readFileSync(join(root, relativePath), "utf8");
}

record("CASE A: price null → 価格未設定", formatPetPrice(null) === "価格未設定");

record("CASE B: price 0 → 0円（税抜）", formatPetPrice(0) === "0円（税抜）");

record("CASE C: price 250000 → 250,000円（税抜）", formatPetPrice(250_000) === "250,000円（税抜）");

record(
  "CASE D: price 9999999 → 9,999,999円（税抜）",
  formatPetPrice(9_999_999) === "9,999,999円（税抜）",
);

record(
  "CASE E: PU-01 uses formatPetPrice",
  readSrc("src/features/pets/components/public-pet-card.tsx").includes("formatPetPrice(pet.price)"),
);

record(
  "CASE F: PU-02 uses formatPetPrice",
  readSrc("src/features/pets/components/public-pet-detail-view.tsx").includes(
    "formatPetPrice(detail.price)",
  ),
);

record(
  "CASE G: BY-03 uses formatPetPrice",
  readSrc("src/features/favorites/components/buyer-favorite-pet-card.tsx").includes(
    "formatPetPrice(pet.price)",
  ),
);

const draftFields = readSrc("src/features/pets/components/pet-draft-form-fields.tsx");
record(
  "CASE H: BR-08/11 has no 税込 label",
  !draftFields.includes("税込") && draftFields.includes("販売価格（税抜）"),
);

record(
  "CASE I: BR-10 uses formatPetPrice",
  readSrc("src/features/pets/components/breeder-pets-list-content.tsx").includes(
    "formatPetPrice(pet.price)",
  ),
);

record(
  "CASE J: AD-11 uses formatAdminPetPrice via loader",
  readSrc("src/features/admin/loaders.ts").includes("formatAdminPetPrice(petRow.price)"),
);

record(
  "CASE Jb: formatAdminPetPrice tax-exclusive",
  formatAdminPetPrice(250_000) === "250,000円（税抜）" && formatAdminPetPrice(null) === "—",
);

const normalized = normalizeCreatePetDraftInput({
  managementName: "管理名",
  publicDisplayName: "公開名",
  species: "cat",
  breed: "ラグドール",
  sex: "female",
  birthday: "",
  color: "",
  temperament: "",
  description: "",
  price: "250000",
  priceComment: "",
});

record("CASE K: DB save value unchanged (tax-exclusive integer)", normalized.price === 250_000);

const billingCreate = readSrc("src/features/billing/create-checkout-session.ts");
record(
  "CASE L: Stripe checkout unchanged (no pet price)",
  billingCreate.includes("getStripeBreederPriceId") && !billingCreate.includes("formatPetPrice"),
);

const failed = checks.filter((check) => !check.passed).length;
console.log("");
console.log(`${checks.length - failed} passed / ${failed} failed`);

if (failed > 0) {
  process.exitCode = 1;
}
